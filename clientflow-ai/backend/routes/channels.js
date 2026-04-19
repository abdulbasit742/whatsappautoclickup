const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/channels — list all channels
router.get('/', async (req, res) => {
  try {
    const r = await db.query(`SELECT * FROM channels ORDER BY type`);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/channels/unified-inbox — all messages across channels
router.get('/unified-inbox', async (req, res) => {
  try {
    const { channel, unread } = req.query;
    let q = `
      SELECT cm.*, c.name AS client_name, c.whatsapp_number
      FROM channel_messages cm
      LEFT JOIN clients c ON c.id = cm.client_id
      WHERE 1=1
    `;
    const params = [];
    if (channel) { params.push(channel); q += ` AND cm.channel=$${params.length}`; }
    if (unread === 'true') q += ` AND cm.is_read=false`;
    q += ` ORDER BY cm.created_at DESC LIMIT 100`;
    const r = await db.query(q, params);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/channels/badges — unread counts per channel
router.get('/badges', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT channel, COUNT(*) AS unread FROM channel_messages WHERE is_read=false GROUP BY channel`
    );
    const badges = {};
    r.rows.forEach(row => { badges[row.channel] = parseInt(row.unread); });
    res.json(badges);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/channels/messages — send a message via channel
router.post('/messages', async (req, res) => {
  try {
    const { client_id, channel, content, subject } = req.body;
    const r = await db.query(
      `INSERT INTO channel_messages (client_id, channel, direction, content, subject)
       VALUES ($1,$2,'outbound',$3,$4) RETURNING *`,
      [client_id, channel, content, subject || null]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/channels/messages/:id/read — mark as read
router.patch('/messages/:id/read', async (req, res) => {
  try {
    await db.query(`UPDATE channel_messages SET is_read=true WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
