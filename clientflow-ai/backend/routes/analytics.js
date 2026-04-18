const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/dashboard', async (req, res) => {
  try {
    const [
      totalClients, newThisWeek, activeClients,
      revenueMonth, revenueWeek, revenueToday,
      pendingPayments, avgRating, unresolvedAlerts, hotLeads
    ] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM clients`),
      db.query(`SELECT COUNT(*) FROM clients WHERE created_at > NOW() - INTERVAL '7 days'`),
      db.query(`SELECT COUNT(*) FROM clients WHERE last_active_at > NOW() - INTERVAL '7 days'`),
      db.query(`SELECT COALESCE(SUM(amount_pkr),0) as total FROM payments WHERE status='confirmed' AND confirmed_at > NOW() - INTERVAL '30 days'`),
      db.query(`SELECT COALESCE(SUM(amount_pkr),0) as total FROM payments WHERE status='confirmed' AND confirmed_at > NOW() - INTERVAL '7 days'`),
      db.query(`SELECT COALESCE(SUM(amount_pkr),0) as total FROM payments WHERE status='confirmed' AND confirmed_at > NOW() - INTERVAL '1 day'`),
      db.query(`SELECT COUNT(*) FROM payments WHERE status='pending'`),
      db.query(`SELECT COALESCE(AVG(rating),0) as avg FROM reviews`),
      db.query(`SELECT COUNT(*) FROM alerts WHERE is_resolved=false`),
      // Hot leads: asked about pricing or payment in last 24h but not paid
      db.query(`
        SELECT COUNT(DISTINCT m.client_id) FROM messages m
        JOIN clients c ON c.id = m.client_id
        WHERE m.direction='inbound'
          AND m.created_at > NOW() - INTERVAL '24 hours'
          AND c.status IN ('lead','active')
          AND (m.content ILIKE '%price%' OR m.content ILIKE '%pay%' OR m.content ILIKE '%cost%' OR m.content ILIKE '%rate%')
      `),
    ]);

    res.json({
      totalClients: parseInt(totalClients.rows[0].count),
      newThisWeek: parseInt(newThisWeek.rows[0].count),
      activeClients: parseInt(activeClients.rows[0].count),
      revenueMonth: parseFloat(revenueMonth.rows[0].total),
      revenueWeek: parseFloat(revenueWeek.rows[0].total),
      revenueToday: parseFloat(revenueToday.rows[0].total),
      pendingPayments: parseInt(pendingPayments.rows[0].count),
      avgRating: parseFloat(avgRating.rows[0].avg).toFixed(1),
      unresolvedAlerts: parseInt(unresolvedAlerts.rows[0].count),
      hotLeads: parseInt(hotLeads.rows[0].count),
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
    const [total, leads, active, paid, repeat] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM clients`),
      db.query(`SELECT COUNT(*) FROM clients WHERE status='lead'`),
      db.query(`SELECT COUNT(*) FROM clients WHERE status='active'`),
      db.query(`SELECT COUNT(*) FROM clients WHERE status='paid'`),
      db.query(`SELECT COUNT(*) FROM clients WHERE total_spent_pkr > 0`),
    ]);
    res.json({
      total: parseInt(total.rows[0].count),
      leads: parseInt(leads.rows[0].count),
      active: parseInt(active.rows[0].count),
      paid: parseInt(paid.rows[0].count),
      repeat: parseInt(repeat.rows[0].count),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/hot-leads', async (req, res) => {
  try {
    const r = await db.query(`
      SELECT c.id, c.name, c.whatsapp_number, c.status, c.last_active_at,
             COUNT(m.id) as message_count,
             MAX(m.created_at) as last_message_at
      FROM clients c
      JOIN messages m ON m.client_id = c.id
      WHERE c.status IN ('lead','active')
        AND m.direction = 'inbound'
        AND m.created_at > NOW() - INTERVAL '24 hours'
        AND (m.content ILIKE '%price%' OR m.content ILIKE '%pay%' OR m.content ILIKE '%cost%'
             OR m.content ILIKE '%rate%' OR m.content ILIKE '%service%' OR m.content ILIKE '%kitna%')
      GROUP BY c.id, c.name, c.whatsapp_number, c.status, c.last_active_at
      ORDER BY last_message_at DESC
      LIMIT 10
    `);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
