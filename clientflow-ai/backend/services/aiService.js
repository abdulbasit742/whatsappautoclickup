const axios = require('axios');
const db = require('../db');

const PROVIDERS = ['claude', 'openai', 'gemini', 'groq'];

const providerHealth = {
  claude: { available: true, lastError: null },
  openai: { available: true, lastError: null },
  gemini: { available: true, lastError: null },
  groq:   { available: true, lastError: null },
};

const FALLBACK_RESPONSES = [
  `I'm connecting you with our team for better assistance! Please wait a moment. 🙏`,
  `Let me get one of our specialists to help you right away! ✨`,
  `Our team will be with you shortly. Feel free to ask any questions in the meantime! 😊`,
];

function detectLanguage(text) {
  const urduPattern = /[\u0600-\u06FF]/;
  return urduPattern.test(text) ? 'ur' : 'en';
}

function getFallbackResponse() {
  return FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)];
}

function scoreConfidence(response) {
  if (!response) return 0;
  const text = response.trim();
  // Flag weak/generic responses
  if (text.length < 20) return 0.2;
  if (text.length < 50) return 0.5;

  const weakPhrases = [
    'i cannot', "i can't", 'i do not know', 'i don\'t know', 'not sure',
    'please contact', 'i am unable', 'as an ai', 'language model',
  ];
  const textLower = text.toLowerCase();
  if (weakPhrases.some(p => textLower.includes(p))) return 0.4;

  // Good response signals
  const goodSignals = ['pkr', 'price', 'payment', 'easypaisa', 'jazzcash', 'service', '😊', '✅', '🚀'];
  const goodCount = goodSignals.filter(s => textLower.includes(s)).length;
  return Math.min(0.6 + goodCount * 0.08, 1.0);
}

function buildSalesSystemPrompt(bizName, catalog, paymentInfo, clientName) {
  return `You are a professional, friendly sales and customer service AI for "${bizName}" on WhatsApp.

YOUR PRIMARY GOALS (in order):
1. SELL our services — always guide the conversation toward a purchase
2. ANSWER questions confidently and persuasively
3. HANDLE OBJECTIONS — turn "too expensive" or "let me think" into a yes
4. GUIDE toward PAYMENT — provide payment details proactively when appropriate
5. Build trust and rapport with the client

SERVICES AVAILABLE:
${catalog}

PAYMENT METHODS:
${paymentInfo}

CLIENT: ${clientName}

STRICT RULES:
- Never make up prices or services not listed above
- If asked about custom pricing or refunds, say "Let me connect you with our team for this!"
- Keep replies SHORT (2–4 sentences max)
- Use WhatsApp-friendly formatting: emojis ✅💰🚀, *bold* for emphasis
- Always end with a clear call-to-action (e.g., "Want to get started?" or "Shall I send payment details?")
- If client seems hesitant: highlight value, urgency, or social proof
- NEVER say "I cannot" or "I don't know" — always have a helpful response`;
}

async function callClaude(systemPrompt, history, userMessage) {
  const res = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      system: systemPrompt,
      messages: [...history, { role: 'user', content: userMessage }],
    },
    {
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      timeout: 15000,
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
    { model: 'gpt-4o', messages, max_tokens: 512 },
    { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, timeout: 15000 }
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
    { system_instruction: { parts: [{ text: systemPrompt }] }, contents },
    { timeout: 15000 }
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
    { model: 'llama-3.3-70b-versatile', messages, max_tokens: 512 },
    { headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` }, timeout: 15000 }
  );
  return res.data.choices[0].message.content;
}

const callers = { claude: callClaude, openai: callOpenAI, gemini: callGemini, groq: callGroq };

async function generateAIResponse({ systemPrompt, history, conversationHistory, userMessage, clientId = null }) {
  history = history || conversationHistory || [];
  const lang = detectLanguage(userMessage);
  const langInstruction = lang === 'ur'
    ? '\n\nIMPORTANT: The user is writing in Urdu/Roman Urdu. Reply in the same style (Roman Urdu or Urdu script to match their writing).'
    : '\n\nIMPORTANT: Reply in English.';

  const fullSystem = systemPrompt + langInstruction;
  const start = Date.now();

  for (const provider of PROVIDERS) {
    if (!providerHealth[provider].available) continue;
    try {
      const rawResponse = await callers[provider](fullSystem, history, userMessage);
      const latency = Date.now() - start;
      const confidence = scoreConfidence(rawResponse);

      await db.query(
        `INSERT INTO ai_logs (client_id, provider, latency_ms, success) VALUES ($1,$2,$3,true)`,
        [clientId, provider, latency]
      ).catch(() => {});

      providerHealth[provider].available = true;
      providerHealth[provider].lastError = null;

      const isWeak = confidence < 0.4;

      return {
        response: rawResponse,
        providerUsed: provider,
        success: true,
        confidence,
        isWeak,
      };
    } catch (err) {
      const isRateLimit = err?.response?.status === 429 || err?.response?.status === 503;
      providerHealth[provider].lastError = err.message;
      if (isRateLimit) {
        providerHealth[provider].available = false;
        setTimeout(() => {
          providerHealth[provider].available = true;
          console.log(`[AI] ${provider} re-enabled after cooldown`);
        }, 10 * 60 * 1000);
      }

      await db.query(
        `INSERT INTO ai_logs (client_id, provider, latency_ms, success, error_message) VALUES ($1,$2,$3,false,$4)`,
        [clientId, provider, Date.now() - start, err.message]
      ).catch(() => {});

      console.warn(`[AI] ${provider} failed (${err?.response?.status || err.message}), trying next...`);
    }
  }

  // All providers failed — return deterministic fallback
  const fallback = getFallbackResponse();
  return { response: fallback, providerUsed: 'fallback', success: false, confidence: 0, isWeak: true };
}

function getProviderHealth() {
  return providerHealth;
}

module.exports = { generateAIResponse, getProviderHealth, buildSalesSystemPrompt };
