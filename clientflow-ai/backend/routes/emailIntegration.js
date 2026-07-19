const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// ─── List email integrations ──────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT id, provider, email, last_synced_at, is_active, created_at
       FROM email_integrations WHERE org_id=$1`,
      [req.owner.org_id]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Connect email account ────────────────────────────────────
router.post('/connect', async (req, res) => {
  try {
    const { provider, email, access_token, refresh_token, token_expiry } = req.body;
    const r = await db.query(
      `INSERT INTO email_integrations (org_id, provider, email, access_token, refresh_token, token_expiry)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT DO NOTHING RETURNING *`,
      [req.owner.org_id, provider || 'gmail', email, access_token, refresh_token, token_expiry]
    );
    res.status(201).json(r.rows[0] || { message: 'Already connected' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Disconnect ───────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM email_integrations WHERE id=$1 AND org_id=$2`, [req.params.id, req.owner.org_id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── List email threads ───────────────────────────────────────
router.get('/threads', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT et.*, c.name AS client_name FROM email_threads et
       LEFT JOIN clients c ON c.id=et.client_id
       WHERE et.org_id=$1 ORDER BY et.last_message_at DESC LIMIT 50`,
      [req.owner.org_id]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Get messages in thread ───────────────────────────────────
router.get('/threads/:threadId/messages', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT * FROM email_messages WHERE thread_id=$1 ORDER BY sent_at ASC`,
      [req.params.threadId]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Send email ───────────────────────────────────────────────
router.post('/send', async (req, res) => {
  try {
    const { integration_id, to_email, subject, body, thread_id } = req.body;
    // In production: use Gmail API / SMTP here
    const r = await db.query(
      `INSERT INTO email_messages (thread_id, from_email, to_email, subject, body, direction, sent_at)
       VALUES ($1, (SELECT email FROM email_integrations WHERE id=$2), $3, $4, $5, 'outbound', NOW())
       RETURNING *`,
      [thread_id, integration_id, to_email, subject, body]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Link thread to contact ───────────────────────────────────
router.put('/threads/:id/link', async (req, res) => {
  try {
    const { client_id } = req.body;
    const r = await db.query(
      `UPDATE email_threads SET client_id=$1 WHERE id=$2 AND org_id=$3 RETURNING *`,
      [client_id, req.params.id, req.owner.org_id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
