const db = require('../db');
const crypto = require('crypto');
const { AI_CONFIG } = require('./aiConfig');
const { generateWithGroq } = require('./providers/groq');
const { generateWithOpenAI } = require('./providers/openai');
const { generateWithClaude } = require('./providers/claude');
const { generateWithGemini } = require('./providers/gemini');

const providers = {
  groq: generateWithGroq,
  openai: generateWithOpenAI,
  claude: generateWithClaude,
  gemini: generateWithGemini
};

const providerHealth = Object.keys(providers).reduce((acc, key) => {
  acc[key] = { available: true, lastError: null, lastLatencyMs: null };
  return acc;
}, {});

const memoryCache = new Map();
const queue = [];
let running = 0;

function detectLanguage(text = '') {
  return /[\u0600-\u06FF]/.test(text) ? 'ur' : 'en';
}

function buildCacheKey(payload) {
  return crypto.createHash('sha1').update(JSON.stringify(payload)).digest('hex');
}

function getCached(key) {
  const item = memoryCache.get(key);
  if (!item) return null;
  if (item.expiresAt < Date.now()) {
    memoryCache.delete(key);
    return null;
  }
  return item.value;
}

function setCached(key, value) {
  memoryCache.set(key, { value, expiresAt: Date.now() + AI_CONFIG.cacheTtlMs });
}

function pushTask(task) {
  return new Promise((resolve, reject) => {
    queue.push({ task, resolve, reject });
    runQueue().catch(() => {});
  });
}

async function runQueue() {
  if (running >= AI_CONFIG.queueConcurrency) return;
  const next = queue.shift();
  if (!next) return;
  running += 1;
  try {
    const result = await executeTask(next.task);
    next.resolve(result);
  } catch (err) {
    next.reject(err);
  } finally {
    running -= 1;
    if (queue.length) runQueue().catch(() => {});
  }
}

function resolveOrder(preferredProvider) {
  if (preferredProvider && AI_CONFIG.providers[preferredProvider]?.enabled) {
    return [preferredProvider, ...AI_CONFIG.fallbackOrder.filter(p => p !== preferredProvider)];
  }
  return AI_CONFIG.fallbackOrder.slice();
}

async function executeTask({
  systemPrompt,
  history = [],
  conversationHistory = [],
  userMessage,
  preferredProvider = null,
  clientId = null,
  bypassCache = false
}) {
  history = history.length ? history : conversationHistory;
  const cachePayload = { systemPrompt, history, userMessage, preferredProvider };
  const cacheKey = buildCacheKey(cachePayload);
  if (!bypassCache) {
    const cached = getCached(cacheKey);
    if (cached) return { ...cached, cached: true };
  }

  const lang = detectLanguage(userMessage);
  const langInstruction = lang === 'ur'
    ? '\n\nIMPORTANT: Reply in Urdu and keep tone natural.'
    : '\n\nIMPORTANT: Reply in English.';
  const fullSystem = `${systemPrompt}${langInstruction}`;
  const order = resolveOrder(preferredProvider);

  for (const provider of order) {
    const cfg = AI_CONFIG.providers[provider];
    if (!cfg?.enabled || !providerHealth[provider].available) continue;

    const started = Date.now();
    try {
      const response = await providers[provider]({ systemPrompt: fullSystem, history, userMessage });
      const latency = Date.now() - started;
      providerHealth[provider].available = true;
      providerHealth[provider].lastError = null;
      providerHealth[provider].lastLatencyMs = latency;

      await db.query(
        `INSERT INTO ai_logs (client_id, provider, latency_ms, success) VALUES ($1,$2,$3,true)`,
        [clientId, provider, latency]
      ).catch(() => {});

      const output = { response, providerUsed: provider, success: true, cached: false };
      setCached(cacheKey, output);
      return output;
    } catch (err) {
      const latency = Date.now() - started;
      providerHealth[provider].lastError = err.message;
      providerHealth[provider].available = !(err?.response?.status === 429 || err?.response?.status === 503);
      await db.query(
        `INSERT INTO ai_logs (client_id, provider, latency_ms, success, error_message) VALUES ($1,$2,$3,false,$4)`,
        [clientId, provider, latency, err.message]
      ).catch(() => {});
    }
  }

  return { response: null, providerUsed: null, success: false, cached: false };
}

async function generateAIResponse(payload) {
  return pushTask(payload);
}

function getProviderHealth() {
  return providerHealth;
}

module.exports = { generateAIResponse, getProviderHealth, detectLanguage };
