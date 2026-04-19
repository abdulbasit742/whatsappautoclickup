const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');

router.use(auth);
router.use(apiLimiter);

router.get('/', async (req, res) => {
  try {
    const { client_id } = req.query;
    let query = `SELECT r.*, c.name, c.whatsapp_number FROM reviews r LEFT JOIN clients c ON c.id=r.client_id`;
    const params = [];
    if (client_id) { query += ` WHERE r.client_id=$1`; params.push(client_id); }
    query += ` ORDER BY r.created_at DESC`;
    const r = await db.query(query, params);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/stats', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT COALESCE(AVG(rating),0) as avg_rating, COUNT(*) as total,
       SUM(CASE WHEN sentiment='positive' THEN 1 ELSE 0 END) as positive,
       SUM(CASE WHEN sentiment='neutral' THEN 1 ELSE 0 END) as neutral,
       SUM(CASE WHEN sentiment='negative' THEN 1 ELSE 0 END) as negative
       FROM reviews`
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
