const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// Features tracked: crm, inbox, campaigns, ai_center, billing, integrations

// POST /api/feature-adoption/track — log a feature usage event
router.post('/track', async (req, res) => {
  try {
    const { client_id, feature } = req.body;
    const allowed = ['crm', 'inbox', 'campaigns', 'ai_center', 'billing', 'integrations'];
    if (!allowed.includes(feature)) return res.status(400).json({ error: 'Invalid feature' });
    const r = await db.query(
      `INSERT INTO feature_usage (client_id, feature, last_used_at, use_count)
       VALUES ($1,$2,NOW(),1)
       ON CONFLICT (client_id, feature)
       DO UPDATE SET last_used_at=NOW(), use_count=feature_usage.use_count+1
       RETURNING *`,
      [client_id, feature]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/feature-adoption/summary — adoption rates per feature
router.get('/summary', async (req, res) => {
  try {
    const total = parseInt((await db.query(`SELECT COUNT(*) FROM clients`)).rows[0].count);
    const features = await db.query(
      `SELECT feature,
              COUNT(DISTINCT client_id) AS adopters,
              SUM(use_count) AS total_uses,
              ROUND(AVG(use_count),1) AS avg_depth
       FROM feature_usage GROUP BY feature`
    );
    const result = features.rows.map(f => ({
      feature: f.feature,
      adopters: parseInt(f.adopters),
      adoptionPct: total > 0 ? ((parseInt(f.adopters) / total) * 100).toFixed(1) : '0.0',
      totalUses: parseInt(f.total_uses),
      avgDepth: parseFloat(f.avg_depth),
    }));
    res.json({ total_clients: total, features: result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/feature-adoption/most-used — ranked modules
router.get('/most-used', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT feature, SUM(use_count) AS total_uses, COUNT(DISTINCT client_id) AS unique_users
       FROM feature_usage GROUP BY feature ORDER BY total_uses DESC`
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/feature-adoption/trend — daily feature usage last 30d
router.get('/trend', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT DATE_TRUNC('day', last_used_at) as date, feature, COUNT(*) as count
       FROM feature_usage WHERE last_used_at > NOW() - INTERVAL '30 days'
       GROUP BY 1,2 ORDER BY 1`
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
