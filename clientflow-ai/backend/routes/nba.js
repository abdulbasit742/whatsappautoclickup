const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { generateRecommendations, ACTIONS } = require('../services/nbaService');

router.use(auth);

// ─── Get recommendations for a client ────────────────────────
router.get('/:clientId', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT * FROM nba_recommendations WHERE client_id=$1 AND is_dismissed=false ORDER BY priority ASC`,
      [req.params.clientId]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Refresh recommendations ──────────────────────────────────
router.post('/:clientId/refresh', async (req, res) => {
  try {
    const recs = await generateRecommendations(req.params.clientId);
    res.json(recs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Dismiss recommendation ───────────────────────────────────
router.put('/:id/dismiss', async (req, res) => {
  try {
    await db.query(`UPDATE nba_recommendations SET is_dismissed=true WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Available action types ───────────────────────────────────
router.get('/actions/types', (req, res) => {
  res.json(ACTIONS);
});

module.exports = router;
