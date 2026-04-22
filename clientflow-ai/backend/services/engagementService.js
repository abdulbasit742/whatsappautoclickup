/**
 * Engagement Service — AI-driven proactive engagement triggers
 */

const db     = require('../db');
const OpenAI = require('openai');

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const ENGAGEMENT_RULES = [
  { trigger: 'inactive_7d',   condition: m => m.daysSinceActive >= 7  && m.daysSinceActive < 14, score: 60, template: 'We miss you! 👋' },
  { trigger: 'inactive_14d',  condition: m => m.daysSinceActive >= 14 && m.daysSinceActive < 30, score: 75, template: 'It\'s been a while! Come back with 10% off.' },
  { trigger: 'post_purchase',  condition: m => m.daysSinceLastPayment >= 1 && m.daysSinceLastPayment <= 3, score: 50, template: 'Thank you for your recent purchase! 🎉' },
  { trigger: 'upsell_ready',   condition: m => m.paymentCount >= 2 && m.daysSinceLastPayment < 30, score: 80, template: 'You might also like our premium services.' },
  { trigger: 'birthday_week',  condition: m => m.birthdayDays !== null && m.birthdayDays <= 7 && m.birthdayDays >= 0, score: 90, template: 'Happy Birthday! 🎂 Here\'s a special gift for you.' },
];

async function getClientEngagementMetrics(clientId) {
  const [clientRes, msgRes, payRes] = await Promise.all([
    db.query(`SELECT * FROM clients WHERE id = $1`, [clientId]),
    db.query(`SELECT MAX(created_at) AS last_msg FROM messages WHERE client_id = $1`, [clientId]),
    db.query(`SELECT COUNT(*) AS count, MAX(created_at) AS last_pay FROM payments WHERE client_id = $1 AND status='confirmed'`, [clientId]),
  ]);

  const client   = clientRes.rows[0];
  if (!client) throw new Error('Client not found');
  const lastMsg  = msgRes.rows[0];
  const lastPay  = payRes.rows[0];

  const now = Date.now();
  return {
    clientId,
    name:                 client.name || client.whatsapp_number,
    phone:                client.whatsapp_number,
    daysSinceActive:      client.last_active_at ? Math.floor((now - new Date(client.last_active_at)) / 86400000) : 999,
    daysSinceLastMessage: lastMsg.last_msg ? Math.floor((now - new Date(lastMsg.last_msg)) / 86400000) : 999,
    daysSinceLastPayment: lastPay.last_pay  ? Math.floor((now - new Date(lastPay.last_pay))  / 86400000) : 999,
    paymentCount:         parseInt(lastPay.count),
    birthdayDays:         null, // extend with birthday field if available
  };
}

async function getEngagementScore(clientId) {
  const metrics = await getClientEngagementMetrics(clientId);
  let score = 100;

  // Reduce score for inactivity
  if (metrics.daysSinceActive > 30) score -= 40;
  else if (metrics.daysSinceActive > 14) score -= 20;
  else if (metrics.daysSinceActive > 7) score -= 10;

  // Boost for recent payments
  if (metrics.paymentCount > 0 && metrics.daysSinceLastPayment < 30) score += 15;
  if (metrics.paymentCount >= 3) score += 10;

  score = Math.max(0, Math.min(100, score));

  const matchedRules = ENGAGEMENT_RULES.filter(r => r.condition(metrics));
  return { clientId, score, metrics, matchedRules };
}

async function triggerEngagement(clientId) {
  const { score, metrics, matchedRules } = await getEngagementScore(clientId);
  if (matchedRules.length === 0) return { clientId, triggered: false, score };

  const rule = matchedRules.sort((a, b) => b.score - a.score)[0];
  let message = rule.template;

  if (openai) {
    try {
      const completion = await openai.chat.completions.create({
        model:       'gpt-3.5-turbo',
        messages: [{
          role:    'user',
          content: `Write a personalized WhatsApp engagement message for client "${metrics.name}". 
Trigger: ${rule.trigger}. Base template: "${rule.template}". Keep it under 60 words, friendly and professional.`,
        }],
        max_tokens: 80,
      });
      message = completion.choices[0]?.message?.content?.trim() || message;
    } catch { /* use template */ }
  }

  await db.query(
    `INSERT INTO engagement_triggers (client_id, trigger_type, message, score, fired_at)
     VALUES ($1, $2, $3, $4, NOW())`,
    [clientId, rule.trigger, message, score]
  );

  return { clientId, triggered: true, trigger: rule.trigger, message, score };
}

async function scheduleEngagementCampaign(segment, campaignName) {
  const clients = await db.query(
    `SELECT c.id FROM clients c WHERE c.status IN ('active','paid','lead') ORDER BY c.last_active_at ASC LIMIT 200`
  );

  const results = [];
  for (const { id } of clients.rows) {
    const { score, matchedRules } = await getEngagementScore(id);
    if (score < 40 && matchedRules.length > 0) {
      results.push({ clientId: id, score });
    }
  }

  const campaignId = `camp_${Date.now()}`;
  await db.query(
    `INSERT INTO engagement_campaigns (id, name, segment, client_count, status, created_at)
     VALUES ($1, $2, $3, $4, 'scheduled', NOW())`,
    [campaignId, campaignName || `Engagement Campaign ${new Date().toLocaleDateString()}`, segment, results.length]
  );

  return { campaignId, clientsTargeted: results.length, results };
}

module.exports = { triggerEngagement, scheduleEngagementCampaign, getEngagementScore };
