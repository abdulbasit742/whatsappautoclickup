/**
 * AI Segment Prediction Service
 * Uses rule-based RFM scoring + OpenAI for dynamic segment creation.
 */

const db        = require('../db');
const OpenAI    = require('openai');

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const SEGMENTS = {
  champion:         { label: 'Champion',          minScore: 85, color: 'emerald', description: 'High-value, frequent, recent buyers' },
  loyal:            { label: 'Loyal',              minScore: 70, color: 'blue',    description: 'Regular buyers with good engagement' },
  potential:        { label: 'Potential Loyalist', minScore: 55, color: 'purple',  description: 'Recent buyers with growth potential' },
  at_risk:          { label: 'At Risk',            minScore: 35, color: 'yellow',  description: 'Previously active, now going quiet' },
  cant_lose:        { label: 'Can\'t Lose',        minScore: 25, color: 'orange',  description: 'High-value clients showing churn signals' },
  hibernating:      { label: 'Hibernating',        minScore: 15, color: 'gray',    description: 'Long-inactive clients' },
  new_client:       { label: 'New Client',         minScore: 0,  color: 'cyan',    description: 'First-time or very recent clients' },
};

async function getClientMetrics(clientId) {
  const [clientRes, msgRes, payRes, apptRes] = await Promise.all([
    db.query(`SELECT * FROM clients WHERE id = $1`, [clientId]),
    db.query(`SELECT COUNT(*) AS msg_count, MAX(created_at) AS last_msg FROM messages WHERE client_id = $1`, [clientId]),
    db.query(`SELECT COUNT(*) AS pay_count, COALESCE(SUM(amount_pkr),0) AS total_spent FROM payments WHERE client_id = $1 AND status = 'confirmed'`, [clientId]),
    db.query(`SELECT COUNT(*) AS appt_count FROM appointments WHERE client_id = $1`, [clientId]),
  ]);

  const client    = clientRes.rows[0];
  const msgs      = msgRes.rows[0];
  const payments  = payRes.rows[0];
  const appts     = apptRes.rows[0];

  const daysSinceLastActive = client.last_active_at
    ? Math.floor((Date.now() - new Date(client.last_active_at)) / 86400000)
    : 999;
  const daysSinceFirstContact = client.first_contact_at
    ? Math.floor((Date.now() - new Date(client.first_contact_at)) / 86400000)
    : 0;

  return {
    clientId,
    name:                client.name || client.whatsapp_number,
    status:              client.status,
    daysSinceLastActive,
    daysSinceFirstContact,
    messageCount:        parseInt(msgs.msg_count),
    paymentCount:        parseInt(payments.pay_count),
    totalSpent:          parseFloat(payments.total_spent),
    appointmentCount:    parseInt(appts.appt_count),
  };
}

function computeRFMScore(metrics) {
  const { daysSinceLastActive, paymentCount, totalSpent, messageCount, daysSinceFirstContact } = metrics;

  // Recency (0-30): lower days = higher score
  const recency = Math.max(0, 30 - Math.min(daysSinceLastActive / 10, 30));

  // Frequency (0-30): more interactions = higher score
  const frequency = Math.min(30, (paymentCount * 5 + messageCount * 0.5));

  // Monetary (0-30): higher spend = higher score
  const monetary = Math.min(30, totalSpent / 1000);

  // Engagement (0-10): appointments + recent activity
  const engagement = Math.min(10, metrics.appointmentCount * 2 + (daysSinceFirstContact > 0 ? 2 : 0));

  const total = recency + frequency + monetary + engagement;
  return Math.round(Math.min(100, total));
}

function classifySegment(score, metrics) {
  const { daysSinceFirstContact, paymentCount } = metrics;

  // New client override
  if (daysSinceFirstContact <= 14 && paymentCount === 0) return 'new_client';

  for (const [key, seg] of Object.entries(SEGMENTS)) {
    if (score >= seg.minScore) return key;
  }
  return 'hibernating';
}

async function predictSegment(clientId) {
  const metrics     = await getClientMetrics(clientId);
  const score       = computeRFMScore(metrics);
  const segmentKey  = classifySegment(score, metrics);
  const segment     = SEGMENTS[segmentKey];

  let aiInsight = null;
  if (openai) {
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{
          role: 'user',
          content: `Analyze this customer and provide 1 upsell recommendation in 1 sentence:
Client: ${metrics.name}, Segment: ${segment.label}, Score: ${score}/100
Days since last activity: ${metrics.daysSinceLastActive}, Payments: ${metrics.paymentCount}, Spent: PKR ${metrics.totalSpent}`,
        }],
        max_tokens: 100,
      });
      aiInsight = completion.choices[0]?.message?.content?.trim();
    } catch { /* fallback to null */ }
  }

  return {
    clientId,
    clientName:    metrics.name,
    score,
    segmentKey,
    segment:       segment.label,
    color:         segment.color,
    description:   segment.description,
    aiInsight,
    metrics,
  };
}

async function optimizeSegments() {
  const clients = await db.query(`SELECT id FROM clients ORDER BY last_active_at DESC LIMIT 500`);
  const results = await Promise.allSettled(clients.rows.map(c => predictSegment(c.id)));

  const segmentCounts = {};
  const segmentClients = {};

  for (const r of results) {
    if (r.status !== 'fulfilled') continue;
    const { segmentKey, clientId, clientName, score } = r.value;
    if (!segmentCounts[segmentKey]) { segmentCounts[segmentKey] = 0; segmentClients[segmentKey] = []; }
    segmentCounts[segmentKey]++;
    segmentClients[segmentKey].push({ clientId, clientName, score });
  }

  return { segmentCounts, segmentClients, totalAnalyzed: results.length };
}

async function getUpsellOpportunities() {
  const clients = await db.query(
    `SELECT id FROM clients WHERE status IN ('active','paid') ORDER BY total_spent_pkr DESC LIMIT 100`
  );
  const predictions = await Promise.allSettled(clients.rows.map(c => predictSegment(c.id)));
  return predictions
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value)
    .filter(p => ['loyal', 'champion', 'potential'].includes(p.segmentKey) && p.aiInsight)
    .sort((a, b) => b.score - a.score);
}

module.exports = { predictSegment, optimizeSegments, getUpsellOpportunities, SEGMENTS };
