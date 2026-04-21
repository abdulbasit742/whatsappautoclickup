const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { sendText } = require('../services/whatsappService');
const { calculateLeadScore, refreshLeadScore } = require('../services/leadScoringService');

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const { status, search, temperature, min_score } = req.query;
    let q = `SELECT * FROM clients WHERE 1=1`;
    const params = [];
    if (status) { params.push(status); q += ` AND status=$${params.length}`; }
    if (search) { params.push(`%${search}%`); q += ` AND (name ILIKE $${params.length} OR whatsapp_number ILIKE $${params.length})`; }
    if (temperature) { params.push(temperature); q += ` AND lead_temperature=$${params.length}`; }
    if (min_score) { params.push(Number(min_score)); q += ` AND lead_score >= $${params.length}`; }
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
    const { name, email, notes, status, city, company, source, product_interest, is_invalid } = req.body;
    const r = await db.query(
      `UPDATE clients
       SET name=$1,email=$2,notes=$3,status=$4,city=$5,company=$6,source=$7,product_interest=$8,is_invalid=COALESCE($9,is_invalid),updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [name, email, notes, status, city, company, source, product_interest, is_invalid, req.params.id]
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

router.post('/:id/score/recalculate', async (req, res) => {
  try {
    const result = await refreshLeadScore(req.params.id);
    if (!result.client) return res.status(404).json({ error: 'Client not found' });
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id/insights', async (req, res) => {
  try {
    const client = (await db.query(`SELECT * FROM clients WHERE id=$1`, [req.params.id])).rows[0];
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const scoring = await calculateLeadScore(req.params.id);
    res.json({
      clientId: req.params.id,
      score: scoring.score,
      temperature: scoring.temperature,
      tags: scoring.tags,
      metrics: scoring.metrics,
      profile: {
        name: client.name,
        status: client.status,
        totalSpent: Number(client.total_spent_pkr),
        lastActiveAt: client.last_active_at
      }
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/_tools/duplicates', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT whatsapp_number, COUNT(*)::int AS duplicates, ARRAY_AGG(id ORDER BY created_at) AS client_ids
       FROM clients
       WHERE merged_to_id IS NULL
       GROUP BY whatsapp_number
       HAVING COUNT(*) > 1
       ORDER BY duplicates DESC`
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/_tools/merge', async (req, res) => {
  try {
    const { primary_id, secondary_id } = req.body;
    if (!primary_id || !secondary_id || primary_id === secondary_id) {
      return res.status(400).json({ error: 'primary_id and secondary_id are required' });
    }
    await db.query(`UPDATE messages SET client_id=$1 WHERE client_id=$2`, [primary_id, secondary_id]);
    await db.query(`UPDATE payments SET client_id=$1 WHERE client_id=$2`, [primary_id, secondary_id]);
    await db.query(`UPDATE clients SET merged_to_id=$1, status='inactive', updated_at=NOW() WHERE id=$2`, [primary_id, secondary_id]);
    const merged = await refreshLeadScore(primary_id);
    res.json({ success: true, merged });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
