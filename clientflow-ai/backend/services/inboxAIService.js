/**
 * AI Inbox Management Service
 */

const db     = require('../db');
const OpenAI = require('openai');

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const KEYWORD_RULES = {
  urgent: ['urgent', 'asap', 'emergency', 'immediately', 'help me', 'not working', 'problem', 'issue', 'broken', 'error', 'refund', 'cancel', 'complaint'],
  spam:   ['free', 'click here', 'you won', 'prize', 'lottery', 'discount 90%', 'limited offer', 'make money'],
};

function ruleBasedCategory(text) {
  const lower = text.toLowerCase();
  if (KEYWORD_RULES.spam.some(k => lower.includes(k))) return { category: 'spam', confidence: 0.9 };
  if (KEYWORD_RULES.urgent.some(k => lower.includes(k))) return { category: 'urgent', confidence: 0.85 };
  return { category: 'normal', confidence: 0.7 };
}

async function categorizeMessage(messageText) {
  const rule = ruleBasedCategory(messageText);

  if (openai && rule.confidence < 0.9) {
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{
          role:    'system',
          content: 'Classify the WhatsApp message as: urgent, normal, or spam. Respond with JSON: {"category":"urgent|normal|spam","confidence":0.0-1.0,"reason":"brief reason"}',
        }, {
          role:    'user',
          content: messageText,
        }],
        max_tokens:      80,
        response_format: { type: 'json_object' },
      });
      const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
      if (parsed.category && parsed.confidence) {
        return {
          category:       parsed.category,
          confidence:     parsed.confidence,
          reason:         parsed.reason,
          priority_score: parsed.category === 'urgent' ? 90 : parsed.category === 'spam' ? 5 : 50,
        };
      }
    } catch { /* fallback to rule-based */ }
  }

  return {
    category:       rule.category,
    confidence:     rule.confidence,
    priority_score: rule.category === 'urgent' ? 85 : rule.category === 'spam' ? 5 : 50,
  };
}

async function suggestReply(messageId) {
  const r = await db.query(
    `SELECT m.*, c.name, c.status, c.notes FROM messages m
     JOIN clients c ON c.id = m.client_id
     WHERE m.id = $1`,
    [messageId]
  );
  const msg = r.rows[0];
  if (!msg) throw new Error('Message not found');

  if (!openai) {
    return { reply: `Thank you for contacting us! We'll get back to you shortly.`, confidence: 0.5 };
  }

  const history = await db.query(
    `SELECT direction, content FROM messages WHERE client_id = $1 ORDER BY created_at DESC LIMIT 6`,
    [msg.client_id]
  );

  const messages = [
    { role: 'system', content: `You are a helpful WhatsApp business assistant. Client: ${msg.name || 'Customer'}, Status: ${msg.status}. Generate a concise, professional reply in under 50 words.` },
    ...history.rows.reverse().map(m => ({ role: m.direction === 'inbound' ? 'user' : 'assistant', content: m.content })),
  ];

  const completion = await openai.chat.completions.create({ model: 'gpt-3.5-turbo', messages, max_tokens: 80 });
  return {
    reply:      completion.choices[0]?.message?.content?.trim(),
    confidence: 0.85,
    messageId,
  };
}

async function prioritizeInbox(clientId) {
  const msgs = await db.query(
    `SELECT * FROM messages WHERE client_id = $1 AND direction = 'inbound' ORDER BY created_at DESC LIMIT 20`,
    [clientId]
  );

  const categorized = await Promise.allSettled(
    msgs.rows.map(async m => ({
      ...m,
      ...(await categorizeMessage(m.content || '')),
    }))
  );

  return categorized
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value)
    .sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));
}

module.exports = { categorizeMessage, suggestReply, prioritizeInbox };
