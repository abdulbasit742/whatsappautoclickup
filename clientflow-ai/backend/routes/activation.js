const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// Activation events:
// connected_ai_provider, imported_contacts, created_first_campaign,
// opened_inbox, invited_team_member

// POST /api/activation/event — record an activation event
router.post('/event', async (req, res) => {
  try {
    const { client_id, event_type } = req.body;
    const allowed = [
      'connected_ai_provider',
      'imported_contacts',
      'created_first_campaign',
      'opened_inbox',
      'invited_team_member',
    ];
    if (!allowed.includes(event_type)) return res.status(400).json({ error: 'Invalid event type' });
    const r = await db.query(
      `INSERT INTO activation_events (client_id, event_type) VALUES ($1,$2)
       ON CONFLICT (client_id, event_type) DO UPDATE SET updated_at=NOW()
       RETURNING *`,
      [client_id, event_type]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/activation/summary — funnel counts
router.get('/summary', async (req, res) => {
  try {
    const events = await db.query(
      `SELECT event_type, COUNT(DISTINCT client_id) as count
       FROM activation_events GROUP BY event_type`
    );
    const total = (await db.query(`SELECT COUNT(*) FROM clients`)).rows[0].count;
    const byEvent = {};
    events.rows.forEach(e => { byEvent[e.event_type] = parseInt(e.count); });
    res.json({
      total_clients: parseInt(total),
      connected_ai_provider:   byEvent.connected_ai_provider   || 0,
      imported_contacts:       byEvent.imported_contacts       || 0,
      created_first_campaign:  byEvent.created_first_campaign  || 0,
      opened_inbox:            byEvent.opened_inbox            || 0,
      invited_team_member:     byEvent.invited_team_member     || 0,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/activation/trend — daily activation over last 30 days
router.get('/trend', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT DATE_TRUNC('day', created_at) as date, event_type, COUNT(*) as count
       FROM activation_events WHERE created_at > NOW() - INTERVAL '30 days'
       GROUP BY 1,2 ORDER BY 1`
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/activation/clients — clients with activation progress
router.get('/clients', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT c.id, c.name, c.whatsapp_number, c.created_at,
              COALESCE(ae.events, '[]') as events,
              COALESCE(ae.event_count, 0) as steps_completed
       FROM clients c
       LEFT JOIN (
         SELECT client_id,
                json_agg(event_type) as events,
                COUNT(*) as event_count
         FROM activation_events GROUP BY client_id
       ) ae ON ae.client_id = c.id
       ORDER BY steps_completed DESC, c.created_at DESC
       LIMIT 50`
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
