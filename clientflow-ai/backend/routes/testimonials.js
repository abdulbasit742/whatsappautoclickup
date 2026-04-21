const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/testimonials — all testimonials
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    let q = `SELECT t.*, c.name AS client_name, c.whatsapp_number FROM testimonials t LEFT JOIN clients c ON c.id=t.client_id WHERE 1=1`;
    const params = [];
    if (status) { params.push(status); q += ` AND t.status=$${params.length}`; }
    q += ` ORDER BY t.created_at DESC`;
    res.json((await db.query(q, params)).rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/testimonials/request — send request to client via WhatsApp
router.post('/request', async (req, res) => {
  try {
    const { client_id } = req.body;
    const { sendText } = require('../services/whatsappService');
    const client = (await db.query(`SELECT * FROM clients WHERE id=$1`, [client_id])).rows[0];
    if (!client) return res.status(404).json({ error: 'Client not found' });
    await sendText(client.whatsapp_number,
      `⭐ We'd love your feedback!\n\nHi ${client.name || 'there'}, we hope you're happy with our service! Could you spare a minute to share a testimonial? Your words mean the world to us. 🙏\n\nReply to this message with your thoughts!`
    );
    const r = await db.query(
      `INSERT INTO testimonials (client_id, status) VALUES ($1,'requested') RETURNING *`,
      [client_id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/testimonials — submit a testimonial
router.post('/', async (req, res) => {
  try {
    const { client_id, content, rating } = req.body;
    const r = await db.query(
      `INSERT INTO testimonials (client_id, content, rating, status) VALUES ($1,$2,$3,'pending') RETURNING *`,
      [client_id, content, rating]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/testimonials/:id/approve — approve
router.put('/:id/approve', async (req, res) => {
  try {
    const r = await db.query(
      `UPDATE testimonials SET status='approved', reviewed_at=NOW() WHERE id=$1 RETURNING *`,
      [req.params.id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/testimonials/:id/reject — reject
router.put('/:id/reject', async (req, res) => {
  try {
    const r = await db.query(
      `UPDATE testimonials SET status='rejected', reviewed_at=NOW() WHERE id=$1 RETURNING *`,
      [req.params.id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/testimonials/:id/publish — publish to landing page
router.put('/:id/publish', async (req, res) => {
  try {
    const r = await db.query(
      `UPDATE testimonials SET status='published', published_at=NOW() WHERE id=$1 RETURNING *`,
      [req.params.id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/testimonials/public — published testimonials for landing page (no auth)
router.get('/public', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT t.id, t.content, t.rating, t.published_at, c.name AS client_name
       FROM testimonials t LEFT JOIN clients c ON c.id=t.client_id
       WHERE t.status='published' ORDER BY t.published_at DESC`
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
