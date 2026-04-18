const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// ─── Helper ─────────────────────────────────────────────────────────────────────
function periodEnd(billingCycle) {
  return billingCycle === 'yearly'
    ? `NOW() + INTERVAL '1 year'`
    : `NOW() + INTERVAL '1 month'`;
}

// GET /api/subscription — current subscription + plan details
router.get('/', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT s.*, p.name as plan_name, p.display_name, p.price_monthly_pkr, p.price_yearly_pkr,
              p.max_clients, p.max_broadcasts, p.max_templates, p.max_appointments,
              p.max_ai_messages, p.max_team_members,
              p.ai_enabled, p.analytics_enabled, p.referrals_enabled,
              p.whatsapp_api_enabled, p.custom_branding, p.priority_support
       FROM subscriptions s
       JOIN plans p ON p.id = s.plan_id
       WHERE s.owner_email = $1
       ORDER BY s.created_at DESC LIMIT 1`,
      [req.owner.email]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'No subscription found' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/subscription — subscribe to a plan (creates or replaces active subscription)
router.post('/', async (req, res) => {
  const { plan_id, billing_cycle = 'monthly', payment_method, transaction_ref, screenshot_url } = req.body;
  if (!plan_id) return res.status(400).json({ error: 'plan_id is required' });

  try {
    const planRes = await db.query(`SELECT * FROM plans WHERE id = $1 AND is_active = TRUE`, [plan_id]);
    if (!planRes.rows[0]) return res.status(404).json({ error: 'Plan not found' });
    const plan = planRes.rows[0];

    const isFree = plan.name === 'free';
    const amount = billing_cycle === 'yearly' ? plan.price_yearly_pkr : plan.price_monthly_pkr;

    // Cancel any existing active subscription
    await db.query(
      `UPDATE subscriptions SET status='cancelled', cancelled_at=NOW(), updated_at=NOW()
       WHERE owner_email=$1 AND status IN ('active','trialing','paused')`,
      [req.owner.email]
    );

    // Create new subscription
    const subRes = await db.query(
      `INSERT INTO subscriptions
         (owner_email, plan_id, billing_cycle, status, current_period_start, current_period_end)
       VALUES ($1, $2, $3,
               ${isFree ? `'active'` : `'pending_payment'`},
               NOW(),
               ${periodEnd(billing_cycle)})
       RETURNING *`,
      [req.owner.email, plan_id, billing_cycle]
    );
    const sub = subRes.rows[0];

    // Create invoice (waived for free plan)
    const invoiceStatus = isFree ? 'waived' : 'pending';
    const invoiceRes = await db.query(
      `INSERT INTO subscription_invoices
         (subscription_id, plan_id, billing_cycle, amount_pkr, status,
          payment_method, transaction_ref, screenshot_url,
          period_start, period_end, paid_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), ${periodEnd(billing_cycle)},
               ${isFree ? 'NOW()' : 'NULL'})
       RETURNING *`,
      [sub.id, plan_id, billing_cycle, amount, invoiceStatus,
       payment_method || null, transaction_ref || null, screenshot_url || null]
    );

    // Auto-activate free plan
    if (isFree) {
      await db.query(
        `UPDATE subscriptions SET status='active', updated_at=NOW() WHERE id=$1`,
        [sub.id]
      );
      sub.status = 'active';
    }

    res.status(201).json({ subscription: sub, invoice: invoiceRes.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/subscription/upgrade — change plan on existing subscription
router.put('/upgrade', async (req, res) => {
  const { plan_id, billing_cycle, payment_method, transaction_ref, screenshot_url } = req.body;
  if (!plan_id) return res.status(400).json({ error: 'plan_id is required' });

  try {
    const planRes = await db.query(`SELECT * FROM plans WHERE id = $1 AND is_active = TRUE`, [plan_id]);
    if (!planRes.rows[0]) return res.status(404).json({ error: 'Plan not found' });
    const plan = planRes.rows[0];

    const subRes = await db.query(
      `SELECT * FROM subscriptions WHERE owner_email=$1 AND status='active' ORDER BY created_at DESC LIMIT 1`,
      [req.owner.email]
    );
    if (!subRes.rows[0]) return res.status(404).json({ error: 'No active subscription' });
    const sub = subRes.rows[0];

    const newCycle = billing_cycle || sub.billing_cycle;
    const amount = newCycle === 'yearly' ? plan.price_yearly_pkr : plan.price_monthly_pkr;
    const isFree = plan.name === 'free';

    // Update subscription
    await db.query(
      `UPDATE subscriptions
       SET plan_id=$1, billing_cycle=$2, updated_at=NOW(),
           current_period_end=${periodEnd(newCycle)},
           usage_broadcasts=0, usage_ai_messages=0, usage_appointments=0
       WHERE id=$3`,
      [plan_id, newCycle, sub.id]
    );

    // Create upgrade invoice
    const invoiceRes = await db.query(
      `INSERT INTO subscription_invoices
         (subscription_id, plan_id, billing_cycle, amount_pkr, status,
          payment_method, transaction_ref, screenshot_url,
          period_start, period_end, paid_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), ${periodEnd(newCycle)},
               ${isFree ? 'NOW()' : 'NULL'})
       RETURNING *`,
      [sub.id, plan_id, newCycle, amount,
       isFree ? 'waived' : 'pending',
       payment_method || null, transaction_ref || null, screenshot_url || null]
    );

    const updated = (await db.query(
      `SELECT s.*, p.name as plan_name, p.display_name FROM subscriptions s JOIN plans p ON p.id=s.plan_id WHERE s.id=$1`,
      [sub.id]
    )).rows[0];

    res.json({ subscription: updated, invoice: invoiceRes.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/subscription/cancel — schedule cancellation at period end
router.post('/cancel', async (req, res) => {
  try {
    const r = await db.query(
      `UPDATE subscriptions
       SET cancel_at_period_end=TRUE, updated_at=NOW()
       WHERE owner_email=$1 AND status='active'
       RETURNING *`,
      [req.owner.email]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'No active subscription to cancel' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/subscription/reactivate — undo scheduled cancellation
router.post('/reactivate', async (req, res) => {
  try {
    const r = await db.query(
      `UPDATE subscriptions
       SET cancel_at_period_end=FALSE, updated_at=NOW()
       WHERE owner_email=$1 AND status='active' AND cancel_at_period_end=TRUE
       RETURNING *`,
      [req.owner.email]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'No cancellation scheduled' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Invoices ────────────────────────────────────────────────────────────────────
// GET /api/subscription/invoices
router.get('/invoices', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT i.*, p.display_name as plan_display_name
       FROM subscription_invoices i
       JOIN subscriptions s ON s.id = i.subscription_id
       JOIN plans p ON p.id = i.plan_id
       WHERE s.owner_email = $1
       ORDER BY i.created_at DESC`,
      [req.owner.email]
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/subscription/invoices/:id/confirm — mark invoice as paid
router.put('/invoices/:id/confirm', async (req, res) => {
  const { payment_method, transaction_ref, screenshot_url } = req.body;
  try {
    const invoiceRes = await db.query(
      `SELECT i.*, s.owner_email, s.id as sub_id FROM subscription_invoices i
       JOIN subscriptions s ON s.id = i.subscription_id
       WHERE i.id = $1`,
      [req.params.id]
    );
    const invoice = invoiceRes.rows[0];
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    if (invoice.owner_email !== req.owner.email) return res.status(403).json({ error: 'Forbidden' });

    const updated = await db.query(
      `UPDATE subscription_invoices
       SET status='paid', paid_at=NOW(),
           payment_method=COALESCE($1, payment_method),
           transaction_ref=COALESCE($2, transaction_ref),
           screenshot_url=COALESCE($3, screenshot_url)
       WHERE id=$4 RETURNING *`,
      [payment_method || null, transaction_ref || null, screenshot_url || null, req.params.id]
    );

    // Activate subscription if it was pending payment
    await db.query(
      `UPDATE subscriptions SET status='active', updated_at=NOW()
       WHERE id=$1 AND status IN ('pending_payment','past_due')`,
      [invoice.sub_id]
    );

    res.json(updated.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Usage ───────────────────────────────────────────────────────────────────────
// GET /api/subscription/usage — current usage vs limits
router.get('/usage', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT s.usage_clients, s.usage_broadcasts, s.usage_ai_messages, s.usage_appointments,
              p.max_clients, p.max_broadcasts, p.max_ai_messages, p.max_appointments,
              p.max_templates, p.max_team_members,
              p.name as plan_name, p.display_name
       FROM subscriptions s
       JOIN plans p ON p.id = s.plan_id
       WHERE s.owner_email=$1 AND s.status='active'
       ORDER BY s.created_at DESC LIMIT 1`,
      [req.owner.email]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'No active subscription' });
    const row = r.rows[0];

    res.json({
      plan: { name: row.plan_name, display_name: row.display_name },
      usage: {
        clients:      { used: row.usage_clients,     limit: row.max_clients },
        broadcasts:   { used: row.usage_broadcasts,  limit: row.max_broadcasts },
        ai_messages:  { used: row.usage_ai_messages, limit: row.max_ai_messages },
        appointments: { used: row.usage_appointments,limit: row.max_appointments },
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
