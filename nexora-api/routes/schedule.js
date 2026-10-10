const express = require('express');
const {
  db,
  nextId
} = require('../db/database');

const {
  extractSyllabusTopics,
  buildSchedule,
  WEEKDAYS
} = require('../services/scheduleService');

const {
  GeminiError
} = require('../services/geminiService');

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

/*
 * Get today's LOCAL date as YYYY-MM-DD.
 *
 * Do not use toISOString() because it converts
 * the date to UTC.
 */
function getLocalDateString() {
  const now = new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(2, '0');

  const day =
    String(
      now.getDate()
    ).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/*
 * Validate YYYY-MM-DD without timezone conversion.
 */
function isValidDateString(value) {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false;
  }

  const [year, month, day] =
    value.split('-').map(Number);

  const date =
    new Date(
      year,
      month - 1,
      day
    );

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/*
 * POST /api/schedule/generate
 */
router.post(
  '/generate',
  async (req, res) => {
    const {
      materialId,
      examDate,
      availableHours,
      studyDays
    } = req.body || {};

    if (!materialId) {
      return res
        .status(400)
        .json({
          error:
            'materialId is required.'
        });
    }

    if (
      !isValidDateString(examDate)
    ) {
      return res
        .status(400)
        .json({
          error:
            'A valid examDate is required in YYYY-MM-DD format.'
        });
    }

    /*
     * The exam must be after today.
     */
    const today =
      getLocalDateString();

    if (examDate <= today) {
      return res
        .status(400)
        .json({
          error:
            'The exam date must be after today.'
        });
    }

    const hours =
      Number(availableHours);

    if (
      !Number.isFinite(hours) ||
      hours <= 0
    ) {
      return res
        .status(400)
        .json({
          error:
            'availableHours must be a positive number.'
        });
    }

    /*
     * Only accept valid weekday names.
     */
    const days =
      Array.isArray(studyDays)
        ? [
            ...new Set(
              studyDays.filter(
                (d) =>
                  WEEKDAYS.includes(d)
              )
            )
          ]
        : [];

    if (days.length === 0) {
      return res
        .status(400)
        .json({
          error:
            'Select at least one valid study day.'
        });
    }

    const material =
      db
        .prepare(
          'SELECT * FROM materials WHERE material_id = ?'
        )
        .get(materialId);

    if (!material) {
      return res
        .status(404)
        .json({
          error:
            'Material not found.'
        });
    }

    if (
      !material.extracted_text ||
      material.extraction_status ===
        'needs_ocr'
    ) {
      return res
        .status(422)
        .json({
          error:
            'No usable extracted text is available for this material. It may be a scanned PDF, which needs OCR before it can be scheduled.'
        });
    }

    try {
      /*
       * Extract syllabus topics.
       */
      const syllabus =
        await extractSyllabusTopics(
          material.extracted_text
        );

      /*
       * Build deterministic schedule.
       *
       * This starts TOMORROW, not today.
       */
      const tasks =
        buildSchedule({
          units: syllabus.units,
          examDate,
          availableHours: hours,
          studyDays: days
        });

      if (tasks.length === 0) {
        return res
          .status(422)
          .json({
            error:
              'No study tasks could be scheduled between tomorrow and the exam date using the selected study days.'
          });
      }

      /*
       * Final server-side safety check.
       *
       * Never save today's tasks.
       */
      const validTasks =
        tasks.filter(
          (task) =>
            task.date > today &&
            task.date < examDate
        );

      if (
        validTasks.length === 0
      ) {
        return res
          .status(422)
          .json({
            error:
              'The generated plan contains no valid future study dates.'
          });
      }

      const scheduleId =
        nextId(
          'SCH',
          'schedules',
          'schedule_id'
        );

      db.prepare(`
        INSERT INTO schedules
          (
            schedule_id,
            material_id,
            subject,
            exam_date,
            available_hours,
            study_days_json,
            topics_json
          )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        scheduleId,
        materialId,
        syllabus.subject,
        examDate,
        hours,
        JSON.stringify(days),
        JSON.stringify(syllabus)
      );

      const insertTask =
        db.prepare(`
          INSERT INTO tasks
            (
              task_id,
              schedule_id,
              material_id,
              topic,
              subtopic,
              task_date,
              duration_minutes,
              priority,
              status
            )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
        `);

      const insertMany =
        db.transaction(
          (taskList) => {
            taskList.forEach(
              (task) => {
                const taskId =
                  nextId(
                    'TASK',
                    'tasks',
                    'task_id'
                  );

                insertTask.run(
                  taskId,
                  scheduleId,
                  materialId,
                  task.topic,
                  task.subtopic,
                  task.date,
                  task.duration,
                  task.priority
                );
              }
            );
          }
        );

      insertMany(validTasks);

      const savedTasks =
        db
          .prepare(
            `
              SELECT *
              FROM tasks
              WHERE schedule_id = ?
              ORDER BY task_date ASC
            `
          )
          .all(scheduleId);

      return res
        .status(201)
        .json({
          scheduleId,
          subject: syllabus.subject,
          examDate,
          availableHours: hours,
          studyDays: days,
          tasks:
            savedTasks.map(
              serializeTask
            )
        });
    } catch (err) {
      console.error(
        '[schedule] generate failed:',
        err
      );

      if (
        err instanceof GeminiError
      ) {
        const status =
          err.code === 'NO_API_KEY'
            ? 503
            : 502;

        return res
          .status(status)
          .json({
            error: err.message
          });
      }

      return res
        .status(500)
        .json({
          error:
            err.message ||
            'Failed to generate study plan.'
        });
    }
  }
);

/*
 * GET /api/schedule
 * List all schedules.
 */
router.get(
  '/',
  (req, res) => {
    const rows =
      db
        .prepare(
          'SELECT * FROM schedules ORDER BY created_at DESC'
        )
        .all();

    res.json(
      rows.map((r) => ({
        scheduleId:
          r.schedule_id,

        materialId:
          r.material_id,

        subject:
          r.subject,

        examDate:
          r.exam_date,

        availableHours:
          r.available_hours,

        studyDays:
          JSON.parse(
            r.study_days_json ||
              '[]'
          ),

        createdAt:
          r.created_at
      }))
    );
  }
);

/*
 * GET /api/schedule/:date
 * Tasks due on a specific date.
 */
router.get(
  '/:date',
  (req, res) => {
    const rows =
      db
        .prepare(
          `
            SELECT *
            FROM tasks
            WHERE task_date = ?
            ORDER BY priority DESC
          `
        )
        .all(
          req.params.date
        );

    res.json(
      rows.map(
        serializeTask
      )
    );
  }
);

/*
 * PATCH /api/schedule/:id
 * Edit exam date / available hours.
 */
router.patch(
  '/:id',
  (req, res) => {
    const row =
      db
        .prepare(
          'SELECT * FROM schedules WHERE schedule_id = ?'
        )
        .get(req.params.id);

    if (!row) {
      return res
        .status(404)
        .json({
          error:
            'Schedule not found.'
        });
    }

    const examDate =
      req.body.examDate &&
      isValidDateString(
        req.body.examDate
      )
        ? req.body.examDate
        : row.exam_date;

    const availableHours =
      req.body.availableHours
        ? Number(
            req.body.availableHours
          )
        : row.available_hours;

    if (
      examDate <=
      getLocalDateString()
    ) {
      return res
        .status(400)
        .json({
          error:
            'The exam date must be after today.'
        });
    }

    if (
      !Number.isFinite(
        availableHours
      ) ||
      availableHours <= 0
    ) {
      return res
        .status(400)
        .json({
          error:
            'availableHours must be a positive number.'
        });
    }

    db.prepare(`
      UPDATE schedules
      SET
        exam_date = ?,
        available_hours = ?,
        updated_at = datetime('now')
      WHERE schedule_id = ?
    `).run(
      examDate,
      availableHours,
      req.params.id
    );

    res.json({
      success: true
    });
  }
);

module.exports = router;