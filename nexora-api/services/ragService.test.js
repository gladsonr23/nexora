const test = require('node:test');
const assert = require('node:assert/strict');
const {createRagService, splitText, sessionPrefix} = require('./ragService');

function memoryStore() {
  const values = new Map();
  return {
    ttlSeconds: 7200,
    async get(key) { return values.get(key) ?? null; },
    async set(key, value) { values.set(key, value); },
    async delete(keys) { keys.forEach(key => values.delete(key)); },
    values,
  };
}

function fakeEmbeddingFetch() {
  return async (_url, options) => {
    const body = JSON.parse(options.body);
    const embeddings = body.requests.map(request => {
      const text = request.content.parts[0].text.toLowerCase();
      return {values: [text.includes('21mab201t') ? 1 : 0, text.includes('calculus') ? 1 : 0]};
    });
    return new Response(JSON.stringify({embeddings}), {status: 200});
  };
}

test('splits page-labelled text and keeps page citations on chunks', () => {
  const result = splitText('Page 2:\nQuestion 1: 21MAB201T matrix problem.\n\nPage 3:\nQuestion 2: calculus.', {
    materialId: 'paper', filename: 'Paper.pdf', sessionId: 'tab-1', subject: 'Math',
  });
  assert.equal(result.length, 2);
  assert.equal(result[0].pageNumber, 2);
  assert.equal(result[1].pageNumber, 3);
  assert.equal(result[0].materialId, 'paper');
});

test('indexes durable session chunks, uses hybrid exact-term retrieval, reconciles, and closes', async () => {
  const store = memoryStore();
  const rag = createRagService({
    env: {GEMINI_API_KEY: 'test-key'}, store, fetchImpl: fakeEmbeddingFetch(), clock: () => 1000,
  });
  const args = {userId: 'user-a', sessionId: 'tab-1'};
  const result = await rag.indexMaterials({...args, materials: [
    {materialId: 'math', filename: 'Math.pdf', subject: 'Math', extractedText: 'Page 4:\nQuestion 1: 21MAB201T matrix properties and vector spaces are important.'},
    {materialId: 'calculus', filename: 'Calculus.pdf', subject: 'Math', extractedText: 'Page 1:\nQuestion 1: calculus limits and derivatives.'},
  ]});
  assert.equal(result.materialCount, 2);
  assert.equal((await rag.status(args)).chunkCount, 2);
  const hits = await rag.retrieve({...args, query: '21MAB201T matrix', topK: 1});
  assert.equal(hits[0].materialId, 'math');
  assert.equal(hits[0].pageNumber, 4);
  assert.equal('embedding' in hits[0], false);
  await rag.indexMaterials({...args, materials: [
    {materialId: 'math', filename: 'Math.pdf', subject: 'Math', extractedText: 'Page 4:\n21MAB201T updated matrix question details.'},
  ]});
  assert.match((await rag.retrieve({...args, query: '21MAB201T matrix', topK: 1}))[0].text, /updated matrix/);
  await rag.reconcile({...args, materialIds: ['math']});
  assert.equal((await rag.status(args)).materialCount, 1);
  assert.equal((await rag.status({...args, userId: 'other-user'})).indexed, false);
  await rag.closeSession(args);
  assert.equal((await rag.status(args)).indexed, false);
  assert.match(sessionPrefix('user-a', 'tab-1'), /^nexora:rag:[a-f0-9]+:[a-f0-9]+$/);
});
