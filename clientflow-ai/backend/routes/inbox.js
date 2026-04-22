const express = require('express');
const router  = express.Router();
const db      = require('../db');
const auth    = require('../middleware/auth');
const { categorizeMessage, suggestReply, prioritizeInbox } = require('../services/inboxAIService');
const { sendText } = require('../services/whatsappService');

router.use(auth);

// GET /api/inbox — paginated inbox with AI categories
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, category, priority } = req.query;
    const offset = (page - 1) * limit;

    let q = `SELECT m.*, c.name, c.whatsapp_number, c.status, m.ai_category, m.priority_score
             FROM messages m JOIN clients c ON c.id = m.client_id
             WHERE m.direction = 'inbound'`;
    const params = [];

    if (category) { params.push(category); q += ` AND m.ai_category = $${params.length}`; }

    q += ` ORDER BY ${priority === 'true' ? 'm.priority_score DESC, ' : ''}m.created_at DESC`;
    params.push(parseInt(limit)); q += ` LIMIT $${params.length}`;
    params.push(offset);          q += ` OFFSET $${params.length}`;

    const r = await db.query(q, params);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/inbox/categorize — categorize a message
router.post('/categorize', async (req, res) => {
  try {
    const { messageId, text } = req.body;
    if (!text) return res.status(400).json({ error: 'text required' });

    const result = await categorizeMessage(text);

    if (messageId) {
      await db.query(
        `UPDATE messages SET ai_category = $1, priority_score = $2 WHERE id = $3`,
        [result.category, result.priority_score, messageId]
      );
    }

    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/inbox/suggestions/:messageId — get reply suggestions
router.get('/suggestions/:messageId', async (req, res) => {
  try {
    const result = await suggestReply(req.params.messageId);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/inbox/auto-reply — send AI suggested reply
router.post('/auto-reply', async (req, res) => {
  try {
    const { messageId, reply } = req.body;
    if (!messageId || !reply) return res.status(400).json({ error: 'messageId and reply required' });

    const msgRes = await db.query(`SELECT m.*, c.whatsapp_number FROM messages m JOIN clients c ON c.id = m.client_id WHERE m.id = $1`, [messageId]);
    const msg    = msgRes.rows[0];
    if (!msg) return res.status(404).json({ error: 'Message not found' });

    await sendText(msg.whatsapp_number, reply);
    await db.query(
      `INSERT INTO messages (client_id, direction, content) VALUES ($1, 'outbound', $2)`,
      [msg.client_id, reply]
    );

    res.json({ success: true, messageId, reply });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/inbox/priority/:clientId — prioritized inbox for client
router.get('/priority/:clientId', async (req, res) => {
  try {
    const result = await prioritizeInbox(req.params.clientId);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
