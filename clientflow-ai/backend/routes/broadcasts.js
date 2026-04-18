const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { sendText } = require('../services/whatsappService');

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const r = await db.query(`SELECT * FROM broadcasts ORDER BY created_at DESC`);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { title, message, target_audience, scheduled_at } = req.body;
    const r = await db.query(
      `INSERT INTO broadcasts (title,message,target_audience,scheduled_at,status) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [title, message, target_audience, scheduled_at, scheduled_at ? 'scheduled' : 'draft']
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/send', async (req, res) => {
  try {
    const broadcast = (await db.query(`SELECT * FROM broadcasts WHERE id=$1`, [req.params.id])).rows[0];
    if (!broadcast) return res.status(404).json({ error: 'Not found' });

    let clientQ = `SELECT id, whatsapp_number, name FROM clients WHERE status != 'blocked'`;
    if (broadcast.target_audience === 'paid') clientQ += ` AND status='paid'`;
    else if (broadcast.target_audience === 'inactive') clientQ += ` AND last_active_at < NOW() - INTERVAL '14 days'`;
    else if (broadcast.target_audience === 'leads') clientQ += ` AND status='lead'`;

    const clients = (await db.query(clientQ)).rows;
    let sent = 0;

    for (const c of clients) {
      try {
        // Interpolate {{client_name}} placeholder
        const msg = broadcast.message.replace(/\{\{client_name\}\}/g, c.name || 'there');
        // Pass c.id so outbound broadcast messages are logged per-client
        await sendText(c.whatsapp_number, msg, c.id);
        await db.query(
          `INSERT INTO broadcast_recipients (broadcast_id,client_id,delivered) VALUES ($1,$2,true)
           ON CONFLICT DO NOTHING`,
          [broadcast.id, c.id]
        );
        sent++;
        // Small delay to avoid WhatsApp rate limits on burst sends
        await new Promise(r => setTimeout(r, 100));
      } catch { /* skip failed individual sends */ }
    }

    await db.query(
      `UPDATE broadcasts SET status='sent', sent_at=NOW(), total_sent=$1 WHERE id=$2`,
      [sent, broadcast.id]
    );
    res.json({ sent });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
