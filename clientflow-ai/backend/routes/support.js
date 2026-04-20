const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// ── Submit support ticket ─────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { org_id, name, email, category, message, attachment_url } = req.body;
  if (!name || !email || !message) return res.status(400).json({ error: 'name, email, message are required' });
  try {
    const { rows: [ticket] } = await db.query(
      `INSERT INTO support_tickets (org_id, name, email, category, message, attachment_url)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [org_id || null, name, email, category || 'other', message, attachment_url || null]
    );
    res.status(201).json({ success: true, ticket });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── List tickets (admin inbox) ────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const { status, priority } = req.query;
    let q = `SELECT t.*, u.full_name AS assigned_to_name FROM support_tickets t
             LEFT JOIN users u ON u.id=t.assigned_to WHERE 1=1`;
    const params = [];
    if (status) { q += ` AND t.status=$${params.length+1}`; params.push(status); }
    if (priority) { q += ` AND t.priority=$${params.length+1}`; params.push(priority); }
    q += ` ORDER BY t.created_at DESC`;
    const { rows } = await db.query(q, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Update ticket status / assign ────────────────────────────────────────────
router.put('/:id', auth, async (req, res) => {
  const { status, priority, assigned_to } = req.body;
  try {
    const resolved_at = status === 'resolved' ? new Date() : null;
    const { rows: [ticket] } = await db.query(
      `UPDATE support_tickets SET status=COALESCE($1,status), priority=COALESCE($2,priority),
         assigned_to=COALESCE($3,assigned_to), resolved_at=COALESCE($4,resolved_at)
       WHERE id=$5 RETURNING *`,
      [status, priority, assigned_to, resolved_at, req.params.id]
    );
    res.json(ticket);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
