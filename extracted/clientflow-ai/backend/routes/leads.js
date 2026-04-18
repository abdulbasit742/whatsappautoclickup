const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { createRateLimiter } = require('../middleware/rateLimiter');

const apiRateLimit = createRateLimiter(100, 60 * 1000);
router.use(auth);

// Recalculate and get lead scores
router.post('/recalculate', apiRateLimit, async (req, res) => {
  try {
    // Hot: replied in last 24h OR total_spent > 0
    await db.query(`
      UPDATE clients SET lead_score = 'hot'
      WHERE (last_active_at > NOW() - INTERVAL '24 hours' AND reply_count > 0)
         OR total_spent_pkr > 0
    `);
    // Warm: replied in last 7 days
    await db.query(`
      UPDATE clients SET lead_score = 'warm'
      WHERE lead_score != 'hot'
        AND last_active_at > NOW() - INTERVAL '7 days'
        AND reply_count > 0
    `);
    // Cold: everyone else
    await db.query(`
      UPDATE clients SET lead_score = 'cold'
      WHERE lead_score NOT IN ('hot', 'warm')
         OR (lead_score = 'warm' AND last_active_at <= NOW() - INTERVAL '7 days')
    `);
    const counts = await db.query(`
      SELECT lead_score, COUNT(*) as count FROM clients GROUP BY lead_score
    `);
    res.json({ success: true, distribution: counts.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get lead score distribution
router.get('/distribution', async (req, res) => {
  try {
    const r = await db.query(`SELECT lead_score, COUNT(*) as count FROM clients GROUP BY lead_score`);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get hot leads
router.get('/hot', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT * FROM clients WHERE lead_score='hot' ORDER BY last_active_at DESC LIMIT 50`
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
