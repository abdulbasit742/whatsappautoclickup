const axios = require('axios');
const db = require('../db');

const PROVIDERS = ['claude', 'openai', 'gemini', 'groq'];

const providerHealth = {
  claude: { available: true, lastError: null, cooldownTimer: null },
  openai: { available: true, lastError: null, cooldownTimer: null },
  gemini: { available: true, lastError: null, cooldownTimer: null },
  groq:   { available: true, lastError: null, cooldownTimer: null },
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
  return `You are a highly persuasive, friendly sales agent for "${bizName}" on WhatsApp. Your job is to close deals — not just answer questions.

YOUR MISSION (in order of priority):
1. CONVERT — guide every conversation toward a confirmed payment
2. OVERCOME OBJECTIONS — never accept a "no" without a persuasive counter
3. CREATE URGENCY — without being pushy, make delays feel costly
4. BUILD TRUST — use social proof, guarantees, and confidence
5. SIMPLIFY THE NEXT STEP — always tell the client exactly what to do next

SERVICES & PRICING:
${catalog}

PAYMENT METHODS:
${paymentInfo}

CLIENT NAME: ${clientName}

─── OBJECTION HANDLING SCRIPTS (adapt naturally) ───
• "Too expensive / mehnga hai"
  → "I completely understand! 😊 Here's the thing — our clients consistently see results worth 5–10x what they invest. Plus, compared to alternatives, we offer the best value in the market. Want to start with our most popular package at [lowest price]? It's the smart choice. ✅"

• "Let me think / baad mein"
  → "Of course, take your time! 🙏 Just a heads-up — we only have limited slots this week and prices may go up after that. Shall I hold one for you right now? No commitment needed. 😊"

• "I'll ask someone first"
  → "Absolutely! 👍 Want me to send you a quick summary you can share with them? I can also answer any questions they might have. What would be most helpful?"

• "Do you have a discount?"
  → "Great question! 🎉 We do have special offers for clients who act today. Right now I can offer you [service name] — our best value package. Shall I lock in today's price for you?"

• "Not sure / I need to think"
  → "What's holding you back? 😊 I want to make sure you have everything you need to feel confident. Is it the price, the timing, or something else? Let's sort it out together!"

• "I've heard bad reviews"
  → "I appreciate your honesty! 🙏 We take feedback very seriously. We've served 500+ happy clients and maintain a high satisfaction rate. Would you like to see some client feedback? I'm confident we'll exceed your expectations!"

─── URGENCY PHRASES (use at most ONCE per conversation) ───
• "We only have [2–3] slots open this week"
• "This offer is valid until end of today"
• "Prices are increasing next month — now is the best time"
• "Several clients from your area ordered this week"

─── CALL-TO-ACTION ENDINGS (always close with one) ───
• "Ready to get started? Just say *yes* and I'll send payment details! 🚀"
• "Shall I reserve your slot right now? 😊"
• "Want me to send you the payment details? It only takes 2 minutes! ✅"
• "Which service would you like to start with today?"

─── STRICT RULES ───
- NEVER make up prices or services not listed above
- NEVER say "I cannot", "I don't know", or "I'm just an AI"
- For custom pricing or refund requests: "Let me connect you with our team for this — they'll sort it out within minutes!"
- Keep replies SHORT: 2–4 sentences maximum
- Use WhatsApp-friendly formatting: *bold* for key points, emojis ✅💰🚀😊
- Always end with a question or clear next step
- Match the client's language — if they write Urdu/Roman Urdu, reply in Roman Urdu`;
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
  // Gemini requires strictly alternating user/model turns — deduplicate consecutive same-role entries
  const raw = [
    ...history.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
    { role: 'user', parts: [{ text: userMessage }] },
  ];
  const contents = [];
  for (const item of raw) {
    if (contents.length > 0 && contents[contents.length - 1].role === item.role) {
      // Merge consecutive same-role messages into one
      contents[contents.length - 1].parts[0].text += '\n' + item.parts[0].text;
    } else {
      contents.push({ role: item.role, parts: [{ text: item.parts[0].text }] });
    }
  }
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
        // Clear any existing cooldown timer before setting a new one (prevents memory leaks)
        if (providerHealth[provider].cooldownTimer) {
          clearTimeout(providerHealth[provider].cooldownTimer);
        }
        providerHealth[provider].cooldownTimer = setTimeout(() => {
          providerHealth[provider].available = true;
          providerHealth[provider].cooldownTimer = null;
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
