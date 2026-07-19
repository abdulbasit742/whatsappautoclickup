const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// List all campaigns
router.get('/', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT * FROM campaigns ORDER BY created_at DESC`
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get single campaign
router.get('/:id', async (req, res) => {
  try {
    const r = await db.query(`SELECT * FROM campaigns WHERE id=$1`, [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Create campaign
router.post('/', async (req, res) => {
  try {
    const { title, message, target_audience = 'all', scheduled_at, status = 'draft' } = req.body;
    if (!title || !message) return res.status(400).json({ error: 'title and message required' });
    const r = await db.query(
      `INSERT INTO campaigns (title, message, target_audience, scheduled_at, status)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [title, message, target_audience, scheduled_at || null, status]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update campaign
router.put('/:id', async (req, res) => {
  try {
    const { title, message, target_audience, scheduled_at, status } = req.body;
    const r = await db.query(
      `UPDATE campaigns
       SET title=COALESCE($1,title),
           message=COALESCE($2,message),
           target_audience=COALESCE($3,target_audience),
           scheduled_at=COALESCE($4,scheduled_at),
           status=COALESCE($5,status)
       WHERE id=$6 RETURNING *`,
      [title, message, target_audience, scheduled_at, status, req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Delete campaign
router.delete('/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM campaigns WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
