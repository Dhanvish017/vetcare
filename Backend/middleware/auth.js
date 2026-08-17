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
// Resolve the Supabase-authenticated user to this app's internal
// integer users.id. users.supabase_uid already exists but is still
// empty for every existing account, so email — the same key
// routes/profile.js already uses to find/create a user — is the live
// fallback. Once matched by email, the row is backfilled with
// supabase_uid so future logins resolve via the indexed UUID instead.
// ---------------------
const resolveInternalUser = async (supabaseUser) => {
  let result = await pool.query(
    'SELECT id, supabase_uid FROM users WHERE supabase_uid = $1',
    [supabaseUser.id]
  );
  let row = result.rows[0];

  if (!row && supabaseUser.email) {
    result = await pool.query(
      'SELECT id, supabase_uid FROM users WHERE email = $1',
      [supabaseUser.email]
    );
    row = result.rows[0];

    if (row && !row.supabase_uid) {
      await pool.query(
        'UPDATE users SET supabase_uid = $1 WHERE id = $2',
        [supabaseUser.id, row.id]
      );
    }
  }

  return row || null;
};

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.log('❌ Token failed:', error?.message);
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    console.log('✅ Token valid:', user.email);

    const internalUser = await resolveInternalUser(user);

    if (!internalUser) {
      console.log('⚠️ No application profile found for authenticated user:', user.email);
      return res.status(404).json({
        message: 'No application profile found for this account. Please complete your profile.',
        code: 'PROFILE_NOT_FOUND',
      });
    }

    req.user = user;
    req.user.authId = user.id;           // Supabase Auth UUID
    req.user.internalId = internalUser.id; // internal integer users.id — use this for all DB queries
    req.userId = user.id;
    next();

  } catch (err) {
    console.error('Auth middleware error:', err.message);
    return res.status(401).json({ message: 'Authentication failed' });
  }
};

module.exports = { protect };