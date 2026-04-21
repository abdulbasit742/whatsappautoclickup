const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/cohorts — signup cohort retention/activation/revenue
router.get('/', async (req, res) => {
  try {
    // cohort = month of signup
    const cohorts = await db.query(
      `SELECT
         TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS cohort,
         COUNT(*) AS signups
       FROM clients
       GROUP BY cohort
       ORDER BY cohort DESC
       LIMIT 12`
    );

    const rows = await Promise.all(cohorts.rows.map(async ({ cohort, signups }) => {
      const [active, paid, revenue] = await Promise.all([
        db.query(
          `SELECT COUNT(*) FROM clients WHERE TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM')=$1 AND last_active_at > NOW() - INTERVAL '7 days'`,
          [cohort]
        ),
        db.query(
          `SELECT COUNT(*) FROM clients WHERE TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM')=$1 AND status='paid'`,
          [cohort]
        ),
        db.query(
          `SELECT COALESCE(SUM(p.amount_pkr),0) AS total FROM payments p JOIN clients c ON c.id=p.client_id WHERE TO_CHAR(DATE_TRUNC('month', c.created_at), 'YYYY-MM')=$1 AND p.status='confirmed'`,
          [cohort]
        ),
      ]);

      const s = parseInt(signups);
      const a = parseInt(active.rows[0].count);
      const pd = parseInt(paid.rows[0].count);

      return {
        cohort,
        signups: s,
        retained: a,
        retentionPct: s > 0 ? ((a / s) * 100).toFixed(1) : '0.0',
        activated: pd,
        activationPct: s > 0 ? ((pd / s) * 100).toFixed(1) : '0.0',
        revenue: parseFloat(revenue.rows[0].total),
      };
    }));

    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/cohorts/by-week — weekly cohort table (last 8 weeks)
router.get('/by-week', async (req, res) => {
  try {
    const cohorts = await db.query(
      `SELECT
         TO_CHAR(DATE_TRUNC('week', created_at), 'IYYY-IW') AS cohort,
         COUNT(*) AS signups
       FROM clients
       GROUP BY cohort
       ORDER BY cohort DESC
       LIMIT 8`
    );

    const rows = await Promise.all(cohorts.rows.map(async ({ cohort, signups }) => {
      const [active, paid] = await Promise.all([
        db.query(
          `SELECT COUNT(*) FROM clients WHERE TO_CHAR(DATE_TRUNC('week', created_at), 'IYYY-IW')=$1 AND last_active_at > NOW() - INTERVAL '7 days'`,
          [cohort]
        ),
        db.query(
          `SELECT COUNT(*) FROM clients WHERE TO_CHAR(DATE_TRUNC('week', created_at), 'IYYY-IW')=$1 AND status='paid'`,
          [cohort]
        ),
      ]);

      const s = parseInt(signups);
      const a = parseInt(active.rows[0].count);
      const pd = parseInt(paid.rows[0].count);

      return {
        cohort,
        signups: s,
        retained: a,
        retentionPct: s > 0 ? ((a / s) * 100).toFixed(1) : '0.0',
        activated: pd,
        activationPct: s > 0 ? ((pd / s) * 100).toFixed(1) : '0.0',
      };
    }));

    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
