const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/admin-ops/search — search organizations/clients
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);
    const r = await db.query(
      `SELECT id, name, whatsapp_number, email, status, total_spent_pkr, created_at
       FROM clients WHERE name ILIKE $1 OR whatsapp_number ILIKE $1 OR email ILIKE $1
       ORDER BY last_active_at DESC LIMIT 20`,
      [`%${q}%`]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/admin-ops/billing-lookup/:client_id — billing issue lookup
router.get('/billing-lookup/:client_id', async (req, res) => {
  try {
    const [client, payments, pending] = await Promise.all([
      db.query(`SELECT id, name, whatsapp_number, status, total_spent_pkr FROM clients WHERE id=$1`, [req.params.client_id]),
      db.query(
        `SELECT p.*, s.name AS service_name FROM payments p LEFT JOIN services s ON s.id=p.service_id
         WHERE p.client_id=$1 ORDER BY p.created_at DESC LIMIT 10`,
        [req.params.client_id]
      ),
      db.query(`SELECT COUNT(*), COALESCE(SUM(amount_pkr),0) AS total FROM payments WHERE client_id=$1 AND status='pending'`, [req.params.client_id]),
    ]);
    if (!client.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json({
      client: client.rows[0],
      payments: payments.rows,
      pending_count: parseInt(pending.rows[0].count),
      pending_amount: parseFloat(pending.rows[0].total),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/admin-ops/ai-diagnostics/:client_id — AI usage diagnostics
router.get('/ai-diagnostics/:client_id', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT provider, success, COUNT(*) AS count, MAX(created_at) AS last_used
       FROM ai_logs WHERE client_id=$1 GROUP BY provider, success ORDER BY provider`,
      [req.params.client_id]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/admin-ops/queue-health — queue health snapshot
router.get('/queue-health', async (req, res) => {
  try {
    const [pendingPayments, pendingFollowups, unresolvedAlerts, scheduledBroadcasts] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM payments WHERE status='pending'`),
      db.query(`SELECT COUNT(*) FROM follow_ups WHERE status='pending' AND scheduled_at <= NOW()`),
      db.query(`SELECT COUNT(*) FROM alerts WHERE is_resolved=false`),
      db.query(`SELECT COUNT(*) FROM broadcasts WHERE status='scheduled' AND scheduled_at <= NOW()`),
    ]);
    res.json({
      pending_payments:     parseInt(pendingPayments.rows[0].count),
      overdue_followups:    parseInt(pendingFollowups.rows[0].count),
      unresolved_alerts:    parseInt(unresolvedAlerts.rows[0].count),
      due_broadcasts:       parseInt(scheduledBroadcasts.rows[0].count),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/admin-ops/recent-incidents — recent incidents
router.get('/recent-incidents', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT id, title, severity, status, created_at, resolved_at
       FROM status_incidents ORDER BY created_at DESC LIMIT 5`
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/admin-ops/overview — combined admin overview
router.get('/overview', async (req, res) => {
  try {
    const [clients, revenue, alerts, aiErrors] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM clients`),
      db.query(`SELECT COALESCE(SUM(amount_pkr),0) AS total FROM payments WHERE status='confirmed' AND confirmed_at > NOW() - INTERVAL '30 days'`),
      db.query(`SELECT COUNT(*) FROM alerts WHERE is_resolved=false`),
      db.query(`SELECT COUNT(*) FROM ai_logs WHERE success=false AND created_at > NOW() - INTERVAL '24 hours'`),
    ]);
    res.json({
      total_clients:   parseInt(clients.rows[0].count),
      revenue_30d:     parseFloat(revenue.rows[0].total),
      open_alerts:     parseInt(alerts.rows[0].count),
      ai_errors_24h:   parseInt(aiErrors.rows[0].count),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
