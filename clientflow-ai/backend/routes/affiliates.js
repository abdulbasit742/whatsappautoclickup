const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

router.use(auth);

// GET /api/affiliates — list affiliates
router.get('/', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT a.*, COALESCE(rc.referrals,0) AS referral_count, COALESCE(rc.commission,0) AS total_commission
       FROM affiliates a
       LEFT JOIN (
         SELECT affiliate_id, COUNT(*) AS referrals, SUM(commission_amount) AS commission
         FROM affiliate_referrals GROUP BY affiliate_id
       ) rc ON rc.affiliate_id=a.id
       ORDER BY a.created_at DESC`
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/affiliates — create affiliate signup
router.post('/', async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const code = uuidv4().split('-')[0].toUpperCase();
    const link = `${process.env.FRONTEND_URL || 'https://app.example.com'}/signup?ref=${code}`;
    const r = await db.query(
      `INSERT INTO affiliates (name, email, phone, referral_code, referral_link) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [name, email, phone, code, link]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/affiliates/:id — affiliate detail with referrals
router.get('/:id', async (req, res) => {
  try {
    const [affiliate, referrals] = await Promise.all([
      db.query(`SELECT * FROM affiliates WHERE id=$1`, [req.params.id]),
      db.query(
        `SELECT * FROM affiliate_referrals WHERE affiliate_id=$1 ORDER BY created_at DESC`,
        [req.params.id]
      ),
    ]);
    if (!affiliate.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json({ ...affiliate.rows[0], referrals: referrals.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/affiliates/:id/payout — mark commission as paid
router.put('/:id/payout', async (req, res) => {
  try {
    await db.query(
      `UPDATE affiliate_referrals SET payout_status='paid', paid_at=NOW() WHERE affiliate_id=$1 AND payout_status='pending'`,
      [req.params.id]
    );
    await db.query(`UPDATE affiliates SET total_paid=total_paid+pending_balance, pending_balance=0 WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/affiliates/analytics/summary
router.get('/analytics/summary', async (req, res) => {
  try {
    const [total, active, revenue, pending] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM affiliates`),
      db.query(`SELECT COUNT(DISTINCT affiliate_id) FROM affiliate_referrals WHERE created_at > NOW() - INTERVAL '30 days'`),
      db.query(`SELECT COALESCE(SUM(commission_amount),0) AS total FROM affiliate_referrals`),
      db.query(`SELECT COALESCE(SUM(commission_amount),0) AS total FROM affiliate_referrals WHERE payout_status='pending'`),
    ]);
    res.json({
      total_affiliates:   parseInt(total.rows[0].count),
      active_this_month:  parseInt(active.rows[0].count),
      total_commission:   parseFloat(revenue.rows[0].total),
      pending_payout:     parseFloat(pending.rows[0].total),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
