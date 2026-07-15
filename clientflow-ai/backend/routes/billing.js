const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// ── Get trial status ──────────────────────────────────────────────────────────
router.get('/:orgId/trial', auth, async (req, res) => {
  try {
    const { rows: [sub] } = await db.query(
      `SELECT os.*, sp.name AS plan_name, sp.seat_limit, sp.features
       FROM org_subscriptions os JOIN subscription_plans sp ON sp.id = os.plan_id
       WHERE os.org_id=$1 ORDER BY os.created_at DESC LIMIT 1`,
      [req.params.orgId]
    );
    if (!sub) return res.status(404).json({ error: 'No subscription found' });
    const now = new Date();
    const trialEnd = new Date(sub.trial_ends_at);
    const daysLeft = Math.ceil((trialEnd - now) / 86400000);
    res.json({
      ...sub,
      is_trialing: sub.status === 'trialing',
      trial_days_left: Math.max(0, daysLeft),
      trial_expired: sub.status === 'trialing' && trialEnd < now,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── List plans ─────────────────────────────────────────────────────────────
router.get('/plans', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM subscription_plans WHERE is_active=TRUE ORDER BY price_monthly ASC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Upgrade/downgrade plan ─────────────────────────────────────────────────
router.post('/:orgId/upgrade', auth, async (req, res) => {
  const { plan_id, billing_cycle = 'monthly' } = req.body;
  if (!plan_id) return res.status(400).json({ error: 'plan_id is required' });
  try {
    const { rows: [plan] } = await db.query(`SELECT * FROM subscription_plans WHERE id=$1`, [plan_id]);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    // Check downgrade: if new seat_limit < current member count, warn
    if (plan.seat_limit !== -1) {
      const { rows: [usage] } = await db.query(
        `SELECT COUNT(*) AS cnt FROM org_members WHERE org_id=$1`,
        [req.params.orgId]
      );
      if (parseInt(usage.cnt) > plan.seat_limit) {
        return res.status(400).json({
          error: `Cannot downgrade: you have ${usage.cnt} members but the ${plan.name} plan only allows ${plan.seat_limit} seats. Please remove members first.`,
          code: 'OVER_SEAT_LIMIT',
        });
      }
    }

    const periodStart = new Date();
    const periodEnd = billing_cycle === 'yearly'
      ? new Date(Date.now() + 365 * 86400000)
      : new Date(Date.now() + 30 * 86400000);

    const { rows: [sub] } = await db.query(
      `INSERT INTO org_subscriptions (org_id, plan_id, status, billing_cycle, current_period_start, current_period_end)
       VALUES ($1,$2,'active',$3,$4,$5)
       RETURNING *`,
      [req.params.orgId, plan_id, billing_cycle, periodStart, periodEnd]
    );
    res.json({ subscription: sub, plan });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Cancel subscription ───────────────────────────────────────────────────────
router.post('/:orgId/cancel', auth, async (req, res) => {
  try {
    const { rows: [sub] } = await db.query(
      `UPDATE org_subscriptions SET status='canceled', canceled_at=NOW()
       WHERE org_id=$1 AND status IN ('active','trialing')
       RETURNING *`,
      [req.params.orgId]
    );
    res.json({ success: true, subscription: sub });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
