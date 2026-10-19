const test = require('node:test');
const assert = require('node:assert/strict');

process.env.GEMINI_API_KEY = 'test-key';
process.env.GEMINI_MODEL = 'test-model';
process.env.GEMINI_FALLBACK_MODEL = 'test-model';

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
