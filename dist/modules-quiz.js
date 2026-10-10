/**
 * modules-quiz.js — NoteToQuiz.
 * Exposes window.NexoraQuiz.mount(container).
 */
(function () {
  const { api, icon, toast, escapeHtml, takeActiveMaterial, loadingBlock, errorBlock, emptyBlock } = window.NexoraShared;

  const state = {
    materials: [],
    quiz: null, // { quizId, questions: [...] } (answers stripped until submitted)
    questionType: 'mcq',
    answers: [],
    currentIndex: 0,
    startedAt: null,
    lastAttempt: null, // { score, percentage, results, questions }
  };

  async function mount(container) {
    if (!container) return;
    container.innerHTML = loadingBlock('Loading Vault materials…');
    try {
      state.materials = await api('/api/materials');
    } catch (err) {
      container.innerHTML = errorBlock(err.message || 'Could not load Vault materials.');
      container.querySelector('.nxm-retry')?.addEventListener('click', () => mount(container));
      return;
    }
    const preselect = takeActiveMaterial();
    renderConfig(container, preselect);
  }

  function renderConfig(container, preselectId) {
    if (state.materials.length === 0) {
      container.innerHTML = emptyBlock('No materials in Vault yet', 'Upload notes or slides in Vault first, then generate a quiz from them here.');
      return;
    }
    container.innerHTML = `
      <div class="nxq-config">
        <label class="nxm-field" style="grid-column:span 2">Material
          <select id="nxq-material">
            ${state.materials.map((m) => `<option value="${escapeHtml(m.materialId)}" ${m.materialId === preselectId ? 'selected' : ''}>${escapeHtml(m.filename)} · ${escapeHtml(m.subject)}</option>`).join('')}
          </select>
        </label>
        <label class="nxm-field">Topic (optional)
          <input type="text" id="nxq-topic" placeholder="All topics">
        </label>
        <label class="nxm-field">Question type
          <select id="nxq-type">
            <option value="mcq">MCQ</option>
            <option value="short_answer">Short Answer</option>
            <option value="term_check">Term Check</option>
          </select>
        </label>
        <label class="nxm-field">Difficulty
          <select id="nxq-difficulty">
            <option value="easy">Easy</option>
            <option value="medium" selected>Medium</option>
            <option value="hard">Hard</option>
          </select>
        </label>
        <label class="nxm-field">Number of questions
          <select id="nxq-count">
            <option>5</option><option selected>10</option><option>15</option><option>20</option>
          </select>
        </label>
        <div class="nxq-generate-row">
          <button type="button" class="nx-primary-button" id="nxq-generate">${icon('quiz')}<span>Generate Quiz</span></button>
        </div>
      </div>
      <div id="nxq-status"></div>
      <div id="nxq-play"></div>
    `;
    container.querySelector('#nxq-generate').addEventListener('click', () => generateQuiz(container));
  }

  async function generateQuiz(container) {
    const materialId = container.querySelector('#nxq-material').value;
    const topic = container.querySelector('#nxq-topic').value.trim() || 'All';
    const questionType = container.querySelector('#nxq-type').value;
    const difficulty = container.querySelector('#nxq-difficulty').value;
    const questionCount = Number(container.querySelector('#nxq-count').value);

    const statusEl = container.querySelector('#nxq-status');
    const playEl = container.querySelector('#nxq-play');
    playEl.innerHTML = '';

    const stages = ['Reading notes…', 'Finding concepts…', 'Generating questions…', 'Validating quiz…'];
    let stageIdx = 0;
    statusEl.innerHTML = loadingBlock(stages[0]);
    const stageTimer = setInterval(() => {
      stageIdx = Math.min(stageIdx + 1, stages.length - 1);
      statusEl.innerHTML = loadingBlock(stages[stageIdx]);
    }, 1400);

    try {
      const quiz = await api('/api/quizzes/generate', {
        method: 'POST',
        body: JSON.stringify({ materialId, topic, questionType, difficulty, questionCount }),
      });
      clearInterval(stageTimer);
      statusEl.innerHTML = '';

      state.quiz = quiz;
      state.questionType = questionType;
      state.answers = new Array(quiz.questions.length).fill(null);
      state.currentIndex = 0;
      state.startedAt = Date.now();
      state.lastAttempt = null;

      renderQuestion(container);
    } catch (err) {
      clearInterval(stageTimer);
      statusEl.innerHTML = errorBlock(err.message || 'Quiz generation failed.');
      statusEl.querySelector('.nxm-retry')?.addEventListener('click', () => generateQuiz(container));
    }
  }

  function renderQuestion(container) {
    const playEl = container.querySelector('#nxq-play');
    const { quiz, questionType, currentIndex, answers } = state;
    const q = quiz.questions[currentIndex];
    const total = quiz.questions.length;
    const isLast = currentIndex === total - 1;

    let bodyHtml = '';
    if (questionType === 'mcq') {
      bodyHtml = `
        <h3 class="nxq-question">${escapeHtml(q.question)}</h3>
        <div class="nxq-options" id="nxq-options">
          ${q.options
            .map(
              (opt, i) => `<button type="button" class="nxq-option ${answers[currentIndex] === i ? 'nxq-option-selected' : ''}" data-choice="${i}">${escapeHtml(opt)}</button>`
            )
            .join('')}
        </div>`;
    } else if (questionType === 'short_answer') {
      bodyHtml = `
        <h3 class="nxq-question">${escapeHtml(q.question)}</h3>
        <textarea class="nxm-field" id="nxq-text-answer" placeholder="Type your answer…">${escapeHtml(answers[currentIndex] || '')}</textarea>`;
    } else {
      bodyHtml = `
        <h3 class="nxq-question">Define: ${escapeHtml(q.term)}</h3>
        <textarea class="nxm-field" id="nxq-text-answer" placeholder="Type the definition…">${escapeHtml(answers[currentIndex] || '')}</textarea>`;
    }

    playEl.innerHTML = `
      <div class="nxq-progress"><span>Question ${currentIndex + 1} of ${total}</span><span>${escapeHtml(quiz.title || '')}</span></div>
      <div class="nxq-card">
        ${bodyHtml}
        <div class="nxq-nav">
          <button type="button" class="nx-secondary-button" id="nxq-prev" ${currentIndex === 0 ? 'disabled' : ''}>Back</button>
          <button type="button" class="nx-primary-button" id="nxq-next">${isLast ? 'Submit quiz' : 'Next question'}</button>
        </div>
      </div>
    `;

    if (questionType === 'mcq') {
      playEl.querySelector('#nxq-options').addEventListener('click', (e) => {
        const btn = e.target.closest('[data-choice]');
        if (!btn) return;
        state.answers[currentIndex] = Number(btn.dataset.choice);
        renderQuestion(container);
      });
    } else {
      playEl.querySelector('#nxq-text-answer').addEventListener('input', (e) => {
        state.answers[currentIndex] = e.target.value;
      });
    }

    playEl.querySelector('#nxq-prev').addEventListener('click', () => {
      state.currentIndex = Math.max(0, currentIndex - 1);
      renderQuestion(container);
    });
    playEl.querySelector('#nxq-next').addEventListener('click', () => {
      if (isLast) {
        submitQuiz(container);
      } else {
        state.currentIndex = Math.min(total - 1, currentIndex + 1);
        renderQuestion(container);
      }
    });
  }

  async function submitQuiz(container) {
    const playEl = container.querySelector('#nxq-play');
    playEl.innerHTML = loadingBlock('Grading your answers…');
    const timeTakenSec = Math.round((Date.now() - state.startedAt) / 1000);

    try {
      const attempt = await api(`/api/quizzes/${state.quiz.quizId}/attempt`, {
        method: 'POST',
        body: JSON.stringify({ answers: state.answers, timeTakenSec }),
      });
      state.lastAttempt = attempt;
      try {
        const stored = JSON.parse(localStorage.getItem('nexora-quiz-attempts') || '[]');
        const attempts = Array.isArray(stored) ? stored : [];
        attempts.push({
          completedAt: new Date().toISOString(),
          score: Number(attempt.score) || 0,
          total: Number(attempt.totalQuestions) || 0,
          topic: state.quiz.topic || 'All',
        });
        localStorage.setItem('nexora-quiz-attempts', JSON.stringify(attempts.slice(-500)));
      } catch (_) {}
      window.dispatchEvent(new CustomEvent('nexora:quiz-completed', { detail: attempt }));
      renderResults(container);
    } catch (err) {
      playEl.innerHTML = errorBlock(err.message || 'Could not submit quiz.');
      playEl.querySelector('.nxm-retry')?.addEventListener('click', () => submitQuiz(container));
    }
  }

  function renderResults(container) {
    const playEl = container.querySelector('#nxq-play');
    const a = state.lastAttempt;
    const minutes = Math.floor((a.timeTakenSec || 0) / 60);
    const seconds = (a.timeTakenSec || 0) % 60;

    const reviewHtml = a.questions
      .map((q, i) => {
        const r = a.results[i];
        const label = state.questionType === 'term_check' ? q.term : q.question;
        const yourAnswer =
          state.questionType === 'mcq'
            ? r.given !== null ? q.options[r.given] : '(no answer)'
            : r.given || '(no answer)';
        const correctAnswer =
          state.questionType === 'mcq' ? q.options[q.correctAnswer] : q.expectedAnswer || q.expectedDefinition;

        return `
        <div class="nxq-review-item">
          <span class="nxq-review-tag ${r.correct ? 'nxq-review-tag-correct' : 'nxq-review-tag-incorrect'}">${r.correct ? 'Correct' : 'Incorrect'}</span>
          <strong>${escapeHtml(label)}</strong>
          <p style="margin:8px 0 0;font-size:13px;color:var(--nx-muted)">Your answer: ${escapeHtml(yourAnswer)}</p>
          ${!r.correct ? `<p style="margin:4px 0 0;font-size:13px;color:var(--nx-text)">Correct answer: ${escapeHtml(correctAnswer)}</p>` : ''}
          ${q.explanation ? `<p style="margin:4px 0 0;font-size:12px;color:var(--nx-subtle)">${escapeHtml(q.explanation)}</p>` : ''}
        </div>`;
      })
      .join('');

    playEl.innerHTML = `
      <div class="nxq-card">
        <p class="nx-kicker">Quiz complete</p>
        <div class="nxq-results-score">
          <div><strong>${a.score} / ${a.totalQuestions}</strong><br><span>Score</span></div>
          <div><strong>${a.percentage}%</strong><br><span>Accuracy</span></div>
          <div><strong>${minutes}m ${seconds}s</strong><br><span>Time taken</span></div>
        </div>
        <div class="nxq-review">${reviewHtml}</div>
        <div class="nxq-actions-row">
          <button type="button" class="nx-primary-button" id="nxq-generate-another">${icon('quiz')}<span>Generate Another Quiz</span></button>
          <button type="button" class="nx-secondary-button" id="nxq-review-material">Review Material</button>
          <button type="button" class="nx-secondary-button" id="nxq-ask-ai">Ask AI</button>
        </div>
      </div>
    `;

    playEl.querySelector('#nxq-generate-another').addEventListener('click', () => mount(container));
    playEl.querySelector('#nxq-review-material').addEventListener('click', () => {
      window.open(`${window.NexoraShared.API_BASE}/api/materials/${state.quiz.materialId}/file`, '_blank');
    });
    playEl.querySelector('#nxq-ask-ai').addEventListener('click', () => {
      window.NexoraShared.setActiveMaterial(state.quiz.materialId);
      location.hash = '#assistant';
    });
  }

  window.NexoraQuiz = { mount };
})();
