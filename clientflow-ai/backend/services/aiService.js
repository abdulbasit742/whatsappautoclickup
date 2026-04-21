const { generateAIResponse, getProviderHealth } = require('../ai/aiManager');
const { PROMPT_TEMPLATES } = require('../ai/promptTemplates');

async function generateMarketingMessage({ topic, tone = 'friendly', audience = 'all clients', businessName = 'our business', businessDescription = '', preferredProvider = null }) {
  const systemPrompt = `${PROMPT_TEMPLATES.message_generation({ businessName, tone, audience, topic })}
Business context: ${businessDescription}
Keep output under 120 words.`;
  return generateAIResponse({
    systemPrompt,
    history: [],
    userMessage: `Create a ${tone} marketing message for ${audience} about "${topic}".`,
    preferredProvider
  });
}

async function generateReplySuggestion({ businessName = 'our business', services = [], paymentHints = '', history = [], userMessage, preferredProvider = null }) {
  const systemPrompt = PROMPT_TEMPLATES.auto_reply({
    businessName,
    services: services.map(s => `${s.name} - PKR ${s.price_pkr}`).join(', ') || 'N/A',
    paymentHints: paymentHints || 'N/A'
  });
  return generateAIResponse({ systemPrompt, history, userMessage, preferredProvider });
}

async function summarizeConversation({ transcript, preferredProvider = null }) {
  return generateAIResponse({
    systemPrompt: PROMPT_TEMPLATES.summarization(),
    history: [],
    userMessage: transcript,
    preferredProvider
  });
}

async function classifyLeadIntent({ userMessage, preferredProvider = null }) {
  return generateAIResponse({
    systemPrompt: `${PROMPT_TEMPLATES.lead_scoring()}
Classify the message into one label only: interested, pricing, support, complaint, refund, not_interested, general.`,
    history: [],
    userMessage,
    preferredProvider
  });
}

async function translateMessage({ text, targetLanguage = 'en', preferredProvider = null }) {
  return generateAIResponse({
    systemPrompt: `${PROMPT_TEMPLATES.translation({ targetLanguage })} Output translation only.`,
    history: [],
    userMessage: text,
    preferredProvider
  });
}

module.exports = {
  generateAIResponse,
  getProviderHealth,
  generateMarketingMessage,
  generateReplySuggestion,
  summarizeConversation,
  classifyLeadIntent,
  translateMessage
};
