const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');

router.use(auth);
router.use(apiLimiter);

router.get('/dashboard', async (req, res) => {
  try {
    const [totalClients, newThisWeek, activeClients, revenueMonth, pendingPayments, avgRating, unresolvedAlerts] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM clients`),
      db.query(`SELECT COUNT(*) FROM clients WHERE created_at > NOW() - INTERVAL '7 days'`),
      db.query(`SELECT COUNT(*) FROM clients WHERE last_active_at > NOW() - INTERVAL '7 days'`),
      db.query(`SELECT COALESCE(SUM(amount_pkr),0) as total FROM payments WHERE status='confirmed' AND confirmed_at > NOW() - INTERVAL '30 days'`),
      db.query(`SELECT COUNT(*) FROM payments WHERE status='pending'`),
      db.query(`SELECT COALESCE(AVG(rating),0) as avg FROM reviews`),
      db.query(`SELECT COUNT(*) FROM alerts WHERE is_resolved=false`),
    ]);

    res.json({
      totalClients: parseInt(totalClients.rows[0].count),
      newThisWeek: parseInt(newThisWeek.rows[0].count),
      activeClients: parseInt(activeClients.rows[0].count),
      revenueMonth: parseFloat(revenueMonth.rows[0].total),
      pendingPayments: parseInt(pendingPayments.rows[0].count),
      avgRating: parseFloat(avgRating.rows[0].avg).toFixed(1),
      unresolvedAlerts: parseInt(unresolvedAlerts.rows[0].count),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/messages-volume', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT DATE_TRUNC('day', created_at) as date, COUNT(*) as count
       FROM messages WHERE created_at > NOW() - INTERVAL '30 days'
       GROUP BY 1 ORDER BY 1`
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/ai-usage', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT provider, COUNT(*) as count FROM ai_logs WHERE success=true
       AND created_at > NOW() - INTERVAL '30 days' GROUP BY provider`
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/funnel', async (req, res) => {
  try {
    const [leads, paid, repeat] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM clients WHERE status='lead'`),
      db.query(`SELECT COUNT(*) FROM clients WHERE status='paid'`),
      db.query(`SELECT COUNT(*) FROM clients WHERE total_spent_pkr > 0`),
    ]);
    res.json({
      leads: parseInt(leads.rows[0].count),
      paid: parseInt(paid.rows[0].count),
      repeat: parseInt(repeat.rows[0].count),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
