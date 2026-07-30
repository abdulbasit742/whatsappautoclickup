const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const config = require('../config');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch (err) {
      return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }

    const result = await query(
      'SELECT id, org_id, email, name, role, is_active FROM users WHERE id = $1 AND is_active = true',
      [decoded.userId]
    );

    if (!result.rows.length) {
      return res.status(401).json({ success: false, error: 'User not found or inactive' });
    }

    req.user = result.rows[0];
    next();
  } catch (err) {
    next(err);
  }
}

function checkRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthenticated' });
    }
    const allowed = roles.flat();
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Insufficient role' });
    }
    next();
  };
}

module.exports = { authenticate, checkRole };
