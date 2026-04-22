const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const { scoreLeads, predictConversion, prioritizeLeads, computeLeadScore } = require('../services/leadScoringService');

router.use(auth);

// GET /api/leads/scores — all lead scores
router.get('/scores', async (req, res) => {
  try {
    const scores = await scoreLeads();
    res.json(scores);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/leads/score/:clientId — individual score
router.get('/score/:clientId', async (req, res) => {
  try {
    const score = await computeLeadScore(req.params.clientId);
    if (!score) return res.status(404).json({ error: 'Client not found' });
    res.json(score);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/leads/refresh — recalculate all scores
router.post('/refresh', async (req, res) => {
  try {
    const scores = await scoreLeads();
    res.json({ refreshed: scores.length, topScore: scores[0]?.score, timestamp: new Date().toISOString() });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/leads/priority — top priority leads
router.get('/priority', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const leads = await prioritizeLeads(parseInt(limit));
    res.json(leads);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/leads/conversion/:clientId — conversion prediction
router.get('/conversion/:clientId', async (req, res) => {
  try {
    const result = await predictConversion(req.params.clientId);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
