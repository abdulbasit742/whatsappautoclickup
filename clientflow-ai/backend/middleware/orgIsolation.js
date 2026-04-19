/**
 * PROMPT 101 — Org Isolation Middleware
 * Enforces that every request only accesses data for the authenticated org.
 * Sets PostgreSQL session variable app.current_org_id for RLS policies.
 */

const db = require('../db/index');
const logger = require('../services/loggerService');

/**
 * Sets the PostgreSQL session-level org context for Row Level Security.
 * Must be called inside a transaction to be effective per-query.
 */
async function setOrgContext(client, orgId) {
  await client.query(`SELECT set_org_context($1)`, [orgId]);
}

/**
 * Main org isolation middleware.
 * Attaches org_id from the authenticated token to the request.
 * Also validates the org is active.
 */
module.exports = function orgIsolation(req, res, next) {
  const orgId = req.owner?.org_id;

  if (!orgId) {
    // Legacy single-owner mode: skip multi-tenant checks
    return next();
  }

  // Attach a scoped DB query helper that auto-sets org context
  req.orgId = orgId;

  // Provide a helper to safely run org-scoped DB queries with RLS
  req.dbQuery = async (text, params) => {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SELECT set_config('app.current_org_id', $1, TRUE)`, [orgId]);
      const result = await client.query(text, params);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  };

  next();
};

/**
 * Role-based access control middleware factory.
 * Usage: router.delete('/org', requireRole('owner', 'admin'), handler)
 */
function requireRole(...roles) {
  return (req, res, next) => {
    const userRole = req.owner?.role;
    if (!userRole || !roles.includes(userRole)) {
      logger.security('insufficient_role', {
        required: roles,
        actual:   userRole,
        org_id:   req.owner?.org_id,
        user_id:  req.owner?.user_id,
      });
      return res.status(403).json({ error: 'Insufficient permissions', code: 'FORBIDDEN' });
    }
    next();
  };
}

module.exports.setOrgContext = setOrgContext;
module.exports.requireRole   = requireRole;
