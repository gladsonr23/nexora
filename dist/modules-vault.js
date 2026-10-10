/**
 * modules-vault.js — Vault / Central Library.
 * Exposes window.NexoraVault.mount(container) which the host app's
 * navigate() calls whenever the user is on the #vault route.
 */
(function () {
  const {
    api,
    icon,
    toast,
    escapeHtml,
    formatDate,
    setActiveMaterial,
    loadingBlock,
    errorBlock,
    emptyBlock
  } = window.NexoraShared;

  const CATEGORIES = [
    'All',
    'Syllabi',
    'Lecture Slides',
    'Notes',
    'Assignments',
    'PYQs',
    'Question Banks'
  ];

  const state = {
    search: '',
    category: 'All',
    pendingFile: null,
    uploadCategory: 'Syllabi',
  };

  function shell() {
    return `
      <div class="nxv-toolbar">
        <div class="nxv-search">
          <input
            type="search"
            id="nxv-search"
            placeholder="Search materials by filename, subject, or category"
            value="${escapeHtml(state.search)}"
          >
        </div>

        <button
          type="button"
          class="nx-primary-button"
          id="nxv-upload-btn"
        >
          ${icon('upload')}
          <span>Upload material</span>
        </button>

        <input
          type="file"
          id="nxv-file-input"
          accept="application/pdf,.pdf"
          hidden
        >
      </div>

      <div class="nxv-filters" id="nxv-filters"></div>

      <div id="nxv-upload-panel"></div>

      <div id="nxv-list">
        ${loadingBlock('Loading your Vault…')}
      </div>
    `;
  }

  async function mount(container) {
    if (!container) return;

    const previousFilter = container.querySelector('#nxv-filters');
    if (previousFilter && window.NexoraGlideSelect) {
      window.NexoraGlideSelect.unmount(previousFilter);
    }
    const previousUploadCategory = container.querySelector('#nxv-upload-category');
    if (previousUploadCategory && window.NexoraGlideSelect) {
      window.NexoraGlideSelect.unmount(previousUploadCategory);
    }

    container.innerHTML = shell();

    wireToolbar(container);

    await refreshList(container);
  }

  function wireToolbar(container) {
    const searchInput = container.querySelector('#nxv-search');
    const filterRoot = container.querySelector('#nxv-filters');

    window.NexoraGlideSelect.mount(filterRoot, {
      options: CATEGORIES.map((category) => ({ value: category, label: category })),
      defaultValue: state.category,
      ariaLabel: 'Filter Vault materials by category',
      showTags: false,
      accentColor: 'var(--nx-accent)',
      surfaceColor: 'var(--nx-surface)',
      highlightColor: 'var(--nx-accent-soft)',
      textColor: 'var(--nx-text)',
      size: 'lg',
      radius: 14,
      menuWidth: 216,
      placement: 'bottom',
      align: 'left',
      onChange: (category) => {
        state.category = category;
        refreshList(container);
      }
    });

    searchInput.addEventListener(
      'input',
      debounce((e) => {
        state.search = e.target.value;
        refreshList(container);
      }, 300)
    );

    container.querySelector('#nxv-upload-btn').addEventListener('click', () => {
      container.querySelector('#nxv-file-input').click();
    });

    container
      .querySelector('#nxv-file-input')
      .addEventListener('change', (e) => {
        const file = e.target.files[0];

        if (!file) return;

        if (
          file.type !== 'application/pdf' &&
          !file.name.toLowerCase().endsWith('.pdf')
        ) {
          toast('Only PDF files are supported.');
          e.target.value = '';
          return;
        }

        state.pendingFile = file;
        state.uploadCategory = 'Syllabi';

        renderUploadPanel(container);
      });
  }

  function renderUploadPanel(container) {
    const panel = container.querySelector('#nxv-upload-panel');
    const previousCategory = panel.querySelector('#nxv-upload-category');
    if (previousCategory) window.NexoraGlideSelect.unmount(previousCategory);

    if (!state.pendingFile) {
      panel.innerHTML = '';
      return;
    }

    panel.innerHTML = `
      <div class="nxv-upload-panel">

        <p
          style="
            grid-column:1/-1;
            margin:0;
            font-size:12px;
            color:var(--nx-muted)
          "
        >
          Uploading
          <strong>${escapeHtml(state.pendingFile.name)}</strong>
        </p>

        <label class="nxm-field">
          Subject

          <input
            type="text"
            id="nxv-upload-subject"
            placeholder="e.g. Operating Systems"
            maxlength="120"
          >
        </label>

        <label class="nxm-field nxv-upload-category-field">
          Category

          <span id="nxv-upload-category"></span>
        </label>

        <div class="nxv-upload-actions">
          <button
            type="button"
            class="nx-secondary-button"
            id="nxv-upload-cancel"
          >
            Cancel
          </button>

          <button
            type="button"
            class="nx-primary-button"
            id="nxv-upload-confirm"
          >
            ${icon('upload')}
            <span>Add to Vault</span>
          </button>
        </div>

      </div>
    `;

    const categoryRoot = panel.querySelector('#nxv-upload-category');
    window.NexoraGlideSelect.mount(categoryRoot, {
      options: CATEGORIES
        .filter((category) => category !== 'All')
        .map((category) => ({ value: category, label: category })),
      defaultValue: state.uploadCategory,
      ariaLabel: 'Choose a category for the uploaded material',
      showTags: false,
      accentColor: 'var(--nx-accent)',
      surfaceColor: 'var(--nx-surface)',
      highlightColor: 'var(--nx-accent-soft)',
      textColor: 'var(--nx-text)',
      size: 'lg',
      radius: 12,
      menuWidth: 216,
      placement: 'bottom',
      align: 'left',
      onChange: (category) => {
        state.uploadCategory = category;
      }
    });

    panel
      .querySelector('#nxv-upload-cancel')
      .addEventListener('click', () => {
        state.pendingFile = null;

        container.querySelector('#nxv-file-input').value = '';

        renderUploadPanel(container);
      });

    panel
      .querySelector('#nxv-upload-confirm')
      .addEventListener('click', () => {
        doUpload(container);
      });
  }

  async function doUpload(container) {
    const panel = container.querySelector('#nxv-upload-panel');

    const subject =
      container
        .querySelector('#nxv-upload-subject')
        .value
        .trim() || 'General';

    const category = state.uploadCategory;

    const file = state.pendingFile;

    if (!file) return;

    const categoryRoot = panel.querySelector('#nxv-upload-category');
    if (categoryRoot) window.NexoraGlideSelect.unmount(categoryRoot);
    panel.innerHTML = loadingBlock('Uploading PDF…');

    const form = new FormData();

    form.append('file', file);
    form.append('subject', subject);
    form.append('category', category);

    try {
      panel.innerHTML = loadingBlock('Extracting text…');

      const material = await api('/api/materials', {
        method: 'POST',
        body: form
      });

      panel.innerHTML = loadingBlock('Indexing…');

      state.pendingFile = null;

      container.querySelector('#nxv-file-input').value = '';

      panel.innerHTML = '';

      if (material.extractionStatus === 'needs_ocr') {
        toast(
          'Uploaded, but this PDF appears to be scanned — text extraction may be incomplete.'
        );
      } else if (material.extractionStatus === 'failed') {
        toast(
          'Uploaded, but text extraction failed. The file is still viewable.'
        );
      } else {
        toast(`${material.filename} added to Vault.`);
      }

      /*
       * Refresh the Vault immediately after upload.
       *
       * The timestamp prevents the browser from reusing a cached
       * GET /api/materials response.
       */
      await refreshList(container);

    } catch (err) {
      const authNeeded = err.code === 'AUTH_REQUIRED';

      panel.innerHTML = errorBlock(
        err.message || 'Upload failed.',
        authNeeded ? 'Sign in' : 'Try again'
      );

      panel
        .querySelector('.nxm-retry')
        ?.addEventListener('click', () => (
          authNeeded ? window.NexoraAuth?.signIn() : doUpload(container)
        ));
    }
  }

  async function refreshList(container) {
    const listEl = container.querySelector('#nxv-list');

    if (!listEl) return;

    listEl.innerHTML = loadingBlock('Loading your Vault…');

    try {
      const params = new URLSearchParams();

      if (state.search) {
        params.set('search', state.search);
      }

      if (state.category !== 'All') {
        params.set('category', state.category);
      }

      /*
       * Cache-buster.
       *
       * This ensures that after uploading/editing/deleting/OCR,
       * the browser requests the latest material list from the API.
       */
      params.set('_', Date.now().toString());

      const materials = await api(
        `/api/materials?${params.toString()}`
      );

      if (!Array.isArray(materials) || materials.length === 0) {
        listEl.innerHTML = emptyBlock(
          'No materials yet',
          state.search || state.category !== 'All'
            ? 'Nothing matches your search or filter. Try clearing them.'
            : 'Upload a syllabus, lecture slides, or notes to get started.'
        );

        return;
      }

      listEl.innerHTML = `
        <div class="nxv-list">
          ${materials.map(renderRow).join('')}
        </div>
      `;

      wireRowActions(container, listEl);

    } catch (err) {
      /*
       * Signed out (HTTP 401): offer "Sign in" instead of a pointless retry.
       * Once the user signs in, clerk-auth.js re-mounts the Vault automatically.
       */
      const authNeeded = err.code === 'AUTH_REQUIRED';

      listEl.innerHTML = errorBlock(
        err.message || 'Could not load Vault materials.',
        authNeeded ? 'Sign in' : 'Try again'
      );

      listEl
        .querySelector('.nxm-retry')
        ?.addEventListener('click', () => (
          authNeeded ? window.NexoraAuth?.signIn() : refreshList(container)
        ));
    }
  }

  function statusBadge(m) {
    if (m.extractionStatus === 'needs_ocr') {
      return `
        <span class="nxm-badge nxm-badge-warn">
          Needs OCR
        </span>
      `;
    }

    if (m.extractionStatus === 'failed') {
      return `
        <span class="nxm-badge nxm-badge-warn">
          Failed
        </span>
      `;
    }

    if (
      m.extractionStatus === 'complete' &&
      m.indexingStatus === 'ready'
    ) {
      return `
        <span class="nxm-badge">
          Ready
        </span>
      `;
    }

    return `
      <span class="nxm-badge nxm-badge-muted">
        Processing…
      </span>
    `;
  }

  function renderRow(m) {
    const needsOcr = m.extractionStatus === 'needs_ocr';

    return `
      <div
        class="nxv-row"
        data-id="${escapeHtml(m.materialId)}"
      >

        <span class="nxv-row-icon">
          ${icon('vault')}
        </span>

        <div class="nxv-row-main">

          <strong>
            ${escapeHtml(m.filename)}
          </strong>

          <small>
            <span>${escapeHtml(m.subject || 'General')}</span>
            ·
            <span>${escapeHtml(m.category || 'Notes')}</span>
            ·
            <span>${m.pages || 0} pages</span>
            ·
            <span>${formatDate(m.createdAt)}</span>
            ·
            ${statusBadge(m)}
          </small>

        </div>

        <div class="nxv-row-actions">

          <button
            type="button"
            data-action="open"
          >
            Open
          </button>

          <button
            type="button"
            data-action="edit"
          >
            Edit
          </button>

          ${
            needsOcr
              ? `
                <button
                  type="button"
                  data-action="ocr"
                  class="nx-primary-button"
                >
                  Run OCR
                </button>
              `
              : ''
          }

          <button
            type="button"
            data-action="quiz"
          >
            Generate Quiz
          </button>

          <button
            type="button"
            data-action="schedule"
          >
            Create Study Plan
          </button>

          <button
            type="button"
            data-action="delete"
            class="nxv-danger"
          >
            Delete
          </button>

        </div>

      </div>
    `;
  }

  function renderEditRow(row, material) {
    row.innerHTML = `
      <span class="nxv-row-icon">
        ${icon('vault')}
      </span>

      <div
        class="nxv-row-main"
        style="display:flex;flex-direction:column;gap:8px;"
      >

        <strong>
          ${escapeHtml(material.filename)}
        </strong>

        <div
          style="
            display:grid;
            grid-template-columns:minmax(180px,1fr) minmax(160px,220px);
            gap:10px;
            align-items:end;
          "
        >

          <label class="nxm-field">
            Subject

            <input
              type="text"
              data-edit-subject
              value="${escapeHtml(material.subject || 'General')}"
              maxlength="120"
            >
          </label>

          <label class="nxm-field">
            Category

            <select data-edit-category>
              ${CATEGORIES
                .filter((c) => c !== 'All')
                .map(
                  (c) => `
                    <option
                      value="${escapeHtml(c)}"
                      ${c === material.category ? 'selected' : ''}
                    >
                      ${escapeHtml(c)}
                    </option>
                  `
                )
                .join('')}
            </select>
          </label>

        </div>

      </div>

      <div class="nxv-row-actions">

        <button
          type="button"
          data-action="save-edit"
          class="nx-primary-button"
        >
          Save
        </button>

        <button
          type="button"
          data-action="cancel-edit"
          class="nx-secondary-button"
        >
          Cancel
        </button>

      </div>
    `;
  }

  async function saveEdit(container, row, materialId) {
    const subjectInput = row.querySelector('[data-edit-subject]');
    const categoryInput = row.querySelector('[data-edit-category]');

    const subject =
      subjectInput?.value.trim() || 'General';

    const category =
      categoryInput?.value || 'Notes';

    const saveButton = row.querySelector('[data-action="save-edit"]');

    if (saveButton) {
      saveButton.disabled = true;
      saveButton.textContent = 'Saving…';
    }

    try {
      await api(`/api/materials/${materialId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subject,
          category
        })
      });

      toast('Material updated.');

      /*
       * Refresh using a fresh GET request so the edited
       * metadata is immediately visible.
       */
      await refreshList(container);

    } catch (err) {
      toast(
        err.message || 'Could not update material.'
      );

      if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent = 'Save';
      }
    }
  }

  async function runOCR(container, row, materialId) {
    const button = row.querySelector('[data-action="ocr"]');
    if (!button) return;

    if (window.NexoraOCR?.isRunning(materialId)) {
      toast('OCR is already running for this material.');
      return;
    }

    const originalLabel = button.textContent;
    button.disabled = true;
    button.textContent = 'Starting OCR…';

    try {
      if (!window.NexoraOCR) {
        throw new Error('OCR module did not load. Check that ocr.js, pdf.js, and tesseract.js are included in index.html.');
      }

      /*
       * OCR runs entirely in the browser:
       *   PDF -> PDF.js renders each page to a canvas -> Tesseract.js
       *   recognizes that canvas -> text is accumulated with page markers.
       * The backend only receives and saves the final text — it never
       * runs OCR itself (no Gemini involved in this step).
       */
      const updated = await window.NexoraOCR.run(materialId, (progress) => {
        button.textContent = progress.message || 'Running OCR…';
      });

      toast(
        updated.extractionStatus === 'complete'
          ? 'OCR completed successfully.'
          : 'OCR finished, but the result still needs review.'
      );

      await refreshList(container);
    } catch (err) {
      console.error('[Vault] OCR failed:', err);
      toast(err.message || 'OCR failed. Please try again.');
      button.disabled = false;
      button.textContent = originalLabel;
    }
  }

  function wireRowActions(container, listEl) {
    listEl.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-action]');

      if (!btn) return;

      const row = btn.closest('.nxv-row');

      if (!row) return;

      const materialId = row.dataset.id;

      if (!materialId) return;

      const action = btn.dataset.action;

      /*
       * OCR
       */
      if (action === 'ocr') {
        await runOCR(container, row, materialId);
        return;
      }

      /*
       * OPEN
       */
      if (action === 'open') {
        /*
         * The file endpoint now requires the Clerk token, which a plain
         * window.open(url) can't send — so fetch with auth and open a blob URL.
         */
        try {
          await window.NexoraShared.openAuthenticatedFile(
            `/api/materials/${materialId}/file`
          );
        } catch (err) {
          toast(err.message || 'Could not open this file.');
        }

        return;
      }

      /*
       * EDIT
       */
      if (action === 'edit') {
        try {
          /*
           * Get the latest material data before opening
           * the edit form.
           */
          const material = await api(
            `/api/materials/${materialId}?_=${Date.now()}`
          );

          renderEditRow(row, material);

        } catch (err) {
          toast(
            err.message || 'Could not load material details.'
          );
        }

        return;
      }

      /*
       * SAVE EDIT
       */
      if (action === 'save-edit') {
        await saveEdit(container, row, materialId);
        return;
      }

      /*
       * CANCEL EDIT
       */
      if (action === 'cancel-edit') {
        await refreshList(container);
        return;
      }

      /*
       * GENERATE QUIZ
       */
      if (action === 'quiz') {
        setActiveMaterial(materialId);
        location.hash = '#quiz';

        return;
      }

      /*
       * CREATE STUDY PLAN
       */
      if (action === 'schedule') {
        setActiveMaterial(materialId);
        location.hash = '#schedule';

        return;
      }

      /*
       * DELETE
       */
      if (action === 'delete') {
        if (
          !confirm(
            'Delete this material from Vault? This cannot be undone.'
          )
        ) {
          return;
        }

        try {
          await api(`/api/materials/${materialId}`, {
            method: 'DELETE'
          });

          toast('Material deleted.');

          await refreshList(container);

        } catch (err) {
          toast(
            err.message || 'Could not delete material.'
          );
        }

        return;
      }
    });
  }

  function debounce(fn, ms) {
    let t;

    return (...args) => {
      clearTimeout(t);

      t = setTimeout(() => {
        fn(...args);
      }, ms);
    };
  }

  window.NexoraVault = {
    mount
  };
})();
