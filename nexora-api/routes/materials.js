/**
 * routes/materials.js — Vault API. Thin controllers only:
 *   authenticate (Clerk) -> req.auth.userId -> validate -> vaultService -> respond.
 * No Supabase or SQLite code lives here, and the user ID is never read from
 * the request body, query string, or URL.
 */
const express = require('express');
const multer = require('multer');
const path = require('path');

const vault = require('../services/vaultService');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const MAX_UPLOAD_MB = parseInt(process.env.MAX_UPLOAD_MB || '25', 10);
const MIN_OCR_TEXT_LENGTH = 40;

const VALID_CATEGORIES = [
  'Syllabi',
  'Lecture Slides',
  'Notes',
  'Assignments',
  'PYQs',
  'Question Banks',
];

// PDFs are held in memory just long enough to extract text and push to Supabase
// Storage. Nothing is written to the local uploads/ directory any more.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const isPdf =
      file.mimetype === 'application/pdf' ||
      path.extname(file.originalname).toLowerCase() === '.pdf';
    if (!isPdf) return cb(new Error('Only PDF files are supported.'));
    cb(null, true);
  },
});

// ---------- shared middleware / helpers ----------

// Every Vault route requires a verified Clerk session. This runs BEFORE multer,
// so unauthenticated clients can't even make the server buffer an upload.
router.use(requireAuth);

// Responses are per-user: never let a browser or proxy cache one user's Vault.
router.use((req, res, next) => {
  res.set('Cache-Control', 'private, no-store');
  res.set('Vary', 'Authorization');
  next();
});

// Material IDs look like MAT-001. Anything else can't exist -> 404 without a DB hit.
router.param('id', (req, res, next, id) => {
  if (!/^MAT-\d+$/.test(id)) return res.status(404).json({ error: 'Material not found.' });
  next();
});

function sendError(res, err) {
  if (err instanceof vault.VaultError) {
    return res.status(err.status).json({ error: err.message });
  }
  console.error('[materials] unexpected error:', err);
  return res.status(500).json({ error: 'Something went wrong on the server.' });
}

const route = (handler) => async (req, res) => {
  try {
    await handler(req, res);
  } catch (err) {
    sendError(res, err);
  }
};

function contentDisposition(filename) {
  const ascii = String(filename).replace(/[^\x20-\x7e]|["\\]/g, '_');
  return `inline; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

// ---------- routes ----------

// POST /api/materials — upload + process a new PDF
router.post('/', (req, res) => {
  upload.single('file')(req, res, async (uploadErr) => {
    if (uploadErr) {
      const tooBig = uploadErr.code === 'LIMIT_FILE_SIZE';
      return res.status(tooBig ? 413 : 400).json({
        error: tooBig ? `PDF is too large (max ${MAX_UPLOAD_MB} MB).` : uploadErr.message,
      });
    }

    try {
      const file = req.file;
      if (!file) return res.status(400).json({ error: 'No PDF file was provided.' });

      // Don't trust the client's mimetype/extension alone: real PDFs start with "%PDF-".
      if (file.buffer.subarray(0, 5).toString('latin1') !== '%PDF-') {
        return res.status(400).json({ error: 'Only PDF files are supported.' });
      }

      const category = VALID_CATEGORIES.includes(req.body.category) ? req.body.category : 'Notes';
      const subject = String(req.body.subject || 'General').trim().slice(0, 120) || 'General';

      const material = await vault.saveFile(req.auth.userId, file, { subject, category });
      return res.status(201).json(material);
    } catch (err) {
      return sendError(res, err);
    }
  });
});

// GET /api/materials — this user's materials, with optional search + category filter
router.get('/', route(async (req, res) => {
  const { search, category } = req.query;
  const materials = await vault.getFiles(req.auth.userId, {
    search: typeof search === 'string' ? search : undefined,
    category: typeof category === 'string' ? category : undefined,
  });
  res.json(materials);
}));

// GET /api/materials/:id — one material with extracted text (consumed by Quiz / Schedule)
router.get('/:id', route(async (req, res) => {
  res.json(await vault.getMaterial(req.auth.userId, req.params.id, { includeText: true }));
}));

// GET /api/materials/:id/file — stream the PDF from Supabase Storage (never a raw path or URL)
router.get('/:id/file', route(async (req, res) => {
  const { buffer, filename, mimeType } = await vault.getFile(req.auth.userId, req.params.id);
  res.set('Content-Type', mimeType);
  res.set('Content-Disposition', contentDisposition(filename));
  res.set('Content-Length', String(buffer.length));
  res.send(buffer);
}));

// POST /api/materials/:id/ocr — persist browser-generated OCR text (Tesseract.js runs
// client-side; the backend only validates and saves it).
router.post('/:id/ocr', route(async (req, res) => {
  const extractedText = typeof req.body?.extractedText === 'string' ? req.body.extractedText.trim() : '';

  if (extractedText.replace(/\s/g, '').length < MIN_OCR_TEXT_LENGTH) {
    return res.status(422).json({
      error: 'No readable text was detected in this PDF. OCR did not produce enough usable text to save.',
    });
  }

  res.json(await vault.saveExtractedText(req.auth.userId, req.params.id, extractedText));
}));

// PATCH /api/materials/:id — edit subject / category / (display) filename
router.patch('/:id', route(async (req, res) => {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ error: 'Invalid request body.' });
  }

  const changes = {};

  if (body.filename !== undefined) {
    const filename = typeof body.filename === 'string' ? body.filename.trim().slice(0, 255) : '';
    if (!filename) return res.status(400).json({ error: 'Filename cannot be empty.' });
    changes.filename = filename;
  }
  if (body.subject !== undefined) {
    changes.subject = String(body.subject).trim().slice(0, 120) || 'General';
  }
  // Same behaviour as before: an unrecognised category is ignored, not an error.
  if (VALID_CATEGORIES.includes(body.category)) {
    changes.category = body.category;
  }

  // A pure rename goes through renameFile; anything else through updateMetadata.
  const onlyRename = Object.keys(changes).length === 1 && changes.filename !== undefined;
  const updated = onlyRename
    ? await vault.renameFile(req.auth.userId, req.params.id, changes.filename)
    : await vault.updateMetadata(req.auth.userId, req.params.id, changes);

  res.json(updated);
}));

// DELETE /api/materials/:id — remove the Storage object + metadata row
router.delete('/:id', route(async (req, res) => {
  res.json(await vault.deleteFile(req.auth.userId, req.params.id));
}));

module.exports = router;