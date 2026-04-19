const express = require('express');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const manager = require('../services/integrationManager');

router.use(auth);

// Rate limiter for sensitive token-exchange and connect endpoints
const sensitiveRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

// ─── List All Integrations ────────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const r = await db.query('SELECT * FROM integrations ORDER BY provider_name');
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Get Single Integration + Masked Keys ────────────────────────────────────────

router.get('/:provider', async (req, res) => {
  try {
    const integration = await manager.getIntegration(req.params.provider);
    const keys = await manager.getMaskedKeys(req.params.provider);
    res.json({ integration, keys });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Save / Update Credentials (encrypted) ───────────────────────────────────────

router.put('/:provider/credentials', async (req, res) => {
  try {
    const { provider } = req.params;
    const credentials = req.body;
    const createdBy = req.owner.email;

    for (const [keyName, value] of Object.entries(credentials)) {
      if (value && typeof value === 'string' && value.trim()) {
        await manager.saveKey(provider, keyName, value.trim(), { createdBy });
      }
    }

    // Ensure an integrations row exists
    const existing = await manager.getIntegration(provider);
    if (!existing) {
      await manager.upsertIntegration(provider, {
        status: 'configured',
        connected_at: null,
        last_sync_at: null,
        last_error: null,
      });
    }

    await manager.logEvent(provider, 'credentials_updated', 'success', `Credentials updated by ${createdBy}`);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Test Connection ─────────────────────────────────────────────────────────────

router.post('/:provider/test', sensitiveRateLimit, async (req, res) => {
  try {
    const result = await manager.testConnection(req.params.provider);
    res.json({ success: true, data: result.data });
  } catch (err) {
    await manager.logEvent(req.params.provider, 'test_connection', 'error', err.message);
    await db.query(
      `UPDATE integrations SET last_error = $1, updated_at = NOW() WHERE provider_name = $2`,
      [err.message, req.params.provider]
    );
    res.status(400).json({ success: false, error: err.message });
  }
});

// ─── Connect / Reconnect ─────────────────────────────────────────────────────────

router.post('/:provider/connect', sensitiveRateLimit, async (req, res) => {
  try {
    const result = await manager.connectProvider(req.params.provider);
    res.json({ success: true, data: result.data });
  } catch (err) {
    await manager.logEvent(req.params.provider, 'connect', 'error', err.message);
    await db.query(
      `UPDATE integrations SET last_error = $1, status = 'error', updated_at = NOW()
       WHERE provider_name = $2`,
      [err.message, req.params.provider]
    );
    res.status(400).json({ success: false, error: err.message });
  }
});

// ─── Disconnect ──────────────────────────────────────────────────────────────────

router.delete('/:provider', async (req, res) => {
  try {
    await manager.disconnectProvider(req.params.provider);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Instagram Token Exchange ─────────────────────────────────────────────────────

router.post('/instagram/exchange-token', sensitiveRateLimit, async (req, res) => {
  try {
    const createdBy = req.owner.email;
    const result = await manager.exchangeInstagramToken(createdBy);
    res.json({ success: true, expires_in: result.expires_in });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ─── Instagram Token Refresh ──────────────────────────────────────────────────────

router.post('/instagram/refresh-token', sensitiveRateLimit, async (req, res) => {
  try {
    const createdBy = req.owner.email;
    const result = await manager.refreshInstagramToken(createdBy);
    res.json({ success: true, expires_in: result.expires_in });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ─── OAuth – Initiate (create state) ─────────────────────────────────────────────

router.post('/:provider/oauth/init', async (req, res) => {
  try {
    const { provider } = req.params;
    const { redirect_uri } = req.body;
    const state = crypto.randomBytes(16).toString('hex');

    await manager.createOAuthSession(provider, state, redirect_uri || '');
    res.json({ state });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── OAuth – Callback handler ─────────────────────────────────────────────────────

router.post('/:provider/oauth/callback', async (req, res) => {
  try {
    const { state, code } = req.body;
    const session = await manager.getOAuthSession(state);
    if (!session) return res.status(400).json({ error: 'Invalid or expired OAuth state' });

    await manager.deleteOAuthSession(state);
    // code exchange would happen here per-provider; for now record the code as a placeholder
    await manager.logEvent(req.params.provider, 'oauth_callback', 'success', 'OAuth callback received');
    res.json({ success: true, message: 'OAuth callback received. Exchange token manually or via token exchange endpoint.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Get Integration Logs ─────────────────────────────────────────────────────────

router.get('/:provider/logs', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const logs = await manager.getLogs(req.params.provider, limit);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
