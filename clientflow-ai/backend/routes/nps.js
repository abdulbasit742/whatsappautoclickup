const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/nps — all NPS responses
router.get('/', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT n.*, c.name AS client_name, c.whatsapp_number
       FROM nps_responses n LEFT JOIN clients c ON c.id=n.client_id
       ORDER BY n.created_at DESC`
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/nps/send — send NPS survey via WhatsApp
router.post('/send', async (req, res) => {
  try {
    const { client_id } = req.body;
    const { sendText } = require('../services/whatsappService');
    const client = (await db.query(`SELECT * FROM clients WHERE id=$1`, [client_id])).rows[0];
    if (!client) return res.status(404).json({ error: 'Client not found' });
    await sendText(client.whatsapp_number,
      `📊 Quick Question!\n\nHi ${client.name || 'there'}, on a scale of 0–10, how likely are you to recommend our service to a friend or colleague?\n\nReply with your score (0–10) and feel free to add any comments. Your feedback helps us improve! 🙏`
    );
    const r = await db.query(
      `INSERT INTO nps_responses (client_id, status) VALUES ($1,'sent') RETURNING *`,
      [client_id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/nps/respond — record a response
router.post('/respond', async (req, res) => {
  try {
    const { client_id, score, comment } = req.body;
    if (score < 0 || score > 10) return res.status(400).json({ error: 'Score must be 0–10' });
    const category = score >= 9 ? 'promoter' : score >= 7 ? 'passive' : 'detractor';
    const r = await db.query(
      `INSERT INTO nps_responses (client_id, score, comment, category, status)
       VALUES ($1,$2,$3,$4,'responded')
       ON CONFLICT (client_id) DO UPDATE SET score=$2, comment=$3, category=$4, status='responded', responded_at=NOW()
       RETURNING *`,
      [client_id, score, comment, category]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/nps/analytics — NPS score and breakdown
router.get('/analytics', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT
         COUNT(*) FILTER (WHERE category='promoter') AS promoters,
         COUNT(*) FILTER (WHERE category='passive')  AS passives,
         COUNT(*) FILTER (WHERE category='detractor') AS detractors,
         COUNT(*) AS total,
         ROUND(AVG(score),1) AS avg_score
       FROM nps_responses WHERE status='responded'`
    );
    const row = r.rows[0];
    const total = parseInt(row.total) || 0;
    const promoters  = parseInt(row.promoters)  || 0;
    const detractors = parseInt(row.detractors) || 0;
    const nps = total > 0 ? (((promoters - detractors) / total) * 100).toFixed(1) : 0;

    const trend = await db.query(
      `SELECT DATE_TRUNC('week', responded_at) AS week, ROUND(AVG(score),1) AS avg_score, COUNT(*) AS count
       FROM nps_responses WHERE status='responded' AND responded_at > NOW() - INTERVAL '90 days'
       GROUP BY 1 ORDER BY 1`
    );

    res.json({
      nps_score:  parseFloat(nps),
      avg_score:  parseFloat(row.avg_score),
      total,
      promoters,
      passives:   parseInt(row.passives) || 0,
      detractors,
      trend: trend.rows,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
