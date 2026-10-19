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
