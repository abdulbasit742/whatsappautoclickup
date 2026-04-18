const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { sendText } = require('../services/whatsappService');

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
    const { client_id, service_id, amount_pkr, method, transaction_ref, notes } = req.body;
    if (!client_id || !amount_pkr) return res.status(400).json({ error: 'client_id and amount_pkr are required' });

    const r = await db.query(
      `INSERT INTO payments (client_id,service_id,amount_pkr,method,transaction_ref,notes)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [client_id, service_id || null, amount_pkr, method || null, transaction_ref || null, notes || null]
    );
    await db.query(
      `INSERT INTO alerts (type,client_id,message,priority) VALUES ('pending_payment',$1,'New payment awaiting confirmation','high')`,
      [client_id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/confirm', async (req, res) => {
  const dbClient = await require('../db').pool.connect();
  try {
    await dbClient.query('BEGIN');

    const r = await dbClient.query(
      `UPDATE payments SET status='confirmed', confirmed_at=NOW() WHERE id=$1 AND status='pending' RETURNING *`,
      [req.params.id]
    );
    if (!r.rows.length) {
      await dbClient.query('ROLLBACK');
      return res.status(404).json({ error: 'Payment not found or already confirmed' });
    }

    const pay = r.rows[0];

    // Update client total and status
    await dbClient.query(
      `UPDATE clients SET total_spent_pkr = total_spent_pkr + $1, status='paid' WHERE id=$2`,
      [pay.amount_pkr, pay.client_id]
    );

    // Fetch client inside the transaction for consistency
    const clientRow = (await dbClient.query(
      `SELECT whatsapp_number, name FROM clients WHERE id=$1`, [pay.client_id]
    )).rows[0];

    await dbClient.query('COMMIT');

    if (!clientRow) {
      console.warn(`[Payments] Client ${pay.client_id} not found after confirming payment ${pay.id}`);
      return res.json(pay);
    }
    const name = clientRow.name || 'valued client';

    // Send payment confirmation to client
    await sendText(clientRow.whatsapp_number,
      `✅ *Payment Confirmed!*\n\nThank you, ${name}! Your payment of PKR ${Number(pay.amount_pkr).toLocaleString()} has been received.\n\n🚀 Your service is now being processed. We'll send you updates here. Stay tuned!`,
      pay.client_id
    ).catch(() => {});

    // Send service/account details if available in settings
    const serviceDetailsRow = await db.query(`SELECT value FROM settings WHERE key='service_delivery_message'`);
    const serviceDetails = serviceDetailsRow.rows[0]?.value;
    if (serviceDetails) {
      await sendText(clientRow.whatsapp_number,
        serviceDetails.replace(/\{\{name\}\}/g, name),
        pay.client_id
      ).catch(() => {});
    }

    // Resolve any pending_payment alerts for this client
    await db.query(
      `UPDATE alerts SET is_resolved=true, resolved_at=NOW()
       WHERE client_id=$1 AND type='pending_payment' AND is_resolved=false`,
      [pay.client_id]
    );

    // Schedule post-delivery follow-up
    await db.query(
      `INSERT INTO follow_ups (client_id,type,scheduled_at) VALUES ($1,'post_delivery', NOW() + INTERVAL '2 days')`,
      [pay.client_id]
    ).catch(() => {});

    // Schedule upsell after 3 days
    await db.query(
      `INSERT INTO follow_ups (client_id,type,scheduled_at) VALUES ($1,'upsell', NOW() + INTERVAL '3 days')`,
      [pay.client_id]
    ).catch(() => {});

    // Alert owner
    const ownerRow = await db.query(`SELECT value FROM settings WHERE key='owner_whatsapp'`);
    const ownerNum = ownerRow.rows[0]?.value;
    if (ownerNum) {
      await sendText(ownerNum,
        `💰 *Payment Confirmed!*\n\nClient: ${name} (${clientRow.whatsapp_number})\nAmount: PKR ${Number(pay.amount_pkr).toLocaleString()}\nMethod: ${pay.method || 'N/A'}\n\nService delivery initiated. ✅`
      ).catch(() => {});
    }

    res.json(pay);
  } catch (err) {
    await dbClient.query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: err.message });
  } finally {
    dbClient.release();
  }
});

router.put('/:id/reject', async (req, res) => {
  try {
    const r = await db.query(
      `UPDATE payments SET status='rejected' WHERE id=$1 AND status='pending' RETURNING *`,
      [req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Payment not found or already processed' });
    const pay = r.rows[0];
    const clientRow = (await db.query(`SELECT whatsapp_number, name FROM clients WHERE id=$1`, [pay.client_id])).rows[0];
    if (clientRow) {
      await sendText(clientRow.whatsapp_number,
        `⚠️ We could not verify your payment. Please resend the screenshot or contact us for assistance. We're here to help! 🙏`,
        pay.client_id
      ).catch(() => {});
    }
    // Resolve pending_payment alerts so the admin dashboard stays clean
    await db.query(
      `UPDATE alerts SET is_resolved=true, resolved_at=NOW()
       WHERE client_id=$1 AND type='pending_payment' AND is_resolved=false`,
      [pay.client_id]
    );
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
