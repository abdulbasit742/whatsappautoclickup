const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { sendText } = require('../services/whatsappService');

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const allowed = ['pending', 'sent', 'skipped', 'failed'];
    const statusFilter = allowed.includes(status) ? status : 'pending';
    const r = await db.query(
      `SELECT f.*, c.name, c.whatsapp_number FROM follow_ups f
       JOIN clients c ON c.id=f.client_id
       WHERE f.status=$1 ORDER BY f.scheduled_at ASC LIMIT 100`,
      [statusFilter]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { client_id, type, scheduled_at } = req.body;
    const r = await db.query(
      `INSERT INTO follow_ups (client_id, type, scheduled_at) VALUES ($1,$2,$3) RETURNING *`,
      [client_id, type, scheduled_at]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/trigger/:id', async (req, res) => {
  try {
    const f = (await db.query(
      `SELECT f.*,c.whatsapp_number FROM follow_ups f JOIN clients c ON c.id=f.client_id WHERE f.id=$1`,
      [req.params.id]
    )).rows[0];
    if (!f) return res.status(404).json({ error: 'Not found' });
    await sendText(f.whatsapp_number, req.body.message || 'Hello! Just checking in. 😊');
    await db.query(`UPDATE follow_ups SET status='sent', sent_at=NOW() WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/skip', async (req, res) => {
  try {
    const r = await db.query(
      `UPDATE follow_ups SET status='skipped' WHERE id=$1 AND status='pending' RETURNING *`,
      [req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'Not found or already processed' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
