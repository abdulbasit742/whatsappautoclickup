const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { sendText } = require('../services/whatsappService');

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT a.*, c.name, c.whatsapp_number FROM appointments a
       JOIN clients c ON c.id=a.client_id ORDER BY a.slot_datetime ASC`
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { client_id, slot_datetime, notes } = req.body;
    if (!client_id) return res.status(400).json({ error: 'client_id is required' });
    if (!slot_datetime) return res.status(400).json({ error: 'slot_datetime is required' });

    const client = (await db.query(`SELECT whatsapp_number, name FROM clients WHERE id=$1`, [client_id])).rows[0];
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const r = await db.query(
      `INSERT INTO appointments (client_id,slot_datetime,notes,status) VALUES ($1,$2,$3,'confirmed') RETURNING *`,
      [client_id, slot_datetime, notes || null]
    );
    const dt = new Date(slot_datetime).toLocaleString('en-PK');
    // Pass clientId so the confirmation message is logged per-client
    await sendText(
      client.whatsapp_number,
      `📅 Your appointment is confirmed for *${dt}*. We look forward to speaking with you! 😊`,
      client_id
    ).catch(() => {});
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'status is required' });
    const r = await db.query(
      `UPDATE appointments SET status=$1 WHERE id=$2 RETURNING *`,
      [status, req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'Appointment not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
