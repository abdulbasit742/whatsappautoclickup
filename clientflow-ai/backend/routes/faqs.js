const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// ── Categories ────────────────────────────────────────────────────────────────
router.get('/categories', async (_req, res) => {
  try {
    const { rows } = await db.query(`SELECT * FROM faq_categories ORDER BY sort_order, name`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/categories', auth, async (req, res) => {
  const { name, sort_order } = req.body;
  try {
    const { rows: [cat] } = await db.query(
      `INSERT INTO faq_categories (name, sort_order) VALUES ($1,$2) RETURNING *`,
      [name, sort_order || 0]
    );
    res.status(201).json(cat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── FAQs ──────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { category_id, q } = req.query;
    let query = `SELECT f.*, c.name AS category_name FROM faqs f
                 LEFT JOIN faq_categories c ON c.id=f.category_id
                 WHERE f.is_published=TRUE`;
    const params = [];
    if (category_id) { query += ` AND f.category_id=$${params.length+1}`; params.push(category_id); }
    if (q) { query += ` AND (f.question ILIKE $${params.length+1} OR f.answer ILIKE $${params.length+1})`; params.push(`%${q}%`); }
    query += ` ORDER BY c.sort_order, f.sort_order, f.created_at`;
    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  const { category_id, question, answer, sort_order } = req.body;
  try {
    const { rows: [faq] } = await db.query(
      `INSERT INTO faqs (category_id, question, answer, sort_order) VALUES ($1,$2,$3,$4) RETURNING *`,
      [category_id, question, answer, sort_order || 0]
    );
    res.status(201).json(faq);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  const { question, answer, sort_order, is_published } = req.body;
  try {
    const { rows: [faq] } = await db.query(
      `UPDATE faqs SET question=$1,answer=$2,sort_order=$3,is_published=$4,updated_at=NOW()
       WHERE id=$5 RETURNING *`,
      [question, answer, sort_order, is_published, req.params.id]
    );
    res.json(faq);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query(`DELETE FROM faqs WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Reorder ───────────────────────────────────────────────────────────────────
router.post('/reorder', auth, async (req, res) => {
  const { items } = req.body; // [{ id, sort_order }]
  try {
    for (const item of items) {
      await db.query(`UPDATE faqs SET sort_order=$1 WHERE id=$2`, [item.sort_order, item.id]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
