const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/expansion — organizations/clients near plan limits or showing growth signals
router.get('/', async (req, res) => {
  try {
    const [
      highAi,
      growingContacts,
      highTeamActivity,
      highSpenders,
    ] = await Promise.all([
      // High AI usage (>50 calls in last 30 days)
      db.query(
        `SELECT c.id, c.name, c.whatsapp_number, c.status, c.total_spent_pkr, COUNT(al.id) AS ai_calls
         FROM clients c JOIN ai_logs al ON al.client_id=c.id
         WHERE al.created_at > NOW() - INTERVAL '30 days' AND al.success=true
         GROUP BY c.id HAVING COUNT(al.id) > 50 ORDER BY ai_calls DESC`
      ),
      // Rapid contact growth (new clients in last 7 days)
      db.query(
        `SELECT id, name, whatsapp_number, status, total_spent_pkr, created_at
         FROM clients WHERE created_at > NOW() - INTERVAL '7 days' ORDER BY created_at DESC`
      ),
      // High broadcast/campaign usage
      db.query(
        `SELECT c.id, c.name, c.whatsapp_number, c.status, c.total_spent_pkr, COUNT(b.id) AS broadcast_count
         FROM clients c JOIN broadcasts b ON b.client_id=c.id
         WHERE b.created_at > NOW() - INTERVAL '30 days'
         GROUP BY c.id HAVING COUNT(b.id) >= 3 ORDER BY broadcast_count DESC`
      ),
      // Near plan limit — high spenders
      db.query(
        `SELECT id, name, whatsapp_number, status, total_spent_pkr
         FROM clients WHERE total_spent_pkr >= 5000 AND status != 'blocked'
         ORDER BY total_spent_pkr DESC LIMIT 20`
      ),
    ]);

    res.json({
      high_ai_usage:       highAi.rows,
      growing_contacts:    growingContacts.rows,
      high_campaign_usage: highAi.rows,
      high_spenders:       highSpenders.rows,
      summary: {
        high_ai_count:      highAi.rows.length,
        growing_count:      growingContacts.rows.length,
        campaign_count:     highAi.rows.length,
        high_spender_count: highSpenders.rows.length,
      },
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/expansion/:id/signals — signals for one client
router.get('/:id/signals', async (req, res) => {
  try {
    const { id } = req.params;
    const [client, aiUsage, broadcasts, payments] = await Promise.all([
      db.query(`SELECT * FROM clients WHERE id=$1`, [id]),
      db.query(`SELECT COUNT(*) FROM ai_logs WHERE client_id=$1 AND created_at > NOW() - INTERVAL '30 days' AND success=true`, [id]),
      db.query(`SELECT COUNT(*) FROM broadcasts WHERE client_id=$1 AND created_at > NOW() - INTERVAL '30 days'`, [id]),
      db.query(`SELECT COALESCE(SUM(amount_pkr),0) as total FROM payments WHERE client_id=$1 AND status='confirmed'`, [id]),
    ]);
    if (!client.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json({
      client: client.rows[0],
      signals: {
        ai_calls_30d:    parseInt(aiUsage.rows[0].count),
        broadcasts_30d:  parseInt(broadcasts.rows[0].count),
        lifetime_revenue: parseFloat(payments.rows[0].total),
      },
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
