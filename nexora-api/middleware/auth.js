/**
 * auth.js — Clerk session verification for the Express API.
 *
 * The frontend sends the Clerk session JWT as `Authorization: Bearer <token>`.
 * We verify its signature with Clerk and expose the verified Clerk user ID as
 * `req.auth.userId`. This is the ONLY source of user identity in the API:
 * nothing in req.body / req.query / req.params is ever used as a user ID.
 *
 *   requireAuth  — 401 unless a valid Clerk session token is present.
 *   optionalAuth — sets req.auth if a valid token is present, never rejects.
 *                  (For routes that are not migrated yet but may want identity.)
 */
const { verifyToken } = require('@clerk/backend');

// Optional hardening: comma-separated list of frontend origins allowed to have
// minted the token, e.g. "http://localhost:5500,https://nexora.example.com".
// Clerk compares this against the token's `azp` claim.
const AUTHORIZED_PARTIES = (process.env.CLERK_AUTHORIZED_PARTIES || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

function extractBearerToken(req) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

/** Returns { userId } for a valid token, or null. Never throws. */
async function authenticate(req) {
  const token = extractBearerToken(req);
  if (!token) return null;

  if (!process.env.CLERK_SECRET_KEY && !process.env.CLERK_JWT_KEY) {
    console.error('[auth] CLERK_SECRET_KEY is not set — cannot verify sessions.');
    return null;
  }

  try {
    const options = { secretKey: process.env.CLERK_SECRET_KEY };
    if (process.env.CLERK_JWT_KEY) options.jwtKey = process.env.CLERK_JWT_KEY;
    if (AUTHORIZED_PARTIES.length) options.authorizedParties = AUTHORIZED_PARTIES;

    const result = await verifyToken(token, options);

    // Different @clerk/backend versions either return the payload directly or
    // wrap it as { data, errors }. Accept both.
    const payload = result && 'data' in result && 'errors' in result ? result.data : result;
    if (result && result.errors && result.errors.length) return null;

    const userId = payload && payload.sub;
    return typeof userId === 'string' && userId ? { userId } : null;
  } catch (err) {
    // Expired / malformed / wrong-instance tokens land here. Not a server error.
    console.warn('[auth] token rejected:', err && err.reason ? err.reason : err.message);
    return null;
  }
}

async function requireAuth(req, res, next) {
  const auth = await authenticate(req);
  if (!auth) {
    return res.status(401).json({ error: 'Please sign in to continue.' });
  }
  req.auth = auth;
  next();
}

async function optionalAuth(req, res, next) {
  const auth = await authenticate(req);
  if (auth) req.auth = auth;
  next();
}

module.exports = { requireAuth, optionalAuth };