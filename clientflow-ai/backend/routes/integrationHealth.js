const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const axios = require('axios');

router.use(auth);

// ─── Integration health check ─────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const results = {};
    const checks = [
      { name: 'groq',     url: 'https://api.groq.com', key: process.env.GROQ_API_KEY },
      { name: 'gmail',    url: 'https://gmail.googleapis.com', key: process.env.GMAIL_CLIENT_ID },
      { name: 'calendar', url: 'https://calendar.googleapis.com', key: process.env.GOOGLE_CALENDAR_KEY },
      { name: 'clickup',  url: 'https://api.clickup.com/api/v2/user', key: process.env.CLICKUP_API_KEY },
      { name: 'make',     url: 'https://www.make.com', key: process.env.MAKE_API_KEY },
    ];

    await Promise.all(checks.map(async ({ name, url, key }) => {
      if (!key) { results[name] = { status: 'not_configured', latency_ms: null }; return; }
      const start = Date.now();
      try {
        await axios.get(url, { timeout: 3000 });
        const latency = Date.now() - start;
        results[name] = { status: 'ok', latency_ms: latency };
        await db.query(
          `INSERT INTO integration_health_logs (org_id, integration, status, latency_ms)
           VALUES ($1,$2,'ok',$3)`,
          [req.owner.org_id, name, latency]
        ).catch(() => {});
      } catch (e) {
        results[name] = { status: 'error', error: e.message, latency_ms: Date.now() - start };
        await db.query(
          `INSERT INTO integration_health_logs (org_id, integration, status, error_message, latency_ms)
           VALUES ($1,$2,'error',$3,$4)`,
          [req.owner.org_id, name, e.message, Date.now() - start]
        ).catch(() => {});
      }
    }));

    res.json(results);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Historical health logs ───────────────────────────────────
router.get('/logs', async (req, res) => {
  try {
    const { integration } = req.query;
    let q = `SELECT * FROM integration_health_logs WHERE org_id=$1`;
    const params = [req.owner.org_id];
    if (integration) { params.push(integration); q += ` AND integration=$${params.length}`; }
    q += ` ORDER BY checked_at DESC LIMIT 200`;
    const r = await db.query(q, params);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
