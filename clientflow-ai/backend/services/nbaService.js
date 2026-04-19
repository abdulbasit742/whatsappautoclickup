/**
 * Next Best Action (NBA) Engine (P68)
 * Analyzes CRM data and suggests the most impactful next action for each client.
 */

const db = require('../db');

const ACTIONS = {
  send_followup:    { label: 'Send Follow-Up',       priority: 3 },
  assign_sales:     { label: 'Assign to Sales',      priority: 2 },
  send_pricing:     { label: 'Send Pricing Info',    priority: 4 },
  escalate_issue:   { label: 'Escalate Issue',       priority: 1 },
  request_payment:  { label: 'Request Payment',      priority: 2 },
  move_lead_stage:  { label: 'Move Lead Stage',      priority: 5 },
};

/**
 * Generate NBA recommendations for a client.
 * @param {string} clientId
 * @returns {Array<{ action, reason, priority }>}
 */
async function generateRecommendations(clientId) {
  const [clientR, issuesR, paymentsR, messagesR] = await Promise.all([
    db.query(`SELECT * FROM clients WHERE id=$1`, [clientId]),
    db.query(`SELECT * FROM issues WHERE client_id=$1 AND status='open' ORDER BY created_at DESC LIMIT 3`, [clientId]).catch(() => ({ rows: [] })),
    db.query(`SELECT * FROM payments WHERE client_id=$1 AND status='pending' LIMIT 3`, [clientId]).catch(() => ({ rows: [] })),
    db.query(`SELECT direction, created_at FROM messages WHERE client_id=$1 ORDER BY created_at DESC LIMIT 10`, [clientId]).catch(() => ({ rows: [] })),
  ]);

  const client = clientR.rows[0];
  if (!client) return [];

  const recommendations = [];
  const now = new Date();

  // Rule 1: Open issues → escalate
  const criticalIssues = issuesR.rows.filter(i => i.priority === 'critical' || i.priority === 'high');
  if (criticalIssues.length > 0) {
    recommendations.push({ action: 'escalate_issue', reason: `${criticalIssues.length} high-priority open issues`, priority: 1 });
  }

  // Rule 2: Pending payment → request payment
  if (paymentsR.rows.length > 0) {
    recommendations.push({ action: 'request_payment', reason: `${paymentsR.rows.length} pending payment(s)`, priority: 2 });
  }

  // Rule 3: No reply in 3 days → send follow-up
  const lastInbound = messagesR.rows.find(m => m.direction === 'inbound');
  if (lastInbound) {
    const daysSince = (now - new Date(lastInbound.created_at)) / 86400000;
    if (daysSince > 3) {
      recommendations.push({ action: 'send_followup', reason: `No response for ${Math.round(daysSince)} days`, priority: 3 });
    }
  }

  // Rule 4: Hot lead → assign to sales
  if (client.lead_tier === 'hot' || client.lead_score >= 70) {
    recommendations.push({ action: 'assign_sales', reason: `Lead score ${client.lead_score} — ready for sales`, priority: 2 });
  }

  // Rule 5: Warm lead, no pricing yet → send pricing
  if (client.lead_tier === 'warm') {
    recommendations.push({ action: 'send_pricing', reason: 'Warm lead — good time to share pricing', priority: 4 });
  }

  // Persist recommendations
  await db.query(`DELETE FROM nba_recommendations WHERE client_id=$1`, [clientId]).catch(() => {});
  await Promise.allSettled(
    recommendations.map(rec =>
      db.query(
        `INSERT INTO nba_recommendations (client_id, action, reason, priority) VALUES ($1,$2,$3,$4)`,
        [clientId, rec.action, rec.reason, rec.priority]
      )
    )
  );

  return recommendations;
}

module.exports = { generateRecommendations, ACTIONS };
