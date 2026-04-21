const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// PQL scoring rules:
// usage_depth (feature_usage count)  — up to 30 pts
// contacts count                      — up to 20 pts
// campaigns created                   — up to 20 pts
// ai_usage                            — up to 15 pts
// invited team members                — up to 15 pts

function pqlScore({ featureUses, contacts, campaigns, aiUsage, teamInvites }) {
  const usageScore    = Math.min(featureUses * 2, 30);
  const contactScore  = Math.min(Math.floor(contacts / 5) * 2, 20);
  const campScore     = Math.min(campaigns * 5, 20);
  const aiScore       = Math.min(aiUsage * 3, 15);
  const teamScore     = Math.min(teamInvites * 5, 15);
  return usageScore + contactScore + campScore + aiScore + teamScore;
}

// GET /api/pql — scored lead list
router.get('/', async (req, res) => {
  try {
    const clients = await db.query(
      `SELECT c.id, c.name, c.whatsapp_number, c.status, c.created_at,
              COALESCE(fu.total_uses,0) AS feature_uses,
              COALESCE(bc.broadcast_count,0) AS campaigns,
              COALESCE(al.ai_count,0) AS ai_usage,
              COALESCE(ae.team_invites,0) AS team_invites,
              (SELECT COUNT(*) FROM clients WHERE 1=1) AS contacts
       FROM clients c
       LEFT JOIN (SELECT client_id, SUM(use_count) AS total_uses FROM feature_usage GROUP BY client_id) fu ON fu.client_id=c.id
       LEFT JOIN (SELECT client_id, COUNT(*) AS broadcast_count FROM broadcasts WHERE status='sent' GROUP BY client_id) bc ON bc.client_id=c.id
       LEFT JOIN (SELECT client_id, COUNT(*) AS ai_count FROM ai_logs WHERE success=true GROUP BY client_id) al ON al.client_id=c.id
       LEFT JOIN (SELECT client_id, COUNT(*) AS team_invites FROM activation_events WHERE event_type='invited_team_member' GROUP BY client_id) ae ON ae.client_id=c.id
       WHERE c.status != 'blocked'
       ORDER BY c.created_at DESC`
    );

    const scored = clients.rows.map(c => {
      const score = pqlScore({
        featureUses:  parseInt(c.feature_uses),
        contacts:     parseInt(c.contacts),
        campaigns:    parseInt(c.campaigns),
        aiUsage:      parseInt(c.ai_usage),
        teamInvites:  parseInt(c.team_invites),
      });
      const tier = score >= 70 ? 'hot' : score >= 40 ? 'warm' : 'cold';
      return { ...c, pql_score: score, tier };
    });

    scored.sort((a, b) => b.pql_score - a.pql_score);
    res.json(scored);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/pql/summary
router.get('/summary', async (req, res) => {
  try {
    const all = await db.query(`SELECT COUNT(*) FROM clients WHERE status != 'blocked'`);
    const total = parseInt(all.rows[0].count);
    res.json({ total, note: 'Use GET /api/pql for scored breakdown' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
