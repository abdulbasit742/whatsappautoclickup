const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  generateAIResponse,
  generateMarketingMessage,
  generateReplySuggestion,
  summarizeConversation,
  classifyLeadIntent,
  translateMessage,
  getProviderHealth
} = require('../services/aiService');
const db = require('../db');

router.use(auth);

// ─── AI Broadcast Writer ──────────────────────────────────────────────────────
router.post('/write-broadcast', async (req, res) => {
  try {
    const { topic, tone, audience, provider } = req.body;
    const settings = (await db.query(`SELECT key, value FROM settings`)).rows;
    const biz = settings.find(s => s.key === 'business_name')?.value || 'our business';
    const desc = settings.find(s => s.key === 'business_description')?.value || '';

    const result = await generateMarketingMessage({
      topic,
      tone,
      audience,
      businessName: biz,
      businessDescription: desc,
      preferredProvider: provider
    });

    res.json({ message: result.response, provider: result.providerUsed });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── AI Quick Reply Suggestion ────────────────────────────────────────────────
router.post('/suggest-reply', async (req, res) => {
  try {
    const { clientId, lastMessage, tone, language, provider } = req.body;
    const settings = (await db.query(`SELECT key, value FROM settings`)).rows;
    const biz = settings.find(s => s.key === 'business_name')?.value || 'our business';
    const services = (await db.query(`SELECT name, price_pkr FROM services WHERE is_active=true`)).rows;
    const payDetails = {
      easypaisa: settings.find(s => s.key === 'easypaisa_number')?.value,
      jazzcash: settings.find(s => s.key === 'jazzcash_number')?.value,
    };

    const history = [];
    if (clientId) {
      const msgs = (await db.query(
        `SELECT direction, content FROM messages WHERE client_id=$1 ORDER BY created_at DESC LIMIT 10`,
        [clientId]
      )).rows.reverse();
      msgs.forEach(m => history.push({ role: m.direction === 'inbound' ? 'user' : 'assistant', content: m.content }));
    }

    const result = await generateReplySuggestion({
      businessName: biz,
      services,
      history,
      userMessage: `${lastMessage}\nTone:${tone || 'friendly'}\nLanguage:${language || 'auto'}`,
      paymentHints: `Easypaisa ${payDetails.easypaisa || 'N/A'}, JazzCash ${payDetails.jazzcash || 'N/A'}`,
      preferredProvider: provider
    });
    res.json({ reply: result.response, provider: result.providerUsed });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── AI Provider Health ────────────────────────────────────────────────────────
router.get('/health', async (req, res) => {
  try {
    res.json(getProviderHealth());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Upsell Message Generator ─────────────────────────────────────────────────
router.post('/upsell', async (req, res) => {
  try {
    const { clientId, serviceId, provider } = req.body;
    const client = (await db.query(`SELECT * FROM clients WHERE id=$1`, [clientId])).rows[0];
    const service = (await db.query(`SELECT * FROM services WHERE id=$1`, [serviceId])).rows[0];
    const otherServices = (await db.query(`SELECT * FROM services WHERE is_active=true AND id!=$1 LIMIT 5`, [serviceId])).rows;

    const systemPrompt = `You are a sales assistant. Write a short, friendly WhatsApp upsell message (max 2 sentences + CTA).
After delivering a service, suggest a related next service. No markdown, no asterisks.`;

    const result = await generateAIResponse({
      systemPrompt,
      history: [],
      userMessage: `Client just received: "${service?.name}". Suggest one of these related services: ${otherServices.map(s => `${s.name} (PKR ${s.price_pkr})`).join(', ')}. Client name: ${client?.name || 'valued client'}.`,
      preferredProvider: provider
    });

    res.json({ message: result.response });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/summarize-chat', async (req, res) => {
  try {
    const { clientId, provider } = req.body;
    const msgs = (await db.query(
      `SELECT direction, content FROM messages WHERE client_id=$1 ORDER BY created_at DESC LIMIT 30`,
      [clientId]
    )).rows.reverse();
    const transcript = msgs.map(m => `${m.direction}: ${m.content}`).join('\n');
    const result = await summarizeConversation({ transcript, preferredProvider: provider });
    res.json({ summary: result.response, provider: result.providerUsed });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/classify', async (req, res) => {
  try {
    const { message, provider } = req.body;
    const result = await classifyLeadIntent({ userMessage: message, preferredProvider: provider });
    res.json({ classification: result.response, provider: result.providerUsed });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/translate', async (req, res) => {
  try {
    const { text, targetLanguage, provider } = req.body;
    const result = await translateMessage({ text, targetLanguage, preferredProvider: provider });
    res.json({ translation: result.response, provider: result.providerUsed });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
