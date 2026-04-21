const db = require('../db');

function getTemperature(score) {
  if (score >= 75) return 'hot';
  if (score >= 40) return 'warm';
  return 'cold';
}

function getTags({ inboundCount, deliveredCount, readCount, paidCount, lastInboundAt }) {
  const tags = new Set();
  if (paidCount > 0) tags.add('customer');
  if (inboundCount >= 5) tags.add('engaged');
  if (readCount > 0 && inboundCount === 0) tags.add('seen_no_reply');
  if (deliveredCount === 0) tags.add('delivery_issue');
  if (lastInboundAt && new Date(lastInboundAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) tags.add('active_7d');
  if (tags.size === 0) tags.add('new_lead');
  return Array.from(tags);
}

async function calculateLeadScore(clientId) {
  const [messageMetrics, paymentMetrics] = await Promise.all([
    db.query(
      `SELECT
         COUNT(*) FILTER (WHERE direction='inbound')::int AS inbound_count,
         COUNT(*) FILTER (WHERE direction='outbound')::int AS outbound_count,
         COUNT(*) FILTER (WHERE delivered=true)::int AS delivered_count,
         COUNT(*) FILTER (WHERE read=true)::int AS read_count,
         MAX(created_at) FILTER (WHERE direction='inbound') AS last_inbound_at
       FROM messages
       WHERE client_id=$1`,
      [clientId]
    ),
    db.query(
      `SELECT
         COUNT(*) FILTER (WHERE status='confirmed')::int AS paid_count,
         COALESCE(SUM(amount_pkr) FILTER (WHERE status='confirmed'), 0)::numeric AS paid_total
       FROM payments
       WHERE client_id=$1`,
      [clientId]
    )
  ]);

  const m = messageMetrics.rows[0];
  const p = paymentMetrics.rows[0];

  const score =
    Math.min(m.inbound_count * 8, 32) +
    Math.min(m.read_count * 4, 16) +
    Math.min(m.delivered_count * 2, 10) +
    Math.min(p.paid_count * 20, 40) +
    (Number(p.paid_total) > 0 ? 8 : 0);

  const bounded = Math.max(0, Math.min(100, score));
  const temperature = getTemperature(bounded);
  const tags = getTags({
    inboundCount: m.inbound_count,
    deliveredCount: m.delivered_count,
    readCount: m.read_count,
    paidCount: p.paid_count,
    lastInboundAt: m.last_inbound_at
  });

  return {
    score: bounded,
    temperature,
    tags,
    metrics: {
      inbound: m.inbound_count,
      outbound: m.outbound_count,
      delivered: m.delivered_count,
      read: m.read_count,
      paidCount: p.paid_count,
      paidTotal: Number(p.paid_total)
    }
  };
}

async function refreshLeadScore(clientId) {
  const summary = await calculateLeadScore(clientId);
  const updated = await db.query(
    `UPDATE clients
     SET lead_score=$1,
         lead_temperature=$2,
         tags=$3,
         updated_at=NOW()
     WHERE id=$4
     RETURNING id, lead_score, lead_temperature, tags`,
    [summary.score, summary.temperature, summary.tags, clientId]
  );
  return { ...summary, client: updated.rows[0] };
}

module.exports = { calculateLeadScore, refreshLeadScore };
