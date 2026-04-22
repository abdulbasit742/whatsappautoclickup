/**
 * RBAC Middleware — requirePermission(feature, action)
 */

const jwt = require('jsonwebtoken');
const { checkPermission } = require('../services/permissionService');

function requirePermission(feature, action) {
  return async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let decoded;
    try {
      decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
      req.owner = decoded;
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // super_admin bypasses all checks
    if (decoded.role === 'super_admin') return next();

    try {
      const allowed = await checkPermission(decoded.id, feature, action);
      if (!allowed) {
        return res.status(403).json({
          error: `Forbidden: requires ${feature}:${action}`,
          feature,
          action,
        });
      }
      next();
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
}

module.exports = { requirePermission };
