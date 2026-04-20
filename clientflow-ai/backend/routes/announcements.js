const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// ── List active announcements ─────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const { user_id } = req.query;
    let query = `
      SELECT a.*, 
        CASE WHEN d.announcement_id IS NOT NULL THEN TRUE ELSE FALSE END AS dismissed
      FROM announcements a
      LEFT JOIN announcement_dismissals d ON d.announcement_id=a.id AND d.user_id=$1
      WHERE a.is_active=TRUE AND a.starts_at <= NOW()
        AND (a.ends_at IS NULL OR a.ends_at > NOW())
      ORDER BY a.created_at DESC`;
    const { rows } = await db.query(query, [user_id || null]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Create announcement (admin) ───────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  const { title, body, type = 'info', target_plan, starts_at, ends_at, created_by } = req.body;
  try {
    const { rows: [ann] } = await db.query(
      `INSERT INTO announcements (title, body, type, target_plan, starts_at, ends_at, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [title, body, type, target_plan || null, starts_at || new Date(), ends_at || null, created_by || null]
    );
    res.status(201).json(ann);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Update announcement ───────────────────────────────────────────────────────
router.put('/:id', auth, async (req, res) => {
  const { title, body, type, target_plan, starts_at, ends_at, is_active } = req.body;
  try {
    const { rows: [ann] } = await db.query(
      `UPDATE announcements SET title=$1,body=$2,type=$3,target_plan=$4,starts_at=$5,ends_at=$6,is_active=$7
       WHERE id=$8 RETURNING *`,
      [title, body, type, target_plan, starts_at, ends_at, is_active, req.params.id]
    );
    res.json(ann);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Dismiss announcement ──────────────────────────────────────────────────────
router.post('/:id/dismiss', auth, async (req, res) => {
  const { user_id } = req.body;
  try {
    await db.query(
      `INSERT INTO announcement_dismissals (announcement_id, user_id)
       VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [req.params.id, user_id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Delete announcement ───────────────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query(`UPDATE announcements SET is_active=FALSE WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
