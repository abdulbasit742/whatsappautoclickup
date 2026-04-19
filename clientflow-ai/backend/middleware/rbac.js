/**
 * RBAC Middleware (P52)
 * Usage: requirePermission('crm', 'edit')
 */

const db = require('../db');

const DEFAULT_PERMISSIONS = {
  super_admin: { all: ['view','create','edit','delete','export','manage'] },
  org_admin:   {
    dashboard: ['view','manage'], inbox: ['view','create','edit','delete'],
    crm: ['view','create','edit','delete','export'], campaigns: ['view','create','edit','delete','export'],
    ai_center: ['view','create','edit'], billing: ['view','manage'],
    integrations: ['view','manage'], settings: ['view','manage'],
    analytics: ['view','export'], audit_logs: ['view'],
  },
  manager: {
    dashboard: ['view'], inbox: ['view','create','edit'], crm: ['view','create','edit','export'],
    campaigns: ['view','create','edit'], ai_center: ['view'], analytics: ['view','export'],
    audit_logs: ['view'], settings: ['view'],
  },
  agent: {
    dashboard: ['view'], inbox: ['view','create','edit'], crm: ['view','create','edit'],
    campaigns: ['view'], ai_center: ['view'],
  },
  support: {
    dashboard: ['view'], inbox: ['view','create'], crm: ['view'],
  },
  viewer: {
    dashboard: ['view'], inbox: ['view'], crm: ['view'], analytics: ['view'], campaigns: ['view'],
  },
};

function requirePermission(module, action) {
  return async (req, res, next) => {
    try {
      const role = req.owner?.role || 'viewer';

      // Super admin always passes
      if (role === 'super_admin') return next();

      const orgId = req.owner?.org_id;

      // Check org-level custom override
      if (orgId) {
        const override = await db.query(
          `SELECT 1 FROM permissions WHERE org_id=$1 AND role=$2 AND module=$3 AND action=$4`,
          [orgId, role, module, action]
        );
        if (override.rows.length > 0) return next();
      }

      // Check defaults
      const rolePerms = DEFAULT_PERMISSIONS[role] || {};
      const allPerms    = rolePerms.all || [];
      const modulePerms = rolePerms[module] || [];
      if (allPerms.includes(action) || modulePerms.includes(action)) return next();

      return res.status(403).json({ error: `Forbidden: requires ${module}:${action}` });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  };
}

module.exports = { requirePermission };
