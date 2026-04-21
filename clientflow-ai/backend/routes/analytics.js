const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/dashboard', async (req, res) => {
  try {
    const [totalClients, newThisWeek, activeClients, revenueMonth, pendingPayments, avgRating, unresolvedAlerts, totalLeads, hotLeads, pendingFollowups, campaignsRunning, paymentsPendingAmount, paymentsConfirmedAmount, aiToday] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM clients`),
      db.query(`SELECT COUNT(*) FROM clients WHERE created_at > NOW() - INTERVAL '7 days'`),
      db.query(`SELECT COUNT(*) FROM clients WHERE last_active_at > NOW() - INTERVAL '7 days'`),
      db.query(`SELECT COALESCE(SUM(amount_pkr),0) as total FROM payments WHERE status='confirmed' AND confirmed_at > NOW() - INTERVAL '30 days'`),
      db.query(`SELECT COUNT(*) FROM payments WHERE status='pending'`),
      db.query(`SELECT COALESCE(AVG(rating),0) as avg FROM reviews`),
      db.query(`SELECT COUNT(*) FROM alerts WHERE is_resolved=false`),
      db.query(`SELECT COUNT(*) FROM clients WHERE status='lead'`),
      db.query(`SELECT COUNT(*) FROM clients WHERE lead_temperature='hot'`),
      db.query(`SELECT COUNT(*) FROM follow_ups WHERE status='pending'`),
      db.query(`SELECT COUNT(*) FROM broadcasts WHERE status IN ('running','scheduled')`),
      db.query(`SELECT COALESCE(SUM(amount_pkr),0) as total FROM payments WHERE status='pending'`),
      db.query(`SELECT COALESCE(SUM(amount_pkr),0) as total FROM payments WHERE status='confirmed' AND confirmed_at > NOW() - INTERVAL '30 days'`),
      db.query(`SELECT COUNT(*) FROM ai_logs WHERE created_at::date = CURRENT_DATE`)
    ]);

    res.json({
      totalClients: parseInt(totalClients.rows[0].count),
      totalLeads: parseInt(totalLeads.rows[0].count),
      newThisWeek: parseInt(newThisWeek.rows[0].count),
      activeClients: parseInt(activeClients.rows[0].count),
      hotLeads: parseInt(hotLeads.rows[0].count),
      pendingFollowups: parseInt(pendingFollowups.rows[0].count),
      revenueMonth: parseFloat(revenueMonth.rows[0].total),
      pendingPayments: parseInt(pendingPayments.rows[0].count),
      paymentsPendingAmount: parseFloat(paymentsPendingAmount.rows[0].total),
      paymentsReceivedAmount: parseFloat(paymentsConfirmedAmount.rows[0].total),
      campaignsRunning: parseInt(campaignsRunning.rows[0].count),
      avgRating: parseFloat(avgRating.rows[0].avg).toFixed(1),
      unresolvedAlerts: parseInt(unresolvedAlerts.rows[0].count),
      aiRequestsToday: parseInt(aiToday.rows[0].count),
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

router.get('/funnel-advanced', async (req, res) => {
  try {
    const [sent, delivered, read, replied, converted] = await Promise.all([
      db.query(`SELECT COUNT(*)::int AS count FROM messages WHERE direction='outbound'`),
      db.query(`SELECT COUNT(*)::int AS count FROM messages WHERE direction='outbound' AND delivered=true`),
      db.query(`SELECT COUNT(*)::int AS count FROM messages WHERE direction='outbound' AND read=true`),
      db.query(
        `SELECT COUNT(DISTINCT m.client_id)::int AS count
         FROM messages m
         WHERE m.direction='inbound'
           AND EXISTS (
             SELECT 1 FROM messages o
             WHERE o.client_id=m.client_id AND o.direction='outbound' AND o.created_at < m.created_at
           )`
      ),
      db.query(`SELECT COUNT(DISTINCT client_id)::int AS count FROM payments WHERE status='confirmed'`)
    ]);

    const steps = {
      sent: sent.rows[0].count,
      delivered: delivered.rows[0].count,
      seen: read.rows[0].count,
      replied: replied.rows[0].count,
      converted: converted.rows[0].count
    };
    const denom = steps.sent || 1;
    res.json({
      ...steps,
      rates: {
        deliveryRate: Number(((steps.delivered / denom) * 100).toFixed(2)),
        seenRate: Number(((steps.seen / denom) * 100).toFixed(2)),
        replyRate: Number(((steps.replied / denom) * 100).toFixed(2)),
        conversionRate: Number(((steps.converted / denom) * 100).toFixed(2))
      }
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/best-send-times', async (req, res) => {
  try {
    const r = await db.query(
      `WITH outbound AS (
         SELECT id, client_id, created_at
         FROM messages
         WHERE direction='outbound'
           AND created_at > NOW() - INTERVAL '30 days'
       ),
       replied AS (
         SELECT o.id AS outbound_id
         FROM outbound o
         WHERE EXISTS (
           SELECT 1
           FROM messages i
           WHERE i.client_id=o.client_id
             AND i.direction='inbound'
             AND i.created_at > o.created_at
             AND i.created_at <= o.created_at + INTERVAL '24 hours'
         )
       )
       SELECT
         EXTRACT(HOUR FROM o.created_at)::int AS hour_utc,
         COUNT(*)::int AS sent_count,
         COUNT(r.outbound_id)::int AS replied_count,
         ROUND((COUNT(r.outbound_id)::numeric / NULLIF(COUNT(*),0)) * 100, 2) AS reply_rate
       FROM outbound o
       LEFT JOIN replied r ON r.outbound_id=o.id
       GROUP BY 1
       ORDER BY reply_rate DESC NULLS LAST, sent_count DESC
       LIMIT 8`
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/agent-performance', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT
         u.id,
         u.full_name,
         u.email,
         COUNT(cv.id)::int AS assigned_chats,
         COUNT(*) FILTER (WHERE cv.status='resolved')::int AS resolved_chats,
         COALESCE(AVG(EXTRACT(EPOCH FROM (cv.updated_at - cv.created_at)) / 60),0)::numeric(10,2) AS avg_resolution_minutes
       FROM users u
       LEFT JOIN conversations cv ON cv.assigned_to=u.id
       WHERE u.is_active=true
       GROUP BY u.id, u.full_name, u.email
       ORDER BY resolved_chats DESC, assigned_chats DESC`
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/ai-center', async (req, res) => {
  try {
    const [totals, byProvider, byType, failed, recent, avgLatency] = await Promise.all([
      db.query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE created_at::date=CURRENT_DATE)::int AS today FROM ai_logs`),
      db.query(`SELECT provider, COUNT(*)::int AS count FROM ai_logs GROUP BY provider ORDER BY count DESC`),
      db.query(`SELECT provider, success, COUNT(*)::int AS count FROM ai_logs GROUP BY provider, success ORDER BY provider`),
      db.query(`SELECT COUNT(*)::int AS failed FROM ai_logs WHERE success=false`),
      db.query(`SELECT provider, success, error_message, created_at FROM ai_logs ORDER BY created_at DESC LIMIT 20`),
      db.query(`SELECT COALESCE(AVG(latency_ms),0)::numeric(10,2) AS avg_latency FROM ai_logs WHERE success=true`)
    ]);
    res.json({
      totalRequests: totals.rows[0].total,
      todayRequests: totals.rows[0].today,
      byProvider: byProvider.rows,
      providerOutcomes: byType.rows,
      failedRequests: failed.rows[0].failed,
      avgLatencyMs: Number(avgLatency.rows[0].avg_latency),
      recentLogs: recent.rows
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/integration-status', async (req, res) => {
  try {
    const status = {
      gmail: Boolean(process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET),
      googleCalendar: Boolean(process.env.GOOGLE_CALENDAR_CLIENT_ID && process.env.GOOGLE_CALENDAR_CLIENT_SECRET),
      clickup: Boolean(process.env.CLICKUP_API_KEY),
      make: Boolean(process.env.MAKE_WEBHOOK_URL),
      paymentGateway: Boolean(process.env.STRIPE_SECRET_KEY || process.env.PAYPAL_CLIENT_ID),
      groq: Boolean(process.env.GROQ_API_KEY),
      openai: Boolean(process.env.OPENAI_API_KEY),
      claude: Boolean(process.env.ANTHROPIC_API_KEY),
      gemini: Boolean(process.env.GEMINI_API_KEY)
    };
    res.json(status);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
