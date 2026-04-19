const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// ─── Get widget layout for user ───────────────────────────────
router.get('/', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT layout FROM widget_layouts WHERE org_id=$1 AND user_id=$2`,
      [req.owner.org_id, req.owner.id || null]
    );
    if (r.rows[0]) return res.json(r.rows[0].layout);
    // Return default layout
    res.json(DEFAULT_LAYOUT);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Save widget layout ───────────────────────────────────────
router.put('/', async (req, res) => {
  try {
    const { layout } = req.body;
    await db.query(
      `INSERT INTO widget_layouts (org_id, user_id, layout)
       VALUES ($1,$2,$3)
       ON CONFLICT (org_id, user_id) DO UPDATE SET layout=EXCLUDED.layout, updated_at=NOW()`,
      [req.owner.org_id, req.owner.id || null, JSON.stringify(layout)]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Available widgets registry ───────────────────────────────
router.get('/registry', async (req, res) => {
  res.json(WIDGET_REGISTRY);
});

const WIDGET_REGISTRY = [
  { id: 'kpi_clients',     type: 'kpi',   title: 'Total Clients',       icon: 'Users',         dataKey: 'totalClients' },
  { id: 'kpi_revenue',     type: 'kpi',   title: 'Revenue (30d)',        icon: 'TrendingUp',    dataKey: 'revenueMonth' },
  { id: 'kpi_alerts',      type: 'kpi',   title: 'Open Alerts',          icon: 'AlertTriangle', dataKey: 'unresolvedAlerts' },
  { id: 'kpi_issues',      type: 'kpi',   title: 'Open Issues',          icon: 'Bug',           dataKey: 'openIssues' },
  { id: 'chart_messages',  type: 'chart', title: 'Message Activity',     chartType: 'line' },
  { id: 'chart_leads',     type: 'chart', title: 'Lead Funnel',          chartType: 'bar' },
  { id: 'feed_alerts',     type: 'feed',  title: 'Live Alerts Feed' },
  { id: 'feed_followups',  type: 'feed',  title: 'Upcoming Follow-ups' },
  { id: 'ai_insights',     type: 'ai',    title: 'AI Insights' },
  { id: 'ai_health',       type: 'ai',    title: 'AI Provider Status' },
];

const DEFAULT_LAYOUT = [
  { id: 'kpi_clients',    x: 0, y: 0, w: 3, h: 2, enabled: true },
  { id: 'kpi_revenue',    x: 3, y: 0, w: 3, h: 2, enabled: true },
  { id: 'kpi_alerts',     x: 6, y: 0, w: 3, h: 2, enabled: true },
  { id: 'kpi_issues',     x: 9, y: 0, w: 3, h: 2, enabled: true },
  { id: 'chart_messages', x: 0, y: 2, w: 8, h: 4, enabled: true },
  { id: 'feed_alerts',    x: 8, y: 2, w: 4, h: 4, enabled: true },
  { id: 'ai_health',      x: 0, y: 6, w: 4, h: 3, enabled: true },
  { id: 'feed_followups', x: 4, y: 6, w: 8, h: 3, enabled: true },
];

module.exports = router;
