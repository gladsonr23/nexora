require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const studyComponentsRouter = require('./routes/study-components');
const scheduleRouter = require('./routes/schedule');
const tasksRouter = require('./routes/tasks');
const quizzesRouter = require('./routes/quizzes');
const assistantRouter = require('./routes/assistant');
const flashloopRouter = require('./routes/flashloop');
const { optionalAuth } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 4000;

app.set('trust proxy', 1);
app.use(cors());
app.use(express.json({ limit: '16mb' }));

// This server is API-only. The actual dashboard (index.html / app.js /
// styles.css + the frontend-modules/ files) is a separate static site that
// calls these endpoints over HTTP (see frontend-modules/INTEGRATION.md).
// If you'd rather serve everything from one origin, copy the dashboard's
// files into a folder here and uncomment the line below.
// app.use(express.static(path.join(__dirname, 'public')));

// API routes — one mount point per module, all sharing the same SQLite DB.
// Shared release: study files live in each browser until account storage is re-enabled.
app.use('/api', studyComponentsRouter); // YouTube notes and historical exam-pattern analysis
// Schedule / Quiz are still SQLite-backed and not login-gated yet. optionalAuth
// only *attaches* req.auth.userId when a valid Clerk token is sent (never rejects),
// so these routes can look up the signed-in user's Vault materials via
// vaultService.getMaterial(req.auth.userId, id) — see MIGRATION notes.
app.use('/api/schedule', optionalAuth, scheduleRouter);     // SyllabusToSchedule
app.use('/api/tasks', tasksRouter);                         // shared task system (Overview / Focus Mode read this too)
app.use('/api/quizzes', optionalAuth, quizzesRouter);       // NoteToQuiz
app.use('/api/assistant', assistantRouter);                  // AI Study Assistant — grounded in the signed-in user's Vault
app.use('/api/flashloop', flashloopRouter);                  // FlashLoop — provider keys stay server-side

app.get('/health', (req, res) => res.json({ ok: true }));

// Central error handler — never leak stack traces to the client.
app.use((err, req, res, next) => {
  console.error('[server] unhandled error:', err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

app.listen(PORT, () => {
  console.log(`Nexora modules API running at http://localhost:${PORT}`);
  console.log(`  Point the dashboard's window.NEXORA_API_BASE at this URL.`);
  if (!process.env.GEMINI_API_KEY) {
    console.warn('  ⚠ GEMINI_API_KEY not set — AI generation endpoints will return 503 until it is.');
  }
});
