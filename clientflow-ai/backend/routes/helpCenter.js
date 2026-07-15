const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// ── Categories ────────────────────────────────────────────────────────────────
router.get('/categories', async (_req, res) => {
  try {
    const { rows } = await db.query(`SELECT * FROM help_categories ORDER BY sort_order, name`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/categories', auth, async (req, res) => {
  const { name, slug, icon, sort_order } = req.body;
  try {
    const { rows: [cat] } = await db.query(
      `INSERT INTO help_categories (name, slug, icon, sort_order) VALUES ($1,$2,$3,$4) RETURNING *`,
      [name, slug, icon, sort_order || 0]
    );
    res.status(201).json(cat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Articles ──────────────────────────────────────────────────────────────────
router.get('/articles', async (req, res) => {
  try {
    const { category_id, featured, q } = req.query;
    let query = `SELECT a.*, c.name AS category_name FROM help_articles a
                 LEFT JOIN help_categories c ON c.id=a.category_id
                 WHERE a.is_published=TRUE`;
    const params = [];
    if (category_id) { query += ` AND a.category_id=$${params.length+1}`; params.push(category_id); }
    if (featured === 'true') { query += ` AND a.is_featured=TRUE`; }
    if (q) { query += ` AND (a.title ILIKE $${params.length+1} OR a.body ILIKE $${params.length+1})`; params.push(`%${q}%`); }
    query += ` ORDER BY a.is_featured DESC, a.view_count DESC`;
    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/articles/:id', async (req, res) => {
  try {
    const { rows: [art] } = await db.query(
      `SELECT a.*, c.name AS category_name FROM help_articles a
       LEFT JOIN help_categories c ON c.id=a.category_id
       WHERE a.id=$1`,
      [req.params.id]
    );
    if (!art) return res.status(404).json({ error: 'Not found' });
    await db.query(`UPDATE help_articles SET view_count=view_count+1 WHERE id=$1`, [req.params.id]);
    res.json(art);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/articles', auth, async (req, res) => {
  const { category_id, title, slug, body, is_featured } = req.body;
  try {
    const { rows: [art] } = await db.query(
      `INSERT INTO help_articles (category_id, title, slug, body, is_featured) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [category_id, title, slug, body, is_featured || false]
    );
    res.status(201).json(art);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/articles/:id', auth, async (req, res) => {
  const { title, body, is_featured, is_published } = req.body;
  try {
    const { rows: [art] } = await db.query(
      `UPDATE help_articles SET title=$1,body=$2,is_featured=$3,is_published=$4,updated_at=NOW()
       WHERE id=$5 RETURNING *`,
      [title, body, is_featured, is_published, req.params.id]
    );
    res.json(art);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
