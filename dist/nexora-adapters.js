(() => {
  const shared = window.NexoraShared;
  if (!shared) return;

  const fileType = (name) => (/\.txt$/i.test(name) ? 'text/plain' : 'application/pdf');
  const authHeaders = async () => {
    const headers = new Headers();
    try {
      const token = await window.NexoraAuth?.getToken?.();
      if (token) headers.set('Authorization', `Bearer ${token}`);
    } catch (_) {}
    return headers;
  };

  window.NexoraVaultFileStore = {
    async list() {
      const materials = await shared.api('/api/materials');
      return (Array.isArray(materials) ? materials : [])
        .filter((material) => /\.(pdf|txt)$/i.test(material.filename || ''))
        .map((material) => ({
          id: material.materialId,
          name: material.filename,
          type: fileType(material.filename || ''),
        }));
    },
    async get(id) {
      const files = await this.list();
      const file = files.find((item) => item.id === id);
      if (!file) return null;
      const response = await fetch(
        `${shared.API_BASE}/api/materials/${encodeURIComponent(id)}/file`,
        { headers: await authHeaders() },
      );
      if (!response.ok) {
        let message = 'Could not open that file from the Vault.';
        try { message = (await response.json()).error || message; } catch (_) {}
        throw new Error(message);
      }
      const blob = await response.blob();
      return { ...file, type: blob.type || file.type, blob };
    },
  };

  window.NexoraStudyTasks = {
    list: () => shared.api('/api/tasks'),
    complete: (id) => shared.api(`/api/tasks/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'completed' }),
    }),
  };
})();
