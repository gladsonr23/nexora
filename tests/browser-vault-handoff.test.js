const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function loadShared(store) {
  const window = {NEXORA_API_BASE: '', NexoraVaultFileStore: store};
  const context = {
    window,
    Uint8Array,
    Headers,
    FormData,
    fetch: async () => { throw new Error('Unexpected network request'); },
    btoa: value => Buffer.from(value, 'binary').toString('base64'),
    console,
  };
  vm.runInNewContext(fs.readFileSync('dist/modules-shared.js', 'utf8'), context);
  return window.NexoraShared;
}

test('planner and quiz material listing reads browser Vault records without an API fetch', async () => {
  const shared = loadShared({
    list: async () => [{
      id: 'local-1',
      name: 'Operating Systems.pdf',
      subject: 'Computer Science',
      category: 'Syllabi',
      size: 256,
      type: 'application/pdf',
      createdAt: '2026-10-19T00:00:00.000Z',
    }],
  });

  assert.deepEqual(JSON.parse(JSON.stringify(await shared.listVaultMaterials())), [{
    materialId: 'local-1',
    filename: 'Operating Systems.pdf',
    subject: 'Computer Science',
    category: 'Syllabi',
    size: 256,
    type: 'application/pdf',
    createdAt: '2026-10-19T00:00:00.000Z',
  }]);
});

test('Pattern Detector Vault selection lists only PYQs and Question Banks', async () => {
  const shared = loadShared({
    list: async () => [
      {id: 'notes', name: 'Lecture notes.pdf', category: 'Notes', size: 200, type: 'application/pdf', createdAt: '2026-10-19T00:00:00.000Z'},
      {id: 'pyq', name: '2025-final.pdf', category: 'PYQs', size: 300, type: 'application/pdf', createdAt: '2026-10-19T00:00:00.000Z'},
      {id: 'bank', name: 'Unit questions.txt', category: 'Question Banks', size: 100, type: 'text/plain', createdAt: '2026-10-19T00:00:00.000Z'},
      {id: 'other', name: 'photo.png', category: 'Question Banks', size: 100, type: 'image/png', createdAt: '2026-10-19T00:00:00.000Z'},
    ],
  });

  const files = await shared.listVaultQuestionBankMaterials();
  assert.deepEqual(files.map(file => file.materialId), ['pyq', 'bank']);
  assert.deepEqual(files.map(file => file.category), ['PYQs', 'Question Banks']);
});

test('Pattern Detector saves newly uploaded papers under Question Banks', async () => {
  let saved;
  const shared = loadShared({putMany: async (files, metadata) => { saved = {files, metadata}; }});
  const files = [{name: '2025-final.pdf'}];

  await shared.saveQuestionBankFiles(files);
  assert.equal(saved.files, files);
  assert.deepEqual(JSON.parse(JSON.stringify(saved.metadata)), {category: 'Question Banks'});
});

test('planner and quiz handoff serializes a selected local PDF for server-side extraction', async () => {
  const bytes = Buffer.from('%PDF-1.7 local syllabus');
  const shared = loadShared({
    get: async id => id === 'local-2' ? {
      id,
      name: 'Syllabus.pdf',
      subject: 'Networks',
      size: bytes.length,
      blob: {
        size: bytes.length,
        arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      },
    } : null,
  });

  const payload = await shared.vaultMaterialPayload('local-2');
  assert.equal(payload.materialId, 'local-2');
  assert.equal(payload.material.filename, 'Syllabus.pdf');
  assert.equal(payload.material.subject, 'Networks');
  assert.equal(Buffer.from(payload.material.fileBase64, 'base64').toString(), bytes.toString());
});

test('browser Vault handoff fails clearly after a file is removed', async () => {
  const shared = loadShared({get: async () => null});
  await assert.rejects(shared.vaultMaterialPayload('deleted-file'), /no longer in this browser/i);
});
