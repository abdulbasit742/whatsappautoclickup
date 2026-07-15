const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// ── Get branding ─────────────────────────────────────────────────────────────
router.get('/:orgId', auth, async (req, res) => {
  try {
    const { rows: [branding] } = await db.query(
      `SELECT * FROM org_branding WHERE org_id=$1`,
      [req.params.orgId]
    );
    res.json(branding || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Save branding ────────────────────────────────────────────────────────────
router.put('/:orgId', auth, async (req, res) => {
  const { company_name, logo_url, favicon_url, primary_color, secondary_color, support_email } = req.body;
  try {
    const { rows: [branding] } = await db.query(
      `INSERT INTO org_branding (org_id, company_name, logo_url, favicon_url, primary_color, secondary_color, support_email)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (org_id) DO UPDATE SET
         company_name=$2, logo_url=$3, favicon_url=$4,
         primary_color=$5, secondary_color=$6, support_email=$7,
         updated_at=NOW()
       RETURNING *`,
      [req.params.orgId, company_name, logo_url, favicon_url, primary_color, secondary_color, support_email]
    );
    res.json(branding);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
