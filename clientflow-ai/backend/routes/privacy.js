const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/privacy/access-logs
router.get('/access-logs', async (req, res) => {
  try {
    const r = await db.query(`SELECT * FROM data_access_logs ORDER BY created_at DESC LIMIT 100`);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/privacy/log — log an access event
router.post('/log', async (req, res) => {
  try {
    const { user_email, action, entity_type, entity_id } = req.body;
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    await db.query(
      `INSERT INTO data_access_logs (user_email, action, entity_type, entity_id, ip_address)
       VALUES ($1,$2,$3,$4,$5)`,
      [user_email, action, entity_type, entity_id, ip]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/privacy/deletion-requests
router.get('/deletion-requests', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT dr.*, c.name AS client_name, c.whatsapp_number
       FROM data_deletion_requests dr LEFT JOIN clients c ON c.id=dr.client_id
       ORDER BY dr.created_at DESC`
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/privacy/deletion-requests — submit deletion request
router.post('/deletion-requests', async (req, res) => {
  try {
    const { client_id, reason } = req.body;
    const r = await db.query(
      `INSERT INTO data_deletion_requests (client_id, reason) VALUES ($1,$2) RETURNING *`,
      [client_id, reason]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/privacy/deletion-requests/:id — approve/reject
router.patch('/deletion-requests/:id', async (req, res) => {
  try {
    const { status } = req.body;
    if (status === 'completed') {
      // Anonymize client data
      const req_data = (await db.query(`SELECT client_id FROM data_deletion_requests WHERE id=$1`, [req.params.id])).rows[0];
      if (req_data?.client_id) {
        await db.query(
          `UPDATE clients SET name='[Deleted]', email=NULL, notes=NULL WHERE id=$1`,
          [req_data.client_id]
        );
      }
    }
    const r = await db.query(
      `UPDATE data_deletion_requests SET status=$1, processed_at=NOW() WHERE id=$2 RETURNING *`,
      [status, req.params.id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/privacy/export/:clientId — export all client data
router.get('/export/:clientId', async (req, res) => {
  try {
    const [client, messages, payments] = await Promise.all([
      db.query(`SELECT * FROM clients WHERE id=$1`, [req.params.clientId]),
      db.query(`SELECT * FROM messages WHERE client_id=$1 ORDER BY created_at`, [req.params.clientId]),
      db.query(`SELECT * FROM payments WHERE client_id=$1 ORDER BY created_at`, [req.params.clientId]),
    ]);
    res.json({
      client: client.rows[0],
      messages: messages.rows,
      payments: payments.rows,
      exported_at: new Date(),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
