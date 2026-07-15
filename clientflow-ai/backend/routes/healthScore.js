const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// ── Calculate health score for an org ──────────────────────────────────────
async function computeScore(orgId) {
  // Activity: messages in last 30 days (max 100 = 50+ messages)
  const { rows: [actRow] } = await db.query(
    `SELECT COUNT(*) AS cnt FROM messages WHERE created_at > NOW()-INTERVAL '30 days'`
  );
  const actScore = Math.min(100, Math.round((parseInt(actRow.cnt) / 50) * 100));

  // Reply rate: outbound / total messages
  const { rows: [msgRow] } = await db.query(
    `SELECT COUNT(*) FILTER (WHERE direction='outbound') AS out, COUNT(*) AS total FROM messages`
  );
  const replyRate = msgRow.total > 0 ? parseInt(msgRow.out) / parseInt(msgRow.total) : 0;
  const replyScore = Math.round(replyRate * 100);

  // Payment score: no pending/rejected payments = 100
  const { rows: [payRow] } = await db.query(
    `SELECT COUNT(*) AS bad FROM payments WHERE status IN ('pending','rejected')`
  );
  const payScore = Math.max(0, 100 - parseInt(payRow.bad) * 20);

  // Issue score: unresolved alerts penalise
  const { rows: [issRow] } = await db.query(
    `SELECT COUNT(*) AS open FROM alerts WHERE is_resolved=FALSE`
  );
  const issScore = Math.max(0, 100 - parseInt(issRow.open) * 15);

  // Usage: clients active in last 7 days
  const { rows: [usageRow] } = await db.query(
    `SELECT COUNT(*) AS cnt FROM clients WHERE last_active_at > NOW()-INTERVAL '7 days'`
  );
  const usageScore = Math.min(100, Math.round((parseInt(usageRow.cnt) / 10) * 100));

  const total = Math.round((actScore + replyScore + payScore + issScore + usageScore) / 5);
  const label = total >= 70 ? 'healthy' : total >= 40 ? 'at_risk' : 'critical';

  return { activity_score: actScore, reply_rate_score: replyScore, payment_score: payScore,
           issue_score: issScore, usage_score: usageScore, total_score: total, label };
}

// ── Get health score ─────────────────────────────────────────────────────────
router.get('/:orgId', auth, async (req, res) => {
  try {
    const score = await computeScore(req.params.orgId);
    // Persist
    await db.query(
      `INSERT INTO customer_health_scores
         (org_id, activity_score, reply_rate_score, payment_score, issue_score, usage_score, total_score, label)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [req.params.orgId, score.activity_score, score.reply_rate_score, score.payment_score,
       score.issue_score, score.usage_score, score.total_score, score.label]
    );
    res.json(score);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Churn risk ───────────────────────────────────────────────────────────────
router.get('/:orgId/churn-risk', auth, async (req, res) => {
  try {
    const score = await computeScore(req.params.orgId);
    const risks = [];
    if (score.usage_score < 30) risks.push({ factor: 'low_usage', detail: 'Few active clients in last 7 days' });
    if (score.payment_score < 60) risks.push({ factor: 'unpaid_invoices', detail: 'Multiple pending or rejected payments' });
    if (score.issue_score < 60) risks.push({ factor: 'unresolved_issues', detail: 'Several open unresolved alerts' });
    if (score.activity_score < 30) risks.push({ factor: 'declining_activity', detail: 'Low message activity in last 30 days' });
    const risk_level = risks.length >= 3 ? 'critical' : risks.length >= 1 ? 'at_risk' : 'low';
    res.json({ risk_level, factors: risks, health_score: score.total_score });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Lifecycle dashboard ──────────────────────────────────────────────────────
router.get('/:orgId/lifecycle', auth, async (req, res) => {
  try {
    // Derive lifecycle stages from clients table
    const { rows } = await db.query(`
      SELECT
        COUNT(*) FILTER (WHERE status='lead' AND created_at > NOW()-INTERVAL '7 days') AS new,
        COUNT(*) FILTER (WHERE status IN ('active','paid')) AS active,
        COUNT(*) FILTER (WHERE status='paid' AND last_active_at > NOW()-INTERVAL '7 days') AS engaged,
        COUNT(*) FILTER (WHERE status='inactive' AND last_active_at > NOW()-INTERVAL '30 days') AS at_risk,
        COUNT(*) FILTER (WHERE status='blocked' OR (status='inactive' AND last_active_at < NOW()-INTERVAL '30 days')) AS churned,
        0 AS won_back
      FROM clients
    `);
    const stage_counts = rows[0];

    // Trends: last 6 weeks (new clients per week)
    const { rows: trends } = await db.query(`
      SELECT DATE_TRUNC('week', created_at) AS week, COUNT(*) AS new_clients
      FROM clients WHERE created_at > NOW()-INTERVAL '42 days'
      GROUP BY week ORDER BY week
    `);

    res.json({ stage_counts, trends });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Win-back campaigns ────────────────────────────────────────────────────────
router.get('/:orgId/winback', auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM winback_campaigns WHERE org_id=$1 ORDER BY created_at DESC`,
      [req.params.orgId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:orgId/winback', auth, async (req, res) => {
  const { trigger, action } = req.body;
  try {
    const { rows: [campaign] } = await db.query(
      `INSERT INTO winback_campaigns (org_id, trigger, action) VALUES ($1,$2,$3) RETURNING *`,
      [req.params.orgId, trigger, action]
    );
    res.status(201).json(campaign);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Renewal reminders ────────────────────────────────────────────────────────
router.get('/:orgId/renewals', auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT r.*, os.trial_ends_at, os.current_period_end, sp.name AS plan_name
       FROM renewal_reminders r
       LEFT JOIN org_subscriptions os ON os.id=r.subscription_id
       LEFT JOIN subscription_plans sp ON sp.id=os.plan_id
       WHERE r.org_id=$1 ORDER BY r.created_at DESC`,
      [req.params.orgId]
    );
    // Also return upcoming renewal info
    const { rows: [sub] } = await db.query(
      `SELECT os.*, sp.name AS plan_name, sp.price_monthly
       FROM org_subscriptions os JOIN subscription_plans sp ON sp.id=os.plan_id
       WHERE os.org_id=$1 AND os.status IN ('trialing','active')
       ORDER BY os.created_at DESC LIMIT 1`,
      [req.params.orgId]
    );
    res.json({ reminders: rows, upcoming: sub || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
