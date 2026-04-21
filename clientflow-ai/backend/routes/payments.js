const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { sendText } = require('../services/whatsappService');
const { refreshLeadScore } = require('../services/leadScoringService');

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const { status, client_id } = req.query;
    let q = `SELECT p.*, c.name, c.whatsapp_number, s.name as service_name FROM payments p
             LEFT JOIN clients c ON c.id=p.client_id
             LEFT JOIN services s ON s.id=p.service_id WHERE 1=1`;
    const params = [];
    if (status) { params.push(status); q += ` AND p.status=$${params.length}`; }
    if (client_id) { params.push(client_id); q += ` AND p.client_id=$${params.length}`; }
    q += ` ORDER BY p.created_at DESC`;
    res.json((await db.query(q, params)).rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { client_id, service_id, amount_pkr, method } = req.body;
    const r = await db.query(
      `INSERT INTO payments (client_id,service_id,amount_pkr,method) VALUES ($1,$2,$3,$4) RETURNING *`,
      [client_id, service_id, amount_pkr, method]
    );
    await db.query(
      `INSERT INTO alerts (type,client_id,message) VALUES ('pending_payment',$1,'New payment awaiting confirmation')`,
      [client_id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/confirm', async (req, res) => {
  try {
    const r = await db.query(
      `UPDATE payments SET status='confirmed', confirmed_at=NOW() WHERE id=$1 RETURNING *`,
      [req.params.id]
    );
    const pay = r.rows[0];
    if (pay) {
      await db.query(`UPDATE clients SET total_spent_pkr = total_spent_pkr + $1, status='paid' WHERE id=$2`, [pay.amount_pkr, pay.client_id]);
      await refreshLeadScore(pay.client_id).catch(() => {});
      const client = (await db.query(`SELECT whatsapp_number, name FROM clients WHERE id=$1`, [pay.client_id])).rows[0];
      await sendText(client.whatsapp_number,
        `✅ Payment confirmed! Thank you, ${client.name || 'valued client'}! Your service is now being processed. We'll update you soon. 🚀`
      );
      await db.query(
        `INSERT INTO follow_ups (client_id,type,scheduled_at) VALUES ($1,'post_delivery', NOW() + INTERVAL '2 days')`,
        [pay.client_id]
      );
      // Schedule upsell after 3 days
      if (pay.service_id) {
        await db.query(
          `INSERT INTO follow_ups (client_id,type,scheduled_at) VALUES ($1,'upsell', NOW() + INTERVAL '3 days')`,
          [pay.client_id]
        ).catch(() => {}); // non-blocking
      }
    }
    res.json(pay);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/revenue', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT DATE_TRUNC('day', confirmed_at) as date, SUM(amount_pkr) as total
       FROM payments WHERE status='confirmed' AND confirmed_at > NOW() - INTERVAL '30 days'
       GROUP BY 1 ORDER BY 1`
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
