/**
 * Winback Service — identifies and re-engages churned clients
 */

const db     = require('../db');
const OpenAI = require('openai');
const { sendText } = require('./whatsappService');

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const CHURN_THRESHOLD_DAYS = 30;

async function identifyChurnedClients(thresholdDays = CHURN_THRESHOLD_DAYS) {
  const r = await db.query(
    `SELECT c.*, 
            EXTRACT(DAY FROM NOW() - c.last_active_at) AS days_inactive,
            COUNT(DISTINCT p.id) AS payment_count,
            COALESCE(SUM(p.amount_pkr),0) AS total_spent
     FROM clients c
     LEFT JOIN payments p ON p.client_id = c.id AND p.status = 'confirmed'
     WHERE c.status NOT IN ('blocked')
       AND c.last_active_at < NOW() - INTERVAL '${thresholdDays} days'
     GROUP BY c.id
     ORDER BY total_spent DESC, days_inactive ASC
     LIMIT 200`
  );
  return r.rows;
}

async function generateWinbackMessage(client, offer) {
  const name       = client.name || 'valued customer';
  const daysAway   = Math.round(client.days_inactive);
  const baseOffer  = offer || `a special ${daysAway > 60 ? '20%' : '10%'} discount just for you`;

  if (!openai) {
    return `Hi ${name}! 👋 We've missed you! It's been ${daysAway} days since your last visit. Come back and enjoy ${baseOffer}. Reply to this message to claim your offer!`;
  }

  try {
    const completion = await openai.chat.completions.create({
      model:    'gpt-3.5-turbo',
      messages: [{
        role:    'user',
        content: `Write a friendly WhatsApp winback message for ${name} who has been inactive for ${daysAway} days. Mention: "${baseOffer}". Keep it under 60 words, warm and not pushy.`,
      }],
      max_tokens: 100,
    });
    return completion.choices[0]?.message?.content?.trim();
  } catch {
    return `Hi ${name}! We miss you! It's been ${daysAway} days. Come back and enjoy ${baseOffer}. Reply to claim! 🎁`;
  }
}

async function createWinbackCampaign(clientIds, offer, campaignName) {
  const campaignId = `wb_${Date.now()}`;
  const r = await db.query(
    `INSERT INTO winback_campaigns (id, name, offer, client_count, status, created_at)
     VALUES ($1,$2,$3,$4,'scheduled',NOW()) RETURNING *`,
    [campaignId, campaignName || `Winback ${new Date().toLocaleDateString()}`, offer || 'Special offer', clientIds.length]
  );

  const campaign = r.rows[0];
  let sent = 0, errors = 0;

  for (const clientId of clientIds) {
    try {
      const clientRes = await db.query(`SELECT * FROM clients WHERE id=$1`, [clientId]);
      const client    = clientRes.rows[0];
      if (!client) continue;

      const message = await generateWinbackMessage(client, offer);
      await sendText(client.whatsapp_number, message);
      await db.query(
        `INSERT INTO winback_sends (campaign_id, client_id, message, sent_at) VALUES ($1,$2,$3,NOW())`,
        [campaignId, clientId, message]
      );
      sent++;
    } catch { errors++; }
  }

  await db.query(
    `UPDATE winback_campaigns SET status='sent', sent_count=$1, error_count=$2 WHERE id=$3`,
    [sent, errors, campaignId]
  );

  return { campaignId, sent, errors, total: clientIds.length };
}

async function trackWinbackSuccess(campaignId) {
  const r = await db.query(
    `SELECT wc.*, 
            COUNT(DISTINCT ws.client_id) AS total_sent,
            COUNT(DISTINCT m.client_id) AS replied_count,
            COUNT(DISTINCT p.client_id) AS converted_count
     FROM winback_campaigns wc
     LEFT JOIN winback_sends ws ON ws.campaign_id = wc.id
     LEFT JOIN messages m ON m.client_id = ws.client_id AND m.direction='inbound' AND m.created_at > ws.sent_at
     LEFT JOIN payments p ON p.client_id = ws.client_id AND p.status='confirmed' AND p.created_at > ws.sent_at
     WHERE wc.id = $1
     GROUP BY wc.id`,
    [campaignId]
  );
  const c = r.rows[0];
  if (!c) throw new Error('Campaign not found');

  const totalSent    = parseInt(c.total_sent) || 0;
  const repliedCount = parseInt(c.replied_count) || 0;
  const converted    = parseInt(c.converted_count) || 0;

  return {
    campaignId,
    name:              c.name,
    status:            c.status,
    totalSent,
    repliedCount,
    converted,
    replyRate:         totalSent > 0 ? Math.round((repliedCount / totalSent) * 100) : 0,
    conversionRate:    totalSent > 0 ? Math.round((converted     / totalSent) * 100) : 0,
  };
}

async function listWinbackCampaigns() {
  const r = await db.query(`SELECT * FROM winback_campaigns ORDER BY created_at DESC LIMIT 50`);
  return r.rows;
}

module.exports = { identifyChurnedClients, createWinbackCampaign, trackWinbackSuccess, listWinbackCampaigns };
