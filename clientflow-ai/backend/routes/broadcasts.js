const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { enqueueMessageJob } = require('../services/jobQueueService');

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

    let clientQ = `SELECT id, whatsapp_number FROM clients WHERE status != 'blocked'`;
    if (broadcast.target_audience === 'paid') clientQ += ` AND status='paid'`;
    else if (broadcast.target_audience === 'inactive') clientQ += ` AND last_active_at < NOW() - INTERVAL '14 days'`;
    else if (broadcast.target_audience === 'leads') clientQ += ` AND status='lead'`;

    const clients = (await db.query(clientQ)).rows;
    let queued = 0;

    await db.query(`UPDATE broadcasts SET status='running' WHERE id=$1`, [broadcast.id]);
    for (const c of clients) {
      await enqueueMessageJob({
        type: 'broadcast',
        clientId: c.id,
        broadcastId: broadcast.id,
        payload: { to: c.whatsapp_number, message: broadcast.message }
      });
      await db.query(
        `INSERT INTO broadcast_recipients (broadcast_id,client_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [broadcast.id, c.id]
      );
      queued++;
    }

    await db.query(
      `UPDATE broadcasts SET status='scheduled', total_sent=$1 WHERE id=$2`,
      [queued, broadcast.id]
    );
    res.json({ queued });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/pause', async (req, res) => {
  try {
    const r = await db.query(`UPDATE broadcasts SET status='paused' WHERE id=$1 RETURNING *`, [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/resume', async (req, res) => {
  try {
    const r = await db.query(`UPDATE broadcasts SET status='scheduled' WHERE id=$1 RETURNING *`, [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/archive', async (req, res) => {
  try {
    const r = await db.query(`UPDATE broadcasts SET status='archived' WHERE id=$1 RETURNING *`, [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/duplicate', async (req, res) => {
  try {
    const src = (await db.query(`SELECT * FROM broadcasts WHERE id=$1`, [req.params.id])).rows[0];
    if (!src) return res.status(404).json({ error: 'Not found' });
    const copy = await db.query(
      `INSERT INTO broadcasts (title, message, target_audience, status, template_vars, timezone, recurring_rule)
       VALUES ($1,$2,$3,'draft',$4,$5,$6)
       RETURNING *`,
      [`${src.title} (Copy)`, src.message, src.target_audience, src.template_vars || {}, src.timezone, src.recurring_rule]
    );
    res.json(copy.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
