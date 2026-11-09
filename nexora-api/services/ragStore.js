const DEFAULT_TTL_SECONDS = 2 * 60 * 60;

class RagStoreError extends Error {
  constructor(message, code = 'RAG_STORE_ERROR') {
    super(message);
    this.name = 'RagStoreError';
    this.code = code;
  }
}

function getConfig(env = process.env) {
  const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL || env.REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN || env.REDIS_REST_TOKEN;
  return url && token ? {url: url.replace(/\/+$/, ''), token} : null;
}

function createRagStore({env = process.env, fetchImpl = globalThis.fetch, ttlSeconds = DEFAULT_TTL_SECONDS} = {}) {
  async function run(commands) {
    const config = getConfig(env);
    if (!config) throw new RagStoreError('Durable study storage is not configured.', 'NOT_CONFIGURED');
    const list = Array.isArray(commands[0]) ? commands : [commands];
    const response = await fetchImpl(`${config.url}${list.length > 1 ? '/pipeline' : ''}`, {
      method: 'POST',
      headers: {Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json'},
      body: JSON.stringify(list.length > 1 ? list : list[0]),
      signal: AbortSignal.timeout(10000),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || (Array.isArray(body) && body.some(item => item?.error)) || body?.error) {
      throw new RagStoreError('Durable study storage request failed.', 'REQUEST_FAILED');
    }
    return Array.isArray(body) ? body.map(item => item?.result) : body?.result;
  }

  return {
    ttlSeconds,
    async get(key) {
      const [result] = await run([['GET', key], ['EXPIRE', key, String(ttlSeconds)]]);
      if (typeof result !== 'string') return null;
      try { return JSON.parse(result); } catch (_) { return null; }
    },
    async set(key, value) {
      await run(['SET', key, JSON.stringify(value), 'EX', String(ttlSeconds)]);
    },
    async delete(keys) {
      if (!keys.length) return;
      await run(['DEL', ...keys]);
    },
  };
}

module.exports = {createRagStore, getConfig, RagStoreError, DEFAULT_TTL_SECONDS};
