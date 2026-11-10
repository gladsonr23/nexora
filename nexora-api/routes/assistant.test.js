const test = require('node:test');
const assert = require('node:assert/strict');
const assistantRouter = require('./assistant');

const twoChunks = [
  {materialId: 'asm', materialName: 'Assembly.pdf', subject: 'Assembly', pageNumber: 2, text: 'MOV copies a value into a register.'},
  {materialId: 'java', materialName: 'Java.pdf', subject: 'Java', pageNumber: 1, text: 'Java organizes code into classes and methods.'},
];

function mockRag(chunks = twoChunks) {
  const calls = {status: [], retrieve: []};
  return {
    calls,
    async status(args) { calls.status.push(args); return {indexed: true, materialCount: 2}; },
    async retrieve(args) { calls.retrieve.push(args); return chunks; },
  };
}

test('session summary is grounded in two session files and receives the fixed four-section format', async () => {
  const ragService = mockRag();
  let generation;
  const response = await assistantRouter.buildChatResponse({
    question: 'Summarize this session', sessionId: 'session-a', hasMaterials: true, ragService,
    generate: async (system, prompt) => { generation = {system, prompt}; return {answer: '## Overview\nTwo subjects.'}; },
  });

  assert.equal(response.grounded, true);
  assert.equal(response.sources.length, 2);
  assert.deepEqual(response.sources.map(source => source.filename), ['Assembly.pdf', 'Java.pdf']);
  assert.equal(ragService.calls.status[0].sessionId, 'session-a');
  assert.equal(ragService.calls.retrieve[0].sessionId, 'session-a');
  assert.match(generation.system, /## Overview, ## Key Concepts, ## Important Details, ## Takeaways/);
  assert.match(generation.prompt, /MOV copies a value/);
  assert.match(generation.prompt, /Java organizes code/);
});

test('normal questions use session retrieval and the regular grounded answer format', async () => {
  const ragService = mockRag();
  let systemPrompt = '';
  const response = await assistantRouter.buildChatResponse({
    question: 'What does MOV do?', sessionId: 'session-b', hasMaterials: true, ragService,
    generate: async system => { systemPrompt = system; return {answer: '1. **MOV** copies a value. [Source 1, Page 2]'}; },
  });

  assert.equal(response.grounded, true);
  assert.equal(response.sources.length, 2);
  assert.match(systemPrompt, /one bracket per citation/);
  assert.doesNotMatch(systemPrompt, /## Key Concepts/);
});

test('empty sessions use general guidance with no Vault sources or invented citations', async () => {
  const ragService = mockRag([]);
  let systemPrompt = '';
  const response = await assistantRouter.buildChatResponse({
    question: 'Summarize this session', sessionId: 'session-empty', hasMaterials: false, ragService,
    generate: async system => { systemPrompt = system; return {answer: '## Overview\nNo session materials are indexed.'}; },
  });

  assert.equal(ragService.calls.status.length, 0);
  assert.equal(ragService.calls.retrieve.length, 0);
  assert.equal(response.grounded, false);
  assert.deepEqual(response.sources, []);
  assert.match(systemPrompt, /no indexed Vault material/);
  assert.match(systemPrompt, /## Overview, ## Key Concepts, ## Important Details, ## Takeaways/);
});
