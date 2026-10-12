const os = require('node:os');
const path = require('node:path');

/**
 * Return a directory where the API can write runtime data.
 * Vercel's deployed bundle is read-only; /tmp is writable but ephemeral.
 * NEXORA_DATA_DIR can override the location for local development and tests.
 */
function getDataDirectory({ env = process.env, localDir = path.resolve(__dirname, '..', 'data'), tempDir = os.tmpdir() } = {}) {
  const override = String(env.NEXORA_DATA_DIR || '').trim();
  if (override) return path.resolve(override);
  if (env.VERCEL) return path.join(tempDir, 'nexora-api');
  return localDir;
}

module.exports = { getDataDirectory };
