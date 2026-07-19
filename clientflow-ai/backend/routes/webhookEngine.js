const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const crypto = require('crypto');
const axios = require('axios');

router.use(auth);

// ─── List outgoing webhooks ───────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT id, name, url, events, is_active, created_at FROM outgoing_webhooks WHERE org_id=$1`,
      [req.owner.org_id]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Create webhook ───────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { name, url, events } = req.body;
    const secret = crypto.randomBytes(24).toString('hex');
    const r = await db.query(
      `INSERT INTO outgoing_webhooks (org_id, name, url, secret, events)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.owner.org_id, name, url, secret, events || []]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Update webhook ───────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const { name, url, events, is_active } = req.body;
    const r = await db.query(
      `UPDATE outgoing_webhooks SET name=$1, url=$2, events=$3, is_active=$4
       WHERE id=$5 AND org_id=$6 RETURNING *`,
      [name, url, events, is_active !== false, req.params.id, req.owner.org_id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Delete webhook ───────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM outgoing_webhooks WHERE id=$1 AND org_id=$2`, [req.params.id, req.owner.org_id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Webhook logs ─────────────────────────────────────────────
router.get('/:id/logs', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT * FROM webhook_logs WHERE webhook_id=$1 ORDER BY created_at DESC LIMIT 100`,
      [req.params.id]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Test webhook ─────────────────────────────────────────────
router.post('/:id/test', async (req, res) => {
  try {
    const wh = (await db.query(
      `SELECT * FROM outgoing_webhooks WHERE id=$1 AND org_id=$2`, [req.params.id, req.owner.org_id]
    )).rows[0];
    if (!wh) return res.status(404).json({ error: 'Webhook not found' });
    const payload = { event: 'test', data: { message: 'Test from ClientFlow AI' }, timestamp: new Date().toISOString() };
    const sig = crypto.createHmac('sha256', wh.secret).update(JSON.stringify(payload)).digest('hex');
    const response = await axios.post(wh.url, payload, {
      headers: { 'X-ClientFlow-Signature': sig },
      timeout: 5000,
    });
    await db.query(
      `INSERT INTO webhook_logs (webhook_id, event, payload, response_status, response_body, status)
       VALUES ($1,'test',$2,$3,$4,'success')`,
      [wh.id, JSON.stringify(payload), response.status, String(response.data).slice(0,500)]
    );
    res.json({ success: true, status: response.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Trigger webhook (internal helper) ───────────────────────
async function triggerWebhooks(orgId, event, data) {
  try {
    const whs = (await db.query(
      `SELECT * FROM outgoing_webhooks WHERE org_id=$1 AND is_active=true AND $2=ANY(events)`,
      [orgId, event]
    )).rows;
    for (const wh of whs) {
      const payload = { event, data, timestamp: new Date().toISOString() };
      const sig = crypto.createHmac('sha256', wh.secret).update(JSON.stringify(payload)).digest('hex');
      try {
        const r = await axios.post(wh.url, payload, { headers: { 'X-ClientFlow-Signature': sig }, timeout: 5000 });
        await db.query(
          `INSERT INTO webhook_logs (webhook_id, event, payload, response_status, response_body, status)
           VALUES ($1,$2,$3,$4,$5,'success')`,
          [wh.id, event, JSON.stringify(payload), r.status, String(r.data).slice(0,500)]
        );
      } catch (e) {
        await db.query(
          `INSERT INTO webhook_logs (webhook_id, event, payload, status, response_body)
           VALUES ($1,$2,$3,'failed',$4)`,
          [wh.id, event, JSON.stringify(payload), e.message]
        );
      }
    }
  } catch { /* silent */ }
}

module.exports = router;
module.exports.triggerWebhooks = triggerWebhooks;
