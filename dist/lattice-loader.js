/* Small vanilla-JS adaptation of React Bits' LatticeLoader for Nexora's static UI. */
(function () {
  const ORBIT = [0, 1, 2, 7, null, 3, 6, 5, 4];
  const MARKS = {
    done: [2, 3, 5, 7],
    error: [0, 2, 4, 6, 8],
  };

  function formatTime(seconds) {
    return seconds < 60
      ? `${seconds.toFixed(1)}s`
      : `${Math.floor(seconds / 60)}m ${(seconds % 60).toFixed(1)}s`;
  }

  function create({ status = 'working', label = 'Thinking', doneLabel = 'Done in', errorLabel = 'Failed after' } = {}) {
    const root = document.createElement('span');
    root.className = 'lattice-loader';
    root.setAttribute('role', 'status');
    root.setAttribute('aria-live', 'polite');
    root.style.setProperty('--ll-n', '3');
    root.style.setProperty('--ll-cell', '7px');
    root.style.setProperty('--ll-gap', '3px');
    root.style.setProperty('--ll-font', '12px');
    root.style.setProperty('--ll-color', 'currentColor');
    root.style.setProperty('--ll-mark', '#22c55e');
    root.style.setProperty('--ll-mark-glow', '#22c55e');
    root.style.setProperty('--ll-idle', '.15');
    root.style.setProperty('--ll-cycle', '864ms');

    const grid = document.createElement('span');
    grid.className = 'lattice-loader__grid';
    grid.setAttribute('aria-hidden', 'true');
    const layers = ['lattice-loader__run', 'lattice-loader__mark'].map((className) => {
      const layer = document.createElement('span');
      layer.className = `lattice-loader__layer ${className}`;
      ORBIT.forEach((delay, index) => {
        const cell = document.createElement('span');
        cell.className = 'lattice-loader__cell';
        if (index === 4) cell.setAttribute('data-hole', '');
        if (layer.classList.contains('lattice-loader__run') && delay !== null) {
          cell.style.animationDelay = `${delay * 108}ms`;
        }
        layer.append(cell);
      });
      grid.append(layer);
      return layer;
    });

    const labelWrap = document.createElement('span');
    labelWrap.className = 'lattice-loader__label';
    const labels = [label, doneLabel, errorLabel].map((text, index) => {
      const item = document.createElement('span');
      item.className = 'lattice-loader__text';
      item.textContent = text;
      if (index === 0) item.setAttribute('data-active', '');
      labelWrap.append(item);
      return item;
    });
    const timer = document.createElement('span');
    timer.className = 'lattice-loader__timer';
    timer.setAttribute('aria-hidden', 'true');
    const screenReader = document.createElement('span');
    screenReader.className = 'lattice-loader__sr';
    root.append(grid, labelWrap, timer, screenReader);

    let startedAt = performance.now();
    let elapsed = 0;
    let timerId = null;

    function updateTimer() {
      elapsed = Math.max(0, (performance.now() - startedAt) / 1000);
      timer.textContent = formatTime(elapsed);
    }

    function setStatus(nextStatus, elapsedSeconds) {
      if (timerId) {
        clearInterval(timerId);
        timerId = null;
      }
      if (nextStatus === 'working') {
        startedAt = performance.now();
        elapsed = 0;
        updateTimer();
        timerId = window.setInterval(updateTimer, 100);
      } else if (Number.isFinite(elapsedSeconds)) {
        elapsed = Math.max(0, elapsedSeconds);
        timer.textContent = formatTime(elapsed);
      } else {
        updateTimer();
      }
      root.dataset.status = nextStatus;
      root.style.setProperty('--ll-mark', nextStatus === 'error' ? '#ef4444' : '#22c55e');
      root.style.setProperty('--ll-mark-glow', nextStatus === 'error' ? '#ef4444' : '#22c55e');
      layers[1].querySelectorAll('.lattice-loader__cell').forEach((cell, index) => {
        if (MARKS[nextStatus]?.includes(index)) cell.setAttribute('data-on', '');
        else cell.removeAttribute('data-on');
      });
      labels.forEach((item, index) => {
        if (index === (nextStatus === 'working' ? 0 : nextStatus === 'done' ? 1 : 2)) item.setAttribute('data-active', '');
        else item.removeAttribute('data-active');
      });
      screenReader.textContent = nextStatus === 'working'
        ? `${label}, in progress`
        : `${nextStatus === 'done' ? doneLabel : errorLabel} ${formatTime(elapsed)}`;
    }

    setStatus(status);
    return { element: root, setStatus };
  }

  window.NexoraLatticeLoader = { create };
})();
