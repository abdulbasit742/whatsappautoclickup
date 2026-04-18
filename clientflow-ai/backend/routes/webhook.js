const express = require('express');
const router = express.Router();
const db = require('../db');
const { generateAIResponse, buildSalesSystemPrompt } = require('../services/aiService');
const { sendText, markAsRead } = require('../services/whatsappService');

// In-memory set to prevent double-processing within a short window
const recentlyProcessed = new Set();

function markProcessed(msgId) {
  recentlyProcessed.add(msgId);
  setTimeout(() => recentlyProcessed.delete(msgId), 5 * 60 * 1000); // clear after 5 min
}

// ─── Batch-load all settings in one query ────────────────────────────────────────
async function loadSettings() {
  const r = await db.query(`SELECT key, value FROM settings`);
  return Object.fromEntries(r.rows.map(s => [s.key, s.value]));
}

// ─── Webhook Verification ────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    // Validate challenge is printable ASCII only (alphanumeric + common punctuation) before echoing back
    if (challenge && /^[a-zA-Z0-9_\-]+$/.test(challenge)) {
      res.setHeader('Content-Type', 'text/plain');
      return res.status(200).send(challenge);
    }
    return res.sendStatus(400);
  }
  res.sendStatus(403);
});

// ─── Incoming Messages ───────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  // Always respond 200 immediately to avoid WhatsApp retries
  res.sendStatus(200);

  try {
    const body = req.body;
    if (!body?.object) return;

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    // Handle delivery/read status updates
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

    // Load all settings and active services once for this webhook batch
    const [settings, activeServicesRes] = await Promise.all([
      loadSettings(),
      db.query(`SELECT name FROM services WHERE is_active=true`),
    ]);
    const activeServices = activeServicesRes.rows;

    for (const msg of msgs) {
      const from = msg.from;
      const msgId = msg.id;
      const msgType = msg.type;

      // ─── Idempotency: skip already-processed messages ──────────────────────
      if (recentlyProcessed.has(msgId)) {
        console.log(`[Webhook] Skipping duplicate message ${msgId}`);
        continue;
      }

      // Check DB for exact duplicate (persisted idempotency)
      const dupCheck = await db.query(
        `SELECT id FROM messages WHERE whatsapp_message_id=$1 AND direction='inbound' LIMIT 1`,
        [msgId]
      );
      if (dupCheck.rows.length > 0) {
        console.log(`[Webhook] Already processed message ${msgId}, skipping`);
        markProcessed(msgId);
        continue;
      }
      markProcessed(msgId);

      let content = '';
      let isPossiblePaymentProof = false;

      if (msgType === 'text') {
        content = msg.text.body;
      } else if (msgType === 'image') {
        content = '[Image received]';
        isPossiblePaymentProof = true; // Images may be payment screenshots
      } else if (msgType === 'audio') {
        content = '[Voice message received]';
      } else if (msgType === 'document') {
        content = `[Document: ${msg.document?.filename || 'file'}]`;
        isPossiblePaymentProof = true;
      } else {
        content = `[${msgType}]`;
      }

      // ─── Find or create client (race-safe via ON CONFLICT) ──────────────────
      const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const upsertRes = await db.query(
        `INSERT INTO clients (whatsapp_number, referral_code, status)
         VALUES ($1, $2, 'lead')
         ON CONFLICT (whatsapp_number) DO UPDATE SET last_active_at=NOW()
         RETURNING *, (xmax = 0) AS is_new_row`,
        [from, referralCode]
      );
      const client = upsertRes.rows[0];
      // PostgreSQL: xmax=0 means no existing row was updated → it's a new insert
      const isNew = client.is_new_row === true || client.is_new_row === 't';

      if (isNew) {
        await db.query(
          `INSERT INTO alerts (type, client_id, message, priority) VALUES ('new_client',$1,'New client started a conversation','medium')`,
          [client.id]
        );
        req.app.get('io')?.emit('new_alert', { type: 'new_client', clientId: client.id, priority: 'medium' });

        // ─── Referral attribution ──────────────────────────────────────────
        // Detect referral codes (6-char alphanumeric) in the first message and
        // link the new client to their referrer.
        if (msgType === 'text') {
          const codeMatch = content.match(/\b([A-Z0-9]{6})\b/);
          if (codeMatch) {
            const referrer = (await db.query(
              `SELECT id FROM clients WHERE referral_code=$1 AND id!=$2 LIMIT 1`,
              [codeMatch[1], client.id]
            )).rows[0];
            if (referrer) {
              await db.query(
                `UPDATE clients SET referred_by_id=$1 WHERE id=$2 AND referred_by_id IS NULL`,
                [referrer.id, client.id]
              ).catch(() => {});
              await db.query(
                `INSERT INTO referrals (referrer_id, referred_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
                [referrer.id, client.id]
              ).catch(() => {});
            }
          }
        }
      }

      // ─── Save inbound message ──────────────────────────────────────────────
      await db.query(
        `INSERT INTO messages (client_id, direction, content, message_type, whatsapp_message_id)
         VALUES ($1,'inbound',$2,$3,$4)`,
        [client.id, content, msgType, msgId]
      );

      // Mark message as read (fire-and-forget, don't block processing)
      markAsRead(msgId).catch(() => {});

      // ─── Check auto-reply setting ──────────────────────────────────────────
      if (settings['auto_reply_enabled'] !== 'true') continue;

      const now = new Date();
      const hour = now.getHours();
      const [sh] = (settings['working_hours_start'] || '09:00').split(':').map(Number);
      const [eh] = (settings['working_hours_end'] || '22:00').split(':').map(Number);

      if (hour < sh || hour >= eh) {
        await sendText(from, settings['offline_message'] || 'We are currently offline. We will reply soon!', client.id);
        continue;
      }

      const lc = content.toLowerCase();

      // ─── Payment screenshot / confirmation detection ───────────────────────
      const paymentConfirmKeywords = [
        'paid', 'payment done', 'payment sent', 'sent payment', 'transferred',
        'bhej diya', 'bheja', 'kar diya', 'ho gaya', 'screenshot',
        'paisa bheja', 'deposit', 'transaction', 'proof',
        'send kar diya', 'payment kar di',
      ];
      const isPaymentConfirmation = paymentConfirmKeywords.some(k => lc.includes(k));

      if (isPaymentConfirmation || isPossiblePaymentProof) {
        await handlePaymentConfirmationMessage(client, from, content, isPossiblePaymentProof, settings, req.app.get('io'));
        continue;
      }

      // ─── Keyword routing ───────────────────────────────────────────────────
      if (isNew || lc.includes('hello') || lc.includes('hi') || lc.includes('assalam') || lc.includes('start')) {
        await handleOnboarding(client, from, isNew, settings);
        continue;
      }
      if (lc.includes('price') || lc.includes('pricing') || lc.includes('rate') || lc.includes('kitna') || lc.includes('cost') || lc.includes('charges')) {
        await handlePricing(client, from);
        continue;
      }
      if (lc.includes('pay') || lc.includes('payment') || lc.includes('send money') || lc.includes('kaise bhejun') || lc.includes('how to pay')) {
        await handlePaymentInstructions(client, from, settings);
        continue;
      }
      if (lc.includes('book') || lc.includes('call') || lc.includes('meeting') || lc.includes('appointment')) {
        await sendText(from,
          `📅 To book a consultation, please tell us your preferred date and time!\nWe'll confirm your slot within a few minutes. 😊`,
          client.id
        );
        continue;
      }
      if (/^[1-5]$/.test(content.trim())) {
        await handleReview(client, from, parseInt(content.trim()));
        continue;
      }

      // ─── Service selection detection ──────────────────────────────────────
      // If the client names a specific service, route to payment instructions
      // Uses activeServices loaded once per webhook batch (no per-message DB query)
      const namedService = activeServices.find(s => lc.includes(s.name.toLowerCase()));
      if (namedService) {
        await sendText(from,
          `✅ Great choice! *${namedService.name}* is one of our most popular services! 🎉\n\nTo get started, please make the payment using the details below and share the screenshot here. 💰`,
          client.id
        );
        await handlePaymentInstructions(client, from, settings);
        continue;
      }

      await handleAIResponse(client, from, content, settings, req.app.get('io'));
    }
  } catch (err) {
    console.error('[Webhook] Error:', err.message);
  }
});

// ─── Onboarding ──────────────────────────────────────────────────────────────────
async function handleOnboarding(client, to, isNew, settings) {
  const bizName = settings['business_name'] || 'Our Business';
  const bizDesc = settings['business_description'] || 'Professional services';

  const greeting = isNew
    ? `Assalam u Alaikum! 👋 Welcome to *${bizName}*!\n\n${bizDesc}\n\nWe're here to help you with professional, fast, and affordable services.\n\nType *pricing* to see our services, or just tell us what you need! 😊`
    : `Welcome back! 😊 Great to hear from you again!\n\nHow can we help you today? Type *pricing* to see our services.`;

  await sendText(to, greeting, client.id);

  if (isNew) {
    await db.query(
      `INSERT INTO follow_ups (client_id, type, scheduled_at) VALUES ($1,'cold_lead', NOW() + INTERVAL '24 hours')
       ON CONFLICT (client_id, type) WHERE (status = 'pending') DO NOTHING`,
      [client.id]
    ).catch(() => {});
  }
}

// ─── Pricing ─────────────────────────────────────────────────────────────────────
async function handlePricing(client, to) {
  const svcs = await db.query(
    `SELECT name, description, price_pkr, delivery_days FROM services WHERE is_active=true ORDER BY price_pkr`
  );
  if (svcs.rows.length === 0) {
    await sendText(to, `Our pricing is being updated! Please contact us directly for a custom quote. 😊`, client.id);
    return;
  }
  let msg = `🛍️ *Our Services & Pricing*\n\n`;
  for (const s of svcs.rows) {
    msg += `📦 *${s.name}*\n${s.description || ''}\n💰 PKR ${Number(s.price_pkr).toLocaleString()} | ⏱️ ${s.delivery_days} day(s)\n\n`;
  }
  msg += `✅ Ready to get started? Reply with a service name or type *pay* to see payment options!`;
  await sendText(to, msg, client.id);
}

// ─── Payment Instructions ─────────────────────────────────────────────────────────
async function handlePaymentInstructions(client, to, settings) {
  const msg = `💳 *Payment Details*\n\n` +
    `💚 *Easypaisa:* ${settings['easypaisa_number'] || 'Not set'}\n` +
    `💙 *JazzCash:* ${settings['jazzcash_number'] || 'Not set'}\n` +
    `🏦 *Bank Transfer:* ${settings['bank_details'] || 'Contact for details'}\n\n` +
    `After sending payment, please share a *screenshot* here. We'll confirm within a few minutes! ✅`;

  await sendText(to, msg, client.id);

  // Schedule pending payment follow-up (avoid duplicates)
  await db.query(
    `INSERT INTO follow_ups (client_id, type, scheduled_at) VALUES ($1,'pending_payment', NOW() + INTERVAL '24 hours')
     ON CONFLICT (client_id, type) WHERE (status = 'pending') DO NOTHING`,
    [client.id]
  ).catch(() => {});
}

// ─── Payment Confirmation Message Handler ─────────────────────────────────────────
async function handlePaymentConfirmationMessage(client, to, content, isImage, settings, io) {
  // Acknowledge receipt
  await sendText(to,
    `✅ Payment proof received! Our team will verify and confirm within a few minutes. Thank you for your patience! 🙏`,
    client.id
  );

  // Auto-create a pending payment record so admin can confirm directly from dashboard
  const existingPending = await db.query(
    `SELECT id FROM payments WHERE client_id=$1 AND status='pending' LIMIT 1`,
    [client.id]
  );
  if (existingPending.rows.length === 0) {
    await db.query(
      `INSERT INTO payments (client_id, amount_pkr, notes) VALUES ($1, 0, $2)`,
      [client.id, `Auto-created from ${isImage ? 'payment screenshot' : 'payment confirmation message'}. Amount to be filled by admin.`]
    ).catch(() => {});
  }

  const ownerNum = settings['owner_whatsapp'];

  // Create high-priority payment alert for admin
  await db.query(
    `INSERT INTO alerts (type, client_id, message, priority)
     VALUES ('pending_payment',$1,$2,'high')`,
    [client.id, `Payment ${isImage ? 'screenshot' : 'confirmation message'} received from ${client.name || to}. Awaiting verification.`]
  );
  io?.emit('new_alert', { type: 'pending_payment', clientId: client.id, priority: 'high' });

  // Notify owner on WhatsApp
  if (ownerNum) {
    await sendText(ownerNum,
      `🔔 *Payment Alert!*\n\nClient: ${client.name || to}\nNumber: ${to}\nMessage: ${content.substring(0, 100)}\n\nPlease verify and confirm payment in the dashboard. 💰`
    ).catch(() => {});
  }

  console.log(`[Webhook] Payment confirmation received from ${to}`);
}

// ─── Review Handling ──────────────────────────────────────────────────────────────
async function handleReview(client, to, rating) {
  const sentiment = rating >= 4 ? 'positive' : rating === 3 ? 'neutral' : 'negative';
  await db.query(
    `INSERT INTO reviews (client_id, rating, sentiment) VALUES ($1,$2,$3)`,
    [client.id, rating, sentiment]
  );
  // Static lookup avoids user-controlled string repetition (CodeQL resource-exhaustion)
  const STAR_MAP = ['', '⭐', '⭐⭐', '⭐⭐⭐', '⭐⭐⭐⭐', '⭐⭐⭐⭐⭐'];
  const safeRating = Math.min(Math.max(1, rating), 5);
  const stars = STAR_MAP[safeRating];

  if (rating <= 2) {
    await sendText(to,
      `${stars} Thank you for your honest feedback. We're sorry to hear about your experience — let us make it right! 🙏\n\nPlease tell us what went wrong and we'll address it immediately.`,
      client.id
    );
    await db.query(
      `INSERT INTO alerts (type, client_id, message, priority) VALUES ('complaint',$1,'Client left a negative review (${rating}/5)','high')`,
      [client.id]
    );
  } else if (rating === 3) {
    await sendText(to,
      `${stars} Thank you for the feedback! We appreciate your honesty and will work to improve. 🙏`,
      client.id
    );
  } else {
    await sendText(to,
      `${stars} Thank you so much! We're thrilled you had a great experience! 🎉\n\nWould you like to explore our other services? Type *pricing* to see what's available! 🚀`,
      client.id
    );
  }
}

// ─── AI Response ──────────────────────────────────────────────────────────────────
async function handleAIResponse(client, to, userMessage, settings, io) {
  const [histRes, svcs] = await Promise.all([
    db.query(
      // Only include AI-generated or manual outbound messages to keep context clean
      `SELECT direction, content FROM messages
       WHERE client_id=$1 AND (direction='inbound' OR (direction='outbound' AND ai_provider_used IS NOT NULL))
       ORDER BY created_at DESC LIMIT 10`,
      [client.id]
    ),
    db.query(`SELECT name, price_pkr FROM services WHERE is_active=true`),
  ]);

  const history = histRes.rows.reverse().map(m => ({
    role: m.direction === 'inbound' ? 'user' : 'assistant',
    content: m.content,
  }));

  const bizName = settings['business_name'] || 'Our Business';
  const catalog = svcs.rows.map(s => `- ${s.name}: PKR ${Number(s.price_pkr).toLocaleString()}`).join('\n');
  const paymentInfo = [
    settings['easypaisa_number'] ? `Easypaisa: ${settings['easypaisa_number']}` : null,
    settings['jazzcash_number'] ? `JazzCash: ${settings['jazzcash_number']}` : null,
    settings['bank_details'] ? `Bank: ${settings['bank_details']}` : null,
  ].filter(Boolean).join(' | ') || 'Contact for payment info';

  const systemPrompt = buildSalesSystemPrompt(bizName, catalog, paymentInfo, client.name || 'valued client');

  const { response, providerUsed, success, isWeak } = await generateAIResponse({
    systemPrompt, history, userMessage, clientId: client.id,
  });

  if (!success || !response) {
    await sendText(to, `I'm having a moment — let me connect you with our team right away! 🙏`, client.id);
    await db.query(
      `INSERT INTO alerts (type, client_id, message, priority) VALUES ('ai_failure',$1,'All AI providers failed','high')`,
      [client.id]
    );
    io?.emit('new_alert', { type: 'ai_failure', clientId: client.id, priority: 'high' });
    return;
  }

  const flagKeywords = ['custom', 'special price', 'complaint', 'refund', 'problem', 'issue', 'not working', 'cheated', 'fraud', 'angry', 'worst'];
  const shouldFlag = flagKeywords.some(k => userMessage.toLowerCase().includes(k)) || isWeak;
  const priority = flagKeywords.some(k => userMessage.toLowerCase().includes(k)) ? 'high' : isWeak ? 'medium' : 'low';

  // Log AI message to DB first (captures ai_provider_used and is_flagged),
  // then send via WhatsApp and update the record with the WA message ID.
  // NOTE: sendText is called WITHOUT clientId to avoid double-logging.
  const msgInsert = await db.query(
    `INSERT INTO messages (client_id, direction, content, ai_provider_used, is_flagged) VALUES ($1,'outbound',$2,$3,$4) RETURNING id`,
    [client.id, response, providerUsed, shouldFlag]
  );
  const msgDbId = msgInsert.rows[0]?.id;

  if (shouldFlag) {
    await db.query(
      `INSERT INTO alerts (type, client_id, message, priority) VALUES ('unresolved_query',$1,$2,$3)`,
      [client.id, `Query needs attention: "${userMessage.substring(0, 100)}"`, priority]
    );
    io?.emit('new_alert', { type: 'unresolved_query', clientId: client.id, priority });
  }

  // Send the message without clientId — logOutbound is handled by the INSERT above
  const waData = await sendText(to, response);
  const waId = waData?.messages?.[0]?.id;
  if (waId && msgDbId) {
    // Backfill the WA message ID on the already-inserted record
    await db.query(
      `UPDATE messages SET whatsapp_message_id=$1 WHERE id=$2`,
      [waId, msgDbId]
    ).catch(() => {});
  }
}

module.exports = router;

