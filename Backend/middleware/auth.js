const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');
const pool = require('../config/db');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    realtime: {
      transport: ws  // ✅ fixes Node.js 20 WebSocket issue
    }
  }
);

console.log('🚀 NEW auth.js loaded');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ SET' : '❌ MISSING');
console.log('SERVICE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ SET' : '❌ MISSING');

// ---------------------
// Validate the Bearer token with Supabase and return the auth user.
// Shared by both `protect` and `identify` below.
// ---------------------
const verifySupabaseToken = async (req) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const err = new Error('No token provided');
    err.status = 401;
    throw err;
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    console.log('❌ Token failed:', error?.message);
    const err = new Error('Invalid or expired token');
    err.status = 401;
    throw err;
  }

  console.log('✅ Token valid:', user.email);
  return user;
};

// ---------------------
// Resolve the Supabase-authenticated user to this app's internal
// integer users.id. users.supabase_uid already exists but is still
// empty for every existing account, so email — the same key
// routes/profile.js already uses to find/create a user — is the live
// fallback. Once matched by email, the row is backfilled with
// supabase_uid so future logins resolve via the indexed UUID instead.
// Returns the full row (or null), not just the id.
// ---------------------
const resolveInternalUser = async (supabaseUser) => {
  let result = await pool.query(
    'SELECT * FROM users WHERE supabase_uid = $1',
    [supabaseUser.id]
  );
  let row = result.rows[0];

  if (!row && supabaseUser.email) {
    result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [supabaseUser.email]
    );
    row = result.rows[0];

    if (row && !row.supabase_uid) {
      const updated = await pool.query(
        'UPDATE users SET supabase_uid = $1 WHERE id = $2 RETURNING *',
        [supabaseUser.id, row.id]
      );
      row = updated.rows[0];
    }
  }

  return row || null;
};

// ---------------------
// Same resolution as resolveInternalUser, but creates the users row
// when none exists yet. Used only by /api/profile — the one place a
// brand-new Supabase account is allowed to bootstrap its application
// profile instead of being blocked by `protect`'s 404.
// ---------------------
const findOrCreateInternalUser = async (supabaseUser) => {
  const existing = await resolveInternalUser(supabaseUser);
  if (existing) return existing;

  const inserted = await pool.query(
    `INSERT INTO users (email, supabase_uid, is_profile_complete)
     VALUES ($1, $2, false)
     RETURNING *`,
    [supabaseUser.email || null, supabaseUser.id]
  );
  return inserted.rows[0];
};

// ---------------------
// Strict: requires an existing application profile row. Use for
// every route except /api/profile.
// ---------------------
const protect = async (req, res, next) => {
  try {
    const user = await verifySupabaseToken(req);
    const internalUser = await resolveInternalUser(user);

    if (!internalUser) {
      console.log('⚠️ No application profile found for authenticated user:', user.email);
      return res.status(404).json({
        message: 'No application profile found for this account. Please complete your profile.',
        code: 'PROFILE_NOT_FOUND',
      });
    }

    req.user = user;
    req.user.authId = user.id;             // Supabase Auth UUID
    req.user.internalId = internalUser.id; // internal integer users.id — use this for all DB queries
    req.userId = user.id;
    next();

  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    console.error('Auth middleware error:', err.message);
    return res.status(401).json({ message: 'Authentication failed' });
  }
};

// ---------------------
// Lighter: only requires a valid Supabase token. Creates the
// application profile row on first use instead of 404ing, so a
// brand-new account can call /api/profile to bootstrap itself.
// ---------------------
const identify = async (req, res, next) => {
  try {
    const user = await verifySupabaseToken(req);
    const internalUser = await findOrCreateInternalUser(user);

    req.user = user;
    req.user.authId = user.id;
    req.user.internalId = internalUser.id;
    req.userId = user.id;
    next();

  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    console.error('Auth middleware error:', err.message);
    return res.status(401).json({ message: 'Authentication failed' });
  }
};

module.exports = { protect, identify };