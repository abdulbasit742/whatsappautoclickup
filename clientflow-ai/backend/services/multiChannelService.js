/**
 * Multi-Channel Campaign Service
 * Distributes campaigns via WhatsApp, email, SMS, push, in-app
 */

const db     = require('../db');
const crypto = require('crypto');
const { sendText } = require('./whatsappService');

const CHANNELS = ['whatsapp', 'email', 'sms', 'push', 'in_app'];

async function createCampaign(campaignData) {
  const {
    name, description, channels, audience, messages, schedule, abTest
  } = campaignData;

  const campaignId = `mc_${crypto.randomBytes(6).toString('hex')}`;
  const r = await db.query(
    `INSERT INTO multi_channel_campaigns
       (id, name, description, channels, audience, messages, schedule, ab_test, status, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'draft',NOW()) RETURNING *`,
    [campaignId, name, description, JSON.stringify(channels || []), JSON.stringify(audience || {}),
     JSON.stringify(messages || {}), JSON.stringify(schedule || {}), JSON.stringify(abTest || null)]
  );

  return r.rows[0];
}

async function distribute(campaignId) {
  const r       = await db.query(`SELECT * FROM multi_channel_campaigns WHERE id=$1`, [campaignId]);
  const campaign = r.rows[0];
  if (!campaign) throw new Error('Campaign not found');

  const channels = JSON.parse(campaign.channels || '[]');
  const messages = JSON.parse(campaign.messages || '{}');
  const audience = JSON.parse(campaign.audience || '{}');

  // Get target clients
  let q = `SELECT * FROM clients WHERE status NOT IN ('blocked')`;
  const params = [];
  if (audience.status) { params.push(audience.status); q += ` AND status=$${params.length}`; }
  if (audience.minSpent) { params.push(audience.minSpent); q += ` AND total_spent_pkr >= $${params.length}`; }
  q += ` LIMIT ${audience.limit || 500}`;

  const clients = await db.query(q, params);
  const stats   = {};

  for (const channel of channels) {
    stats[channel] = { sent: 0, failed: 0 };
    const msg = messages[channel] || messages.default;
    if (!msg) continue;

    for (const client of clients.rows) {
      try {
        if (channel === 'whatsapp') {
          await sendText(client.whatsapp_number, msg);
          stats[channel].sent++;
        } else {
          // Simulate other channels (email, SMS, push, in-app)
          await db.query(
            `INSERT INTO campaign_sends (campaign_id, client_id, channel, message, sent_at)
             VALUES ($1,$2,$3,$4,NOW())`,
            [campaignId, client.id, channel, msg]
          );
          stats[channel].sent++;
        }
      } catch {
        stats[channel].failed++;
      }
    }
  }

  await db.query(
    `UPDATE multi_channel_campaigns SET status='launched', stats=$1, launched_at=NOW() WHERE id=$2`,
    [JSON.stringify(stats), campaignId]
  );

  return { campaignId, stats, totalClients: clients.rows.length };
}

async function runABTest(campaignId, variants) {
  const r = await db.query(`SELECT * FROM multi_channel_campaigns WHERE id=$1`, [campaignId]);
  const campaign = r.rows[0];
  if (!campaign) throw new Error('Campaign not found');

  const clients = await db.query(`SELECT id FROM clients WHERE status NOT IN ('blocked') ORDER BY RANDOM() LIMIT 200`);
  const chunkSize = Math.floor(clients.rows.length / variants.length);
  const results   = [];

  for (let i = 0; i < variants.length; i++) {
    const chunk   = clients.rows.slice(i * chunkSize, (i + 1) * chunkSize);
    const variant = variants[i];
    results.push({
      variant:       variant.name || `Variant ${i + 1}`,
      message:       variant.message,
      targetCount:   chunk.length,
      status:        'scheduled',
    });
  }

  await db.query(
    `UPDATE multi_channel_campaigns SET ab_test=$1 WHERE id=$2`,
    [JSON.stringify({ variants: results, startedAt: new Date().toISOString() }), campaignId]
  );

  return { campaignId, abTest: results };
}

async function getChannelStats(campaignId) {
  const r = await db.query(
    `SELECT mcc.*, 
            COUNT(cs.id) AS total_sends,
            COUNT(CASE WHEN cs.opened THEN 1 END) AS opens,
            COUNT(CASE WHEN cs.clicked THEN 1 END) AS clicks
     FROM multi_channel_campaigns mcc
     LEFT JOIN campaign_sends cs ON cs.campaign_id = mcc.id
     WHERE mcc.id = $1
     GROUP BY mcc.id`,
    [campaignId]
  );
  const campaign = r.rows[0];
  if (!campaign) throw new Error('Campaign not found');

  const channelBreakdown = await db.query(
    `SELECT channel, COUNT(*) AS sent FROM campaign_sends WHERE campaign_id=$1 GROUP BY channel`,
    [campaignId]
  );

  return {
    ...campaign,
    channelBreakdown: channelBreakdown.rows,
  };
}

async function listCampaigns() {
  const r = await db.query(`SELECT * FROM multi_channel_campaigns ORDER BY created_at DESC LIMIT 50`);
  return r.rows;
}

module.exports = { createCampaign, distribute, runABTest, getChannelStats, listCampaigns, CHANNELS };
