const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const { sendText } = require('../services/whatsappService');

router.use(auth);
router.use(apiLimiter);

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
    const r = await db.query(
      `INSERT INTO appointments (client_id,slot_datetime,notes,status) VALUES ($1,$2,$3,'confirmed') RETURNING *`,
      [client_id, slot_datetime, notes]
    );
    const client = (await db.query(`SELECT whatsapp_number,name FROM clients WHERE id=$1`, [client_id])).rows[0];
    const dt = new Date(slot_datetime).toLocaleString('en-PK');
    await sendText(client.whatsapp_number, `📅 Your appointment is confirmed for *${dt}*. We look forward to speaking with you! 😊`);
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const r = await db.query(
      `UPDATE appointments SET status=$1 WHERE id=$2 RETURNING *`,
      [status, req.params.id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
