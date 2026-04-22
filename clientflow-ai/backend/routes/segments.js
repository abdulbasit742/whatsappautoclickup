const express = require('express');
const router  = express.Router();
const db      = require('../db');
const auth    = require('../middleware/auth');
const { predictSegment, optimizeSegments, getUpsellOpportunities, SEGMENTS } = require('../services/segmentPredictionService');

router.use(auth);

// GET /api/segments — list all segment definitions + counts
router.get('/', async (req, res) => {
  try {
    const result = await optimizeSegments();
    const segments = Object.entries(SEGMENTS).map(([key, seg]) => ({
      key,
      ...seg,
      count:   result.segmentCounts[key] || 0,
      clients: (result.segmentClients[key] || []).slice(0, 10),
    }));
    res.json({ segments, totalAnalyzed: result.totalAnalyzed });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/segments/predict/:clientId — predict segment for a client
router.get('/predict/:clientId', async (req, res) => {
  try {
    const prediction = await predictSegment(req.params.clientId);
    res.json(prediction);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/segments/upsell — get upsell opportunities
router.get('/upsell', async (req, res) => {
  try {
    const opportunities = await getUpsellOpportunities();
    res.json(opportunities);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/segments — create a custom segment rule
router.post('/', async (req, res) => {
  try {
    const { name, description, minScore, maxScore, conditions, color } = req.body;
    const r = await db.query(
      `INSERT INTO custom_segments (name, description, min_score, max_score, conditions, color, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW()) RETURNING *`,
      [name, description, minScore || 0, maxScore || 100, JSON.stringify(conditions || {}), color || 'gray']
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/segments/custom — list custom segments
router.get('/custom', async (req, res) => {
  try {
    const r = await db.query(`SELECT * FROM custom_segments ORDER BY created_at DESC`);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
