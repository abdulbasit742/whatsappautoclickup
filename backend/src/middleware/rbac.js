const { query } = require('../config/database');

function checkPermission(permission) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthenticated' });
      }

      if (req.user.role === 'super_admin' || req.user.role === 'admin') {
        return next();
      }

      const result = await query(
        `SELECT r.permissions FROM roles r
         JOIN users u ON u.org_id = r.org_id AND u.role = r.name
         WHERE u.id = $1 AND r.org_id = $2`,
        [req.user.id, req.user.org_id]
      );

      if (!result.rows.length) {
        return res.status(403).json({ success: false, error: 'No role permissions found' });
      }

      const permissions = result.rows[0].permissions || [];
      if (!permissions.includes(permission) && !permissions.includes('*')) {
        return res.status(403).json({
          success: false,
          error: `Permission denied: ${permission} required`,
        });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { checkPermission };
