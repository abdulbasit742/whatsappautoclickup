const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// ── Seed sample data for a new org ──────────────────────────────────────────
router.post('/:orgId/seed', auth, async (req, res) => {
  const { orgId } = req.params;
  try {
    // Sample contacts
    const contacts = [
      { name: 'Alice Demo', number: '+10000000001', status: 'active' },
      { name: 'Bob Demo', number: '+10000000002', status: 'lead' },
      { name: 'Carol Demo', number: '+10000000003', status: 'paid' },
      { name: 'Dave Demo', number: '+10000000004', status: 'inactive' },
    ];
    const clientIds = [];
    for (const c of contacts) {
      const { rows: [client] } = await db.query(
        `INSERT INTO clients (name, whatsapp_number, status) VALUES ($1,$2,$3)
         ON CONFLICT (whatsapp_number) DO UPDATE SET name=$1 RETURNING id`,
        [c.name, c.number, c.status]
      );
      clientIds.push(client.id);
    }

    // Sample messages
    for (const cid of clientIds) {
      await db.query(
        `INSERT INTO messages (client_id, direction, content) VALUES
         ($1,'inbound','Hello! I have a question about your services.'),
         ($1,'outbound','Hi! Thanks for reaching out. How can I help you?')`,
        [cid]
      );
    }

    // Sample broadcasts
    await db.query(
      `INSERT INTO broadcasts (title, message, status, sent_at, total_sent)
       VALUES ('Welcome Demo Broadcast','Welcome to ClientFlow AI! Explore all features.','sent',NOW(),4)
       ON CONFLICT DO NOTHING`
    );

    // Sample payments
    if (clientIds[2]) {
      await db.query(
        `INSERT INTO payments (client_id, amount_pkr, method, status) VALUES ($1,5000,'bank','confirmed')
         ON CONFLICT DO NOTHING`,
        [clientIds[2]]
      );
    }

    // Sample follow-ups
    if (clientIds[1]) {
      await db.query(
        `INSERT INTO follow_ups (client_id, type, scheduled_at) VALUES ($1,'cold_lead',NOW()+INTERVAL '1 day')
         ON CONFLICT DO NOTHING`,
        [clientIds[1]]
      );
    }

    res.json({ success: true, message: `Sample data created for org ${orgId}`, clients: clientIds.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Clear sample data ────────────────────────────────────────────────────────
router.delete('/:orgId/seed', auth, async (req, res) => {
  try {
    await db.query(`DELETE FROM clients WHERE whatsapp_number LIKE '+100000000%'`);
    await db.query(`DELETE FROM broadcasts WHERE title='Welcome Demo Broadcast'`);
    res.json({ success: true, message: 'Sample data removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
