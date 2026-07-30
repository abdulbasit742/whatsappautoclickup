const GroqProvider = require('./groq');
const OpenAIProvider = require('./openai');
const ClaudeProvider = require('./claude');
const GeminiProvider = require('./gemini');

class ProviderRegistry {
  constructor() {
    this.providers = {};
    this._initialize();
  }

  _initialize() {
    if (process.env.GROQ_API_KEY) {
      this.providers.groq = new GroqProvider(process.env.GROQ_API_KEY);
    }
    if (process.env.OPENAI_API_KEY) {
      this.providers.openai = new OpenAIProvider(process.env.OPENAI_API_KEY);
    }
    if (process.env.ANTHROPIC_API_KEY) {
      this.providers.claude = new ClaudeProvider(process.env.ANTHROPIC_API_KEY);
    }
    if (process.env.GEMINI_API_KEY) {
      this.providers.gemini = new GeminiProvider(process.env.GEMINI_API_KEY);
    }
  }

  reinitialize(name, apiKey) {
    const map = {
      groq: GroqProvider,
      openai: OpenAIProvider,
      claude: ClaudeProvider,
      gemini: GeminiProvider,
    };
    if (!map[name]) throw new Error(`Unknown provider: ${name}`);
    this.providers[name] = new map[name](apiKey);
  }

  getProvider(name) {
    const provider = this.providers[name];
    if (!provider) throw new Error(`Provider '${name}' is not configured`);
    if (!provider.enabled) throw new Error(`Provider '${name}' is not enabled`);
    return provider;
  }

  getActiveProvider() {
    const order = ['groq', 'openai', 'claude', 'gemini'];
    for (const name of order) {
      const p = this.providers[name];
      if (p && p.enabled) return p;
    }
    throw new Error('No active AI provider configured. Set GROQ_API_KEY or another provider key.');
  }

  listProviders() {
    const all = ['groq', 'openai', 'claude', 'gemini'];
    return all.map((name) => ({
      name,
      configured: !!this.providers[name],
      enabled: !!(this.providers[name] && this.providers[name].enabled),
    }));
  }
}

module.exports = new ProviderRegistry();
