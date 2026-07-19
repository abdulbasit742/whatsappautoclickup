const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// ─── Get timeline for a client ────────────────────────────────
router.get('/:clientId', async (req, res) => {
  try {
    const { type, limit = 50, offset = 0 } = req.query;
    let q = `SELECT * FROM timeline_events WHERE client_id=$1`;
    const params = [req.params.clientId];
    if (type) { params.push(type); q += ` AND event_type=$${params.length}`; }
    q += ` ORDER BY created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`;
    params.push(limit, offset);
    const r = await db.query(q, params);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Add timeline event ───────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { client_id, event_type, metadata } = req.body;
    const r = await db.query(
      `INSERT INTO timeline_events (client_id, event_type, metadata, created_by)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [client_id, event_type, JSON.stringify(metadata || {}), req.owner.id || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Event type summary for a client ─────────────────────────
router.get('/:clientId/summary', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT event_type, COUNT(*) AS count, MAX(created_at) AS last_at
       FROM timeline_events WHERE client_id=$1 GROUP BY event_type ORDER BY last_at DESC`,
      [req.params.clientId]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
