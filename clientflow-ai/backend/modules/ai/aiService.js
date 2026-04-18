const axios = require('axios');
const db = require('../../../db');
const { getKey, markRateLimited } = require('../../apikeys/apiKeyManager');

// ─── Provider call implementations ──────────────────────────────────────────

async function callGroq(systemPrompt, history, userMessage) {
  const apiKey = await getKey('groq');
  if (!apiKey) throw Object.assign(new Error('No Groq API key configured'), { noKey: true });

  try {
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMessage },
    ];
    const res = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      { model: 'llama-3.3-70b-versatile', messages, max_tokens: 1024 },
      { headers: { Authorization: `Bearer ${apiKey.keyValue}` } }
    );
    return res.data.choices[0].message.content;
  } catch (err) {
    if (err?.response?.status === 429) {
      await markRateLimited(apiKey.keyId, 10 * 60 * 1000);
    }
    throw err;
  }
}

// ─── Placeholder providers (activate by adding API keys to the api_keys table)

async function callOpenAI(systemPrompt, history, userMessage) {
  const apiKey = await getKey('openai');
  if (!apiKey) throw Object.assign(new Error('No OpenAI API key configured'), { noKey: true });

  try {
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMessage },
    ];
    const res = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      { model: 'gpt-4o', messages, max_tokens: 1024 },
      { headers: { Authorization: `Bearer ${apiKey.keyValue}` } }
    );
    return res.data.choices[0].message.content;
  } catch (err) {
    if (err?.response?.status === 429) {
      await markRateLimited(apiKey.keyId, 10 * 60 * 1000);
    }
    throw err;
  }
}

async function callClaude(systemPrompt, history, userMessage) {
  const apiKey = await getKey('claude');
  if (!apiKey) throw Object.assign(new Error('No Claude API key configured'), { noKey: true });

  try {
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
          'x-api-key': apiKey.keyValue,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
      }
    );
    return res.data.content[0].text;
  } catch (err) {
    if (err?.response?.status === 429) {
      await markRateLimited(apiKey.keyId, 10 * 60 * 1000);
    }
    throw err;
  }
}

async function callGemini(systemPrompt, history, userMessage) {
  const apiKey = await getKey('gemini');
  if (!apiKey) throw Object.assign(new Error('No Gemini API key configured'), { noKey: true });

  try {
    const contents = [
      ...history.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      { role: 'user', parts: [{ text: userMessage }] },
    ];
    const res = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey.keyValue}`,
      { system_instruction: { parts: [{ text: systemPrompt }] }, contents }
    );
    return res.data.candidates[0].content.parts[0].text;
  } catch (err) {
    if (err?.response?.status === 429) {
      await markRateLimited(apiKey.keyId, 10 * 60 * 1000);
    }
    throw err;
  }
}

// ─── Provider priority: Groq (active) → OpenAI → Claude → Gemini ────────────
// Providers with no configured key are automatically skipped.
const PROVIDERS = [
  { name: 'groq',   call: callGroq   },
  { name: 'openai', call: callOpenAI },
  { name: 'claude', call: callClaude },
  { name: 'gemini', call: callGemini },
];

// ─── Language detection ───────────────────────────────────────────────────────
function detectLanguage(text) {
  return /[\u0600-\u06FF]/.test(text) ? 'ur' : 'en';
}

// ─── Core: generate AI response with provider fallback chain ─────────────────
async function generateAIResponse({ systemPrompt, history, conversationHistory, userMessage, clientId = null }) {
  history = history || conversationHistory || [];

  const lang = detectLanguage(userMessage);
  const langHint =
    lang === 'ur'
      ? '\n\nIMPORTANT: The user is writing in Urdu. Reply in Urdu (Roman or script, match their style).'
      : '\n\nIMPORTANT: Reply in English.';

  const fullSystem = systemPrompt + langHint;
  const start = Date.now();

  for (const provider of PROVIDERS) {
    try {
      const response = await provider.call(fullSystem, history, userMessage);
      const latency = Date.now() - start;

      await db.query(
        `INSERT INTO ai_logs (client_id, provider, latency_ms, success) VALUES ($1, $2, $3, true)`,
        [clientId, provider.name, latency]
      ).catch(() => {});

      return { response, providerUsed: provider.name, success: true };
    } catch (err) {
      const isNoKey = err?.noKey === true;

      await db.query(
        `INSERT INTO ai_logs (client_id, provider, latency_ms, success, error_message)
         VALUES ($1, $2, $3, false, $4)`,
        [clientId, provider.name, Date.now() - start, err.message]
      ).catch(() => {});

      if (isNoKey) {
        // Skip silently — key not configured
        continue;
      }

      console.warn(`[AI] ${provider.name} failed (${err.message}), trying next provider...`);
    }
  }

  return { response: null, providerUsed: null, success: false };
}

module.exports = { generateAIResponse };
