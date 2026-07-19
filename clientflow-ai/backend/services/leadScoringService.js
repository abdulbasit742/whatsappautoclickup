/**
 * Lead Scoring Engine (P67)
 * Computes a 0-100 lead score and tier (Hot/Warm/Cold)
 * based on multiple client behavior signals.
 */

const db = require('../db');

const WEIGHTS = {
  replyFrequency:   25,  // messages from client
  responseSpeed:    15,  // avg response time
  sentiment:        20,  // positive sentiment
  campaignInteractions: 10,
  paymentHistory:   15,  // paid = good
  noteFlags:        10,  // flagged in notes
  issueHistory:     5,   // fewer issues = better
};

/**
 * Score a single client.
 * @param {string} clientId
 * @returns {{ score: number, tier: string, breakdown: object }}
 */
async function scoreClient(clientId) {
  const [msgR, payR, issueR] = await Promise.all([
    db.query(`SELECT COUNT(*) AS cnt, direction FROM messages WHERE client_id=$1 GROUP BY direction`, [clientId]),
    db.query(`SELECT COUNT(*) AS cnt, SUM(amount) AS total FROM payments WHERE client_id=$1 AND status='paid'`, [clientId]).catch(() => ({ rows: [{ cnt: 0, total: 0 }] })),
    db.query(`SELECT COUNT(*) AS cnt FROM issues WHERE client_id=$1 AND status='open'`, [clientId]).catch(() => ({ rows: [{ cnt: 0 }] })),
  ]);

  const inbound  = msgR.rows.find(r => r.direction === 'inbound')?.cnt || 0;
  const outbound = msgR.rows.find(r => r.direction === 'outbound')?.cnt || 0;
  const paid     = parseInt(payR.rows[0]?.cnt || 0);
  const openIssues = parseInt(issueR.rows[0]?.cnt || 0);

  const breakdown = {
    replyFrequency:   Math.min(25, (inbound / 5) * 25),
    responseSpeed:    15, // simplified
    sentiment:        15, // simplified
    campaignInteractions: 5,
    paymentHistory:   Math.min(15, paid * 5),
    noteFlags:        10,
    issueHistory:     Math.max(0, 5 - openIssues * 2),
  };

  const score = Math.round(Math.min(100, Object.values(breakdown).reduce((a, b) => a + b, 0)));
  const tier = score >= 70 ? 'hot' : score >= 40 ? 'warm' : 'cold';

  // Persist
  await db.query(
    `UPDATE clients SET lead_score=$1, lead_tier=$2 WHERE id=$3`,
    [score, tier, clientId]
  ).catch(() => {});

  await db.query(
    `INSERT INTO lead_score_history (client_id, score, tier, reason) VALUES ($1,$2,$3,$4)`,
    [clientId, score, tier, JSON.stringify(breakdown)]
  ).catch(() => {});

  return { score, tier, breakdown };
}

/**
 * Score all clients in an org.
 */
async function scoreAllClients(orgId) {
  const clients = (await db.query(`SELECT id FROM clients`)).rows;
  const results = await Promise.allSettled(clients.map(c => scoreClient(c.id)));
  return results.filter(r => r.status === 'fulfilled').map(r => r.value);
}

module.exports = { scoreClient, scoreAllClients };
