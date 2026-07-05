const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

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
    req.user = user;
    req.userId = user.id;
    next();

  } catch (err) {
    console.error('Auth middleware error:', err.message);
    return res.status(401).json({ message: 'Authentication failed' });
  }
};

module.exports = { protect };