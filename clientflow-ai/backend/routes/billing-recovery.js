const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/billing-recovery — failed/pending payments needing recovery
router.get('/', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT p.*, c.name, c.whatsapp_number, s.name AS service_name
       FROM payments p
       LEFT JOIN clients c ON c.id=p.client_id
       LEFT JOIN services s ON s.id=p.service_id
       WHERE p.status IN ('pending','failed')
       ORDER BY p.created_at DESC`
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/billing-recovery/summary — overview counts
router.get('/summary', async (req, res) => {
  try {
    const [pending, failed, overdueAmt, retried] = await Promise.all([
      db.query(`SELECT COUNT(*), COALESCE(SUM(amount_pkr),0) AS total FROM payments WHERE status='pending'`),
      db.query(`SELECT COUNT(*), COALESCE(SUM(amount_pkr),0) AS total FROM payments WHERE status='failed'`),
      db.query(`SELECT COALESCE(SUM(amount_pkr),0) AS total FROM payments WHERE status='pending' AND created_at < NOW() - INTERVAL '3 days'`),
      db.query(`SELECT COUNT(*) FROM payments WHERE status='pending' AND reminder_sent=true`),
    ]);
    res.json({
      pending_count:  parseInt(pending.rows[0].count),
      pending_amount: parseFloat(pending.rows[0].total),
      failed_count:   parseInt(failed.rows[0].count),
      failed_amount:  parseFloat(failed.rows[0].total),
      overdue_amount: parseFloat(overdueAmt.rows[0].total),
      retried_count:  parseInt(retried.rows[0].count),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/billing-recovery/:id/remind — send WhatsApp reminder
router.post('/:id/remind', async (req, res) => {
  try {
    const { sendText } = require('../services/whatsappService');
    const pay = (await db.query(
      `SELECT p.*, c.whatsapp_number, c.name FROM payments p JOIN clients c ON c.id=p.client_id WHERE p.id=$1`,
      [req.params.id]
    )).rows[0];
    if (!pay) return res.status(404).json({ error: 'Not found' });
    await sendText(pay.whatsapp_number,
      `⚠️ Payment Reminder\n\nHi ${pay.name || 'valued client'}, your payment of PKR ${Number(pay.amount_pkr).toLocaleString()} is still pending.\n\nPlease complete the payment at your earliest convenience. Thank you! 🙏`
    );
    await db.query(`UPDATE payments SET reminder_sent=true, reminder_sent_at=NOW() WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/billing-recovery/:id/mark-failed — mark a payment as failed
router.post('/:id/mark-failed', async (req, res) => {
  try {
    const r = await db.query(
      `UPDATE payments SET status='failed' WHERE id=$1 RETURNING *`,
      [req.params.id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/billing-recovery/:id/retry — retry/re-open payment
router.post('/:id/retry', async (req, res) => {
  try {
    const r = await db.query(
      `UPDATE payments SET status='pending', reminder_sent=false WHERE id=$1 RETURNING *`,
      [req.params.id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
