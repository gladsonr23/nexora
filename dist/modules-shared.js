/**
 * Nexora shared module helpers
 *
 * Handles:
 * - API requests
 * - Clerk authentication token
 * - shared icons/toasts
 * - Vault → Schedule/Quiz material handoff
 */

(function () {
  const API_BASE =
    window.NEXORA_API_BASE || 'http://localhost:4000';

  async function api(path, options = {}) {
    const isFormData = options.body instanceof FormData;

    const headers = new Headers(options.headers || {});

    // JSON requests need this header.
    // FormData must NOT get Content-Type manually because
    // the browser adds the multipart boundary automatically.
    if (!isFormData) {
      headers.set('Content-Type', 'application/json');
    }

    // Attach the Clerk session token.
    try {
      if (
        window.NexoraAuth &&
        typeof window.NexoraAuth.getToken === 'function'
      ) {
        const token = await window.NexoraAuth.getToken();

        if (token) {
          headers.set('Authorization', `Bearer ${token}`);
        }
      }
    } catch (err) {
      console.warn('[Nexora API] Could not get Clerk token:', err);
    }

    let res;

    try {
      res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
      });
    } catch (networkErr) {
      throw new Error(
        'Could not reach the Nexora server. Is it running?'
      );
    }

    let data = null;

    try {
      data = await res.json();
    } catch (_) {
      // Some endpoints may return an empty response.
    }

    if (!res.ok) {
      throw new Error(
        (data && data.error) ||
        `Request failed (${res.status})`
      );
    }

    return data;
  }

  function safeIcon(name) {
    try {
      if (typeof icon === 'function') {
        return icon(name);
      }
    } catch (_) {}

    return '';
  }

  function safeToast(message) {
    try {
      if (typeof toast === 'function') {
        return toast(message);
      }
    } catch (_) {}

    console.log('[Nexora]', message);
  }

  function escapeHtml(str) {
    return String(str ?? '').replace(
      /[&<>"']/g,
      (c) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      }[c])
    );
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';

    const d = new Date(dateStr);

    if (isNaN(d.getTime())) {
      return dateStr;
    }

    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  function weekdayName(dateStr) {
    const d = new Date(dateStr);

    return isNaN(d.getTime())
      ? ''
      : d.toLocaleDateString('en-IN', {
          weekday: 'short',
        });
  }

  function setActiveMaterial(materialId) {
    try {
      sessionStorage.setItem(
        'nexora-active-material',
        materialId
      );
    } catch (_) {}
  }

  function takeActiveMaterial() {
    let id = null;

    try {
      id = sessionStorage.getItem(
        'nexora-active-material'
      );

      sessionStorage.removeItem(
        'nexora-active-material'
      );
    } catch (_) {}

    return id;
  }

  function loadingBlock(message) {
    return `
      <div class="nxm-loading">
        <span
          class="nxm-spinner"
          aria-hidden="true"
        ></span>
        <p>${escapeHtml(message)}</p>
      </div>
    `;
  }

  function errorBlock(
    message,
    retryLabel = 'Try again'
  ) {
    return `
      <div class="nxm-error">
        <p>${escapeHtml(message)}</p>
        <button
          type="button"
          class="nx-secondary-button nxm-retry"
        >
          ${escapeHtml(retryLabel)}
        </button>
      </div>
    `;
  }

  function emptyBlock(title, message) {
    return `
      <div class="nxm-empty">
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(message)}</p>
      </div>
    `;
  }

  window.NexoraShared = {
    api,
    icon: safeIcon,
    toast: safeToast,
    escapeHtml,
    formatDate,
    weekdayName,
    setActiveMaterial,
    takeActiveMaterial,
    loadingBlock,
    errorBlock,
    emptyBlock,
    API_BASE,
  };
})();