/**
 * planLimits middleware
 * Usage:  router.post('/', planLimits('broadcasts'), handler)
 *
 * Supported features: 'broadcasts' | 'ai_messages' | 'appointments' | 'clients'
 */
const db = require('../db');

module.exports = function planLimits(feature) {
  return async function (req, res, next) {
    if (!req.owner) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const r = await db.query(
        `SELECT s.id, s.status,
                s.usage_broadcasts, s.usage_ai_messages,
                s.usage_appointments, s.usage_clients,
                p.max_broadcasts, p.max_ai_messages,
                p.max_appointments, p.max_clients,
                p.ai_enabled, p.analytics_enabled,
                p.referrals_enabled, p.whatsapp_api_enabled,
                p.name as plan_name
         FROM subscriptions s
         JOIN plans p ON p.id = s.plan_id
         WHERE s.owner_email = $1 AND s.status IN ('active','trialing')
         ORDER BY s.created_at DESC LIMIT 1`,
        [req.owner.email]
      );

      const sub = r.rows[0];
      if (!sub) {
        return res.status(402).json({
          error: 'No active subscription. Please choose a plan to continue.',
          code: 'NO_SUBSCRIPTION',
        });
      }

      // ─── Flag-based feature checks ──────────────────────────────────────────
      const flagMap = {
        ai_messages:   sub.ai_enabled,
        analytics:     sub.analytics_enabled,
        referrals:     sub.referrals_enabled,
        whatsapp_api:  sub.whatsapp_api_enabled,
      };
      if (feature in flagMap && !flagMap[feature]) {
        return res.status(403).json({
          error: `This feature is not available on your current plan (${sub.plan_name}). Please upgrade.`,
          code: 'FEATURE_NOT_AVAILABLE',
          plan: sub.plan_name,
        });
      }

      // ─── Usage-based quota checks ────────────────────────────────────────────
      const limitKey = `max_${feature}`;
      const usageKey = `usage_${feature}`;
      const limit = sub[limitKey];
      const used  = sub[usageKey];

      if (limit !== undefined && limit !== -1 && used >= limit) {
        return res.status(429).json({
          error: `You have reached your ${feature.replace('_', ' ')} limit (${limit}) for this billing period. Please upgrade your plan.`,
          code: 'QUOTA_EXCEEDED',
          feature,
          used,
          limit,
          plan: sub.plan_name,
        });
      }

      // Attach subscription info for downstream use
      req.subscription = sub;
      next();
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
};
