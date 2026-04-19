const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// ─── Full 360 profile for a client ────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const [
      clientR, messagesR, notesR, issuesR,
      paymentsR, followupsR, timelineR, attachmentsR, nbaR
    ] = await Promise.all([
      db.query(`SELECT * FROM clients WHERE id=$1`, [id]),
      db.query(`SELECT * FROM messages WHERE client_id=$1 ORDER BY created_at DESC LIMIT 20`, [id]),
      db.query(`SELECT * FROM notes WHERE entity_type='contact' AND entity_id=$1 ORDER BY is_pinned DESC, created_at DESC`, [id]),
      db.query(`SELECT * FROM issues WHERE client_id=$1 ORDER BY created_at DESC LIMIT 10`, [id]),
      db.query(`SELECT * FROM payments WHERE client_id=$1 ORDER BY created_at DESC LIMIT 10`, [id]).catch(() => ({ rows: [] })),
      db.query(`SELECT * FROM followups WHERE client_id=$1 ORDER BY scheduled_at ASC LIMIT 10`, [id]).catch(() => ({ rows: [] })),
      db.query(`SELECT * FROM timeline_events WHERE client_id=$1 ORDER BY created_at DESC LIMIT 30`, [id]),
      db.query(`SELECT * FROM attachments WHERE entity_type='contact' AND entity_id=$1`, [id]),
      db.query(`SELECT * FROM nba_recommendations WHERE client_id=$1 AND is_dismissed=false ORDER BY priority ASC LIMIT 5`, [id]),
    ]);

    if (!clientR.rows[0]) return res.status(404).json({ error: 'Client not found' });
    res.json({
      client: clientR.rows[0],
      messages: messagesR.rows,
      notes: notesR.rows,
      issues: issuesR.rows,
      payments: paymentsR.rows,
      followups: followupsR.rows,
      timeline: timelineR.rows,
      attachments: attachmentsR.rows,
      recommendations: nbaR.rows,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
