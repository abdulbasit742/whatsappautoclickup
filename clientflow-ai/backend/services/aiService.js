const axios = require('axios');
const db = require('../db');
const { logger } = require('../middleware/logger');

const PROVIDERS = ['claude', 'openai', 'gemini', 'groq'];

const providerHealth = {
  claude: { available: true, lastError: null },
  openai: { available: true, lastError: null },
  gemini: { available: true, lastError: null },
  groq:   { available: true, lastError: null },
};

function detectLanguage(text) {
  const urduPattern = /[\u0600-\u06FF]/;
  return urduPattern.test(text) ? 'ur' : 'en';
}

async function callClaude(systemPrompt, history, userMessage) {
  const res = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [...history, { role: 'user', content: userMessage }],
    },
    {
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
    }
  );
  return res.data.content[0].text;
}

async function callOpenAI(systemPrompt, history, userMessage) {
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage },
  ];
  const res = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    { model: 'gpt-4o', messages, max_tokens: 1024 },
    { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` } }
  );
  return res.data.choices[0].message.content;
}

async function callGemini(systemPrompt, history, userMessage) {
  const contents = [
    ...history.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
    { role: 'user', parts: [{ text: userMessage }] },
  ];
  const res = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    { system_instruction: { parts: [{ text: systemPrompt }] }, contents }
  );
  return res.data.candidates[0].content.parts[0].text;
}

async function callGroq(systemPrompt, history, userMessage) {
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage },
  ];
  const res = await axios.post(
    'https://api.groq.com/openai/v1/chat/completions',
    { model: 'llama-3.3-70b-versatile', messages, max_tokens: 1024 },
    { headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` } }
  );
  return res.data.choices[0].message.content;
}

const callers = { claude: callClaude, openai: callOpenAI, gemini: callGemini, groq: callGroq };

async function generateAIResponse({ systemPrompt, history, conversationHistory, userMessage, clientId = null }) {
  history = history || conversationHistory || [];
  const lang = detectLanguage(userMessage);
  const langInstruction = lang === 'ur'
    ? '\n\nIMPORTANT: The user is writing in Urdu. Reply in Urdu (Roman or script, match their style).'
    : '\n\nIMPORTANT: Reply in English.';

  const fullSystem = systemPrompt + langInstruction;
  const start = Date.now();

  for (const provider of PROVIDERS) {
    if (!providerHealth[provider].available) continue;
    try {
      const response = await callers[provider](fullSystem, history, userMessage);
      const latency = Date.now() - start;

      await db.query(
        `INSERT INTO ai_logs (client_id, provider, latency_ms, success) VALUES ($1,$2,$3,true)`,
        [clientId, provider, latency]
      );

      providerHealth[provider].available = true;
      return { response, providerUsed: provider, success: true };
    } catch (err) {
      const isRateLimit = err?.response?.status === 429 || err?.response?.status === 503;
      providerHealth[provider].lastError = err.message;
      if (isRateLimit) providerHealth[provider].available = false;

      await db.query(
        `INSERT INTO ai_logs (client_id, provider, latency_ms, success, error_message) VALUES ($1,$2,$3,false,$4)`,
        [clientId, provider, Date.now() - start, err.message]
      ).catch(() => {});

      setTimeout(() => { providerHealth[provider].available = true; }, 10 * 60 * 1000);
      logger.warn(`[AI] ${provider} failed (${err?.response?.status || err.message}), trying next...`);
    }
  }

  return { response: null, providerUsed: null, success: false };
}

function getProviderHealth() {
  return providerHealth;
}

module.exports = { generateAIResponse, getProviderHealth };
