const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { broadcastQueue } = require('../modules/queue/queues');

router.use(auth);

router.get('/', async (req, res, next) => {
  try {
    const r = await db.query(`SELECT * FROM broadcasts ORDER BY created_at DESC`);
    res.json(r.rows);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { title, message, target_audience, scheduled_at } = req.body;
    if (!message) return res.status(400).json({ error: '"message" is required' });

    const r = await db.query(
      `INSERT INTO broadcasts (title, message, target_audience, scheduled_at, status)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [title, message, target_audience || 'all', scheduled_at || null, scheduled_at ? 'scheduled' : 'draft']
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { next(err); }
});

// Enqueue broadcast for async fan-out processing
router.post('/:id/send', async (req, res, next) => {
  try {
    const broadcast = (
      await db.query(`SELECT * FROM broadcasts WHERE id = $1`, [req.params.id])
    ).rows[0];
    if (!broadcast) return res.status(404).json({ error: 'Broadcast not found' });
    if (broadcast.status === 'sent') {
      return res.status(409).json({ error: 'Broadcast already sent' });
    }

    const job = await broadcastQueue.add('send-broadcast', { broadcastId: broadcast.id });

    // Mark as processing to prevent duplicate sends
    await db.query(
      `UPDATE broadcasts SET status = 'scheduled' WHERE id = $1`,
      [broadcast.id]
    );

    res.json({ message: 'Broadcast queued for sending', jobId: job.id });
  } catch (err) { next(err); }
});

module.exports = router;
