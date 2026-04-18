const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

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

router.get('/ai-dashboard', async (req, res) => {
  try {
    const [totalRequests, successRate, avgLatency, byProvider, recentLogs, dailyUsage] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM ai_logs WHERE created_at > NOW() - INTERVAL '30 days'`),
      db.query(`SELECT ROUND(100.0 * SUM(CASE WHEN success THEN 1 ELSE 0 END) / NULLIF(COUNT(*),0), 1) as rate FROM ai_logs WHERE created_at > NOW() - INTERVAL '30 days'`),
      db.query(`SELECT ROUND(AVG(latency_ms)) as avg FROM ai_logs WHERE success=true AND created_at > NOW() - INTERVAL '30 days'`),
      db.query(`SELECT provider, COUNT(*) as count, ROUND(AVG(latency_ms)) as avg_latency FROM ai_logs WHERE created_at > NOW() - INTERVAL '30 days' GROUP BY provider ORDER BY count DESC`),
      db.query(`SELECT al.*, c.name as client_name FROM ai_logs al LEFT JOIN clients c ON c.id=al.client_id ORDER BY al.created_at DESC LIMIT 20`),
      db.query(`SELECT DATE_TRUNC('day', created_at) as date, COUNT(*) as count FROM ai_logs WHERE created_at > NOW() - INTERVAL '14 days' GROUP BY 1 ORDER BY 1`),
    ]);
    res.json({
      totalRequests: parseInt(totalRequests.rows[0].count),
      successRate: parseFloat(successRate.rows[0].rate || 0),
      avgLatency: parseInt(avgLatency.rows[0].avg || 0),
      byProvider: byProvider.rows,
      recentLogs: recentLogs.rows,
      dailyUsage: dailyUsage.rows,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/campaigns', async (req, res) => {
  try {
    const [stats, recent] = await Promise.all([
      db.query(`SELECT 
        COUNT(*) FILTER (WHERE status='sent') as completed,
        COUNT(*) FILTER (WHERE status='scheduled') as running,
        COUNT(*) FILTER (WHERE status='failed') as failed,
        COUNT(*) FILTER (WHERE status='draft') as draft,
        COALESCE(SUM(total_sent),0) as total_messages_sent
        FROM broadcasts`),
      db.query(`SELECT * FROM broadcasts ORDER BY created_at DESC LIMIT 20`),
    ]);
    res.json({ stats: stats.rows[0], recent: recent.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
