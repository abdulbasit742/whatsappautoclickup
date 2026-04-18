const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { enqueueCampaign } = require('../services/queueService');

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

    // Update to running status
    await db.query(`UPDATE broadcasts SET status='scheduled' WHERE id=$1`, [req.params.id]);

    let clientQ = `SELECT id, whatsapp_number, name FROM clients WHERE status != 'blocked'`;
    if (broadcast.target_audience === 'paid') clientQ += ` AND status='paid'`;
    else if (broadcast.target_audience === 'inactive') clientQ += ` AND last_active_at < NOW() - INTERVAL '14 days'`;
    else if (broadcast.target_audience === 'leads') clientQ += ` AND status='lead'`;

    const clients = (await db.query(clientQ)).rows;
    const delayMs = req.body.delay_seconds ? parseInt(req.body.delay_seconds) * 1000 : 2000;

    const queued = await enqueueCampaign(broadcast.id, clients, broadcast.message, delayMs);

    await db.query(`UPDATE broadcasts SET status='sent', sent_at=NOW(), total_sent=$1 WHERE id=$2`, [queued, broadcast.id]);
    res.json({ queued, total: clients.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM broadcasts WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
