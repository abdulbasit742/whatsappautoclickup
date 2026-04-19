const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/dashboard-builder — list all layouts
router.get('/', async (req, res) => {
  try {
    const r = await db.query(`SELECT * FROM dashboard_layouts ORDER BY created_at DESC`);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/dashboard-builder — create layout
router.post('/', async (req, res) => {
  try {
    const { name, widgets, is_default } = req.body;
    if (is_default) {
      await db.query(`UPDATE dashboard_layouts SET is_default=false`);
    }
    const r = await db.query(
      `INSERT INTO dashboard_layouts (name, widgets, is_default) VALUES ($1,$2,$3) RETURNING *`,
      [name, JSON.stringify(widgets || []), is_default || false]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/dashboard-builder/:id
router.get('/:id', async (req, res) => {
  try {
    const r = await db.query(`SELECT * FROM dashboard_layouts WHERE id=$1`, [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/dashboard-builder/:id — update layout
router.put('/:id', async (req, res) => {
  try {
    const { name, widgets, is_default } = req.body;
    if (is_default) {
      await db.query(`UPDATE dashboard_layouts SET is_default=false`);
    }
    const r = await db.query(
      `UPDATE dashboard_layouts SET name=$1,widgets=$2,is_default=$3,updated_at=NOW() WHERE id=$4 RETURNING *`,
      [name, JSON.stringify(widgets || []), is_default || false, req.params.id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/dashboard-builder/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM dashboard_layouts WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
