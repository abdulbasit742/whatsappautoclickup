/**
 * PROMPT 111 — Custom Domain Routes
 * PROMPT 110 — White-Label / Branding Routes
 */

const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const { requireRole } = require('../middleware/orgIsolation');
const whitelabelService = require('../services/whitelabelService');
const { asyncHandler, ValidationError } = require('../middleware/errorHandler');

router.use(auth);
router.use(apiLimiter);

// ─── Branding ────────────────────────────────────────────────────────────────

/** GET /api/branding — Get org branding config */
router.get('/branding', asyncHandler(async (req, res) => {
  const branding = await whitelabelService.getBranding(req.owner.org_id);
  res.json(branding || {});
}));

/** PUT /api/branding — Update org branding (owner/admin only) */
router.put('/branding', requireRole('owner', 'admin'), asyncHandler(async (req, res) => {
  const { brandName, logoUrl, primaryColor, secondaryColor, customCss } = req.body;
  if (primaryColor && !/^#[0-9A-Fa-f]{6}$/.test(primaryColor)) {
    throw new ValidationError('Invalid primaryColor format — must be hex e.g. #10B981');
  }
  await whitelabelService.updateBranding(req.owner.org_id, { brandName, logoUrl, primaryColor, secondaryColor, customCss });
  res.json({ message: 'Branding updated successfully' });
}));

// ─── Custom Domain ────────────────────────────────────────────────────────────

/** POST /api/domains/initiate — Start custom domain setup */
router.post('/domains/initiate', requireRole('owner', 'admin'), asyncHandler(async (req, res) => {
  const { domain } = req.body;
  if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) {
    throw new ValidationError('Invalid domain format');
  }
  const result = await whitelabelService.initiateCustomDomain(req.owner.org_id, domain);
  res.json(result);
}));

/** POST /api/domains/verify — Trigger DNS TXT verification */
router.post('/domains/verify', requireRole('owner', 'admin'), asyncHandler(async (req, res) => {
  const result = await whitelabelService.verifyCustomDomain(req.owner.org_id);
  res.json(result);
}));

/** GET /api/domains — Get current domain status */
router.get('/domains', asyncHandler(async (req, res) => {
  const db = require('../db/index');
  const { rows } = await db.query(
    `SELECT domain, verified, verified_at, txt_record, ssl_provisioned, created_at
     FROM custom_domains WHERE org_id = $1`,
    [req.owner.org_id]
  );
  res.json(rows[0] || null);
}));

module.exports = router;
