const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const r = await db.query(`SELECT * FROM templates ORDER BY usage_count DESC`);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { name, category, content } = req.body;
    const r = await db.query(
      `INSERT INTO templates (name,category,content) VALUES ($1,$2,$3) RETURNING *`,
      [name, category, content]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, category, content } = req.body;
    const r = await db.query(
      `UPDATE templates SET name=$1,category=$2,content=$3 WHERE id=$4 RETURNING *`,
      [name, category, content, req.params.id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM templates WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/use', async (req, res) => {
  try {
    await db.query(`UPDATE templates SET usage_count=usage_count+1 WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
