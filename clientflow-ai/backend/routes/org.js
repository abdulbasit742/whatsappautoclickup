const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/org — get org settings
router.get('/', async (req, res) => {
  try {
    const r = await db.query(`SELECT * FROM org_settings LIMIT 1`);
    res.json(r.rows[0] || {});
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/org — update org settings
router.put('/', async (req, res) => {
  try {
    const { org_name, logo_url, timezone, primary_color, email_notifications, whatsapp_alerts, ai_provider_priority, integrations } = req.body;
    const existing = (await db.query(`SELECT id FROM org_settings LIMIT 1`)).rows[0];
    if (!existing) {
      const r = await db.query(
        `INSERT INTO org_settings (org_name, logo_url, timezone, primary_color, email_notifications, whatsapp_alerts, ai_provider_priority, integrations)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [org_name, logo_url, timezone, primary_color, email_notifications, whatsapp_alerts, ai_provider_priority, JSON.stringify(integrations || {})]
      );
      return res.json(r.rows[0]);
    }
    const r = await db.query(
      `UPDATE org_settings SET org_name=$1,logo_url=$2,timezone=$3,primary_color=$4,
       email_notifications=$5,whatsapp_alerts=$6,ai_provider_priority=$7,integrations=$8,updated_at=NOW()
       WHERE id=$9 RETURNING *`,
      [org_name, logo_url, timezone, primary_color, email_notifications, whatsapp_alerts, ai_provider_priority, JSON.stringify(integrations || {}), existing.id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
