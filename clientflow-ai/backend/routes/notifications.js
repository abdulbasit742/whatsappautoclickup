const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// ─── List notifications ───────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { unread_only } = req.query;
    let q = `SELECT * FROM notifications WHERE user_id=$1 OR (org_id=$2 AND user_id IS NULL)`;
    const params = [req.owner.id || null, req.owner.org_id];
    if (unread_only === 'true') q += ` AND is_read=false`;
    q += ` ORDER BY created_at DESC LIMIT 100`;
    const r = await db.query(q, params);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Mark as read ─────────────────────────────────────────────
router.put('/:id/read', async (req, res) => {
  try {
    await db.query(`UPDATE notifications SET is_read=true WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Mark all read ────────────────────────────────────────────
router.put('/read-all', async (req, res) => {
  try {
    await db.query(
      `UPDATE notifications SET is_read=true WHERE org_id=$1 AND (user_id=$2 OR user_id IS NULL)`,
      [req.owner.org_id, req.owner.id || null]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Unread count ─────────────────────────────────────────────
router.get('/count', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT COUNT(*) AS count FROM notifications
       WHERE is_read=false AND org_id=$1 AND (user_id=$2 OR user_id IS NULL)`,
      [req.owner.org_id, req.owner.id || null]
    );
    res.json({ count: parseInt(r.rows[0].count) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Create notification (internal) ──────────────────────────
router.post('/', async (req, res) => {
  try {
    const { user_id, type, title, body, entity_type, entity_id } = req.body;
    const r = await db.query(
      `INSERT INTO notifications (org_id, user_id, type, title, body, entity_type, entity_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.owner.org_id, user_id, type, title, body, entity_type, entity_id]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
