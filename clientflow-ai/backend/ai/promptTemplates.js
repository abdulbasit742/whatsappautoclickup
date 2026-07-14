const PROMPT_TEMPLATES = {
  message_generation: ({ businessName, tone, audience, topic }) =>
    `You are a marketing assistant for ${businessName}.
Tone: ${tone || 'friendly'}
Audience: ${audience || 'all clients'}
Task: Write a concise WhatsApp campaign message about "${topic}" with clear CTA.`,

  auto_reply: ({ businessName, services, paymentHints }) =>
    `You are a customer support assistant for ${businessName}.
Available services: ${services}
Payment details: ${paymentHints}
Reply in maximum 3 short sentences and include the next best action.`,

  lead_scoring: () =>
    'Classify lead intent as hot, warm, or cold with one-line reason.',

  summarization: () =>
    'Summarize this conversation into: issue, intent, outcome, next-step.',

  translation: ({ targetLanguage }) =>
    `Translate content to ${targetLanguage}. Keep meaning and tone.`
};

module.exports = { PROMPT_TEMPLATES };
