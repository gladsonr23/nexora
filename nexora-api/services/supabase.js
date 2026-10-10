/**
 * supabase.js — the single, backend-only Supabase client.
 *
 * Uses the SERVICE ROLE key, which bypasses Row Level Security. That is exactly
 * why this client must never reach the browser and why every query made
 * through it (see vaultService.js) is explicitly scoped by the Clerk user ID.
 */
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'vault';

const isConfigured = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);

// If not configured we export null instead of crashing the whole server, so
// Schedule / Quiz / Tasks (still on SQLite) keep working. vaultService turns a
// null client into a clean 503 for Vault requests.
const supabase = isConfigured
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
  : null;

module.exports = { supabase, BUCKET, isConfigured };