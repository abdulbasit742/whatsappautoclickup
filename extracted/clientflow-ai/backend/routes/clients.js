const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { sendText } = require('../services/whatsappService');

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const { status, search } = req.query;
    let q = `SELECT * FROM clients WHERE 1=1`;
    const params = [];
    if (status) { params.push(status); q += ` AND status=$${params.length}`; }
    if (search) { params.push(`%${search}%`); q += ` AND (name ILIKE $${params.length} OR whatsapp_number ILIKE $${params.length})`; }
    q += ` ORDER BY last_active_at DESC`;
    const r = await db.query(q, params);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const r = await db.query(`SELECT * FROM clients WHERE id=$1`, [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id/messages', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT * FROM messages WHERE client_id=$1 ORDER BY created_at ASC`,
      [req.params.id]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, email, notes, status, tags, lead_score } = req.body;
    const r = await db.query(
      `UPDATE clients SET name=$1,email=$2,notes=$3,status=$4,tags=COALESCE($5,tags),lead_score=COALESCE($6,lead_score) WHERE id=$7 RETURNING *`,
      [name, email, notes, status, tags, lead_score, req.params.id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/send', async (req, res) => {
  try {
    const { message } = req.body;
    const client = (await db.query(`SELECT whatsapp_number FROM clients WHERE id=$1`, [req.params.id])).rows[0];
    if (!client) return res.status(404).json({ error: 'Client not found' });
    await sendText(client.whatsapp_number, message);
    await db.query(
      `INSERT INTO messages (client_id, direction, content) VALUES ($1,'outbound',$2)`,
      [req.params.id, message]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
