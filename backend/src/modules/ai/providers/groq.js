const Groq = require('groq-sdk');

class GroqProvider {
  constructor(apiKey) {
    this.client = new Groq({ apiKey });
    this.name = 'groq';
    this.model = 'llama3-8b-8192';
    this.enabled = true;
  }

  async complete(prompt, options = {}) {
    const start = Date.now();
    const completion = await this.client.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: options.model || this.model,
      max_tokens: options.maxTokens || 1024,
      temperature: options.temperature || 0.7,
    });
    return {
      text: completion.choices[0].message.content,
      promptTokens: completion.usage.prompt_tokens,
      responseTokens: completion.usage.completion_tokens,
      latencyMs: Date.now() - start,
    };
  }
}

module.exports = GroqProvider;
