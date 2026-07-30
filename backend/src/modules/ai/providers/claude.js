class ClaudeProvider {
  constructor(apiKey) {
    this.name = 'claude';
    this.enabled = false;
  }

  async complete(prompt, options = {}) {
    throw new Error('Claude provider is not enabled. Configure ANTHROPIC_API_KEY to activate.');
  }
}

module.exports = ClaudeProvider;
