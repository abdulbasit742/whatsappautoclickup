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

// ─── AI Metrics ──────────────────────────────────────────────────────────────
router.get('/metrics', async (req, res) => {
  try {
    const [total, today, failed, groqCalls, latency, costEst] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM ai_logs`),
      db.query(`SELECT COUNT(*) FROM ai_logs WHERE created_at > NOW() - INTERVAL '1 day'`),
      db.query(`SELECT COUNT(*) FROM ai_logs WHERE success=false`),
      db.query(`SELECT COUNT(*) FROM ai_logs WHERE provider='groq' AND success=true`),
      db.query(`SELECT COALESCE(AVG(latency_ms),0) as avg FROM ai_logs WHERE success=true AND created_at > NOW() - INTERVAL '7 days'`),
      db.query(`SELECT COALESCE(SUM(prompt_tokens + response_tokens),0) as tokens FROM ai_logs WHERE provider='groq' AND created_at > NOW() - INTERVAL '30 days'`),
    ]);

    const totalTokens = parseInt(costEst.rows[0].tokens);
    const estimatedCostUSD = (totalTokens / 1000) * 0.0001;

    res.json({
      total: parseInt(total.rows[0].count),
      today: parseInt(today.rows[0].count),
      failed: parseInt(failed.rows[0].count),
      groqCalls: parseInt(groqCalls.rows[0].count),
      avgLatencyMs: Math.round(parseFloat(latency.rows[0].avg)),
      estimatedCostUSD,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Chat Summarization ───────────────────────────────────────────────────────
router.post('/summarize', async (req, res) => {
  try {
    const { clientId } = req.body;
    if (!clientId) return res.status(400).json({ error: 'clientId required' });

    const msgs = (await db.query(
      `SELECT direction, content FROM messages WHERE client_id=$1 ORDER BY created_at DESC LIMIT 20`,
      [clientId]
    )).rows.reverse();

    if (msgs.length === 0) return res.json({ summary: 'No messages yet.' });

    const transcript = msgs.map(m => `${m.direction === 'inbound' ? 'Client' : 'Agent'}: ${m.content}`).join('\n');

    const { generateAIResponse } = require('../services/aiService');
    const result = await generateAIResponse({
      systemPrompt: 'You are a CRM assistant. Summarize the following conversation in 2-3 sentences. Include: client sentiment, main topic, and any pending action.',
      conversationHistory: [],
      userMessage: transcript,
      clientId,
    });

    res.json({ summary: result.response });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Lead Scoring ─────────────────────────────────────────────────────────────
router.post('/score-lead', async (req, res) => {
  try {
    const { clientId } = req.body;
    if (!clientId) return res.status(400).json({ error: 'clientId required' });

    const client = (await db.query(`SELECT * FROM clients WHERE id=$1`, [clientId])).rows[0];
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const msgCount = (await db.query(
      `SELECT COUNT(*) FROM messages WHERE client_id=$1`, [clientId]
    )).rows[0].count;
    const paymentCount = (await db.query(
      `SELECT COUNT(*) FROM payments WHERE client_id=$1 AND status='confirmed'`, [clientId]
    )).rows[0].count;

    // Simple heuristic scoring
    let score = 10;
    if (client.total_spent_pkr > 0) score += 40;
    if (client.total_spent_pkr > 5000) score += 15;
    if (parseInt(msgCount) > 5) score += 10;
    if (parseInt(paymentCount) > 0) score += 20;
    if (client.status === 'paid') score += 5;
    score = Math.min(score, 100);

    await db.query(`UPDATE clients SET lead_score=$1 WHERE id=$2`, [score, clientId]);
    res.json({ score, clientId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
