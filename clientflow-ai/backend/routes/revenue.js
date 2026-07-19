const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/revenue/summary — revenue intelligence
router.get('/summary', async (req, res) => {
  try {
    const [total, thisMonth, lastMonth, byService, pipeline, targets] = await Promise.all([
      db.query(`SELECT COALESCE(SUM(amount_pkr),0) AS total FROM payments WHERE status='confirmed'`),
      db.query(`SELECT COALESCE(SUM(amount_pkr),0) AS total FROM payments WHERE status='confirmed' AND confirmed_at >= DATE_TRUNC('month',NOW())`),
      db.query(`SELECT COALESCE(SUM(amount_pkr),0) AS total FROM payments WHERE status='confirmed' AND confirmed_at >= DATE_TRUNC('month',NOW()-INTERVAL '1 month') AND confirmed_at < DATE_TRUNC('month',NOW())`),
      db.query(`SELECT s.name, COALESCE(SUM(p.amount_pkr),0) AS revenue, COUNT(p.id) AS count FROM payments p LEFT JOIN services s ON s.id=p.service_id WHERE p.status='confirmed' GROUP BY s.name ORDER BY revenue DESC LIMIT 5`),
      db.query(`SELECT COALESCE(SUM(value_pkr),0) AS pipeline FROM pipeline_deals WHERE stage_slug NOT IN ('won','lost')`),
      db.query(`SELECT * FROM revenue_targets ORDER BY year DESC, month DESC LIMIT 1`),
    ]);

    const thisM = parseFloat(thisMonth.rows[0].total);
    const lastM = parseFloat(lastMonth.rows[0].total);
    const growth = lastM > 0 ? (((thisM - lastM) / lastM) * 100).toFixed(1) : null;

    res.json({
      total_revenue: parseFloat(total.rows[0].total),
      this_month: thisM,
      last_month: lastM,
      growth_pct: growth,
      by_service: byService.rows,
      pipeline_value: parseFloat(pipeline.rows[0].pipeline),
      current_target: targets.rows[0] || null,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/revenue/trend — daily revenue for chart
router.get('/trend', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const r = await db.query(
      `SELECT DATE_TRUNC('day', confirmed_at) AS date, COALESCE(SUM(amount_pkr),0) AS total
       FROM payments WHERE status='confirmed' AND confirmed_at > NOW() - INTERVAL '${parseInt(days)} days'
       GROUP BY 1 ORDER BY 1`
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/revenue/targets
router.post('/targets', async (req, res) => {
  try {
    const { target_pkr, year, month } = req.body;
    const r = await db.query(
      `INSERT INTO revenue_targets (target_pkr, year, month) VALUES ($1,$2,$3) RETURNING *`,
      [target_pkr, year, month]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
