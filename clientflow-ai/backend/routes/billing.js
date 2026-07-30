const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// ─── Plans ──────────────────────────────────────────────────────────────────
router.get('/plans', async (req, res) => {
  try {
    const r = await db.query(`SELECT * FROM plans WHERE is_active=true ORDER BY price_pkr ASC`);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/plans', async (req, res) => {
  try {
    const { name, description, price_pkr, price_usd, billing_cycle, features, max_users, max_contacts } = req.body;
    const r = await db.query(
      `INSERT INTO plans (name, description, price_pkr, price_usd, billing_cycle, features, max_users, max_contacts)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [name, description, price_pkr, price_usd, billing_cycle || 'monthly', JSON.stringify(features || []), max_users || 3, max_contacts || 500]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/plans/:id', async (req, res) => {
  try {
    const { name, description, price_pkr, price_usd, billing_cycle, features, max_users, max_contacts, is_active } = req.body;
    const r = await db.query(
      `UPDATE plans SET name=$1, description=$2, price_pkr=$3, price_usd=$4, billing_cycle=$5, features=$6, max_users=$7, max_contacts=$8, is_active=$9
       WHERE id=$10 RETURNING *`,
      [name, description, price_pkr, price_usd, billing_cycle, JSON.stringify(features || []), max_users, max_contacts, is_active, req.params.id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Subscriptions ──────────────────────────────────────────────────────────
router.get('/subscription', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT s.*, p.name AS plan_name, p.price_pkr, p.features, p.max_users, p.max_contacts
       FROM subscriptions s LEFT JOIN plans p ON p.id = s.plan_id
       ORDER BY s.created_at DESC LIMIT 1`
    );
    res.json(r.rows[0] || null);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/subscription', async (req, res) => {
  try {
    const { plan_id, payment_method, trial_days } = req.body;
    const trial_ends = trial_days ? new Date(Date.now() + trial_days * 86400000) : null;
    const expires = new Date(Date.now() + 30 * 86400000);
    const r = await db.query(
      `INSERT INTO subscriptions (plan_id, payment_method, trial_ends_at, expires_at)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [plan_id, payment_method, trial_ends, expires]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/subscription/:id', async (req, res) => {
  try {
    const { status, plan_id } = req.body;
    const r = await db.query(
      `UPDATE subscriptions SET status=$1, plan_id=COALESCE($2, plan_id) WHERE id=$3 RETURNING *`,
      [status, plan_id, req.params.id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Invoices ───────────────────────────────────────────────────────────────
router.get('/invoices', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT i.*, p.name AS plan_name FROM invoices i
       LEFT JOIN subscriptions s ON s.id = i.subscription_id
       LEFT JOIN plans p ON p.id = s.plan_id
       ORDER BY i.created_at DESC`
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/invoices', async (req, res) => {
  try {
    const { subscription_id, amount_pkr, amount_usd, due_date, notes } = req.body;
    const r = await db.query(
      `INSERT INTO invoices (subscription_id, amount_pkr, amount_usd, due_date, notes)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [subscription_id, amount_pkr, amount_usd, due_date, notes]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/invoices/:id/pay', async (req, res) => {
  try {
    const r = await db.query(
      `UPDATE invoices SET status='paid', paid_at=NOW() WHERE id=$1 RETURNING *`,
      [req.params.id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
