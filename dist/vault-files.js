(() => {
  const databaseName = 'nexora-vault';
  const storeName = 'files';

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
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Vault storage operation failed.'));
      transaction.oncomplete = () => database.close();
      transaction.onerror = () => database.close();
    });
  }

  async function putMany(files, metadata = {}) {
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
    const records = await transact('readonly', store => store.getAll());
    return records.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }

  const get = id => transact('readonly', store => store.get(id));
  async function update(id, changes = {}) {
    const current = await get(id);
    if (!current) return null;
    const updated = {...current, ...changes, id: current.id};
    await transact('readwrite', objectStore => objectStore.put(updated));
    window.dispatchEvent(new Event('nexora:vault-updated'));
    return {...updated, blob: undefined};
  }
  async function remove(id) {
    await transact('readwrite', store => store.delete(id));
    window.dispatchEvent(new Event('nexora:vault-updated'));
  }

  window.NexoraVaultFileStore = {putMany, list, get, update, remove};
})();
