const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/segments — full segment insights
router.get('/', async (req, res) => {
  try {
    const [
      newClients,
      activeClients,
      highValue,
      inactive,
      atRisk,
      newGrowth,
      activeGrowth,
      highValueGrowth,
      inactiveGrowth,
      atRiskGrowth,
      newRevenue,
      activeRevenue,
      highValueRevenue,
      inactiveRevenue,
      atRiskRevenue,
    ] = await Promise.all([
      // counts
      db.query(`SELECT COUNT(*) FROM clients WHERE created_at > NOW() - INTERVAL '30 days'`),
      db.query(`SELECT COUNT(*) FROM clients WHERE last_active_at > NOW() - INTERVAL '7 days'`),
      db.query(`SELECT COUNT(*) FROM clients WHERE total_spent_pkr >= 10000`),
      db.query(`SELECT COUNT(*) FROM clients WHERE last_active_at < NOW() - INTERVAL '30 days' AND status != 'blocked'`),
      db.query(`SELECT COUNT(*) FROM clients WHERE last_active_at BETWEEN NOW() - INTERVAL '60 days' AND NOW() - INTERVAL '14 days'`),
      // growth (prev 30d vs current 30d)
      db.query(`SELECT COUNT(*) FROM clients WHERE created_at BETWEEN NOW() - INTERVAL '60 days' AND NOW() - INTERVAL '30 days'`),
      db.query(`SELECT COUNT(*) FROM clients WHERE last_active_at BETWEEN NOW() - INTERVAL '14 days' AND NOW() - INTERVAL '7 days'`),
      db.query(`SELECT COUNT(*) FROM clients WHERE total_spent_pkr >= 10000 AND created_at > NOW() - INTERVAL '60 days'`),
      db.query(`SELECT COUNT(*) FROM clients WHERE last_active_at BETWEEN NOW() - INTERVAL '60 days' AND NOW() - INTERVAL '30 days' AND status != 'blocked'`),
      db.query(`SELECT COUNT(*) FROM clients WHERE last_active_at BETWEEN NOW() - INTERVAL '90 days' AND NOW() - INTERVAL '60 days'`),
      // revenue
      db.query(`SELECT COALESCE(SUM(p.amount_pkr),0) as total FROM payments p JOIN clients c ON c.id=p.client_id WHERE p.status='confirmed' AND c.created_at > NOW() - INTERVAL '30 days'`),
      db.query(`SELECT COALESCE(SUM(p.amount_pkr),0) as total FROM payments p JOIN clients c ON c.id=p.client_id WHERE p.status='confirmed' AND c.last_active_at > NOW() - INTERVAL '7 days'`),
      db.query(`SELECT COALESCE(SUM(p.amount_pkr),0) as total FROM payments p JOIN clients c ON c.id=p.client_id WHERE p.status='confirmed' AND c.total_spent_pkr >= 10000`),
      db.query(`SELECT COALESCE(SUM(p.amount_pkr),0) as total FROM payments p JOIN clients c ON c.id=p.client_id WHERE p.status='confirmed' AND c.last_active_at < NOW() - INTERVAL '30 days'`),
      db.query(`SELECT COALESCE(SUM(p.amount_pkr),0) as total FROM payments p JOIN clients c ON c.id=p.client_id WHERE p.status='confirmed' AND c.last_active_at BETWEEN NOW() - INTERVAL '60 days' AND NOW() - INTERVAL '14 days'`),
    ]);

    const calc = (curr, prev) => {
      const c = parseInt(curr.rows[0].count || 0);
      const p = parseInt(prev.rows[0].count || 0);
      return p > 0 ? (((c - p) / p) * 100).toFixed(1) : (c > 0 ? 100 : 0);
    };

    res.json({
      segments: [
        {
          key: 'new',
          label: 'New Customers',
          count: parseInt(newClients.rows[0].count),
          growthPct: calc(newClients, newGrowth),
          revenue: parseFloat(newRevenue.rows[0].total),
          engagementLevel: 'medium',
        },
        {
          key: 'active',
          label: 'Active Customers',
          count: parseInt(activeClients.rows[0].count),
          growthPct: calc(activeClients, activeGrowth),
          revenue: parseFloat(activeRevenue.rows[0].total),
          engagementLevel: 'high',
        },
        {
          key: 'high_value',
          label: 'High-Value Customers',
          count: parseInt(highValue.rows[0].count),
          growthPct: calc(highValue, highValueGrowth),
          revenue: parseFloat(highValueRevenue.rows[0].total),
          engagementLevel: 'very_high',
        },
        {
          key: 'inactive',
          label: 'Inactive Customers',
          count: parseInt(inactive.rows[0].count),
          growthPct: calc(inactive, inactiveGrowth),
          revenue: parseFloat(inactiveRevenue.rows[0].total),
          engagementLevel: 'low',
        },
        {
          key: 'at_risk',
          label: 'At-Risk Customers',
          count: parseInt(atRisk.rows[0].count),
          growthPct: calc(atRisk, atRiskGrowth),
          revenue: parseFloat(atRiskRevenue.rows[0].total),
          engagementLevel: 'medium',
        },
      ],
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/segments/:key/clients — list clients in a segment
router.get('/:key/clients', async (req, res) => {
  try {
    const { key } = req.params;
    const conditions = {
      new:        `created_at > NOW() - INTERVAL '30 days'`,
      active:     `last_active_at > NOW() - INTERVAL '7 days'`,
      high_value: `total_spent_pkr >= 10000`,
      inactive:   `last_active_at < NOW() - INTERVAL '30 days' AND status != 'blocked'`,
      at_risk:    `last_active_at BETWEEN NOW() - INTERVAL '60 days' AND NOW() - INTERVAL '14 days'`,
    };
    const where = conditions[key];
    if (!where) return res.status(400).json({ error: 'Unknown segment' });
    const r = await db.query(
      `SELECT id, name, whatsapp_number, status, total_spent_pkr, last_active_at, created_at
       FROM clients WHERE ${where} ORDER BY last_active_at DESC LIMIT 50`
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
