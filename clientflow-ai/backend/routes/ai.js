const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { generateAIResponse } = require('../services/aiService');
const db = require('../db');

router.use(auth);

// ─── AI Broadcast Writer ──────────────────────────────────────────────────────
router.post('/write-broadcast', async (req, res) => {
  try {
    const { topic, tone, audience } = req.body;
    const settings = (await db.query(`SELECT key, value FROM settings`)).rows;
    const biz = settings.find(s => s.key === 'business_name')?.value || 'our business';
    const desc = settings.find(s => s.key === 'business_description')?.value || '';

    const systemPrompt = `You are a WhatsApp marketing copywriter for ${biz}. ${desc}
Write short, punchy WhatsApp broadcast messages. No markdown, no asterisks. Use emojis naturally.
Keep under 200 words. Write in a ${tone || 'friendly'} tone for ${audience || 'all clients'}.`;

    const result = await generateAIResponse({
      systemPrompt,
      conversationHistory: [],
      userMessage: `Write a WhatsApp broadcast message about: ${topic}`,
    });

    res.json({ message: result.response, provider: result.providerUsed });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── AI Quick Reply Suggestion ────────────────────────────────────────────────
router.post('/suggest-reply', async (req, res) => {
  try {
    const { clientId, lastMessage } = req.body;
    const settings = (await db.query(`SELECT key, value FROM settings`)).rows;
    const biz = settings.find(s => s.key === 'business_name')?.value || 'our business';
    const services = (await db.query(`SELECT name, price_pkr FROM services WHERE is_active=true`)).rows;
    const payDetails = {
      easypaisa: settings.find(s => s.key === 'easypaisa_number')?.value,
      jazzcash: settings.find(s => s.key === 'jazzcash_number')?.value,
    };

    const systemPrompt = `You are a helpful customer service agent for ${biz}.
Services: ${services.map(s => `${s.name} - PKR ${s.price_pkr}`).join(', ')}.
Payment: Easypaisa ${payDetails.easypaisa}, JazzCash ${payDetails.jazzcash}.
Write a short, helpful reply (max 3 sentences). No markdown. Use emojis sparingly.`;

    const history = [];
    if (clientId) {
      const msgs = (await db.query(
        `SELECT direction, content FROM messages WHERE client_id=$1 ORDER BY created_at DESC LIMIT 10`,
        [clientId]
      )).rows.reverse();
      msgs.forEach(m => history.push({ role: m.direction === 'inbound' ? 'user' : 'assistant', content: m.content }));
    }

    const result = await generateAIResponse({ systemPrompt, conversationHistory: history, userMessage: lastMessage });
    res.json({ reply: result.response, provider: result.providerUsed });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── AI Provider Health ────────────────────────────────────────────────────────
router.get('/health', async (req, res) => {
  try {
    const { getProviderHealth } = require('../services/aiService');
    res.json(getProviderHealth());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Upsell Message Generator ─────────────────────────────────────────────────
router.post('/upsell', async (req, res) => {
  try {
    const { clientId, serviceId } = req.body;
    const client = (await db.query(`SELECT * FROM clients WHERE id=$1`, [clientId])).rows[0];
    const service = (await db.query(`SELECT * FROM services WHERE id=$1`, [serviceId])).rows[0];
    const otherServices = (await db.query(`SELECT * FROM services WHERE is_active=true AND id!=$1 LIMIT 5`, [serviceId])).rows;

    const systemPrompt = `You are a sales assistant. Write a short, friendly WhatsApp upsell message (max 2 sentences + CTA).
After delivering a service, suggest a related next service. No markdown, no asterisks.`;

    const result = await generateAIResponse({
      systemPrompt,
      conversationHistory: [],
      userMessage: `Client just received: "${service?.name}". Suggest one of these related services: ${otherServices.map(s => `${s.name} (PKR ${s.price_pkr})`).join(', ')}. Client name: ${client?.name || 'valued client'}.`,
    });

    res.json({ message: result.response });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
