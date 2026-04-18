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

// ─── Broadcast Stats: delivery count + reply count ───────────────────────────
router.get('/:id/stats', async (req, res) => {
  try {
    const broadcast = (await db.query(`SELECT id, sent_at, total_sent FROM broadcasts WHERE id=$1`, [req.params.id])).rows[0];
    if (!broadcast) return res.status(404).json({ error: 'Not found' });
    if (!broadcast.sent_at) return res.json({ delivered: 0, replies: 0, replyRate: '0.0' });

    const [delivered, replies] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM broadcast_recipients WHERE broadcast_id=$1 AND delivered=true`, [broadcast.id]),
      // Count inbound messages from recipients after the broadcast was sent
      db.query(`
        SELECT COUNT(DISTINCT br.client_id) FROM broadcast_recipients br
        JOIN messages m ON m.client_id = br.client_id
        WHERE br.broadcast_id=$1
          AND m.direction = 'inbound'
          AND m.created_at > $2
      `, [broadcast.id, broadcast.sent_at]),
    ]);

    const deliveredN = parseInt(delivered.rows[0].count);
    const repliesN   = parseInt(replies.rows[0].count);
    const replyRate  = deliveredN > 0 ? ((repliesN / deliveredN) * 100).toFixed(1) : '0.0';

    res.json({ delivered: deliveredN, replies: repliesN, replyRate });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
