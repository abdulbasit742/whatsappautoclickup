/**
 * Customer Service AI — Sentiment, ticket routing, response generation
 */

const db     = require('../db');
const OpenAI = require('openai');

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const SENTIMENT_KEYWORDS = {
  positive: ['thank', 'great', 'excellent', 'love', 'happy', 'satisfied', 'perfect', 'awesome', '👍', '😊'],
  negative: ['bad', 'terrible', 'awful', 'angry', 'frustrated', 'disappointed', 'refund', 'cancel', 'worst', '😠', '😡'],
  urgent:   ['urgent', 'asap', 'emergency', 'immediately', 'not working', 'broken', 'error', 'fail'],
};

function ruleSentiment(text) {
  const lower = text.toLowerCase();
  let pos = 0, neg = 0;
  SENTIMENT_KEYWORDS.positive.forEach(k => { if (lower.includes(k)) pos++; });
  SENTIMENT_KEYWORDS.negative.forEach(k => { if (lower.includes(k)) neg++; });
  const urgent = SENTIMENT_KEYWORDS.urgent.some(k => lower.includes(k));

  if (neg > pos) return { sentiment: 'negative', score: Math.min(1, neg * 0.2), urgency: urgent ? 'high' : 'medium' };
  if (pos > neg) return { sentiment: 'positive', score: Math.min(1, pos * 0.2), urgency: 'low' };
  return { sentiment: 'neutral', score: 0.5, urgency: urgent ? 'high' : 'low' };
}

async function analyzeSentiment(text) {
  const rule = ruleSentiment(text);

  if (openai) {
    try {
      const completion = await openai.chat.completions.create({
        model:           'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'Analyze the sentiment of this customer message. Respond with JSON: {"sentiment":"positive|neutral|negative","score":0.0-1.0,"urgency":"low|medium|high","summary":"brief summary"}' },
          { role: 'user',   content: text },
        ],
        max_tokens:      80,
        response_format: { type: 'json_object' },
      });
      const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
      if (parsed.sentiment) return { ...rule, ...parsed };
    } catch { /* fallback */ }
  }

  return rule;
}

async function routeTicket(ticketId) {
  const r = await db.query(
    `SELECT t.*, c.status AS client_status FROM tickets t JOIN clients c ON c.id = t.client_id WHERE t.id = $1`,
    [ticketId]
  );
  const ticket = r.rows[0];
  if (!ticket) throw new Error('Ticket not found');

  // Routing rules
  let assignedTo = 'general_queue';
  if (ticket.urgency === 'high' || ticket.sentiment === 'negative') assignedTo = 'senior_agent';
  else if (ticket.category === 'billing' || ticket.category === 'payment') assignedTo = 'billing_team';
  else if (ticket.category === 'technical') assignedTo = 'technical_support';
  else if (ticket.client_status === 'paid' || ticket.client_status === 'active') assignedTo = 'priority_queue';

  await db.query(
    `UPDATE tickets SET assigned_to = $1, routed_at = NOW() WHERE id = $2`,
    [assignedTo, ticketId]
  );

  return { ticketId, assignedTo, routedAt: new Date().toISOString() };
}

async function generateResponse(ticketId) {
  const r = await db.query(
    `SELECT t.*, c.name FROM tickets t JOIN clients c ON c.id = t.client_id WHERE t.id = $1`,
    [ticketId]
  );
  const ticket = r.rows[0];
  if (!ticket) throw new Error('Ticket not found');

  if (!openai) {
    return { suggestion: `Dear ${ticket.name || 'Customer'}, thank you for reaching out. Our team will address your concern shortly.`, confidence: 0.5 };
  }

  const completion = await openai.chat.completions.create({
    model:    'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: 'You are a helpful customer service agent. Write a professional, empathetic reply in under 80 words.' },
      { role: 'user',   content: `Customer: ${ticket.name || 'Customer'}\nMessage: ${ticket.message}\nSentiment: ${ticket.sentiment || 'neutral'}` },
    ],
    max_tokens: 120,
  });

  return {
    suggestion:  completion.choices[0]?.message?.content?.trim(),
    confidence:  0.85,
    ticketId,
  };
}

module.exports = { analyzeSentiment, routeTicket, generateResponse };
