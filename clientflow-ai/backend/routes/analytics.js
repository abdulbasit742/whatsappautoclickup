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

// ─── Client Segmentation Breakdown ────────────────────────────────────────────
// Segments are derived dynamically from behavioral data — no extra column needed
router.get('/segments', async (req, res) => {
  try {
    const [hotLeads, interested, paying, repeat, atRisk, inactive] = await Promise.all([
      // Hot leads: asked pricing in last 24h, unpaid
      db.query(`
        SELECT COUNT(DISTINCT c.id) FROM clients c
        JOIN messages m ON m.client_id = c.id
        WHERE c.status IN ('lead','active')
          AND m.direction = 'inbound'
          AND m.created_at > NOW() - INTERVAL '24 hours'
          AND (m.content ILIKE '%price%' OR m.content ILIKE '%pay%' OR m.content ILIKE '%cost%'
               OR m.content ILIKE '%rate%' OR m.content ILIKE '%kitna%')
      `),
      // Interested: engaged (>=3 messages today or yesterday) but still unpaid
      db.query(`
        SELECT COUNT(DISTINCT c.id) FROM clients c
        JOIN messages m ON m.client_id = c.id
        WHERE c.status IN ('lead','active')
          AND m.direction = 'inbound'
          AND m.created_at > NOW() - INTERVAL '48 hours'
        GROUP BY c.id HAVING COUNT(m.id) >= 3
      `).then(r => ({ rows: [{ count: r.rows.length }] })),
      // Paying: exactly one confirmed payment
      db.query(`
        SELECT COUNT(*) FROM (
          SELECT client_id FROM payments WHERE status='confirmed'
          GROUP BY client_id HAVING COUNT(*) = 1
        ) x
      `),
      // Repeat buyers: more than one confirmed payment
      db.query(`
        SELECT COUNT(*) FROM (
          SELECT client_id FROM payments WHERE status='confirmed'
          GROUP BY client_id HAVING COUNT(*) > 1
        ) x
      `),
      // At risk: paid client, no activity for 14–30 days
      db.query(`
        SELECT COUNT(*) FROM clients
        WHERE status = 'paid'
          AND last_active_at < NOW() - INTERVAL '14 days'
          AND last_active_at >= NOW() - INTERVAL '30 days'
      `),
      // Inactive: no activity for 30+ days, not blocked
      db.query(`
        SELECT COUNT(*) FROM clients
        WHERE last_active_at < NOW() - INTERVAL '30 days'
          AND status != 'blocked'
      `),
    ]);

    res.json({
      hot_leads:  parseInt(hotLeads.rows[0].count),
      interested: parseInt(interested.rows[0].count),
      paying:     parseInt(paying.rows[0].count),
      repeat:     parseInt(repeat.rows[0].count),
      at_risk:    parseInt(atRisk.rows[0].count),
      inactive:   parseInt(inactive.rows[0].count),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Actionable Business Insights ─────────────────────────────────────────────
router.get('/insights', async (req, res) => {
  try {
    const [total, withMessages, withPricing, withPayAttempt, paid] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM clients`),
      db.query(`SELECT COUNT(DISTINCT client_id) FROM messages WHERE direction='inbound'`),
      db.query(`
        SELECT COUNT(DISTINCT m.client_id) FROM messages m
        JOIN clients c ON c.id = m.client_id
        WHERE m.direction='inbound'
          AND (m.content ILIKE '%price%' OR m.content ILIKE '%pricing%' OR m.content ILIKE '%cost%' OR m.content ILIKE '%kitna%')
          AND c.status NOT IN ('paid')
      `),
      db.query(`SELECT COUNT(DISTINCT client_id) FROM payments WHERE status='pending'`),
      db.query(`SELECT COUNT(DISTINCT client_id) FROM payments WHERE status='confirmed'`),
    ]);

    const totalN          = parseInt(total.rows[0].count) || 1;
    const withMessagesN   = parseInt(withMessages.rows[0].count);
    const withPricingN    = parseInt(withPricing.rows[0].count);
    const withPayAttemptN = parseInt(withPayAttempt.rows[0].count);
    const paidN           = parseInt(paid.rows[0].count);

    // Drop-off at each stage
    const engagedPct    = ((withMessagesN / totalN) * 100).toFixed(1);
    const pricingPct    = withMessagesN > 0 ? ((withPricingN / withMessagesN) * 100).toFixed(1) : '0.0';
    const payAttemptPct = withPricingN > 0  ? ((withPayAttemptN / withPricingN) * 100).toFixed(1)  : '0.0';
    const conversionPct = totalN > 0        ? ((paidN / totalN) * 100).toFixed(1) : '0.0';

    // Best converting service
    const bestService = await db.query(`
      SELECT s.name, COUNT(p.id) as orders, SUM(p.amount_pkr) as revenue
      FROM payments p JOIN services s ON s.id = p.service_id
      WHERE p.status = 'confirmed' AND p.service_id IS NOT NULL
      GROUP BY s.name ORDER BY orders DESC LIMIT 1
    `);

    // Avg response time to payment (lead → first payment)
    const avgTimeToPayment = await db.query(`
      SELECT AVG(EXTRACT(EPOCH FROM (p.created_at - c.first_contact_at))/3600)::numeric(6,1) as avg_hours
      FROM payments p JOIN clients c ON c.id = p.client_id
      WHERE p.status = 'confirmed'
    `);

    const insights = [];

    if (parseFloat(pricingPct) > 30) {
      insights.push({ type: 'info', message: `${pricingPct}% of engaged clients ask about pricing — AI objection handling is critical here.` });
    }
    if (parseFloat(payAttemptPct) < 30) {
      insights.push({ type: 'warning', message: `Only ${payAttemptPct}% of pricing inquiries lead to a payment attempt — strengthen the payment CTA.` });
    }
    if (parseFloat(conversionPct) < 10) {
      insights.push({ type: 'warning', message: `Overall conversion rate is ${conversionPct}% — consider a targeted follow-up campaign for cold leads.` });
    } else {
      insights.push({ type: 'success', message: `Conversion rate is ${conversionPct}% — good performance! Upsell repeat buyers to boost revenue.` });
    }
    if (bestService.rows[0]) {
      insights.push({ type: 'success', message: `"${bestService.rows[0].name}" is your best-converting service (${bestService.rows[0].orders} orders, PKR ${Number(bestService.rows[0].revenue).toLocaleString()} revenue). Feature it prominently.` });
    }
    if (avgTimeToPayment.rows[0]?.avg_hours) {
      insights.push({ type: 'info', message: `Average time from first contact to payment: ${avgTimeToPayment.rows[0].avg_hours} hours. Target is < 48h.` });
    }

    res.json({
      funnel: { total: totalN, engaged: withMessagesN, pricing: withPricingN, payAttempt: withPayAttemptN, paid: paidN },
      dropOff: { engagedPct, pricingPct, payAttemptPct, conversionPct },
      insights,
      bestService: bestService.rows[0] || null,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── AI Provider Performance ───────────────────────────────────────────────────
router.get('/ai-performance', async (req, res) => {
  try {
    const r = await db.query(`
      SELECT
        provider,
        COUNT(*) as total_calls,
        SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful,
        ROUND(AVG(CASE WHEN success THEN latency_ms END))::int as avg_latency_ms,
        ROUND(100.0 * SUM(CASE WHEN success THEN 1 ELSE 0 END) / NULLIF(COUNT(*),0), 1) as success_rate,
        MAX(created_at) as last_used
      FROM ai_logs
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY provider
      ORDER BY total_calls DESC
    `);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Service Performance ───────────────────────────────────────────────────────
router.get('/service-performance', async (req, res) => {
  try {
    const r = await db.query(`
      SELECT
        s.name,
        s.price_pkr,
        COUNT(p.id) as total_orders,
        SUM(p.amount_pkr) as total_revenue,
        ROUND(AVG(p.amount_pkr))::int as avg_order_value
      FROM services s
      LEFT JOIN payments p ON p.service_id = s.id AND p.status = 'confirmed'
      WHERE s.is_active = true
      GROUP BY s.id, s.name, s.price_pkr
      ORDER BY total_revenue DESC NULLS LAST
    `);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
