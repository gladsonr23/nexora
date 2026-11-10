(() => {
  const shared = window.NexoraShared;
  if (!shared) return;
  let pendingSync = null;
  let lastSyncAt = 0;
  let lastSync = null;
  const sessionId = window.NexoraSession?.id;

  async function sync({force = false} = {}) {
    if (!sessionId) throw new Error('The study session could not be started. Refresh and try again.');
    if (!force && lastSync && Date.now() - lastSyncAt < 60000) return lastSync;
    if (pendingSync) return pendingSync;
    pendingSync = (async () => {
      const store = window.NexoraVaultFileStore;
      if (!store?.list) throw new Error('Browser Vault is unavailable. Refresh and try again.');
      await store.ready;
      const materials = await shared.listVaultMaterials();
      const active = materials.filter(item => item.sessionId === sessionId && /\.(pdf|txt)$/i.test(item.filename)).slice(0, 20);
      if (!active.length) {
        try {
          await shared.api('/api/assistant/reconcile', {method: 'POST', body: JSON.stringify({sessionId, materialIds: []})});
        } catch (_) {}
        lastSyncAt = Date.now();
        lastSync = {indexed: false, materialCount: 0, chunkCount: 0};
        return lastSync;
      }
      let indexedStatus = {indexed: false};
      try { indexedStatus = await status(); } catch (_) {}
      const cacheKey = `nexora-rag-indexed:${sessionId}`;
      let indexedSignatures = {};
      try { indexedSignatures = JSON.parse(sessionStorage.getItem(cacheKey) || '{}'); } catch (_) {}
      if (!indexedStatus.indexed) indexedSignatures = {};
      const nextSignatures = {};
      for (const item of active) {
        const signature = `${item.size}:${item.createdAt}:${item.filename}`;
        nextSignatures[item.materialId] = signature;
        if (!force && indexedSignatures[item.materialId] === signature) continue;
        const payload = await shared.vaultMaterialPayload(item.materialId);
        await shared.api('/api/assistant/index-material', {
          method: 'POST', body: JSON.stringify({...payload, sessionId}),
        });
      }
      const result = await shared.api('/api/assistant/reconcile', {
        method: 'POST', body: JSON.stringify({sessionId, materialIds: active.map(item => item.materialId)}),
      });
      try { sessionStorage.setItem(cacheKey, JSON.stringify(nextSignatures)); } catch (_) {}
      lastSyncAt = Date.now();
      lastSync = {...result, indexed: result.materialCount > 0};
      window.dispatchEvent(new CustomEvent('nexora:rag-status', {detail: result}));
      return lastSync;
    })().finally(() => { pendingSync = null; });
    return pendingSync;
  }

  async function status() {
    if (!sessionId) return {indexed: false, materialCount: 0};
    return shared.api('/api/assistant/status', {method: 'POST', body: JSON.stringify({sessionId})});
  }

  async function close() {
    if (!sessionId) return;
    await shared.api('/api/assistant/close', {method: 'POST', body: JSON.stringify({sessionId})});
  }

  window.NexoraRag = {sessionId, sync, status, close};
  let updateTimer = null;
  window.addEventListener('nexora:vault-updated', () => {
    lastSyncAt = 0;
    clearTimeout(updateTimer);
    updateTimer = setTimeout(() => sync().catch(error => {
      window.dispatchEvent(new CustomEvent('nexora:rag-error', {detail: {message: error.message}}));
    }), 350);
  });
  window.addEventListener('nexora-auth-changed', () => { lastSyncAt = 0; lastSync = null; });
  window.addEventListener('pagehide', () => {
    if (!sessionId) return;
    try {
      fetch(`${shared.API_BASE}/api/assistant/close`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({sessionId}),
        keepalive: true,
      }).catch(() => {});
    } catch (_) {}
  });
})();
