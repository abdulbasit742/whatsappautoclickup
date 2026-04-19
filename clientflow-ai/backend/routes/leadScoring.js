const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { scoreClient, scoreAllClients } = require('../services/leadScoringService');

router.use(auth);

// ─── Get score for a client ───────────────────────────────────
router.get('/:clientId', async (req, res) => {
  try {
    const c = (await db.query(
      `SELECT id, name, lead_score, lead_tier FROM clients WHERE id=$1`, [req.params.clientId]
    )).rows[0];
    if (!c) return res.status(404).json({ error: 'Client not found' });
    const history = (await db.query(
      `SELECT * FROM lead_score_history WHERE client_id=$1 ORDER BY scored_at DESC LIMIT 10`,
      [req.params.clientId]
    )).rows;
    res.json({ client: c, history });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Recalculate score ────────────────────────────────────────
router.post('/:clientId/recalculate', async (req, res) => {
  try {
    const result = await scoreClient(req.params.clientId);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Score distribution ───────────────────────────────────────
router.get('/distribution/overview', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT lead_tier, COUNT(*) AS count, AVG(lead_score) AS avg_score
       FROM clients GROUP BY lead_tier`
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
