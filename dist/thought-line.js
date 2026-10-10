/* Vanilla-JS ThoughtLine for Nexora's static dashboard (no React runtime). */
(function () {
  function formatTime(seconds) {
    return seconds < 60
      ? `${seconds.toFixed(1)}s`
      : `${Math.floor(seconds / 60)}m ${(seconds % 60).toFixed(1)}s`;
  }

  function create({
    label = 'Thinking…',
    doneLabel = 'Thought for',
    steps = [],
    glyph = 'sparkle',
    showTimer = true,
    collapsible = true,
    collapseOnSettle = true,
    fontSize = 13,
    breathPeriod = 1.6,
    breathDepth = 0.45,
    settleDuration = 350,
    settleBlur = 2,
    elapsed: controlledElapsed,
    onSettle,
  } = {}) {
    const root = document.createElement('div');
    root.className = 'thought-line';
    root.style.setProperty('--tl-font', `${fontSize}px`);
    root.style.setProperty('--tl-color', 'currentColor');
    root.style.setProperty('--tl-glyph', 'var(--nx-accent)');
    root.style.setProperty('--tl-settle', `${settleDuration}ms`);
    root.style.setProperty('--tl-blur', `${settleBlur}px`);
    root.style.setProperty('--tl-shimmer', '1.8s');
    root.style.setProperty('--tl-breath-period', `${breathPeriod}s`);
    root.style.setProperty('--tl-breath-depth', String(breathDepth));

    const glyphNode = document.createElement('span');
    glyphNode.className = 'thought-line__glyph';
    glyphNode.setAttribute('aria-hidden', 'true');
    if (glyph === 'sparkle') {
      glyphNode.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.5 14.3 9.7 21.5 12l-7.2 2.3L12 21.5l-2.3-7.2L2.5 12l7.2-2.3L12 2.5Z"/><path d="m19 2 .7 2.3L22 5l-2.3.7L19 8l-.7-2.3L16 5l2.3-.7L19 2Z"/></svg>';
    } else if (glyph === 'dot') {
      const dot = document.createElement('span');
      dot.className = 'thought-line__dot';
      glyphNode.append(dot);
    } else if (glyph !== 'none' && glyph instanceof Node) {
      glyphNode.append(glyph.cloneNode(true));
    }

    const labelStack = document.createElement('span');
    labelStack.className = 'thought-line__label';
    const workText = document.createElement('span');
    workText.className = 'thought-line__text';
    const breath = document.createElement('span');
    breath.className = 'thought-line__breath';
    breath.textContent = label;
    workText.append(breath);
    const doneText = document.createElement('span');
    doneText.className = 'thought-line__text thought-line__text--done';
    doneText.textContent = doneLabel || (showTimer ? 'Thought for' : 'Done thinking');
    labelStack.append(workText, doneText);

    const timer = document.createElement('span');
    timer.className = 'thought-line__timer';
    timer.setAttribute('aria-hidden', 'true');
    if (!showTimer) timer.hidden = true;

    const chevron = document.createElement('span');
    chevron.className = 'thought-line__chevron';
    chevron.setAttribute('aria-hidden', 'true');
    chevron.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';

    const screenReader = document.createElement('span');
    screenReader.className = 'thought-line__sr';
    screenReader.setAttribute('role', 'status');

    const head = document.createElement(collapsible ? 'button' : 'div');
    head.className = 'thought-line__head';
    if (collapsible) {
      head.type = 'button';
      head.setAttribute('aria-expanded', 'true');
    }
    head.append(glyphNode, labelStack, timer, chevron, screenReader);
    root.append(head);

    const trace = document.createElement('div');
    trace.className = 'thought-line__trace';
    const fold = document.createElement('div');
    fold.className = 'thought-line__fold';
    const list = document.createElement('div');
    list.className = 'thought-line__steps';
    fold.append(list);
    trace.append(fold);
    root.append(trace);

    let currentSteps = [...steps];
    let working = true;
    let open = true;
    let startedAt = performance.now();
    let elapsed = Number.isFinite(controlledElapsed) ? controlledElapsed : 0;
    let timerId = null;

    function paintTime() {
      elapsed = Number.isFinite(controlledElapsed)
        ? controlledElapsed
        : Math.max(0, (performance.now() - startedAt) / 1000);
      timer.textContent = formatTime(elapsed);
    }

    function renderSteps() {
      list.replaceChildren();
      currentSteps.forEach((text, index) => {
        const row = document.createElement('div');
        row.className = 'thought-line__step';
        const complete = !working || index < currentSteps.length - 1;
        if (complete) row.dataset.done = '';
        const mark = document.createElement('span');
        mark.className = 'thought-line__mark';
        mark.setAttribute('aria-hidden', 'true');
        if (complete) {
          mark.innerHTML = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m3 8 3.2 3.2L13 4.5"/></svg>';
        } else {
          const pulse = document.createElement('i');
          pulse.className = 'thought-line__pulse';
          mark.append(pulse);
        }
        const copy = document.createElement('span');
        copy.className = 'thought-line__step-text';
        copy.textContent = text;
        row.append(mark, copy);
        list.append(row);
      });
      const hasTrace = currentSteps.length > 0;
      trace.hidden = !hasTrace;
      chevron.dataset.on = hasTrace && collapsible ? '' : undefined;
      if (collapsible) {
        head.setAttribute('aria-expanded', String(open && hasTrace));
        trace.toggleAttribute('data-open', open && hasTrace);
        trace.setAttribute('aria-hidden', String(!open || !hasTrace));
        root.toggleAttribute('data-open', open && hasTrace);
        head.toggleAttribute('data-toggle', hasTrace);
        head.tabIndex = hasTrace ? 0 : -1;
      }
    }

    function setWorking(nextWorking) {
      const next = Boolean(nextWorking);
      if (next === working) return;
      working = next;
      if (timerId) window.clearInterval(timerId);
      timerId = null;
      if (working) {
        startedAt = performance.now();
        elapsed = 0;
        if (collapsible) open = true;
        root.dataset.working = '';
        breath.dataset.shimmer = '';
        workText.dataset.active = '';
        doneText.removeAttribute('data-active');
        timer.removeAttribute('data-done');
        screenReader.textContent = label;
        paintTime();
        if (!Number.isFinite(controlledElapsed) && showTimer) timerId = window.setInterval(paintTime, 100);
      } else {
        paintTime();
        delete root.dataset.working;
        breath.removeAttribute('data-shimmer');
        workText.removeAttribute('data-active');
        doneText.dataset.active = '';
        timer.dataset.done = '';
        if (collapseOnSettle && collapsible) open = false;
        screenReader.textContent = showTimer ? `${doneText.textContent} ${formatTime(elapsed)}` : doneText.textContent;
        if (typeof onSettle === 'function') onSettle(elapsed);
      }
      renderSteps();
    }

    function setSteps(nextSteps) {
      currentSteps = Array.isArray(nextSteps) ? [...nextSteps] : [];
      renderSteps();
    }

    if (collapsible) {
      head.addEventListener('click', () => {
        if (!currentSteps.length) return;
        open = !open;
        renderSteps();
      });
    }
    root.dataset.working = '';
    breath.dataset.shimmer = '';
    workText.dataset.active = '';
    doneText.removeAttribute('data-active');
    screenReader.textContent = label;
    if (!Number.isFinite(controlledElapsed) && showTimer) timerId = window.setInterval(paintTime, 100);
    paintTime();
    renderSteps();

    return {
      element: root,
      setWorking,
      setSteps,
      getElapsed: () => Number.isFinite(controlledElapsed) ? controlledElapsed : Math.max(0, (performance.now() - startedAt) / 1000),
    };
  }

  window.NexoraThoughtLine = { create };
})();
