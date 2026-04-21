const axios = require('axios');
const { AI_CONFIG } = require('../aiConfig');

async function generateWithGemini({ systemPrompt, history, userMessage }) {
  const contents = [
    ...history.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
    { role: 'user', parts: [{ text: userMessage }] }
  ];
  const res = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/${AI_CONFIG.providers.gemini.model}:generateContent?key=${AI_CONFIG.providers.gemini.apiKey}`,
    { system_instruction: { parts: [{ text: systemPrompt }] }, contents }
  );
  return res.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

module.exports = { generateWithGemini };
