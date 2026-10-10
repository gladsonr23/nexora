const express = require('express');
const { db } = require('../db/database');

const router = express.Router();

function serializeTask(row) {
  return {
    taskId: row.task_id,
    scheduleId: row.schedule_id,
    materialId: row.material_id,
    topic: row.topic,
    subtopic: row.subtopic,
    date: row.task_date,
    durationMinutes: row.duration_minutes,
    priority: row.priority,
    status: row.status,
    completedAt: row.completed_at,
  };
}

// GET /api/tasks?date=YYYY-MM-DD  (defaults to today) — used by Overview
router.get('/', (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const rows = db.prepare('SELECT * FROM tasks WHERE task_date = ? ORDER BY priority DESC').all(date);
  res.json(rows.map(serializeTask));
});

// PATCH /api/tasks/:id — mark completed / rescheduled / edit duration
router.patch('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM tasks WHERE task_id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Task not found.' });

  const status = ['pending', 'completed', 'rescheduled'].includes(req.body.status)
    ? req.body.status
    : row.status;
  const taskDate = req.body.date && !isNaN(Date.parse(req.body.date)) ? req.body.date : row.task_date;
  const completedAt = status === 'completed' ? new Date().toISOString() : null;

  db.prepare(`
    UPDATE tasks SET status = ?, task_date = ?, completed_at = ?, updated_at = datetime('now')
    WHERE task_id = ?
  `).run(status, taskDate, completedAt, req.params.id);

  const updated = db.prepare('SELECT * FROM tasks WHERE task_id = ?').get(req.params.id);
  res.json(serializeTask(updated));
});

// DELETE /api/tasks/:id
router.delete('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM tasks WHERE task_id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Task not found.' });
  db.prepare('DELETE FROM tasks WHERE task_id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
