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
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
    if (!content?.trim()) return res.status(400).json({ error: 'content is required' });
    const r = await db.query(
      `INSERT INTO templates (name,category,content) VALUES ($1,$2,$3) RETURNING *`,
      [name.trim(), category || null, content.trim()]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, category, content } = req.body;
    const r = await db.query(
      `UPDATE templates
       SET name     = COALESCE($1, name),
           category = COALESCE($2, category),
           content  = COALESCE($3, content)
       WHERE id=$4 RETURNING *`,
      [
        name    !== undefined ? name    : null,
        category !== undefined ? category : null,
        content !== undefined ? content : null,
        req.params.id,
      ]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'Template not found' });
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
