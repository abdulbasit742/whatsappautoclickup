const jwt = require('jsonwebtoken');
const { logger } = require('./logger');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.owner = decoded;
    next();
  } catch (err) {
    logger.warn(`Auth failure from ${req.ip}: ${err.message}`);
    return res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * Middleware factory for role-based access control.
 * Usage: router.use(requireRole('owner'))
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.owner) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!roles.includes(req.owner.role)) {
      logger.warn(`Forbidden: ${req.owner.email} (role=${req.owner.role}) attempted to access ${req.path}`);
      return res.status(403).json({ error: 'Forbidden: insufficient privileges' });
    }
    next();
  };
}

module.exports = authMiddleware;
module.exports.requireRole = requireRole;
