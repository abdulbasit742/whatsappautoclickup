/**
 * PROMPT 107 — Feature Usage Tracking Routes
 * PROMPT 115 — API Versioning — v1 index router
 */

const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const { requireRole } = require('../middleware/orgIsolation');
const featureTracker = require('../services/featureTracker');
const { asyncHandler } = require('../middleware/errorHandler');

router.use(auth);

/** GET /api/usage/monthly — Monthly feature usage for current org */
router.get('/monthly', asyncHandler(async (req, res) => {
  const usage = await featureTracker.getMonthlyUsage(req.owner.org_id);
  res.json({ usage });
}));

/** GET /api/usage/top-features — Top features (admin only) */
router.get('/top-features', requireRole('owner'), asyncHandler(async (_req, res) => {
  const features = await featureTracker.getTopFeatures(20);
  res.json({ features });
}));

module.exports = router;
