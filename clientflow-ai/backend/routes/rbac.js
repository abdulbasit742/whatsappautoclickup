const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// Default permission matrix
const DEFAULT_PERMISSIONS = {
  super_admin: { all: ['view','create','edit','delete','export','manage'] },
  org_admin:   {
    dashboard:    ['view','manage'],
    inbox:        ['view','create','edit','delete'],
    crm:          ['view','create','edit','delete','export'],
    campaigns:    ['view','create','edit','delete','export'],
    ai_center:    ['view','create','edit'],
    billing:      ['view','manage'],
    integrations: ['view','manage'],
    settings:     ['view','manage'],
    analytics:    ['view','export'],
    audit_logs:   ['view'],
  },
  manager: {
    dashboard:  ['view'],
    inbox:      ['view','create','edit'],
    crm:        ['view','create','edit','export'],
    campaigns:  ['view','create','edit'],
    ai_center:  ['view'],
    analytics:  ['view','export'],
    audit_logs: ['view'],
    settings:   ['view'],
  },
  agent: {
    dashboard: ['view'],
    inbox:     ['view','create','edit'],
    crm:       ['view','create','edit'],
    campaigns: ['view'],
    ai_center: ['view'],
  },
  support: {
    dashboard: ['view'],
    inbox:     ['view','create'],
    crm:       ['view'],
  },
  viewer: {
    dashboard:  ['view'],
    inbox:      ['view'],
    crm:        ['view'],
    analytics:  ['view'],
    campaigns:  ['view'],
  },
};

// ─── Get permissions for org (merged with defaults) ───────────
router.get('/', async (req, res) => {
  try {
    const custom = await db.query(
      `SELECT role, module, action FROM permissions WHERE org_id=$1`,
      [req.owner.org_id]
    );
    res.json({ defaults: DEFAULT_PERMISSIONS, custom: custom.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Check permission ─────────────────────────────────────────
router.get('/check', async (req, res) => {
  try {
    const { role, module, action } = req.query;
    if (role === 'super_admin') return res.json({ allowed: true });

    // Check org override
    const override = await db.query(
      `SELECT * FROM permissions WHERE org_id=$1 AND role=$2 AND module=$3 AND action=$4`,
      [req.owner.org_id, role, module, action]
    );
    if (override.rows.length > 0) return res.json({ allowed: true });

    // Check defaults
    const rolePerms = DEFAULT_PERMISSIONS[role] || {};
    const allPerms = rolePerms.all || [];
    const modulePerms = rolePerms[module] || [];
    const allowed = allPerms.includes(action) || modulePerms.includes(action);
    res.json({ allowed });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Set custom permission ────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { role, module, action, plan_required } = req.body;
    const r = await db.query(
      `INSERT INTO permissions (org_id, role, module, action, plan_required)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (role, module, action, org_id) DO UPDATE SET plan_required=EXCLUDED.plan_required
       RETURNING *`,
      [req.owner.org_id, role, module, action, plan_required || null]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Delete custom permission ─────────────────────────────────
router.delete('/', async (req, res) => {
  try {
    const { role, module, action } = req.body;
    await db.query(
      `DELETE FROM permissions WHERE org_id=$1 AND role=$2 AND module=$3 AND action=$4`,
      [req.owner.org_id, role, module, action]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
