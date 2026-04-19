const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/ai-training — list training data
router.get('/', async (req, res) => {
  try {
    const { label } = req.query;
    let q = `SELECT * FROM ai_training_data WHERE 1=1`;
    const params = [];
    if (label) { params.push(label); q += ` AND label=$${params.length}`; }
    q += ` ORDER BY created_at DESC LIMIT 100`;
    const r = await db.query(q, params);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/ai-training — add training example
router.post('/', async (req, res) => {
  try {
    const { client_id, input, output, label, quality } = req.body;
    const r = await db.query(
      `INSERT INTO ai_training_data (client_id, input, output, label, quality)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [client_id || null, input, output, label || null, quality || 3]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/ai-training/:id — update label/quality
router.put('/:id', async (req, res) => {
  try {
    const { label, quality, used_in_prompt } = req.body;
    const r = await db.query(
      `UPDATE ai_training_data SET label=$1,quality=$2,used_in_prompt=$3 WHERE id=$4 RETURNING *`,
      [label, quality, used_in_prompt, req.params.id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/ai-training/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM ai_training_data WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/ai-training/stats
router.get('/stats', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT label, COUNT(*) AS count, AVG(quality)::NUMERIC(3,1) AS avg_quality
       FROM ai_training_data GROUP BY label ORDER BY count DESC`
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
