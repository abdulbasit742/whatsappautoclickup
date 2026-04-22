/**
 * Lead Scoring Service
 * Scores leads based on behavior: messages, payments, referrals, appointments
 */

const db = require('../db');

async function computeLeadScore(clientId) {
  const [clientRes, msgRes, payRes, apptRes, refRes] = await Promise.all([
    db.query(`SELECT * FROM clients WHERE id = $1`, [clientId]),
    db.query(`SELECT COUNT(*) AS count, MAX(created_at) AS last FROM messages WHERE client_id = $1`, [clientId]),
    db.query(`SELECT COUNT(*) AS count, COALESCE(SUM(amount_pkr),0) AS total FROM payments WHERE client_id = $1 AND status='confirmed'`, [clientId]),
    db.query(`SELECT COUNT(*) AS count FROM appointments WHERE client_id = $1`, [clientId]),
    db.query(`SELECT COUNT(*) AS count FROM clients WHERE referred_by_id = $1`, [clientId]),
  ]);

  const client = clientRes.rows[0];
  if (!client) return null;

  const msgs  = msgRes.rows[0];
  const pays  = payRes.rows[0];
  const appts = apptRes.rows[0];
  const refs  = refRes.rows[0];

  const daysSinceActive = client.last_active_at
    ? Math.floor((Date.now() - new Date(client.last_active_at)) / 86400000)
    : 999;

  // Scoring components (0-100)
  const activityScore  = Math.max(0, 25 - daysSinceActive * 0.5);          // 0-25
  const messageScore   = Math.min(20, parseInt(msgs.count) * 0.5);          // 0-20
  const paymentScore   = Math.min(30, parseInt(pays.count) * 8 + parseFloat(pays.total) / 5000); // 0-30
  const appointScore   = Math.min(15, parseInt(appts.count) * 3);           // 0-15
  const referralScore  = Math.min(10, parseInt(refs.count) * 5);            // 0-10

  const total = activityScore + messageScore + paymentScore + appointScore + referralScore;
  const score = Math.round(Math.min(100, Math.max(0, total)));

  // Conversion probability (logistic-like)
  const conversionProbability = Math.round(1 / (1 + Math.exp(-0.07 * (score - 50))) * 100);

  return {
    clientId,
    clientName:   client.name || client.whatsapp_number,
    phone:        client.whatsapp_number,
    status:       client.status,
    score,
    conversionProbability,
    breakdown: {
      activity:    Math.round(activityScore),
      messages:    Math.round(messageScore),
      payments:    Math.round(paymentScore),
      appointments: Math.round(appointScore),
      referrals:   Math.round(referralScore),
    },
    daysSinceActive,
    totalSpent: parseFloat(pays.total),
  };
}

async function scoreLeads() {
  const clients = await db.query(
    `SELECT id FROM clients WHERE status NOT IN ('blocked') ORDER BY last_active_at DESC LIMIT 500`
  );
  const scores = await Promise.allSettled(clients.rows.map(c => computeLeadScore(c.id)));
  return scores
    .filter(r => r.status === 'fulfilled' && r.value)
    .map(r => r.value)
    .sort((a, b) => b.score - a.score);
}

async function predictConversion(clientId) {
  const result = await computeLeadScore(clientId);
  if (!result) throw new Error('Client not found');
  return {
    clientId,
    conversionProbability: result.conversionProbability,
    score:                 result.score,
    recommendation:        result.conversionProbability >= 70 ? 'High priority — follow up now' :
                           result.conversionProbability >= 40 ? 'Medium priority — nurture with content' :
                                                                'Low priority — add to drip campaign',
  };
}

async function prioritizeLeads(limit = 50) {
  const all = await scoreLeads();
  return all.slice(0, limit).map((l, i) => ({ rank: i + 1, ...l }));
}

module.exports = { scoreLeads, predictConversion, prioritizeLeads, computeLeadScore };
