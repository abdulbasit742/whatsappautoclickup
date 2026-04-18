const axios = require('axios');
const db = require('../db');

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

function getBaseUrl() {
  return `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_ID}/messages`;
}

function getHeaders() {
  return {
    Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendWithRetry(payload, retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await axios.post(getBaseUrl(), payload, { headers: getHeaders() });
      return res.data;
    } catch (err) {
      const isRetryable = !err?.response?.status || err?.response?.status >= 500 || err?.response?.status === 429;
      if (attempt < retries && isRetryable) {
        const delay = RETRY_DELAY_MS * attempt;
        console.warn(`[WA] Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await sleep(delay);
      } else {
        console.error('[WA] sendWithRetry final error:', err?.response?.data || err.message);
        throw err;
      }
    }
  }
}

async function logOutbound(clientId, content, messageType = 'text', waMessageId = null) {
  try {
    await db.query(
      `INSERT INTO messages (client_id, direction, content, message_type, whatsapp_message_id)
       VALUES ($1, 'outbound', $2, $3, $4)`,
      [clientId, content, messageType, waMessageId]
    );
  } catch (err) {
    console.error('[WA] logOutbound error:', err.message);
  }
}

async function sendText(to, text, clientId = null) {
  try {
    const data = await sendWithRetry({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    });

    const waId = data?.messages?.[0]?.id || null;
    console.log(`[WA] sendText → ${to} | msgId=${waId}`);

    if (clientId) {
      await logOutbound(clientId, text, 'text', waId);
    }

    return data;
  } catch (err) {
    console.error('[WA] sendText error:', err?.response?.data || err.message);
    throw err;
  }
}

async function sendTemplate(to, templateName, langCode = 'en', components = []) {
  try {
    const data = await sendWithRetry({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: { name: templateName, language: { code: langCode }, components },
    });
    console.log(`[WA] sendTemplate "${templateName}" → ${to}`);
    return data;
  } catch (err) {
    console.error('[WA] sendTemplate error:', err?.response?.data || err.message);
    throw err;
  }
}

async function markAsRead(messageId) {
  try {
    await axios.post(getBaseUrl(), {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    }, { headers: getHeaders() });
  } catch (err) {
    console.error('[WA] markAsRead error:', err.message);
  }
}

module.exports = { sendText, sendTemplate, markAsRead, logOutbound };
