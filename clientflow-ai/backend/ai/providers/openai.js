const axios = require('axios');
const { AI_CONFIG } = require('../aiConfig');

async function generateWithOpenAI({ systemPrompt, history, userMessage, maxTokens = 1024 }) {
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage }
  ];
  const res = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    { model: AI_CONFIG.providers.openai.model, messages, max_tokens: maxTokens },
    { headers: { Authorization: `Bearer ${AI_CONFIG.providers.openai.apiKey}` } }
  );
  return res.data?.choices?.[0]?.message?.content || '';
}

module.exports = { generateWithOpenAI };
