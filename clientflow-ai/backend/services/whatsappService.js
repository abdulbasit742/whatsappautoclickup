const axios = require('axios');

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
    console.error('[WA] sendText error:', err?.response?.data || err.message);
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
    console.error('[WA] sendTemplate error:', err?.response?.data || err.message);
    throw err;
  }
}

async function sendImage(to, imageUrl, caption = '') {
  try {
    const res = await axios.post(BASE_URL, {
      messaging_product: 'whatsapp',
      to,
      type: 'image',
      image: { link: imageUrl, caption },
    }, { headers: HEADERS });
    return res.data;
  } catch (err) {
    console.error('[WA] sendImage error:', err?.response?.data || err.message);
    throw err;
  }
}

async function sendInteractiveButtons(to, bodyText, buttons) {
  try {
    const res = await axios.post(BASE_URL, {
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: bodyText },
        action: {
          buttons: buttons.map((b, i) => ({
            type: 'reply',
            reply: { id: `btn_${i}`, title: b }
          }))
        }
      }
    }, { headers: HEADERS });
    return res.data;
  } catch (err) {
    console.error('[WA] sendInteractiveButtons error:', err?.response?.data || err.message);
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
    console.error('[WA] markAsRead error:', err.message);
  }
}

module.exports = { sendText, sendTemplate, sendImage, sendInteractiveButtons, markAsRead };
