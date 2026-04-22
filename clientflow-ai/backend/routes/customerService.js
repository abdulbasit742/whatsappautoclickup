const express = require('express');
const router  = express.Router();
const db      = require('../db');
const auth    = require('../middleware/auth');
const { analyzeSentiment, routeTicket, generateResponse } = require('../services/customerServiceAI');

router.use(auth);

// POST /api/cs/analyze — analyze message sentiment
router.post('/analyze', async (req, res) => {
  try {
    const { text, clientId, messageId } = req.body;
    if (!text) return res.status(400).json({ error: 'text required' });
    const result = await analyzeSentiment(text);

    if (messageId) {
      await db.query(`UPDATE messages SET sentiment = $1 WHERE id = $2`, [result.sentiment, messageId]);
    }

    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/cs/tickets — list tickets with sentiment
router.get('/tickets', async (req, res) => {
  try {
    const { status, sentiment, urgency } = req.query;
    let q = `SELECT t.*, c.name, c.whatsapp_number FROM tickets t JOIN clients c ON c.id = t.client_id WHERE 1=1`;
    const params = [];
    if (status)    { params.push(status);    q += ` AND t.status = $${params.length}`; }
    if (sentiment) { params.push(sentiment); q += ` AND t.sentiment = $${params.length}`; }
    if (urgency)   { params.push(urgency);   q += ` AND t.urgency = $${params.length}`; }
    q += ` ORDER BY t.created_at DESC LIMIT 100`;
    const r = await db.query(q, params);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/cs/tickets — create ticket
router.post('/tickets', async (req, res) => {
  try {
    const { clientId, message, category } = req.body;
    const sentiment = await analyzeSentiment(message || '');
    const r = await db.query(
      `INSERT INTO tickets (client_id, message, category, sentiment, urgency, status, created_at)
       VALUES ($1,$2,$3,$4,$5,'open',NOW()) RETURNING *`,
      [clientId, message, category || 'general', sentiment.sentiment, sentiment.urgency]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/cs/route/:ticketId — route ticket
router.post('/route/:ticketId', async (req, res) => {
  try {
    const result = await routeTicket(req.params.ticketId);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/cs/suggest/:ticketId — get AI response suggestion
router.get('/suggest/:ticketId', async (req, res) => {
  try {
    const result = await generateResponse(req.params.ticketId);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
