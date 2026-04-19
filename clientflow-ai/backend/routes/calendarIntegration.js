const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// ─── List calendar integrations ───────────────────────────────
router.get('/', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT id, provider, email, last_synced_at, is_active, created_at
       FROM calendar_integrations WHERE org_id=$1`,
      [req.owner.org_id]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Connect calendar ─────────────────────────────────────────
router.post('/connect', async (req, res) => {
  try {
    const { provider, email, access_token, refresh_token, token_expiry } = req.body;
    const r = await db.query(
      `INSERT INTO calendar_integrations (org_id, provider, email, access_token, refresh_token, token_expiry)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.owner.org_id, provider || 'google', email, access_token, refresh_token, token_expiry]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Disconnect calendar ──────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM calendar_integrations WHERE id=$1 AND org_id=$2`, [req.params.id, req.owner.org_id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── List events ──────────────────────────────────────────────
router.get('/events', async (req, res) => {
  try {
    const { from, to } = req.query;
    let q = `SELECT ce.*, c.name AS client_name FROM calendar_events ce
             LEFT JOIN clients c ON c.id=ce.client_id WHERE ce.org_id=$1`;
    const params = [req.owner.org_id];
    if (from) { params.push(from); q += ` AND ce.start_at >= $${params.length}`; }
    if (to)   { params.push(to);   q += ` AND ce.start_at <= $${params.length}`; }
    q += ` ORDER BY ce.start_at ASC`;
    const r = await db.query(q, params);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Create event ─────────────────────────────────────────────
router.post('/events', async (req, res) => {
  try {
    const { integration_id, title, description, start_at, end_at, client_id, followup_id } = req.body;
    const r = await db.query(
      `INSERT INTO calendar_events (org_id, integration_id, title, description, start_at, end_at, client_id, followup_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.owner.org_id, integration_id, title, description, start_at, end_at, client_id, followup_id]
    );
    // In production: sync to Google Calendar API here
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Delete event ─────────────────────────────────────────────
router.delete('/events/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM calendar_events WHERE id=$1 AND org_id=$2`, [req.params.id, req.owner.org_id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
