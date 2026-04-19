const express = require('express');
const router = express.Router();
const db = require('../db');
const { generateAIResponse } = require('../services/aiService');
const { sendText } = require('../services/whatsappService');

// ─── Webhook Verification ────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// ─── Incoming Messages ───────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  res.sendStatus(200);

  try {
    const body = req.body;
    if (!body?.object) return;

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (value?.statuses) {
      for (const s of value.statuses) {
        if (s.status === 'delivered') {
          await db.query(`UPDATE messages SET delivered=true WHERE whatsapp_message_id=$1`, [s.id]);
        } else if (s.status === 'read') {
          await db.query(`UPDATE messages SET read=true WHERE whatsapp_message_id=$1`, [s.id]);
        }
      }
      return;
    }

    const msgs = value?.messages;
    if (!msgs?.length) return;

    for (const msg of msgs) {
      const from = msg.from;
      const msgId = msg.id;
      const msgType = msg.type;
      let content = '';

      if (msgType === 'text') content = msg.text.body;
      else if (msgType === 'image') content = '[Image received]';
      else if (msgType === 'audio') content = '[Voice message received]';
      else if (msgType === 'document') content = `[Document: ${msg.document?.filename || 'file'}]`;
      else content = `[${msgType}]`;

      let clientRes = await db.query(`SELECT * FROM clients WHERE whatsapp_number=$1`, [from]);
      let client = clientRes.rows[0];
      const isNew = !client;

      if (isNew) {
        const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const ins = await db.query(
          `INSERT INTO clients (whatsapp_number, referral_code, status) VALUES ($1,$2,'lead') RETURNING *`,
          [from, referralCode]
        );
        client = ins.rows[0];

        await db.query(
          `INSERT INTO alerts (type, client_id, message) VALUES ('new_client',$1,'New client started a conversation')`,
          [client.id]
        );
        req.app.get('io')?.emit('new_alert', { type: 'new_client', clientId: client.id });
      }

      await db.query(
        `INSERT INTO messages (client_id, direction, content, message_type, whatsapp_message_id) VALUES ($1,'inbound',$2,$3,$4)`,
        [client.id, content, msgType, msgId]
      );

      await db.query(`UPDATE clients SET last_active_at=NOW() WHERE id=$1`, [client.id]);

      const workStart = await db.query(`SELECT value FROM settings WHERE key='working_hours_start'`);
      const workEnd = await db.query(`SELECT value FROM settings WHERE key='working_hours_end'`);
      const autoReply = await db.query(`SELECT value FROM settings WHERE key='auto_reply_enabled'`);

      if (autoReply.rows[0]?.value !== 'true') continue;

      const now = new Date();
      const hour = now.getHours();
      const [sh] = (workStart.rows[0]?.value || '09:00').split(':').map(Number);
      const [eh] = (workEnd.rows[0]?.value || '22:00').split(':').map(Number);

      if (hour < sh || hour >= eh) {
        const offlineMsg = await db.query(`SELECT value FROM settings WHERE key='offline_message'`);
        await sendText(from, offlineMsg.rows[0]?.value || 'We are currently offline. We will reply soon!');
        continue;
      }

      const lc = content.toLowerCase();
      if (isNew || lc.includes('hello') || lc.includes('hi') || lc.includes('assalam')) {
        await handleOnboarding(client, from, isNew);
        continue;
      }
      if (lc.includes('price') || lc.includes('pricing') || lc.includes('rate') || lc.includes('kitna')) {
        await handlePricing(client, from);
        continue;
      }
      if (lc.includes('pay') || lc.includes('payment') || lc.includes('send money')) {
        await handlePaymentInstructions(client, from);
        continue;
      }
      if (lc.includes('book') || lc.includes('call') || lc.includes('meeting')) {
        await sendText(from, `To book a call, please tell us your preferred date and time and we will confirm a slot for you! 📅`);
        continue;
      }
      if (/^[1-5]$/.test(content.trim())) {
        await handleReview(client, from, parseInt(content.trim()));
        continue;
      }

      await handleAIResponse(client, from, content, req.app.get('io'));
    }
  } catch (err) {
    console.error('[Webhook] Error:', err.message);
  }
});

async function handleOnboarding(client, to, isNew) {
  const bizName = (await db.query(`SELECT value FROM settings WHERE key='business_name'`)).rows[0]?.value || 'Our Business';
  const bizDesc = (await db.query(`SELECT value FROM settings WHERE key='business_description'`)).rows[0]?.value || 'Professional services';

  const greeting = isNew
    ? `Assalam u Alaikum! 👋 Welcome to *${bizName}*!\n\n${bizDesc}\n\nWe're here to help you. Type *pricing* to see our services or just tell us what you need! 😊`
    : `Welcome back! 😊 How can we help you today?`;

  await sendText(to, greeting);
  if (isNew) {
    await db.query(
      `INSERT INTO follow_ups (client_id, type, scheduled_at) VALUES ($1,'cold_lead', NOW() + INTERVAL '24 hours')`,
      [client.id]
    );
  }
}

async function handlePricing(client, to) {
  const svcs = await db.query(`SELECT name, description, price_pkr, delivery_days FROM services WHERE is_active=true ORDER BY price_pkr`);
  let msg = `🛍️ *Our Services & Pricing*\n\n`;
  for (const s of svcs.rows) {
    msg += `📦 *${s.name}*\n${s.description}\n💰 PKR ${Number(s.price_pkr).toLocaleString()} | ⏱️ ${s.delivery_days} day(s)\n\n`;
  }
  msg += `Reply with any service name to get started! 😊`;
  await sendText(to, msg);
}

async function handlePaymentInstructions(client, to) {
  const easy = (await db.query(`SELECT value FROM settings WHERE key='easypaisa_number'`)).rows[0]?.value;
  const jazz = (await db.query(`SELECT value FROM settings WHERE key='jazzcash_number'`)).rows[0]?.value;
  const bank = (await db.query(`SELECT value FROM settings WHERE key='bank_details'`)).rows[0]?.value;

  const msg = `💳 *Payment Details*\n\n💚 *Easypaisa:* ${easy || 'Not set'}\n💙 *JazzCash:* ${jazz || 'Not set'}\n🏦 *Bank:* ${bank || 'Contact for details'}\n\nAfter sending payment, please share a screenshot here. We'll confirm within a few minutes! ✅`;
  await sendText(to, msg);

  await db.query(
    `INSERT INTO follow_ups (client_id, type, scheduled_at) VALUES ($1,'pending_payment', NOW() + INTERVAL '24 hours')`,
    [client.id]
  );
}

async function handleReview(client, to, rating) {
  const sentiment = rating >= 4 ? 'positive' : rating === 3 ? 'neutral' : 'negative';
  await db.query(
    `INSERT INTO reviews (client_id, rating, sentiment) VALUES ($1,$2,$3)`,
    [client.id, rating, sentiment]
  );
  const stars = '⭐'.repeat(rating);
  await sendText(to, `${stars} Thank you for your rating! Your feedback means a lot to us. 🙏`);
  if (rating >= 4) {
    await sendText(to, `We're so glad you had a great experience! Would you like to try any of our other services? Type *pricing* to see options. 🚀`);
  }
}

async function handleAIResponse(client, to, userMessage, io) {
  const histRes = await db.query(
    `SELECT direction, content FROM messages WHERE client_id=$1 ORDER BY created_at DESC LIMIT 10`,
    [client.id]
  );
  const history = [...histRes.rows].reverse().map(m => ({
    role: m.direction === 'inbound' ? 'user' : 'assistant',
    content: m.content,
  }));

  const svcs = await db.query(`SELECT name, price_pkr FROM services WHERE is_active=true`);
  const catalog = svcs.rows.map(s => `${s.name}: PKR ${s.price_pkr}`).join(', ');
  const bizName = (await db.query(`SELECT value FROM settings WHERE key='business_name'`)).rows[0]?.value || 'Our Business';

  const systemPrompt = `You are a helpful, friendly customer service AI for "${bizName}".
Your job is to assist clients on WhatsApp professionally and warmly.
Available services: ${catalog}
Client name: ${client.name || 'valued client'}
Always be polite, concise, and helpful. If asked about something you cannot answer (custom pricing, complaints, technical issues), say "Let me connect you with our team for this!" and flag it.
Do not make up prices or services not listed above.`;

  const { response, providerUsed, success } = await generateAIResponse({
    systemPrompt, history, userMessage, clientId: client.id,
  });

  if (!success || !response) {
    await sendText(to, `I'm having a moment — let me connect you with our team right away! 🙏`);
    await db.query(
      `INSERT INTO alerts (type, client_id, message) VALUES ('ai_failure',$1,'AI failed to respond')`,
      [client.id]
    );
    io?.emit('new_alert', { type: 'ai_failure', clientId: client.id });
    return;
  }

  const flagKeywords = ['custom', 'special price', 'complaint', 'refund', 'problem', 'issue', 'not working'];
  const shouldFlag = flagKeywords.some(k => userMessage.toLowerCase().includes(k));

  await db.query(
    `INSERT INTO messages (client_id, direction, content, ai_provider_used, is_flagged) VALUES ($1,'outbound',$2,$3,$4)`,
    [client.id, response, providerUsed, shouldFlag]
  );

  if (shouldFlag) {
    await db.query(
      `INSERT INTO alerts (type, client_id, message) VALUES ('unresolved_query',$1,$2)`,
      [client.id, `Client query may need manual attention: "${userMessage.substring(0, 100)}"`]
    );
    io?.emit('new_alert', { type: 'unresolved_query', clientId: client.id });
  }

  await sendText(to, response);
}

module.exports = router;
