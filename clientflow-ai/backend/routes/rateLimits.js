const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const { getViolations, getCurrentUsage, PLAN_LIMITS } = require('../middleware/rateLimiter');
const db      = require('../db');

router.use(auth);

// GET /api/rate-limits — current limits and usage
router.get('/', (req, res) => {
  try {
    const userId = req.owner?.id || 'anonymous';
    const orgId  = req.owner?.org_id || 'default';
    const ip     = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || 'unknown';
    const plan   = req.owner?.plan || 'pro';

    const usage = getCurrentUsage(userId, orgId, ip);
    res.json({
      plan,
      limits:    PLAN_LIMITS[plan] || PLAN_LIMITS.pro,
      usage,
      allPlans:  PLAN_LIMITS,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/rate-limits/:userId — adjust limits for a user (store custom limit in DB)
router.put('/:userId', async (req, res) => {
  try {
    const { userLimit, orgLimit, ipLimit } = req.body;
    await db.query(
      `INSERT INTO rate_limit_overrides (user_id, user_limit, org_limit, ip_limit, updated_at)
       VALUES ($1,$2,$3,$4,NOW())
       ON CONFLICT (user_id) DO UPDATE SET user_limit=$2, org_limit=$3, ip_limit=$4, updated_at=NOW()`,
      [req.params.userId, userLimit, orgLimit, ipLimit]
    );
    res.json({ success: true, userId: req.params.userId, limits: { user: userLimit, org: orgLimit, ip: ipLimit } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/rate-limits/violations — blocked requests log
router.get('/violations', (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const vio = getViolations(parseInt(limit));
    res.json({ violations: vio, total: vio.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
