const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// ── Feature flags ─────────────────────────────────────────────────────────────
router.get('/flags', async (_req, res) => {
  try {
    const { rows } = await db.query(`SELECT * FROM feature_flags ORDER BY key`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/flags/:key', async (req, res) => {
  try {
    const { rows: [flag] } = await db.query(`SELECT * FROM feature_flags WHERE key=$1`, [req.params.key]);
    if (!flag) return res.status(404).json({ error: 'Flag not found' });
    res.json(flag);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/flags/:key', auth, async (req, res) => {
  const { enabled } = req.body;
  try {
    const { rows: [flag] } = await db.query(
      `UPDATE feature_flags SET enabled=$1, updated_at=NOW() WHERE key=$2 RETURNING *`,
      [enabled, req.params.key]
    );
    res.json(flag);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Live chat widget info ─────────────────────────────────────────────────────
router.get('/live-chat', async (_req, res) => {
  try {
    const { rows: [flag] } = await db.query(
      `SELECT * FROM feature_flags WHERE key='live_chat_support'`
    );
    res.json({
      enabled: flag?.enabled || false,
      provider: null,
      placeholder_message: 'Live chat is coming soon! Use the contact form below in the meantime.',
      config: {
        provider: null,
        widget_id: null,
        api_key: null,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
