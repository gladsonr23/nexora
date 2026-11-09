const test = require('node:test');
const assert = require('node:assert/strict');
const {createRagStore, getConfig, RagStoreError, DEFAULT_TTL_SECONDS} = require('./ragStore');

test('accepts the Vercel KV REST variable names without exposing their values', () => {
  const env = {KV_REST_API_URL: 'https://kv.example/', KV_REST_API_TOKEN: 'secret'};
  assert.deepEqual(getConfig(env), {url: 'https://kv.example', token: 'secret'});
  assert.equal(getConfig({}), null);
  assert.equal(DEFAULT_TTL_SECONDS, 7200);
});

test('reads JSON and refreshes its inactivity TTL through Upstash pipeline', async () => {
  let request;
  const store = createRagStore({
    env: {KV_REST_API_URL: 'https://kv.example', KV_REST_API_TOKEN: 'secret'},
    fetchImpl: async (url, options) => {
      request = {url, options, body: JSON.parse(options.body)};
      return new Response(JSON.stringify([{result: '{"ok":true}'}, {result: 1}]), {status: 200});
    },
  });
  assert.deepEqual(await store.get('session:manifest'), {ok: true});
  assert.equal(request.url, 'https://kv.example/pipeline');
  assert.deepEqual(request.body, [['GET', 'session:manifest'], ['EXPIRE', 'session:manifest', '7200']]);
  assert.equal(request.options.headers.Authorization, 'Bearer secret');
});

test('reports storage setup errors without exposing secrets', async () => {
  const store = createRagStore({env: {}});
  await assert.rejects(store.get('k'), error => error instanceof RagStoreError && error.code === 'NOT_CONFIGURED' && !error.message.includes('secret'));
});
