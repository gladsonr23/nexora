(() => {
  const databaseName = 'nexora-vault';
  const storeName = 'files';
  const sessionId = window.NexoraSession?.id || null;
  const activeKey = window.NexoraSession?.activeKey || (sessionId ? `nexora-study-session-active:${sessionId}` : null);

  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(databaseName, 1);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(storeName)) {
          const store = database.createObjectStore(storeName, {keyPath: 'id'});
          store.createIndex('createdAt', 'createdAt');
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Vault storage could not be opened.'));
    });
  }

  async function transact(mode, action) {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      const request = action(store);
      let result;
      request.onsuccess = () => { result = request.result; };
      request.onerror = () => reject(request.error || new Error('Vault storage operation failed.'));
      transaction.oncomplete = () => { database.close(); resolve(result); };
      transaction.onerror = () => { database.close(); reject(transaction.error || new Error('Vault storage transaction failed.')); };
      transaction.onabort = () => { database.close(); reject(transaction.error || new Error('Vault storage transaction was cancelled.')); };
    });
  }

  async function putMany(files, metadata = {}) {
    await ready;
    const saved = [];
    for (const file of files) {
      const record = {
        id: crypto.randomUUID(),
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        createdAt: new Date().toISOString(),
        category: String(metadata.category || file.category || 'Notes'),
        subject: String(metadata.subject || file.subject || ''),
        sessionId: window.NexoraSession?.id || null,
        blob: file
      };
      await transact('readwrite', store => store.put(record));
      saved.push({...record, blob: undefined});
    }
    window.dispatchEvent(new Event('nexora:vault-updated'));
    return saved;
  }

  async function list() {
    await ready;
    const records = await transact('readonly', store => store.getAll());
    return records.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }

  const get = async id => {
    await ready;
    return transact('readonly', store => store.get(id));
  };
  async function update(id, changes = {}) {
    await ready;
    const current = await get(id);
    if (!current) return null;
    const updated = {...current, ...changes, id: current.id};
    await transact('readwrite', objectStore => objectStore.put(updated));
    window.dispatchEvent(new Event('nexora:vault-updated'));
    return {...updated, blob: undefined};
  }
  async function remove(id) {
    await ready;
    await transact('readwrite', store => store.delete(id));
    window.dispatchEvent(new Event('nexora:vault-updated'));
  }

  async function cleanupStaleSessions() {
    const records = await transact('readonly', store => store.getAll());
    const now = Date.now();
    const staleIds = new Set();
    for (const record of records) {
      if (!record.sessionId || record.sessionId === sessionId) continue;
      const marker = `nexora-study-session-active:${record.sessionId}`;
      let lastSeen = 0;
      try { lastSeen = Number(localStorage.getItem(marker)) || 0; } catch (_) {}
      if (!lastSeen || now - lastSeen > 900000) {
        staleIds.add(record.sessionId);
        try { localStorage.removeItem(marker); } catch (_) {}
      }
    }
    if (!staleIds.size) return;
    await transact('readwrite', store => {
      for (const record of records) {
        if (staleIds.has(record.sessionId)) store.put({...record, sessionId: null});
      }
      return store.getAll();
    });
    window.dispatchEvent(new Event('nexora:vault-updated'));
  }

  const ready = cleanupStaleSessions();
  const heartbeat = window.setInterval(() => {
    try { if (activeKey) localStorage.setItem(activeKey, String(Date.now())); } catch (_) {}
  }, 30000);
  window.addEventListener('pagehide', () => {
    window.clearInterval(heartbeat);
    if (!sessionId) return;
    try { if (activeKey) localStorage.removeItem(activeKey); } catch (_) {}
    // Release session files locally as the page leaves; stale-session cleanup is the crash fallback.
    openDatabase().then(database => {
      const transaction = database.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => {
        for (const record of request.result || []) {
          if (record.sessionId === sessionId) store.put({...record, sessionId: null});
        }
      };
      transaction.oncomplete = () => database.close();
      transaction.onerror = () => database.close();
      transaction.onabort = () => database.close();
    }).catch(() => {});
  });

  window.NexoraVaultFileStore = {putMany, list, get, update, remove, ready};
})();
