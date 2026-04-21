const axios = require('axios');
const { AI_CONFIG } = require('../aiConfig');

async function generateWithClaude({ systemPrompt, history, userMessage, maxTokens = 1024 }) {
  const res = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model: AI_CONFIG.providers.claude.model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [...history, { role: 'user', content: userMessage }]
    },
    {
      headers: {
        'x-api-key': AI_CONFIG.providers.claude.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      }
    }
  );
  return res.data?.content?.[0]?.text || '';
}

module.exports = { generateWithClaude };
