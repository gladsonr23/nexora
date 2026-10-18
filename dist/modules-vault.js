/**
 * Browser-local Vault UI adapted from Aishwarya's Vault component.
 * Files and metadata stay in this browser's IndexedDB; this module makes no API calls.
 */
(function () {
  const store = window.NexoraVaultFileStore;
  const { toast, escapeHtml, formatDate, icon } = window.NexoraShared || {};
  const categories = [
    'Syllabi',
    'Lecture Slides',
    'Notes',
    'Assignments',
    'PYQs',
    'Question Banks',
    'Other',
  ];
  const state = { search: '', category: 'All', pendingFiles: [] };

  const escape = value => typeof escapeHtml === 'function'
    ? escapeHtml(value)
    : String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const notify = message => typeof toast === 'function' ? toast(message) : console.info('[Vault]', message);
  const prettySize = value => value < 1024 ? `${value} B` : value < 1048576 ? `${Math.round(value / 1024)} KB` : `${(value / 1048576).toFixed(1)} MB`;
  const dateLabel = value => typeof formatDate === 'function' ? formatDate(value) : new Date(value).toLocaleDateString();

  function shell() {
    return `
      <div class="nxv-toolbar">
        <div class="nxv-search">
          <input type="search" id="nxv-search" placeholder="Search materials by filename, subject, or category" aria-label="Search Vault">
        </div>
        <div class="nxv-filter-control">
          <span>Category</span>
          <div id="nxv-filter-select"></div>
        </div>
        <button type="button" class="nx-primary-button" id="nxv-upload-btn">
          ${typeof icon === 'function' ? icon('upload') : '<span aria-hidden="true">＋</span>'}<span>Upload material</span>
        </button>
        <input type="file" id="nxv-file-input" accept="application/pdf,.pdf" multiple hidden>
      </div>
      <div id="nxv-upload-panel"></div>
      <div id="nxv-list" aria-live="polite"></div>
    `;
  }

  function renderCategorySelect(element, container) {
    const options = ['All', ...categories];
    const props = {
      options,
      value: state.category,
      showTags: false,
      ariaLabel: 'Filter Vault materials by category',
      size: 'lg',
      radius: 20,
      menuWidth: 230,
      accentColor: 'var(--nx-accent)',
      surfaceColor: 'var(--nx-surface)',
      highlightColor: 'var(--nx-accent-soft)',
      textColor: 'var(--nx-text)',
      onChange(value) {
        state.category = value;
        renderCategorySelect(element, container);
        refreshList(container);
      },
    };

    if (window.NexoraGlideSelect?.mount) {
      window.NexoraGlideSelect.mount(element, props);
      return;
    }

    element.innerHTML = `<select aria-label="Filter Vault materials by category">${options.map(option => `<option value="${escape(option)}" ${option === state.category ? 'selected' : ''}>${escape(option)}</option>`).join('')}</select>`;
    element.querySelector('select').addEventListener('change', event => {
      state.category = event.target.value;
      refreshList(container);
    });
  }

  function mount(container) {
    if (!container) return;
    if (!store) {
      container.innerHTML = '<div class="nxm-error"><p>Browser storage is unavailable, so the Vault could not be opened.</p></div>';
      return;
    }

    const previousCategorySelect = container.querySelector('#nxv-filter-select');
    if (previousCategorySelect) window.NexoraGlideSelect?.unmount?.(previousCategorySelect);
    container.innerHTML = shell();
    renderCategorySelect(container.querySelector('#nxv-filter-select'), container);
    const search = container.querySelector('#nxv-search');
    search.value = state.search;
    search.addEventListener('input', () => {
      state.search = search.value;
      refreshList(container);
    });

    container.querySelector('#nxv-upload-btn').addEventListener('click', () => container.querySelector('#nxv-file-input').click());
    container.querySelector('#nxv-file-input').addEventListener('change', event => {
      const selected = [...event.target.files];
      const invalid = selected.find(file => file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf'));
      if (invalid) {
        event.target.value = '';
        notify('Only PDF files are supported in the Vault.');
        return;
      }
      state.pendingFiles = selected;
      renderUploadPanel(container);
    });
    refreshList(container);
  }

  function renderUploadPanel(container) {
    const panel = container.querySelector('#nxv-upload-panel');
    if (!state.pendingFiles.length) {
      panel.innerHTML = '';
      return;
    }

    const names = state.pendingFiles.map(file => escape(file.name)).join(', ');
    panel.innerHTML = `
      <div class="nxv-upload-panel">
        <p class="nxv-upload-note">Selected: <strong>${names}</strong><br>Files are saved only in this browser and do not sync across devices.</p>
        <label class="nxm-field">Subject<input type="text" id="nxv-upload-subject" placeholder="e.g. Operating Systems" maxlength="120"></label>
        <label class="nxm-field">Category<select id="nxv-upload-category">${categories.map(category => `<option value="${escape(category)}" ${category === 'Notes' ? 'selected' : ''}>${escape(category)}</option>`).join('')}</select></label>
        <div class="nxv-upload-actions">
          <button type="button" class="nx-secondary-button" id="nxv-upload-cancel">Cancel</button>
          <button type="button" class="nx-primary-button" id="nxv-upload-confirm"><span>Add to Vault</span></button>
        </div>
      </div>
    `;

    panel.querySelector('#nxv-upload-cancel').addEventListener('click', () => {
      state.pendingFiles = [];
      container.querySelector('#nxv-file-input').value = '';
      renderUploadPanel(container);
    });
    panel.querySelector('#nxv-upload-confirm').addEventListener('click', async event => {
      const button = event.currentTarget;
      button.disabled = true;
      button.textContent = 'Saving…';
      try {
        const subject = panel.querySelector('#nxv-upload-subject').value.trim() || 'General';
        const category = panel.querySelector('#nxv-upload-category').value;
        await store.putMany(state.pendingFiles, { subject, category });
        const count = state.pendingFiles.length;
        state.pendingFiles = [];
        container.querySelector('#nxv-file-input').value = '';
        renderUploadPanel(container);
        notify(`${count} ${count === 1 ? 'file' : 'files'} saved to this browser’s Vault.`);
        await refreshList(container);
      } catch (error) {
        notify(error.message || 'Could not save these files.');
        button.disabled = false;
        button.textContent = 'Add to Vault';
      }
    });
  }

  async function refreshList(container) {
    const host = container.querySelector('#nxv-list');
    if (!host) return;
    host.querySelectorAll('.nxv-delete-control').forEach(element => window.NexoraHoldButton?.unmount(element));
    host.innerHTML = '<div class="nxm-loading"><p>Loading your Vault…</p></div>';

    try {
      const files = await store.list();
      const query = state.search.trim().toLowerCase();
      const filtered = files.filter(file => {
        const categoryMatch = state.category === 'All' || file.category === state.category;
        const searchMatch = !query || `${file.name} ${file.subject || ''} ${file.category || ''}`.toLowerCase().includes(query);
        return categoryMatch && searchMatch;
      });

      if (!filtered.length) {
        host.innerHTML = `
          <div class="nxm-empty">
            <h3>${files.length ? 'No matching materials' : 'No materials yet'}</h3>
            <p>${files.length ? 'Clear the search or choose another category.' : 'Upload a syllabus, lecture slides, or notes to get started.'}</p>
          </div>
        `;
        return;
      }

      host.innerHTML = `<div class="nxv-list">${filtered.map(renderRow).join('')}</div>`;
      wireRowActions(container, host);
      mountDeleteButtons(container, host);
    } catch (error) {
      host.innerHTML = `<div class="nxm-error"><p>${escape(error.message || 'Could not load Vault materials.')}</p></div>`;
    }
  }

  function renderRow(file) {
    return `
      <article class="nxv-row" data-file-id="${escape(file.id)}">
        <span class="nxv-row-icon" aria-hidden="true">▤</span>
        <div class="nxv-row-main">
          <strong>${escape(file.name)}</strong>
          <small><span>${escape(file.subject || 'General')}</span> · <span>${escape(file.category || 'Notes')}</span> · <span>${prettySize(file.size || 0)}</span> · <span>${escape(dateLabel(file.createdAt))}</span></small>
        </div>
        <div class="nxv-row-actions">
          <button type="button" data-action="open">Open</button>
          <button type="button" data-action="download">Download</button>
          <button type="button" data-action="edit">Edit</button>
          <span class="nxv-delete-control" data-delete-id="${escape(file.id)}"><button type="button" class="nxv-danger" data-action="delete">Delete</button></span>
        </div>
      </article>
    `;
  }

  function renderEditRow(row, file) {
    row.querySelectorAll('.nxv-delete-control').forEach(element => window.NexoraHoldButton?.unmount(element));
    row.innerHTML = `
      <span class="nxv-row-icon" aria-hidden="true">▤</span>
      <div class="nxv-row-main nxv-edit-fields">
        <strong>${escape(file.name)}</strong>
        <label class="nxm-field">Subject<input type="text" data-edit-subject maxlength="120" value="${escape(file.subject || 'General')}"></label>
        <label class="nxm-field">Category<select data-edit-category>${categories.map(category => `<option value="${escape(category)}" ${category === file.category ? 'selected' : ''}>${escape(category)}</option>`).join('')}</select></label>
      </div>
      <div class="nxv-row-actions"><button type="button" class="nx-primary-button" data-action="save-edit">Save</button><button type="button" data-action="cancel-edit">Cancel</button></div>
    `;
  }

  function mountDeleteButtons(container, host) {
    host.querySelectorAll('.nxv-delete-control').forEach(element => {
      const remove = async () => {
        try {
          await store.remove(element.dataset.deleteId);
          notify('Material deleted.');
          await refreshList(container);
        } catch (error) {
          notify(error.message || 'Could not delete this material.');
        }
      };

      if (!window.NexoraHoldButton?.mount) return;
      window.NexoraHoldButton.mount(element, {
        children: 'Hold to delete',
        doneLabel: 'Deleted',
        size: 'sm',
        radius: 7,
        holdTime: 1600,
        releaseTime: 180,
        fillDirection: 'right',
        backgroundColor: 'var(--nx-surface)',
        fillColor: 'var(--nx-error)',
        textColor: 'var(--nx-error)',
        fillTextColor: '#fff',
        wave: true,
        waveAmplitude: 3,
        glow: false,
        resetAfter: 0,
        onHold: remove,
      });
    });
  }

  function openFile(file, download) {
    if (!file.blob) throw new Error('This file is unavailable in browser storage.');
    const url = URL.createObjectURL(file.blob);
    if (download) {
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      link.click();
    } else {
      const opened = window.open(url, '_blank');
      if (opened) opened.opener = null;
      else notify('Allow pop-ups to preview the file.');
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  function wireRowActions(container, host) {
    host.addEventListener('click', async event => {
      const button = event.target.closest('[data-action]');
      const row = event.target.closest('[data-file-id]');
      if (!button || !row) return;
      const file = await store.get(row.dataset.fileId);
      if (!file) return;

      try {
        switch (button.dataset.action) {
          case 'open': openFile(file, false); break;
          case 'download': openFile(file, true); break;
          case 'edit': renderEditRow(row, file); break;
          case 'cancel-edit': await refreshList(container); break;
          case 'save-edit': {
            await store.update(file.id, {
              subject: row.querySelector('[data-edit-subject]').value.trim() || 'General',
              category: row.querySelector('[data-edit-category]').value,
            });
            notify('Material updated.');
            await refreshList(container);
            break;
          }
          case 'delete':
            if (!confirm(`Delete “${file.name}” from this browser’s Vault?`)) return;
            await store.remove(file.id);
            notify('Material deleted.');
            await refreshList(container);
            break;
        }
      } catch (error) {
        notify(error.message || 'Could not update this material.');
      }
    });
  }

  window.NexoraVault = { mount };
})();
