const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// List integrations
router.get('/', async (req, res) => {
  try {
    const r = await db.query(`SELECT id, name, is_enabled, last_synced, created_at FROM integrations ORDER BY name`);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get integration config
router.get('/:name', async (req, res) => {
  try {
    const r = await db.query(`SELECT * FROM integrations WHERE name=$1`, [req.params.name]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Integration not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Upsert integration config
router.post('/:name', async (req, res) => {
  try {
    const { config, is_enabled } = req.body;
    const r = await db.query(
      `INSERT INTO integrations (name, config, is_enabled)
       VALUES ($1,$2,$3)
       ON CONFLICT (name) DO UPDATE SET config=$2, is_enabled=$3
       RETURNING *`,
      [req.params.name, JSON.stringify(config || {}), is_enabled ?? false]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Toggle integration
router.patch('/:name/toggle', async (req, res) => {
  try {
    const r = await db.query(
      `UPDATE integrations SET is_enabled = NOT is_enabled WHERE name=$1 RETURNING *`,
      [req.params.name]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Webhook endpoints management
router.get('/webhooks/endpoints', async (req, res) => {
  try {
    const r = await db.query(`SELECT * FROM webhook_endpoints ORDER BY created_at DESC`);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/webhooks/endpoints', async (req, res) => {
  try {
    const { url, events } = req.body;
    const secret = require('crypto').randomBytes(16).toString('hex');
    const r = await db.query(
      `INSERT INTO webhook_endpoints (url, events, secret) VALUES ($1,$2,$3) RETURNING *`,
      [url, events || ['message.inbound'], secret]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/webhooks/endpoints/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM webhook_endpoints WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
