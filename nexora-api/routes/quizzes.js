const express = require('express');

const { db, nextId } = require('../db/database');
const {
  generateQuiz,
  gradeAttempt,
} = require('../services/quizService');

const {
  GeminiError,
} = require('../services/geminiService');

const vault = require('../services/vaultService');
const { requireAuth } = require('../middleware/auth');
const { randomUUID } = require('node:crypto');
const { extractPdfText } = require('../services/pdfService');
const {decodeBrowserVaultMaterial} = require('../services/browserVaultMaterial');

const router = express.Router();

const VALID_TYPES = [
  'mcq',
  'short_answer',
  'term_check',
];

const VALID_DIFFICULTIES = [
  'easy',
  'medium',
  'hard',
];

const BROWSER_QUIZ_WINDOW_MS = 10 * 60 * 1000;
const BROWSER_QUIZ_LIMIT = 5;
const browserQuizRequests = new Map();

function allowBrowserVaultQuiz(req, res, next) {
  const now = Date.now();
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  let bucket = browserQuizRequests.get(ip);

  if (!bucket || now - bucket.startedAt >= BROWSER_QUIZ_WINDOW_MS) {
    bucket = {startedAt: now, count: 0};
    browserQuizRequests.set(ip, bucket);
  }

  if (bucket.count >= BROWSER_QUIZ_LIMIT) {
    const retryAfter = Math.max(1, Math.ceil((BROWSER_QUIZ_WINDOW_MS - (now - bucket.startedAt)) / 1000));
    res.set('Retry-After', String(retryAfter));
    return res.status(429).json({error: 'Too many quizzes generated from this browser. Try again in a few minutes.'});
  }

  bucket.count += 1;
  if (browserQuizRequests.size > 1000) {
    for (const [key, entry] of browserQuizRequests) {
      if (now - entry.startedAt >= BROWSER_QUIZ_WINDOW_MS) browserQuizRequests.delete(key);
    }
  }

  return next();
}

function authorizeQuizGeneration(req, res, next) {
  const isBrowserVaultRequest = Boolean(req.body?.material?.fileBase64);
  if (!isBrowserVaultRequest) return requireAuth(req, res, next);
  if (req.auth?.userId) return next();
  return allowBrowserVaultQuiz(req, res, next);
}

function serializeQuiz(
  row,
  { includeAnswers = false } = {}
) {
  const questions = JSON.parse(
    row.questions_json
  );

  return {
    quizId: row.quiz_id,
    materialId: row.material_id,
    title: row.title,
    topic: row.topic,
    questionType: row.question_type,
    difficulty: row.difficulty,
    questionCount: row.question_count,
    createdAt: row.created_at,
    questions: includeAnswers
      ? questions
      : stripAnswers(
          questions,
          row.question_type
        ),
  };
}

function stripAnswers(
  questions,
  type
) {
  return questions.map((q) => {
    if (type === 'mcq') {
      return {
        question: q.question,
        options: q.options,
      };
    }

    if (type === 'short_answer') {
      return {
        question: q.question,
      };
    }

    return {
      term: q.term,
    };
  });
}


/* =========================================================
   GENERATE QUIZ
   ========================================================= */

router.post(
  '/generate',
  authorizeQuizGeneration,
  async (req, res) => {
    const {
      materialId,
      topic,
      questionType,
      difficulty,
      questionCount,
      material: browserMaterial,
    } = req.body || {};

    if (!materialId) {
      return res.status(400).json({
        error: 'materialId is required.',
      });
    }

    if (
      !VALID_TYPES.includes(questionType)
    ) {
      return res.status(400).json({
        error:
          `questionType must be one of: ` +
          `${VALID_TYPES.join(', ')}`,
      });
    }

    if (
      !VALID_DIFFICULTIES.includes(difficulty)
    ) {
      return res.status(400).json({
        error:
          `difficulty must be one of: ` +
          `${VALID_DIFFICULTIES.join(', ')}`,
      });
    }

    const count =
      Number(questionCount) || 10;

    if (count < 1 || count > 30) {
      return res.status(400).json({
        error:
          'questionCount must be between 1 and 30.',
      });
    }

    try {
      /*
       * IMPORTANT:
       * Materials are now owned by Clerk users and stored
       * through the Vault service.
       *
       * Do NOT query the old SQLite materials table here.
       */
      let materialSubject = 'Study';
      let extractedText;
      let pdfBytes;
      if (browserMaterial) {
        const localMaterial = decodeBrowserVaultMaterial({materialId, material: browserMaterial});
        materialSubject = localMaterial.subject;
        const pdfReadStartedAt = Date.now();
        const extracted = await extractPdfText(localMaterial.bytes);
        if (extracted.status === 'complete' && extracted.text.replace(/\s/g, '').length >= 40) {
          extractedText = extracted.text;
        } else {
          pdfBytes = localMaterial.bytes;
        }
        console.info(`[quizzes] Browser Vault PDF inspected in ${Date.now() - pdfReadStartedAt}ms; mode=${pdfBytes ? 'Gemini PDF' : 'extracted text'}`);
      } else {
        const material = await vault.getMaterial(
          req.auth.userId,
          materialId,
          {includeText: true},
        );

        if (!material) {
          return res.status(404).json({error: 'Material not found.'});
        }

        extractedText = material.extractedText || material.extracted_text || '';
        materialSubject = material.subject || 'Study';
        if (!extractedText.trim() || material.extractionStatus === 'needs_ocr' || material.extraction_status === 'needs_ocr') {
          return res.status(422).json({error: 'No usable extracted text is available for this material yet. It may be a scanned PDF needing OCR.'});
        }
      }

      console.log(
        `[quizzes] Generating quiz for ${materialId} ` +
        `for user ${req.auth?.userId || 'browser Vault'}`
      );

      const generationStartedAt = Date.now();
      let questions;
      try {
        questions = await generateQuiz({
          extractedText,
          pdfBytes,
          filename: browserMaterial?.filename,
          topic:
            topic && topic !== 'All'
              ? topic
              : null,
          questionType,
          difficulty,
          questionCount: count,
        });
        console.info(`[quizzes] Quiz generation completed in ${Date.now() - generationStartedAt}ms`);
      } catch (error) {
        console.warn(`[quizzes] Quiz generation failed after ${Date.now() - generationStartedAt}ms (${error.code || error.status || 'error'})`);
        throw error;
      }

      if (browserMaterial) {
        const title = `${materialSubject} ${topic && topic !== 'All' ? `· ${topic} ` : ''}Quiz`.trim();
        return res.status(201).json({
          quizId: randomUUID(),
          materialId,
          title,
          topic: topic || 'All',
          questionType,
          difficulty,
          questionCount: questions.length,
          createdAt: new Date().toISOString(),
          questions,
        });
      }

      const quizId =
        nextId(
          'QUIZ',
          'quizzes',
          'quiz_id'
        );

      const subject = materialSubject;

      const title =
        `${subject} ` +
        `${
          topic && topic !== 'All'
            ? `· ${topic} `
            : ''
        }Quiz`.trim();

      /*
       * Quiz results remain in SQLite.
       * The source material remains in Supabase/Vault.
       */
      db.prepare(`
        INSERT INTO quizzes
          (
            quiz_id,
            material_id,
            title,
            topic,
            question_type,
            difficulty,
            question_count,
            questions_json
          )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        quizId,
        materialId,
        title,
        topic || 'All',
        questionType,
        difficulty,
        questions.length,
        JSON.stringify(questions)
      );

      const saved =
        db.prepare(
          'SELECT * FROM quizzes WHERE quiz_id = ?'
        ).get(quizId);

      return res.status(201).json(
        serializeQuiz(saved)
      );

    } catch (err) {
      console.error(
        '[quizzes] generate failed:',
        err
      );

      if (Number.isInteger(err?.status) && err.status >= 400 && err.status < 500) {
        return res.status(err.status).json({error: err.message});
      }

      /*
       * Vault service errors.
       */
      if (
        err &&
        (
          err.code === 'NOT_FOUND' ||
          err.code === 'MATERIAL_NOT_FOUND'
        )
      ) {
        return res.status(404).json({
          error: 'Material not found.',
        });
      }

      /*
       * Gemini errors.
       */
      if (
        err instanceof GeminiError
      ) {
        const status =
          err.code === 'NO_API_KEY'
            ? 503
            : 502;

        return res.status(status).json({
          error: err.message,
        });
      }

      if (
        err.code === 'NO_TEXT' ||
        err.code === 'NO_VALID_QUESTIONS'
      ) {
        return res.status(422).json({
          error: err.message,
        });
      }

      return res.status(500).json({
        error:
          err.message ||
          'Quiz generation failed.',
      });
    }
  }
);

// Browser-Vault generation is the only unauthenticated quiz route. Saved quiz
// history and attempts continue to require a verified Clerk session.
router.use(requireAuth);


/* =========================================================
   LIST QUIZZES
   ========================================================= */

router.get(
  '/',
  (req, res) => {
    const rows = db.prepare(`
      SELECT *
      FROM quizzes
      ORDER BY created_at DESC
    `).all();

    res.json(
      rows.map((r) => ({
        quizId: r.quiz_id,
        materialId: r.material_id,
        title: r.title,
        topic: r.topic,
        questionType:
          r.question_type,
        difficulty: r.difficulty,
        questionCount:
          r.question_count,
        createdAt: r.created_at,
      }))
    );
  }
);


/* =========================================================
   GET ONE QUIZ
   ========================================================= */

router.get(
  '/:id',
  (req, res) => {
    const row =
      db.prepare(
        'SELECT * FROM quizzes WHERE quiz_id = ?'
      ).get(req.params.id);

    if (!row) {
      return res.status(404).json({
        error: 'Quiz not found.',
      });
    }

    res.json(
      serializeQuiz(row)
    );
  }
);


/* =========================================================
   SUBMIT ATTEMPT
   ========================================================= */

router.post(
  '/:id/attempt',
  (req, res) => {
    const row =
      db.prepare(
        'SELECT * FROM quizzes WHERE quiz_id = ?'
      ).get(req.params.id);

    if (!row) {
      return res.status(404).json({
        error: 'Quiz not found.',
      });
    }

    const {
      answers,
      timeTakenSec,
    } = req.body || {};

    if (!Array.isArray(answers)) {
      return res.status(400).json({
        error:
          'answers must be an array.',
      });
    }

    const questions =
      JSON.parse(
        row.questions_json
      );

    const {
      score,
      results,
    } = gradeAttempt(
      questions,
      row.question_type,
      answers
    );

    const percentage =
      Math.round(
        (score / questions.length) * 100
      );

    const attemptId =
      nextId(
        'ATT',
        'quiz_attempts',
        'attempt_id'
      );

    db.prepare(`
      INSERT INTO quiz_attempts
        (
          attempt_id,
          quiz_id,
          score,
          total_questions,
          percentage,
          time_taken_sec,
          answers_json
        )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      attemptId,
      req.params.id,
      score,
      questions.length,
      percentage,
      timeTakenSec || null,
      JSON.stringify(results)
    );

    res.status(201).json({
      attemptId,
      quizId: req.params.id,
      score,
      totalQuestions:
        questions.length,
      percentage,
      timeTakenSec:
        timeTakenSec || null,
      results,
      questions,
    });
  }
);


/* =========================================================
   ATTEMPT HISTORY
   ========================================================= */

router.get(
  '/:id/attempts',
  (req, res) => {
    const rows =
      db.prepare(`
        SELECT *
        FROM quiz_attempts
        WHERE quiz_id = ?
        ORDER BY created_at DESC
      `).all(req.params.id);

    res.json(
      rows.map((r) => ({
        attemptId:
          r.attempt_id,
        quizId:
          r.quiz_id,
        score:
          r.score,
        totalQuestions:
          r.total_questions,
        percentage:
          r.percentage,
        timeTakenSec:
          r.time_taken_sec,
        createdAt:
          r.created_at,
      }))
    );
  }
);


module.exports = router;
