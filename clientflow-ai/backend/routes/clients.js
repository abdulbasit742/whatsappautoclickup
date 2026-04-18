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
    const { name, email, notes, status } = req.body;
    // Only update fields that were explicitly provided (COALESCE prevents wiping existing data)
    const r = await db.query(
      `UPDATE clients
       SET name    = COALESCE($1, name),
           email   = COALESCE($2, email),
           notes   = COALESCE($3, notes),
           status  = COALESCE($4, status)
       WHERE id=$5 RETURNING *`,
      [
        name !== undefined ? name : null,
        email !== undefined ? email : null,
        notes !== undefined ? notes : null,
        status !== undefined ? status : null,
        req.params.id,
      ]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'Client not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/send', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'Message is required' });
    const client = (await db.query(`SELECT id, whatsapp_number FROM clients WHERE id=$1`, [req.params.id])).rows[0];
    if (!client) return res.status(404).json({ error: 'Client not found' });
    // Pass clientId so whatsappService logs the outbound WA message ID
    await sendText(client.whatsapp_number, message, client.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
