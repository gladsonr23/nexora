const test = require('node:test');
const assert = require('node:assert/strict');

process.env.GEMINI_API_KEY = 'test-key';
process.env.GEMINI_MODEL = 'test-model';
process.env.GEMINI_FALLBACK_MODEL = 'fallback-test-model';
process.env.GEMINI_BACKUP_MODEL = 'backup-test-model';

const {callGemini, GeminiError} = require('./geminiService');

test('stops waiting for a Gemini response at the configured request timeout', async () => {
  await assert.rejects(
    callGemini('system', 'prompt', {
      timeoutMs: 10,
      fetchImpl: (_url, {signal}) => new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'TimeoutError')), {once: true});
      }),
    }),
    error => error instanceof GeminiError && error.code === 'TIMEOUT' && error.status === 504 && /timed out/i.test(error.message),
  );
});

test('sends inline PDF data with the text prompt in one Gemini request', async () => {
  let body;
  await callGemini('system', 'Read this syllabus', {
    inlineData: {mimeType: 'application/pdf', data: 'JVBERi0='},
    fetchImpl: async (_url, options) => {
      body = JSON.parse(options.body);
      return new Response(JSON.stringify({candidates: [{content: {parts: [{text: '{"ok":true}'}]}}]}), {status: 200});
    },
  });
  assert.deepEqual(body.contents[0].parts, [
    {text: 'Read this syllabus'},
    {inlineData: {mimeType: 'application/pdf', data: 'JVBERi0='}},
  ]);
});

test('moves to a third stable model after the primary and fallback return 503', async () => {
  const tried = [];
  const result = await callGemini('system', 'prompt', {
    retryBaseMs: 0,
    retryRandom: () => 0,
    fetchImpl: async url => {
      const model = String(url).match(/models\/([^:]+):/)[1];
      tried.push(model);
      if (model === 'backup-test-model') {
        return new Response(JSON.stringify({candidates: [{content: {parts: [{text: '{"ok":true}'}]}}]}), {status: 200});
      }
      return new Response(JSON.stringify({error: {code: 503, message: 'busy', status: 'UNAVAILABLE'}}), {status: 503});
    },
  });
  assert.deepEqual(tried, ['test-model', 'test-model', 'fallback-test-model', 'backup-test-model']);
  assert.equal(result, '{"ok":true}');
});

test('returns a short retryable message after all configured models return 503', async () => {
  await assert.rejects(
    callGemini('system', 'prompt', {
      retryBaseMs: 0,
      retryRandom: () => 0,
      fetchImpl: async () => new Response(JSON.stringify({error: {code: 503, message: 'busy', status: 'UNAVAILABLE'}}), {status: 503}),
    }),
    error => error instanceof GeminiError && error.status === 503 && /temporarily overloaded/i.test(error.message),
  );
});
