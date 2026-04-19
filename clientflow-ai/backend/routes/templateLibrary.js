const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// ─── List templates ───────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { type, category } = req.query;
    let q = `SELECT tl.*, tm.name AS creator_name FROM template_library tl
             LEFT JOIN team_members tm ON tm.id=tl.created_by
             WHERE tl.org_id=$1`;
    const params = [req.owner.org_id];
    if (type)     { params.push(type);     q += ` AND tl.type=$${params.length}`; }
    if (category) { params.push(category); q += ` AND tl.category=$${params.length}`; }
    q += ` ORDER BY tl.is_favorite DESC, tl.is_default DESC, tl.created_at DESC`;
    const r = await db.query(q, params);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Create template ──────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { name, type, category, content, variables, is_default } = req.body;
    const r = await db.query(
      `INSERT INTO template_library (org_id, name, type, category, content, variables, is_default, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.owner.org_id, name, type, category, content, variables || [], !!is_default, req.owner.id || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Update template ──────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const { name, type, category, content, variables, is_default, is_favorite } = req.body;
    const r = await db.query(
      `UPDATE template_library SET name=$1, type=$2, category=$3, content=$4, variables=$5,
       is_default=$6, is_favorite=$7, updated_at=NOW()
       WHERE id=$8 AND org_id=$9 RETURNING *`,
      [name, type, category, content, variables || [], !!is_default, !!is_favorite, req.params.id, req.owner.org_id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Toggle favorite ──────────────────────────────────────────
router.put('/:id/favorite', async (req, res) => {
  try {
    const r = await db.query(
      `UPDATE template_library SET is_favorite = NOT is_favorite WHERE id=$1 AND org_id=$2 RETURNING *`,
      [req.params.id, req.owner.org_id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Delete template ──────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM template_library WHERE id=$1 AND org_id=$2`, [req.params.id, req.owner.org_id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
