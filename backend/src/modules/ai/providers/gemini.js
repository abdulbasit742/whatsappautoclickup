class GeminiProvider {
  constructor(apiKey) {
    this.name = 'gemini';
    this.enabled = false;
  }

  async complete(prompt, options = {}) {
    throw new Error('Gemini provider is not enabled. Configure GEMINI_API_KEY to activate.');
  }
}

module.exports = GeminiProvider;
