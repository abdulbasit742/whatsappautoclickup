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

const ALLOWED_STATUSES = ['pending', 'confirmed', 'cancelled', 'completed'];

router.put('/:id', async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'status is required' });
    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${ALLOWED_STATUSES.join(', ')}` });
    }
    const r = await db.query(
      `UPDATE appointments SET status=$1 WHERE id=$2 RETURNING *`,
      [status, req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'Appointment not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Available Booking Slots ─────────────────────────────────────────────────
// Returns 9am–6pm slots every 2 hours for the next 14 days, excluding already booked ones
router.get('/available-slots', async (req, res) => {
  try {
    const booked = (await db.query(
      `SELECT slot_datetime FROM appointments WHERE status IN ('confirmed','pending') AND slot_datetime > NOW()`
    )).rows.map(r => new Date(r.slot_datetime).toISOString());

    const bookedSet = new Set(booked);
    const HOURS = [9, 11, 13, 15, 17]; // 9am, 11am, 1pm, 3pm, 5pm
    const slots = [];
    const now = new Date();

    for (let d = 0; d < 14; d++) {
      const day = new Date(now);
      day.setDate(now.getDate() + d + 1);
      for (const h of HOURS) {
        day.setHours(h, 0, 0, 0);
        const iso = day.toISOString();
        if (!bookedSet.has(iso)) {
          slots.push({
            datetime: iso,
            label: day.toLocaleString('en-PK', { weekday: 'long', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }),
          });
        }
      }
    }
    res.json(slots);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
