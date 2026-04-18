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
    const r = await db.query(
      `UPDATE clients SET name=$1,email=$2,notes=$3,status=$4 WHERE id=$5 RETURNING *`,
      [name, email, notes, status, req.params.id]
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

router.delete('/:id', async (req, res) => {
  try {
    await db.query(`UPDATE clients SET status='blocked' WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/export/csv', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT c.whatsapp_number, c.name, c.email, c.status, c.total_spent_pkr,
              c.first_contact_at, c.last_active_at, c.referral_code
       FROM clients c ORDER BY c.created_at DESC`
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="clients.csv"');
    const header = 'whatsapp_number,name,email,status,total_spent_pkr,first_contact,last_active,referral_code\n';
    const rows = r.rows.map(c =>
      [c.whatsapp_number, c.name || '', c.email || '', c.status, c.total_spent_pkr,
       c.first_contact_at, c.last_active_at, c.referral_code || ''].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    res.send(header + rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
