const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// ─── Allowed setting keys — prevents arbitrary key injection ────────────────────
const ALLOWED_KEYS = new Set([
  'business_name', 'business_description', 'owner_whatsapp',
  'easypaisa_number', 'jazzcash_number', 'bank_details',
  'auto_reply_enabled', 'working_hours_start', 'working_hours_end', 'offline_message',
  'service_delivery_message', 'whatsapp_verify_token',
  'follow_up_cold_lead_hours', 'follow_up_payment_hours',
  'follow_up_post_delivery_days', 'follow_up_re_engagement_days',
  'ai_provider_priority',
]);

router.get('/', async (req, res) => {
  try {
    const r = await db.query(`SELECT key, value FROM settings ORDER BY key`);
    const obj = {};
    for (const row of r.rows) obj[row.key] = row.value;
    res.json(obj);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/', async (req, res) => {
  try {
    const entries = Object.entries(req.body);
    const invalid = entries.map(([k]) => k).filter(k => !ALLOWED_KEYS.has(k));
    if (invalid.length) {
      return res.status(400).json({ error: `Unknown settings key(s): ${invalid.join(', ')}` });
    }
    for (const [key, value] of entries) {
      await db.query(
        `INSERT INTO settings (key,value,updated_at) VALUES ($1,$2,NOW())
         ON CONFLICT (key) DO UPDATE SET value=$2, updated_at=NOW()`,
        [key, value]
      );
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
