class OpenAIProvider {
  constructor(apiKey) {
    this.name = 'openai';
    this.enabled = false;
  }

  async complete(prompt, options = {}) {
    throw new Error('OpenAI provider is not enabled. Configure OPENAI_API_KEY to activate.');
  }
}

module.exports = OpenAIProvider;
