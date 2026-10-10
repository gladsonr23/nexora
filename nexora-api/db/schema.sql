-- Vault: one row per uploaded document. This is the source of truth.
CREATE TABLE IF NOT EXISTS materials (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  material_id        TEXT UNIQUE NOT NULL,       -- e.g. MAT-001
  original_filename  TEXT NOT NULL,
  stored_filename    TEXT NOT NULL,
  file_path          TEXT NOT NULL,
  mime_type          TEXT NOT NULL,
  category           TEXT DEFAULT 'Notes',        -- Syllabi / Lecture Slides / Notes / Assignments / PYQs / Question Banks
  subject            TEXT DEFAULT 'General',
  page_count         INTEGER DEFAULT 0,
  extracted_text      TEXT,                        -- page-tagged: "Page 1:\n...\n\nPage 2:\n..."
  extraction_status  TEXT DEFAULT 'pending',       -- pending | extracting | complete | needs_ocr | failed
  indexing_status    TEXT DEFAULT 'pending',       -- pending | indexed | ready
  file_size_bytes    INTEGER DEFAULT 0,
  created_at         TEXT DEFAULT (datetime('now')),
  updated_at         TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_materials_subject ON materials(subject);
CREATE INDEX IF NOT EXISTS idx_materials_category ON materials(category);

-- SyllabusToSchedule: one schedule per generation run, tied to a material.
CREATE TABLE IF NOT EXISTS schedules (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  schedule_id      TEXT UNIQUE NOT NULL,          -- e.g. SCH-001
  material_id      TEXT NOT NULL,
  subject          TEXT,
  exam_date        TEXT NOT NULL,
  available_hours  REAL NOT NULL,
  study_days_json  TEXT,                          -- JSON array of weekday names
  topics_json      TEXT,                          -- JSON: Gemini's structured unit/topic output
  created_at       TEXT DEFAULT (datetime('now')),
  updated_at       TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (material_id) REFERENCES materials(material_id)
);

-- Daily study tasks generated from a schedule. This is the ONE task table
-- the Overview dashboard and Focus Mode should also read/write.
CREATE TABLE IF NOT EXISTS tasks (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id           TEXT UNIQUE NOT NULL,          -- e.g. TASK-000123
  schedule_id       TEXT NOT NULL,
  material_id       TEXT NOT NULL,
  topic             TEXT NOT NULL,
  subtopic          TEXT,
  task_date         TEXT NOT NULL,                 -- YYYY-MM-DD
  duration_minutes  INTEGER NOT NULL,
  priority          TEXT DEFAULT 'medium',          -- low | medium | high
  status            TEXT DEFAULT 'pending',         -- pending | completed | rescheduled
  completed_at      TEXT,
  created_at        TEXT DEFAULT (datetime('now')),
  updated_at        TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (schedule_id) REFERENCES schedules(schedule_id),
  FOREIGN KEY (material_id) REFERENCES materials(material_id)
);
CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(task_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- NoteToQuiz: a generated quiz tied to a material.
CREATE TABLE IF NOT EXISTS quizzes (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  quiz_id         TEXT UNIQUE NOT NULL,
  material_id     TEXT NOT NULL,
  title           TEXT,
  topic           TEXT,
  question_type   TEXT NOT NULL,
  difficulty      TEXT NOT NULL,
  question_count  INTEGER NOT NULL,
  questions_json  TEXT NOT NULL,
  created_at      TEXT DEFAULT (datetime('now'))
);

-- A single attempt at a quiz.
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  attempt_id       TEXT UNIQUE NOT NULL,           -- e.g. ATT-001
  quiz_id          TEXT NOT NULL,
  score            INTEGER NOT NULL,
  total_questions  INTEGER NOT NULL,
  percentage       REAL NOT NULL,
  time_taken_sec   INTEGER,
  answers_json     TEXT NOT NULL,                  -- per-question: given answer + correctness
  created_at       TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (quiz_id) REFERENCES quizzes(quiz_id)
);
