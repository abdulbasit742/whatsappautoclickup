const axios = require('axios');
const { logger } = require('../middleware/logger');

const BASE_URL = `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_ID}/messages`;
const HEADERS = {
  Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
  'Content-Type': 'application/json',
};

async function sendText(to, text) {
  try {
    const res = await axios.post(BASE_URL, {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }, { headers: HEADERS });
    return res.data;
  } catch (err) {
    logger.error(`[WA] sendText error: ${JSON.stringify(err?.response?.data) || err.message}`);
    throw err;
  }
}

async function sendTemplate(to, templateName, langCode = 'en', components = []) {
  try {
    const res = await axios.post(BASE_URL, {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: { name: templateName, language: { code: langCode }, components },
    }, { headers: HEADERS });
    return res.data;
  } catch (err) {
    logger.error(`[WA] sendTemplate error: ${JSON.stringify(err?.response?.data) || err.message}`);
    throw err;
  }
}

async function markAsRead(messageId) {
  try {
    await axios.post(BASE_URL, {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    }, { headers: HEADERS });
  } catch (err) {
    logger.error(`[WA] markAsRead error: ${err.message}`);
  }
}

module.exports = { sendText, sendTemplate, markAsRead };
