const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/conversations', async (req, res) => {
  try {
    const { status, assigned_to, unread_only, search } = req.query;
    const params = [];
    let q = `
      SELECT cv.*, c.name, c.whatsapp_number, c.city, c.company
      FROM conversations cv
      JOIN clients c ON c.id=cv.client_id
      WHERE 1=1`;

    if (status) { params.push(status); q += ` AND cv.status=$${params.length}`; }
    if (assigned_to) { params.push(assigned_to); q += ` AND cv.assigned_to=$${params.length}`; }
    if (unread_only === 'true') q += ` AND cv.unread_count > 0`;
    if (search) {
      params.push(`%${search}%`);
      q += ` AND (c.name ILIKE $${params.length} OR c.whatsapp_number ILIKE $${params.length})`;
    }
    q += ` ORDER BY cv.last_message_at DESC LIMIT 200`;
    const r = await db.query(q, params);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/conversations/:id', async (req, res) => {
  try {
    const { status, assigned_to, is_starred, priority, unread_count } = req.body;
    const r = await db.query(
      `UPDATE conversations
       SET status=COALESCE($1,status),
           assigned_to=COALESCE($2,assigned_to),
           is_starred=COALESCE($3,is_starred),
           priority=COALESCE($4,priority),
           unread_count=COALESCE($5,unread_count),
           updated_at=NOW()
       WHERE id=$6
       RETURNING *`,
      [status, assigned_to, is_starred, priority, unread_count, req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'Conversation not found' });
    await db.query(
      `INSERT INTO audit_logs (actor_email, action, entity_type, entity_id, metadata)
       VALUES ($1,'conversation.updated','conversation',$2,$3)`,
      [req.owner.email, req.params.id, req.body]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/conversations/:id/notes', async (req, res) => {
  try {
    const { note } = req.body;
    if (!note?.trim()) return res.status(400).json({ error: 'Note is required' });
    const r = await db.query(
      `INSERT INTO conversation_notes (conversation_id, author_email, note)
       VALUES ($1,$2,$3)
       RETURNING *`,
      [req.params.id, req.owner.email, note.trim()]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/conversations/:id/timeline', async (req, res) => {
  try {
    const convo = (await db.query(`SELECT client_id FROM conversations WHERE id=$1`, [req.params.id])).rows[0];
    if (!convo) return res.status(404).json({ error: 'Conversation not found' });
    const [messages, notes] = await Promise.all([
      db.query(`SELECT id, direction, content, created_at FROM messages WHERE client_id=$1 ORDER BY created_at DESC LIMIT 200`, [convo.client_id]),
      db.query(`SELECT id, author_email, note, created_at FROM conversation_notes WHERE conversation_id=$1 ORDER BY created_at DESC LIMIT 100`, [req.params.id])
    ]);
    res.json({ messages: messages.rows, notes: notes.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
