const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/csat — all survey responses
router.get('/', async (req, res) => {
  try {
    const { type } = req.query;
    let q = `SELECT s.*, c.name AS client_name, c.whatsapp_number FROM csat_responses s LEFT JOIN clients c ON c.id=s.client_id WHERE 1=1`;
    const params = [];
    if (type) { params.push(type); q += ` AND s.survey_type=$${params.length}`; }
    q += ` ORDER BY s.created_at DESC`;
    res.json((await db.query(q, params)).rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/csat/send — send CSAT survey
router.post('/send', async (req, res) => {
  try {
    const { client_id, survey_type } = req.body;
    const { sendText } = require('../services/whatsappService');
    const client = (await db.query(`SELECT * FROM clients WHERE id=$1`, [client_id])).rows[0];
    if (!client) return res.status(404).json({ error: 'Client not found' });
    const typeLabel = survey_type === 'campaign' ? 'campaign' : 'support';
    await sendText(client.whatsapp_number,
      `😊 How was your experience?\n\nHi ${client.name || 'there'}, we'd love to hear about your recent ${typeLabel} interaction!\n\nPlease rate your experience from 1–5 (1 = poor, 5 = excellent) and add any comments. Thank you! 🙏`
    );
    const r = await db.query(
      `INSERT INTO csat_responses (client_id, survey_type, status) VALUES ($1,$2,'sent') RETURNING *`,
      [client_id, survey_type]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/csat/respond — submit a CSAT rating
router.post('/respond', async (req, res) => {
  try {
    const { client_id, survey_type, rating, comment } = req.body;
    if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be 1–5' });
    const r = await db.query(
      `INSERT INTO csat_responses (client_id, survey_type, rating, comment, status)
       VALUES ($1,$2,$3,$4,'responded') RETURNING *`,
      [client_id, survey_type, rating, comment]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/csat/analytics — CSAT score breakdown
router.get('/analytics', async (req, res) => {
  try {
    const overall = await db.query(
      `SELECT ROUND(AVG(rating),2) AS avg_rating, COUNT(*) AS total
       FROM csat_responses WHERE status='responded'`
    );
    const byType = await db.query(
      `SELECT survey_type, ROUND(AVG(rating),2) AS avg_rating, COUNT(*) AS total
       FROM csat_responses WHERE status='responded' GROUP BY survey_type`
    );
    const trend = await db.query(
      `SELECT DATE_TRUNC('week', created_at) AS week, ROUND(AVG(rating),2) AS avg_rating, COUNT(*) AS count
       FROM csat_responses WHERE status='responded' AND created_at > NOW() - INTERVAL '90 days'
       GROUP BY 1 ORDER BY 1`
    );
    res.json({
      avg_rating:   parseFloat(overall.rows[0].avg_rating) || 0,
      total:        parseInt(overall.rows[0].total),
      by_type:      byType.rows,
      trend:        trend.rows,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
