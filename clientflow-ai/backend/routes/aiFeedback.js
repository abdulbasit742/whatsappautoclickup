const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/ai-feedback — list feedback
router.get('/', async (req, res) => {
  try {
    const r = await db.query(`SELECT * FROM ai_feedback ORDER BY created_at DESC LIMIT 100`);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/ai-feedback — submit feedback
router.post('/', async (req, res) => {
  try {
    const { message_id, client_id, provider, prompt, response, rating, comment } = req.body;
    const r = await db.query(
      `INSERT INTO ai_feedback (message_id, client_id, provider, prompt, response, rating, comment)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [message_id || null, client_id || null, provider, prompt, response, rating, comment || null]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/ai-feedback/stats — thumbs up/down summary
router.get('/stats', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT provider,
         COUNT(*) FILTER (WHERE rating=1) AS thumbs_up,
         COUNT(*) FILTER (WHERE rating=-1) AS thumbs_down,
         COUNT(*) AS total
       FROM ai_feedback GROUP BY provider`
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
