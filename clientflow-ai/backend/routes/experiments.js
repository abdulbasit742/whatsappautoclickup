/**
 * PROMPT 108 — A/B Testing Routes
 */

const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const { requireRole } = require('../middleware/orgIsolation');
const abTestService = require('../services/abTestService');
const { asyncHandler, ValidationError } = require('../middleware/errorHandler');

router.use(auth);
router.use(apiLimiter);

/** GET /api/experiments — List all experiments */
router.get('/', asyncHandler(async (req, res) => {
  const experiments = await abTestService.listExperiments(req.owner.org_id);
  res.json({ experiments });
}));

/** POST /api/experiments — Create a new experiment */
router.post('/', requireRole('owner', 'admin'), asyncHandler(async (req, res) => {
  const { name, description, type, trafficSplit, variantA, variantB } = req.body;
  if (!name || !type) throw new ValidationError('name and type are required');
  if (!['broadcast', 'ai_response', 'ui', 'pricing'].includes(type)) {
    throw new ValidationError('Invalid experiment type');
  }
  const db = require('../db/index');
  const { rows } = await db.query(
    `INSERT INTO ab_experiments (org_id, name, description, type, traffic_split, variant_a, variant_b)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [req.owner.org_id, name, description, type, trafficSplit || 50,
     JSON.stringify(variantA || {}), JSON.stringify(variantB || {})]
  );
  res.status(201).json(rows[0]);
}));

/** PUT /api/experiments/:id/start — Start an experiment */
router.put('/:id/start', requireRole('owner', 'admin'), asyncHandler(async (req, res) => {
  const db = require('../db/index');
  await db.query(
    `UPDATE ab_experiments SET status = 'running', started_at = NOW()
     WHERE id = $1 AND org_id = $2`,
    [req.params.id, req.owner.org_id]
  );
  res.json({ message: 'Experiment started' });
}));

/** GET /api/experiments/:id/results — Get experiment results */
router.get('/:id/results', asyncHandler(async (req, res) => {
  const results = await abTestService.getResults(req.params.id, req.owner.org_id);
  res.json({ results });
}));

/** POST /api/experiments/:id/winner — Declare winner */
router.post('/:id/winner', requireRole('owner', 'admin'), asyncHandler(async (req, res) => {
  const { winner } = req.body;
  if (!['A', 'B'].includes(winner)) throw new ValidationError('winner must be A or B');
  await abTestService.setWinner(req.params.id, req.owner.org_id, winner);
  res.json({ message: `Experiment completed. Variant ${winner} declared as winner.` });
}));

/** POST /api/experiments/:id/convert — Record a conversion */
router.post('/:id/convert', asyncHandler(async (req, res) => {
  const { clientId } = req.body;
  if (!clientId) throw new ValidationError('clientId is required');
  await abTestService.recordConversion(req.params.id, clientId);
  res.json({ message: 'Conversion recorded' });
}));

module.exports = router;
