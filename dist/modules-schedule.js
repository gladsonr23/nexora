/**
 * modules-schedule.js — SyllabusToSchedule.
 * Exposes window.NexoraSchedule.mount(container).
 */
(function () {
  const {
    api,
    icon,
    toast,
    escapeHtml,
    formatDate,
    weekdayName,
    takeActiveMaterial,
    loadingBlock,
    errorBlock,
    emptyBlock
  } = window.NexoraShared;

  const WEEKDAYS = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday'
  ];

  const state = {
    materials: [],
    lastResult: null,
    tab: 'today',
  };

  /*
   * Returns today's date in the user's local timezone as YYYY-MM-DD.
   * Do NOT use toISOString() here because that converts the date to UTC.
   */
  function getLocalDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  async function mount(container) {
    if (!container) return;

    container.innerHTML = loadingBlock('Reading available materials…');

    try {
      state.materials = await api('/api/materials');
    } catch (err) {
      container.innerHTML = errorBlock(
        err.message || 'Could not load Vault materials.'
      );

      container
        .querySelector('.nxm-retry')
        ?.addEventListener('click', () => mount(container));

      return;
    }

    const preselect = takeActiveMaterial();

    container.innerHTML = renderConfigForm(preselect);
    wireConfigForm(container);
  }

  function renderConfigForm(preselectId) {
    if (state.materials.length === 0) {
      return emptyBlock(
        'No materials in Vault yet',
        'Upload a syllabus in Vault first, then come back here to build a plan from it.'
      );
    }

    const today = getLocalDateString();

    return `
      <div class="nxs-config">

        <label class="nxm-field" style="grid-column:span 2">
          Syllabus material

          <select id="nxs-material">
            ${state.materials
              .map(
                (m) => `
                  <option
                    value="${escapeHtml(m.materialId)}"
                    ${m.materialId === preselectId ? 'selected' : ''}
                  >
                    ${escapeHtml(m.filename)} · ${escapeHtml(m.subject)}
                  </option>
                `
              )
              .join('')}
          </select>
        </label>

        <label class="nxm-field">
          Exam date

          <input
            type="date"
            id="nxs-exam-date"
            min="${today}"
          >
        </label>

        <label class="nxm-field">
          Available hours / day

          <input
            type="number"
            id="nxs-hours"
            min="0.5"
            max="12"
            step="0.5"
            value="2"
          >
        </label>

        <div class="nxm-field" style="grid-column:1/-1">
          Study days

          <div class="nxs-weekdays">
            ${WEEKDAYS
              .map(
                (d) => `
                  <label>
                    <input
                      type="checkbox"
                      value="${d}"
                      checked
                    >
                    ${d.slice(0, 3)}
                  </label>
                `
              )
              .join('')}
          </div>
        </div>

        <div class="nxs-generate-row">
          <button
            type="button"
            class="nx-primary-button"
            id="nxs-generate"
          >
            ${icon('schedule')}
            <span>Generate Study Plan</span>
          </button>
        </div>

      </div>

      <div id="nxs-status"></div>
      <div id="nxs-results"></div>
    `;
  }

  function wireConfigForm(container) {
    const btn = container.querySelector('#nxs-generate');

    if (!btn) return;

    btn.addEventListener('click', () => generatePlan(container));
  }

  async function generatePlan(container) {
    const materialId =
      container.querySelector('#nxs-material').value;

    const examDate =
      container.querySelector('#nxs-exam-date').value;

    const availableHours =
      Number(container.querySelector('#nxs-hours').value);

    const studyDays = [
      ...container.querySelectorAll(
        '.nxs-weekdays input:checked'
      )
    ].map((i) => i.value);

    const statusEl =
      container.querySelector('#nxs-status');

    const resultsEl =
      container.querySelector('#nxs-results');

    const today = getLocalDateString();

    if (!examDate) {
      statusEl.innerHTML =
        `<p class="nxm-inline-error">
          Please choose an exam date.
        </p>`;

      return;
    }

    if (examDate <= today) {
      statusEl.innerHTML =
        `<p class="nxm-inline-error">
          Please choose an exam date after today.
        </p>`;

      return;
    }

    if (!availableHours || availableHours <= 0) {
      statusEl.innerHTML =
        `<p class="nxm-inline-error">
          Please enter valid study hours per day.
        </p>`;

      return;
    }

    if (studyDays.length === 0) {
      statusEl.innerHTML =
        `<p class="nxm-inline-error">
          Select at least one study day.
        </p>`;

      return;
    }

    const stages = [
      'Reading syllabus…',
      'Identifying topics…',
      'Building study plan…',
      'Saving schedule…'
    ];

    let stageIdx = 0;

    statusEl.innerHTML =
      loadingBlock(stages[0]);

    resultsEl.innerHTML = '';

    const stageTimer = setInterval(() => {
      stageIdx = Math.min(
        stageIdx + 1,
        stages.length - 1
      );

      statusEl.innerHTML =
        loadingBlock(stages[stageIdx]);
    }, 1400);

    try {
      const result = await api('/api/schedule/generate', {
        method: 'POST',

        body: JSON.stringify({
          materialId,
          examDate,
          availableHours,
          studyDays
        }),
      });

      clearInterval(stageTimer);

      statusEl.innerHTML = '';

      state.lastResult = result;
      state.tab = 'today';

      renderResults(container);

      toast('Study plan generated.');
    } catch (err) {
      clearInterval(stageTimer);

      statusEl.innerHTML =
        errorBlock(
          err.message ||
          'Failed to generate study plan.'
        );

      statusEl
        .querySelector('.nxm-retry')
        ?.addEventListener(
          'click',
          () => generatePlan(container)
        );
    }
  }

  function renderResults(container) {
    const resultsEl =
      container.querySelector('#nxs-results');

    const r = state.lastResult;

    if (!r) return;

    const today = getLocalDateString();

    const examTime = new Date(
      `${r.examDate}T00:00:00`
    );

    const todayTime = new Date(
      `${today}T00:00:00`
    );

    const daysRemaining = Math.max(
      0,
      Math.ceil(
        (examTime - todayTime) /
        86400000
      )
    );

    const total = r.tasks.length;

    const done =
      r.tasks.filter(
        (t) => t.status === 'completed'
      ).length;

    const completion =
      total
        ? Math.round((done / total) * 100)
        : 0;

    resultsEl.innerHTML = `
      <div class="nxs-overview">

        <div>
          <span>Subject</span>
          <strong>
            ${escapeHtml(r.subject)}
          </strong>
        </div>

        <div>
          <span>Exam date</span>
          <strong>
            ${formatDate(r.examDate)}
          </strong>
        </div>

        <div>
          <span>Days remaining</span>
          <strong>
            ${daysRemaining}
          </strong>
        </div>

        <div>
          <span>Plan completion</span>
          <strong>
            ${completion}%
          </strong>
        </div>

      </div>

      <div class="nxs-tabs">

        <button
          type="button"
          data-tab="today"
          class="${state.tab === 'today'
            ? 'nxs-tab-active'
            : ''}"
        >
          Today
        </button>

        <button
          type="button"
          data-tab="all"
          class="${state.tab === 'all'
            ? 'nxs-tab-active'
            : ''}"
        >
          Timeline
        </button>

      </div>

      <div
        class="nxs-tasklist"
        id="nxs-tasklist"
      ></div>
    `;

    resultsEl
      .querySelector('.nxs-tabs')
      .addEventListener('click', (e) => {
        const btn =
          e.target.closest('[data-tab]');

        if (!btn) return;

        state.tab = btn.dataset.tab;

        renderResults(container);
      });

    renderTaskList(container);
  }

  function renderTaskList(container) {
    const listEl =
      container.querySelector('#nxs-tasklist');

    if (!listEl) return;

    const today = getLocalDateString();

    const tasks =
      state.tab === 'today'
        ? state.lastResult.tasks.filter(
            (t) => t.date === today
          )
        : state.lastResult.tasks;

    if (tasks.length === 0) {
      listEl.innerHTML =
        emptyBlock(
          state.tab === 'today'
            ? 'Nothing scheduled for today'
            : 'No tasks yet',

          state.tab === 'today'
            ? 'Check the Timeline tab to see the full plan.'
            : ''
        );

      return;
    }

    listEl.innerHTML =
      tasks
        .map(
          (t) => `
            <div
              class="nxs-task
                ${t.status === 'completed'
                  ? 'nxs-task-completed'
                  : ''}"
              data-task-id="${escapeHtml(t.taskId)}"
            >

              <label>
                <input
                  type="checkbox"
                  ${t.status === 'completed'
                    ? 'checked'
                    : ''}
                >
              </label>

              <div>
                <strong>
                  ${escapeHtml(t.topic)}
                </strong>

                <small>
                  ${escapeHtml(t.subtopic || '')}
                  ·
                  ${t.durationMinutes} min
                </small>
              </div>

              <span
                class="nxs-priority
                  nxs-priority-${t.priority}"
              >
                ${t.priority}
              </span>

              <span class="nxs-date">
                ${formatDate(t.date)}
              </span>

            </div>
          `
        )
        .join('');

    listEl
      .querySelectorAll(
        'input[type="checkbox"]'
      )
      .forEach((cb) => {
        cb.addEventListener(
          'change',
          async (e) => {
            const row =
              e.target.closest('.nxs-task');

            const taskId =
              row.dataset.taskId;

            const status =
              e.target.checked
                ? 'completed'
                : 'pending';

            try {
              await api(
                `/api/tasks/${taskId}`,
                {
                  method: 'PATCH',
                  body: JSON.stringify({
                    status
                  })
                }
              );

              const task =
                state.lastResult.tasks.find(
                  (t) =>
                    t.taskId === taskId
                );

              if (task) {
                task.status = status;
              }

              renderResults(container);
            } catch (err) {
              e.target.checked =
                !e.target.checked;

              toast(
                err.message ||
                'Could not update task.'
              );
            }
          }
        );
      });
  }

  window.NexoraSchedule = {
    mount
  };
})();