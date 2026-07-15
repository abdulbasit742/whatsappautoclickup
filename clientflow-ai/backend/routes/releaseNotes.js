const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// ── List release notes ────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const { user_id } = req.query;
    const { rows } = await db.query(
      `SELECT rn.*,
         CASE WHEN r.release_note_id IS NOT NULL THEN TRUE ELSE FALSE END AS is_read
       FROM release_notes rn
       LEFT JOIN release_note_reads r ON r.release_note_id=rn.id AND r.user_id=$1
       ORDER BY rn.published_at DESC`,
      [user_id || null]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Unread count ──────────────────────────────────────────────────────────────
router.get('/unread-count', auth, async (req, res) => {
  try {
    const { user_id } = req.query;
    const { rows: [row] } = await db.query(
      `SELECT COUNT(*) AS unread
       FROM release_notes rn
       LEFT JOIN release_note_reads r ON r.release_note_id=rn.id AND r.user_id=$1
       WHERE r.release_note_id IS NULL`,
      [user_id || null]
    );
    res.json({ unread: parseInt(row.unread) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Create release note (admin) ───────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  const { version, title, body, highlights } = req.body;
  try {
    const { rows: [note] } = await db.query(
      `INSERT INTO release_notes (version, title, body, highlights) VALUES ($1,$2,$3,$4) RETURNING *`,
      [version, title, body, JSON.stringify(highlights || [])]
    );
    res.status(201).json(note);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Mark as read ──────────────────────────────────────────────────────────────
router.post('/:id/read', auth, async (req, res) => {
  const { user_id } = req.body;
  try {
    await db.query(
      `INSERT INTO release_note_reads (release_note_id, user_id)
       VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [req.params.id, user_id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Mark all as read ──────────────────────────────────────────────────────────
router.post('/read-all', auth, async (req, res) => {
  const { user_id } = req.body;
  try {
    const { rows: notes } = await db.query(`SELECT id FROM release_notes`);
    for (const note of notes) {
      await db.query(
        `INSERT INTO release_note_reads (release_note_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [note.id, user_id]
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
