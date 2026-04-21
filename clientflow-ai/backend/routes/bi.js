const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/bi/overview — executive KPIs
router.get('/overview', async (req, res) => {
  try {
    const { from, to } = req.query;
    const start = from ? `'${from}'` : `NOW() - INTERVAL '30 days'`;
    const end   = to   ? `'${to}'`   : `NOW()`;

    const [
      mrr,
      prevMrr,
      totalClients,
      newClients,
      churnedClients,
      revenueExpansion,
      planDist,
      aiUsageGrowth,
      supportLoad,
      topSegments,
    ] = await Promise.all([
      db.query(`SELECT COALESCE(SUM(amount_pkr),0) AS total FROM payments WHERE status='confirmed' AND confirmed_at BETWEEN ${start} AND ${end}`),
      db.query(`SELECT COALESCE(SUM(amount_pkr),0) AS total FROM payments WHERE status='confirmed' AND confirmed_at BETWEEN ${start}::timestamptz - INTERVAL '30 days' AND ${start}::timestamptz`),
      db.query(`SELECT COUNT(*) FROM clients WHERE status!='blocked'`),
      db.query(`SELECT COUNT(*) FROM clients WHERE created_at BETWEEN ${start} AND ${end}`),
      db.query(`SELECT COUNT(*) FROM clients WHERE last_active_at < ${start} AND status!='blocked'`),
      db.query(
        `SELECT COALESCE(SUM(amount_pkr),0) AS total FROM payments p JOIN clients c ON c.id=p.client_id
         WHERE p.status='confirmed' AND p.confirmed_at BETWEEN ${start} AND ${end} AND c.total_spent_pkr >= 10000`
      ),
      db.query(
        `SELECT status, COUNT(*) AS count FROM clients WHERE status!='blocked' GROUP BY status`
      ),
      db.query(
        `SELECT DATE_TRUNC('week', created_at) AS week, COUNT(*) AS count
         FROM ai_logs WHERE success=true AND created_at BETWEEN ${start} AND ${end}
         GROUP BY 1 ORDER BY 1`
      ),
      db.query(`SELECT COUNT(*) FROM alerts WHERE created_at BETWEEN ${start} AND ${end}`),
      db.query(
        `SELECT
           COUNT(*) FILTER (WHERE created_at BETWEEN ${start} AND ${end}) AS new_customers,
           COUNT(*) FILTER (WHERE last_active_at > NOW() - INTERVAL '7 days') AS active_customers,
           COUNT(*) FILTER (WHERE total_spent_pkr >= 10000) AS high_value_customers,
           COUNT(*) FILTER (WHERE last_active_at < NOW() - INTERVAL '30 days' AND status!='blocked') AS inactive_customers
         FROM clients`
      ),
    ]);

    const mrrVal = parseFloat(mrr.rows[0].total);
    const prevVal = parseFloat(prevMrr.rows[0].total);
    const mrrGrowthPct = prevVal > 0 ? (((mrrVal - prevVal) / prevVal) * 100).toFixed(1) : 0;
    const total = parseInt(totalClients.rows[0].count);
    const churned = parseInt(churnedClients.rows[0].count);
    const churnRate = total > 0 ? ((churned / total) * 100).toFixed(1) : 0;

    res.json({
      mrr:            mrrVal,
      mrr_growth_pct: parseFloat(mrrGrowthPct),
      churn_rate:     parseFloat(churnRate),
      retention_rate: parseFloat((100 - churnRate).toFixed(1)),
      new_clients:    parseInt(newClients.rows[0].count),
      total_clients:  total,
      expansion_revenue: parseFloat(revenueExpansion.rows[0].total),
      plan_distribution: planDist.rows,
      ai_usage_trend:    aiUsageGrowth.rows,
      support_load:      parseInt(supportLoad.rows[0].count),
      top_segments:      topSegments.rows[0],
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/bi/feature-adoption — top features
router.get('/feature-adoption', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT feature, SUM(use_count) AS total_uses, COUNT(DISTINCT client_id) AS unique_users
       FROM feature_usage GROUP BY feature ORDER BY total_uses DESC`
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/bi/revenue-trend — revenue chart
router.get('/revenue-trend', async (req, res) => {
  try {
    const { period = 'day' } = req.query;
    const trunc = ['day', 'week', 'month'].includes(period) ? period : 'day';
    const r = await db.query(
      `SELECT DATE_TRUNC('${trunc}', confirmed_at) AS date, SUM(amount_pkr) AS total
       FROM payments WHERE status='confirmed' AND confirmed_at > NOW() - INTERVAL '90 days'
       GROUP BY 1 ORDER BY 1`
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
