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

// ─── AI Chat Summary ──────────────────────────────────────────────────────────
router.post('/chat-summary', async (req, res) => {
  try {
    const { clientId } = req.body;
    const client = (await db.query(`SELECT * FROM clients WHERE id=$1`, [clientId])).rows[0];
    const msgs = (await db.query(
      `SELECT direction, content, created_at FROM messages WHERE client_id=$1 ORDER BY created_at ASC LIMIT 50`,
      [clientId]
    )).rows;

    if (!msgs.length) return res.json({ summary: 'No messages found for this client.' });

    const convo = msgs.map(m => `${m.direction === 'inbound' ? 'Client' : 'Agent'}: ${m.content}`).join('\n');

    const result = await generateAIResponse({
      systemPrompt: `You are a CRM assistant. Summarize the following WhatsApp conversation in 3-5 bullet points. 
Highlight: main topic, client intent, issues raised, action items, overall sentiment. Be concise.`,
      conversationHistory: [],
      userMessage: `Client: ${client?.name || 'Unknown'}\n\nConversation:\n${convo}`,
    });

    // Save as note
    await db.query(
      `INSERT INTO notes (client_id, content, type) VALUES ($1,$2,'ai_summary')`,
      [clientId, result.response]
    ).catch(() => {});

    res.json({ summary: result.response, provider: result.providerUsed });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── AI Issue Detection ───────────────────────────────────────────────────────
router.post('/detect-issues', async (req, res) => {
  try {
    const { clientId } = req.body;
    const msgs = (await db.query(
      `SELECT direction, content FROM messages WHERE client_id=$1 ORDER BY created_at DESC LIMIT 20`,
      [clientId]
    )).rows.reverse();

    const convo = msgs.map(m => `${m.direction === 'inbound' ? 'Client' : 'Agent'}: ${m.content}`).join('\n');

    const result = await generateAIResponse({
      systemPrompt: `You are a customer service quality analyst. Analyze this conversation and detect:
1. Any complaints or issues raised
2. Unanswered questions
3. Frustration or negative sentiment
4. Urgency indicators
Return a JSON object: { issues: string[], urgency: "low"|"medium"|"high", sentiment: "positive"|"neutral"|"negative", action_required: boolean }
Return ONLY valid JSON, no extra text.`,
      conversationHistory: [],
      userMessage: convo || 'No messages yet.',
    });

    let parsed;
    try {
      parsed = JSON.parse(result.response);
    } catch {
      parsed = { issues: [], urgency: 'low', sentiment: 'neutral', action_required: false, raw: result.response };
    }

    if (parsed.urgency === 'high' || parsed.action_required) {
      await db.query(
        `INSERT INTO alerts (type, client_id, message) VALUES ('unresolved_query',$1,$2)`,
        [clientId, `AI detected issue: ${parsed.issues?.join(', ')}`]
      ).catch(() => {});
    }

    res.json({ ...parsed, provider: result.providerUsed });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── AI Lead Scoring ──────────────────────────────────────────────────────────
router.post('/score-lead', async (req, res) => {
  try {
    const { clientId, leadId } = req.body;
    const client = (await db.query(`SELECT * FROM clients WHERE id=$1`, [clientId])).rows[0];
    const msgs = (await db.query(
      `SELECT direction, content FROM messages WHERE client_id=$1 ORDER BY created_at DESC LIMIT 20`,
      [clientId]
    )).rows;
    const payments = (await db.query(`SELECT COUNT(*), SUM(amount_pkr) FROM payments WHERE client_id=$1 AND status='confirmed'`, [clientId])).rows[0];

    const context = `
Client: ${client?.name || 'Unknown'}
Status: ${client?.status}
Total Spent: PKR ${payments.sum || 0}
Payment Count: ${payments.count}
Last 20 messages: ${msgs.map(m => `${m.direction}: ${m.content?.substring(0, 50)}`).join(' | ')}`;

    const result = await generateAIResponse({
      systemPrompt: `You are a sales analyst. Score this lead from 0-100 based on engagement, payment history, and conversation quality.
Return JSON: { score: number, reason: string, next_action: string }
Return ONLY valid JSON.`,
      conversationHistory: [],
      userMessage: context,
    });

    let parsed;
    try {
      parsed = JSON.parse(result.response);
    } catch {
      parsed = { score: 50, reason: result.response, next_action: 'Follow up' };
    }

    if (leadId && parsed.score) {
      await db.query(`UPDATE leads SET lead_score=$1 WHERE id=$2`, [parsed.score, leadId]).catch(() => {});
    }

    res.json({ ...parsed, provider: result.providerUsed });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── AI Follow-up Suggestion ──────────────────────────────────────────────────
router.post('/suggest-followup', async (req, res) => {
  try {
    const { clientId } = req.body;
    const client = (await db.query(`SELECT * FROM clients WHERE id=$1`, [clientId])).rows[0];
    const lastMsg = (await db.query(
      `SELECT direction, content, created_at FROM messages WHERE client_id=$1 ORDER BY created_at DESC LIMIT 5`,
      [clientId]
    )).rows;
    const payments = (await db.query(`SELECT status, amount_pkr FROM payments WHERE client_id=$1 ORDER BY created_at DESC LIMIT 3`, [clientId])).rows;

    const context = `
Client: ${client?.name || 'Unknown'}, Status: ${client?.status}
Days since last contact: ${lastMsg[0] ? Math.floor((Date.now() - new Date(lastMsg[0].created_at)) / 86400000) : 'unknown'}
Last message: ${lastMsg[0]?.content?.substring(0, 100) || 'none'}
Payment history: ${payments.map(p => `${p.status} PKR${p.amount_pkr}`).join(', ') || 'none'}`;

    const result = await generateAIResponse({
      systemPrompt: `You are a CRM follow-up specialist. Suggest the best follow-up action for this client.
Return JSON: { type: "call"|"whatsapp"|"email", timing: string, message: string, reason: string }
Return ONLY valid JSON.`,
      conversationHistory: [],
      userMessage: context,
    });

    let parsed;
    try {
      parsed = JSON.parse(result.response);
    } catch {
      parsed = { type: 'whatsapp', timing: 'Today', message: result.response, reason: 'AI recommendation' };
    }

    res.json({ ...parsed, provider: result.providerUsed });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── AI Recommendation Engine ─────────────────────────────────────────────────
router.get('/recommendations', async (req, res) => {
  try {
    const [clients, payments, followups, alerts] = await Promise.all([
      db.query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status='lead') as leads FROM clients`),
      db.query(`SELECT COUNT(*) as pending FROM payments WHERE status='pending'`),
      db.query(`SELECT COUNT(*) as due FROM follow_ups WHERE status='pending' AND scheduled_at <= NOW()`),
      db.query(`SELECT COUNT(*) as unresolved FROM alerts WHERE is_resolved=false`),
    ]);

    const result = await generateAIResponse({
      systemPrompt: `You are a business advisor for a WhatsApp-based CRM. Based on these metrics, give 3-5 actionable recommendations.
Return JSON array: [{ priority: "high"|"medium"|"low", title: string, action: string, reason: string }]
Return ONLY valid JSON array.`,
      conversationHistory: [],
      userMessage: `Metrics:
- Total clients: ${clients.rows[0].total}, Leads: ${clients.rows[0].leads}
- Pending payments: ${payments.rows[0].pending}
- Overdue follow-ups: ${followups.rows[0].due}
- Unresolved alerts: ${alerts.rows[0].unresolved}`,
    });

    let parsed;
    try {
      parsed = JSON.parse(result.response);
    } catch {
      parsed = [{ priority: 'medium', title: 'Review business metrics', action: 'Check dashboard', reason: result.response }];
    }

    res.json({ recommendations: parsed, provider: result.providerUsed });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── AI Logs ──────────────────────────────────────────────────────────────────
router.get('/logs', async (req, res) => {
  try {
    const { limit = 50, provider } = req.query;
    let q = `SELECT al.*, c.name AS client_name FROM ai_logs al LEFT JOIN clients c ON c.id = al.client_id WHERE 1=1`;
    const params = [];
    if (provider) { params.push(provider); q += ` AND al.provider=$${params.length}`; }
    q += ` ORDER BY al.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);
    const r = await db.query(q, params);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── AI Usage Stats ───────────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const r = await db.query(`
      SELECT provider,
             COUNT(*) as total_calls,
             COUNT(*) FILTER (WHERE success=true) as success_count,
             COUNT(*) FILTER (WHERE success=false) as error_count,
             AVG(latency_ms) as avg_latency_ms,
             SUM(prompt_tokens) as total_prompt_tokens,
             SUM(response_tokens) as total_response_tokens,
             MAX(created_at) as last_used
      FROM ai_logs
      GROUP BY provider
    `);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
