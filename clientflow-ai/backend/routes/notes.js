const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// ─── List notes for entity ────────────────────────────────────
router.get('/:entityType/:entityId', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT n.*, tm.name AS author_name
       FROM notes n
       LEFT JOIN team_members tm ON tm.id = n.created_by
       WHERE n.entity_type=$1 AND n.entity_id=$2 AND n.org_id=$3
       ORDER BY n.is_pinned DESC, n.created_at DESC`,
      [req.params.entityType, req.params.entityId, req.owner.org_id]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Create note ──────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { entity_type, entity_id, content, visibility, is_pinned } = req.body;
    const r = await db.query(
      `INSERT INTO notes (entity_type, entity_id, content, visibility, is_pinned, created_by, org_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [entity_type, entity_id, content, visibility || 'team', !!is_pinned, req.owner.id || null, req.owner.org_id]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Update note ──────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const { content, visibility, is_pinned } = req.body;
    const r = await db.query(
      `UPDATE notes SET content=$1, visibility=$2, is_pinned=$3, updated_at=NOW()
       WHERE id=$4 AND org_id=$5 RETURNING *`,
      [content, visibility, !!is_pinned, req.params.id, req.owner.org_id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'Note not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Delete note ──────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM notes WHERE id=$1 AND org_id=$2`, [req.params.id, req.owner.org_id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Toggle pin ───────────────────────────────────────────────
router.put('/:id/pin', async (req, res) => {
  try {
    const r = await db.query(
      `UPDATE notes SET is_pinned = NOT is_pinned WHERE id=$1 AND org_id=$2 RETURNING *`,
      [req.params.id, req.owner.org_id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
