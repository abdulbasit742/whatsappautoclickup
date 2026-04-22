/**
 * Customer Journey Service
 * Tracks touchpoints and maps the full customer journey
 */

const db = require('../db');

const JOURNEY_STAGES = [
  { stage: 'awareness',   label: 'Awareness',   description: 'First contact via WhatsApp',       minTouchpoints: 0 },
  { stage: 'interest',    label: 'Interest',    description: 'Active conversations, no payment',  minTouchpoints: 2 },
  { stage: 'consideration', label: 'Consideration', description: 'Asked about services/pricing', minTouchpoints: 4 },
  { stage: 'purchase',    label: 'Purchase',    description: 'Made first payment',                minPayments: 1 },
  { stage: 'retention',   label: 'Retention',   description: 'Repeat customer',                   minPayments: 2 },
  { stage: 'loyalty',     label: 'Loyalty',     description: 'Advocate — refers others',          hasReferrals: true },
];

const TOUCHPOINT_ICONS = {
  whatsapp_message:  '💬',
  payment:           '💳',
  appointment:       '📅',
  review:            '⭐',
  referral:          '🔗',
  broadcast_opened:  '📢',
  followup_sent:     '📩',
  service_viewed:    '👁️',
  support_ticket:    '🎫',
};

async function recordTouchpoint(clientId, touchpoint) {
  const { type, description, metadata } = touchpoint;
  const r = await db.query(
    `INSERT INTO journey_touchpoints (client_id, type, description, metadata, created_at)
     VALUES ($1,$2,$3,$4,NOW()) RETURNING *`,
    [clientId, type, description || TOUCHPOINT_ICONS[type] || type, JSON.stringify(metadata || {})]
  );
  return r.rows[0];
}

async function getJourneyMap(clientId) {
  const [clientRes, touchpointRes, payRes] = await Promise.all([
    db.query(`SELECT * FROM clients WHERE id=$1`, [clientId]),
    db.query(
      `SELECT * FROM journey_touchpoints WHERE client_id=$1 ORDER BY created_at ASC`,
      [clientId]
    ),
    db.query(`SELECT COUNT(*) AS count FROM payments WHERE client_id=$1 AND status='confirmed'`, [clientId]),
  ]);

  const client      = clientRes.rows[0];
  if (!client) throw new Error('Client not found');

  const touchpoints = touchpointRes.rows.map(t => ({
    ...t,
    icon: TOUCHPOINT_ICONS[t.type] || '📌',
  }));

  const stage = await identifyStage(clientId);

  return {
    clientId,
    client,
    touchpoints,
    stage,
    summary: {
      totalTouchpoints: touchpoints.length,
      payments:         parseInt(payRes.rows[0].count),
      firstContact:     client.first_contact_at,
      lastActive:       client.last_active_at,
    },
  };
}

async function identifyStage(clientId) {
  const [touchpointRes, payRes, refRes] = await Promise.all([
    db.query(`SELECT COUNT(*) AS count FROM journey_touchpoints WHERE client_id=$1`, [clientId]),
    db.query(`SELECT COUNT(*) AS count FROM payments WHERE client_id=$1 AND status='confirmed'`, [clientId]),
    db.query(`SELECT COUNT(*) AS count FROM clients WHERE referred_by_id=$1`, [clientId]),
  ]);

  const touchpoints = parseInt(touchpointRes.rows[0].count);
  const payments    = parseInt(payRes.rows[0].count);
  const referrals   = parseInt(refRes.rows[0].count);

  if (referrals > 0)  return JOURNEY_STAGES[5]; // loyalty
  if (payments >= 2)  return JOURNEY_STAGES[4]; // retention
  if (payments >= 1)  return JOURNEY_STAGES[3]; // purchase
  if (touchpoints >= 4) return JOURNEY_STAGES[2]; // consideration
  if (touchpoints >= 2) return JOURNEY_STAGES[1]; // interest
  return JOURNEY_STAGES[0]; // awareness
}

async function getEngagementOpportunities(clientId) {
  const stage = await identifyStage(clientId);
  const opportunities = [];

  switch (stage.stage) {
    case 'awareness':
      opportunities.push({ type: 'send_intro', message: 'Send introduction message with service catalog', priority: 'high' });
      break;
    case 'interest':
      opportunities.push({ type: 'share_testimonials', message: 'Share client testimonials and case studies', priority: 'high' });
      opportunities.push({ type: 'offer_consultation', message: 'Offer a free consultation call', priority: 'medium' });
      break;
    case 'consideration':
      opportunities.push({ type: 'send_proposal', message: 'Send personalized service proposal', priority: 'high' });
      opportunities.push({ type: 'limited_offer', message: 'Offer limited-time discount', priority: 'high' });
      break;
    case 'purchase':
      opportunities.push({ type: 'upsell', message: 'Suggest complementary services', priority: 'medium' });
      opportunities.push({ type: 'review_request', message: 'Request a review after service delivery', priority: 'high' });
      break;
    case 'retention':
      opportunities.push({ type: 'loyalty_reward', message: 'Offer loyalty discount for next purchase', priority: 'medium' });
      opportunities.push({ type: 'referral_request', message: 'Ask to refer friends and family', priority: 'medium' });
      break;
    case 'loyalty':
      opportunities.push({ type: 'vip_treatment', message: 'Send VIP thank you with exclusive offer', priority: 'low' });
      opportunities.push({ type: 'co_marketing', message: 'Invite to ambassador program', priority: 'low' });
      break;
  }

  return { stage: stage.stage, opportunities };
}

async function getAllOpportunities() {
  const clients = await db.query(`SELECT id FROM clients WHERE status IN ('active','paid','lead') ORDER BY last_active_at DESC LIMIT 100`);
  const results = await Promise.allSettled(clients.rows.map(c => getEngagementOpportunities(c.id)));
  return results.filter(r => r.status === 'fulfilled').map(r => r.value);
}

module.exports = { recordTouchpoint, getJourneyMap, identifyStage, getEngagementOpportunities, getAllOpportunities, TOUCHPOINT_ICONS };
