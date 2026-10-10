/**
 * vaultService.js — the ONLY place that knows how Vault data is persisted
 * (Supabase PostgreSQL for metadata, Supabase Storage for the PDF bytes).
 *
 * SECURITY CONTRACT
 *   - Every exported function takes `userId` (the verified Clerk user ID that
 *     middleware/auth.js put on req.auth) as its first argument.
 *   - Every query filters on user_id = userId, in addition to material_id.
 *     material_id alone is never trusted: a material that belongs to someone
 *     else is indistinguishable from one that doesn't exist (404).
 *   - Storage paths are derived server-side from userId + materialId, never
 *     from client input.
 */
const { supabase, BUCKET } = require('./supabase');
const { extractPdfText } = require('./pdfService');

/** Error whose message is safe to show to the browser. */
class VaultError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'VaultError';
    this.status = status;
  }
}

// What the Vault list needs. Deliberately excludes extracted_text (can be huge)
// and storage_path (internal; never sent to the browser).
const LIST_COLUMNS =
  'material_id, filename, subject, category, page_count, extraction_status, ' +
  'indexing_status, file_size, created_at, updated_at';

// ---------- helpers ----------

function client() {
  if (!supabase) {
    throw new VaultError(503, 'Vault storage is not configured on the server.');
  }
  return supabase;
}

function requireUser(userId) {
  if (typeof userId !== 'string' || !userId) {
    throw new VaultError(401, 'Please sign in to continue.');
  }
}

/** Log the real cause server-side; give the browser a generic message. */
function internal(context, error) {
  console.error(`[vaultService] ${context}:`, error && (error.message || error));
  return new VaultError(500, 'Something went wrong while accessing your Vault.');
}

/** Same JSON shape the old SQLite-backed routes returned, so the frontend is untouched. */
function toMaterial(row, { includeText = false } = {}) {
  const material = {
    materialId: row.material_id,
    filename: row.filename,
    subject: row.subject,
    category: row.category,
    pages: row.page_count,
    extractionStatus: row.extraction_status,
    indexingStatus: row.indexing_status,
    fileSizeBytes: row.file_size,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (includeText) material.extractedText = row.extracted_text || '';
  return material;
}

function storagePathFor(userId, materialId) {
  return `user_${userId}/${materialId}/file.pdf`;
}

// Postgres text columns reject NUL (\u0000), which PDF text extraction can emit.
function cleanText(text) {
  return String(text || '').replace(/\u0000/g, '');
}

/** Fetch one row by materialId AND userId. Throws 404 if it isn't this user's. */
async function findOwnedRow(userId, materialId, columns) {
  const { data, error } = await client()
    .from('materials')
    .select(columns)
    .eq('material_id', materialId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw internal('lookup failed', error);
  if (!data) throw new VaultError(404, 'Material not found.');
  return data;
}

// ---------- public API ----------

/**
 * Upload a PDF + create its metadata row.
 * @param file     { buffer, originalname, mimetype, size } (multer memory file)
 * @param metadata { subject, category } — already validated by the route
 */
async function saveFile(userId, file, metadata = {}) {
  requireUser(userId);
  const sb = client();
  if (!file || !Buffer.isBuffer(file.buffer)) {
    throw new VaultError(400, 'No PDF file was provided.');
  }

  const subject = metadata.subject || 'General';
  const category = metadata.category || 'Notes';

  // Text extraction is pure computation on the in-memory buffer. A failed or
  // "needs_ocr" extraction is not fatal: the file is still stored and viewable.
  const { pageCount, text, status } = await extractPdfText(file.buffer);
  const indexingStatus = status === 'complete' ? 'ready' : 'pending';

  const { data: materialId, error: idError } = await sb.rpc('next_material_id');
  if (idError || !materialId) throw internal('could not allocate material id', idError);

  const storagePath = storagePathFor(userId, materialId);

  const { error: uploadError } = await sb.storage
    .from(BUCKET)
    .upload(storagePath, file.buffer, { contentType: 'application/pdf', upsert: false });
  if (uploadError) throw internal('storage upload failed', uploadError);

  const { data: row, error: insertError } = await sb
    .from('materials')
    .insert({
      material_id: materialId,
      user_id: userId,
      filename: String(file.originalname || 'untitled.pdf').slice(0, 255),
      subject,
      category,
      page_count: pageCount,
      storage_path: storagePath,
      mime_type: 'application/pdf',
      file_size: file.size ?? file.buffer.length,
      extracted_text: cleanText(text),
      extraction_status: status,
      indexing_status: indexingStatus,
    })
    .select(LIST_COLUMNS)
    .single();

  if (insertError) {
    // Don't leave an orphaned PDF behind if the metadata row couldn't be written.
    const { error: cleanupError } = await sb.storage.from(BUCKET).remove([storagePath]);
    if (cleanupError) console.error('[vaultService] orphan cleanup failed:', cleanupError.message);
    throw internal('metadata insert failed', insertError);
  }

  return toMaterial(row);
}

/** List this user's materials. Optional { search, category } filters (as before). */
async function getFiles(userId, { search, category } = {}) {
  requireUser(userId);

  let query = client().from('materials').select(LIST_COLUMNS).eq('user_id', userId);

  if (category && category !== 'All') query = query.eq('category', category);

  if (search) {
    // Strip characters that have meaning in PostgREST's filter grammar.
    const term = String(search).replace(/[,()*%\\"]/g, ' ').trim().slice(0, 100);
    if (term) {
      query = query.or(
        `filename.ilike.*${term}*,subject.ilike.*${term}*,category.ilike.*${term}*`
      );
    }
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw internal('list failed', error);
  return (data || []).map((row) => toMaterial(row));
}

/** One material's metadata (+ extractedText if asked). Used by GET /:id and by Quiz/Schedule. */
async function getMaterial(userId, materialId, { includeText = true } = {}) {
  requireUser(userId);
  const columns = includeText ? `${LIST_COLUMNS}, extracted_text` : LIST_COLUMNS;
  const row = await findOwnedRow(userId, materialId, columns);
  return toMaterial(row, { includeText });
}

/** The PDF bytes. Ownership is verified before Storage is touched. */
async function getFile(userId, materialId) {
  requireUser(userId);
  const row = await findOwnedRow(userId, materialId, 'storage_path, filename, mime_type');

  const { data, error } = await client().storage.from(BUCKET).download(row.storage_path);
  if (error || !data) {
    const missing = error && (error.statusCode == 404 || error.status == 404 || /not found/i.test(error.message || ''));
    if (missing) throw new VaultError(404, 'The stored file is missing.');
    throw internal('storage download failed', error);
  }

  return {
    buffer: Buffer.from(await data.arrayBuffer()),
    filename: row.filename,
    mimeType: row.mime_type || 'application/pdf',
  };
}

/** Update display fields (filename / subject / category). storage_path never changes. */
async function updateMetadata(userId, materialId, changes = {}) {
  requireUser(userId);

  const patch = {};
  if (changes.filename !== undefined) patch.filename = changes.filename;
  if (changes.subject !== undefined) patch.subject = changes.subject;
  if (changes.category !== undefined) patch.category = changes.category;

  if (Object.keys(patch).length === 0) {
    return getMaterial(userId, materialId, { includeText: false });
  }
  patch.updated_at = new Date().toISOString();

  const { data, error } = await client()
    .from('materials')
    .update(patch)
    .eq('material_id', materialId)
    .eq('user_id', userId)
    .select(LIST_COLUMNS)
    .maybeSingle();

  if (error) throw internal('update failed', error);
  if (!data) throw new VaultError(404, 'Material not found.');
  return toMaterial(data);
}

/** Rename = change the display name in PostgreSQL only; the Storage object doesn't move. */
function renameFile(userId, materialId, newName) {
  return updateMetadata(userId, materialId, { filename: newName });
}

/** Delete the Storage object, then the metadata row. Both are ownership-checked first. */
async function deleteFile(userId, materialId) {
  requireUser(userId);
  const sb = client();
  const row = await findOwnedRow(userId, materialId, 'storage_path');

  // Removing a path that no longer exists is not an error in Supabase, so a
  // retry after a half-finished delete still succeeds.
  const { error: storageError } = await sb.storage.from(BUCKET).remove([row.storage_path]);
  if (storageError) throw internal('storage delete failed', storageError);

  const { data, error: dbError } = await sb
    .from('materials')
    .delete()
    .eq('material_id', materialId)
    .eq('user_id', userId)
    .select('material_id');
  if (dbError) throw internal('metadata delete failed', dbError);
  if (!data || data.length === 0) throw new VaultError(404, 'Material not found.');

  return { success: true };
}

/** Save browser-generated OCR text and mark the material ready. The PDF is left untouched. */
async function saveExtractedText(userId, materialId, extractedText) {
  requireUser(userId);

  const { data, error } = await client()
    .from('materials')
    .update({
      extracted_text: cleanText(extractedText),
      extraction_status: 'complete',
      indexing_status: 'ready',
      updated_at: new Date().toISOString(),
    })
    .eq('material_id', materialId)
    .eq('user_id', userId)
    .select(LIST_COLUMNS)
    .maybeSingle();

  if (error) throw internal('save OCR text failed', error);
  if (!data) throw new VaultError(404, 'Material not found.');
  return toMaterial(data);
}

module.exports = {
  VaultError,
  saveFile,
  getFiles,
  getMaterial,
  getFile,
  updateMetadata,
  renameFile,
  deleteFile,
  saveExtractedText,
};