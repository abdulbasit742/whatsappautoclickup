/**
 * PROMPT 107 — Feature Usage Tracking
 * Records clicks, actions, and feature usage for analytics, plan limits, and product decisions.
 */

const db = require('../db/index');
const logger = require('./loggerService');

/**
 * Track a feature usage event.
 * Inserts into feature_usage table asynchronously (fire-and-forget).
 *
 * @param {string} orgId
 * @param {string|null} userId
 * @param {string} feature   e.g. 'broadcast', 'ai_reply', 'bulk_import'
 * @param {string} action    e.g. 'send', 'view', 'export'
 * @param {Object} metadata  extra context
 */
async function track(orgId, userId, feature, action, metadata = {}) {
  try {
    await db.query(
      `INSERT INTO feature_usage (org_id, user_id, feature, action, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [orgId, userId || null, feature, action, JSON.stringify(metadata)]
    );
  } catch (err) {
    logger.warn('Feature tracking insert failed', { orgId, feature, error: err.message });
  }
}

/**
 * Express middleware factory — auto-tracks API route usage.
 * Usage: router.get('/broadcasts', trackUsage('broadcast', 'list'), handler)
 */
function trackUsage(feature, action) {
  return (req, _res, next) => {
    const orgId  = req.owner?.org_id;
    const userId = req.owner?.user_id;
    if (orgId) {
      track(orgId, userId, feature, action, { path: req.path, method: req.method });
    }
    next();
  };
}

/**
 * Get feature usage summary for an org (used for analytics and plan limits).
 * Returns usage counts grouped by feature for the current month.
 */
async function getMonthlyUsage(orgId) {
  const { rows } = await db.query(
    `SELECT feature, action, COUNT(*) as count
     FROM feature_usage
     WHERE org_id = $1
       AND created_at >= date_trunc('month', NOW())
     GROUP BY feature, action
     ORDER BY count DESC`,
    [orgId]
  );
  return rows;
}

/**
 * Get top features used across all orgs (for product decisions).
 */
async function getTopFeatures(limit = 20) {
  const { rows } = await db.query(
    `SELECT feature, action, COUNT(*) as total_uses, COUNT(DISTINCT org_id) as orgs_using
     FROM feature_usage
     WHERE created_at >= NOW() - INTERVAL '30 days'
     GROUP BY feature, action
     ORDER BY total_uses DESC
     LIMIT $1`,
    [limit]
  );
  return rows;
}

module.exports = { track, trackUsage, getMonthlyUsage, getTopFeatures };
