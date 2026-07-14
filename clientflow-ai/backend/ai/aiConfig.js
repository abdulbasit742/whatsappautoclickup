const AI_CONFIG = {
  fallbackOrder: ['groq', 'openai', 'claude', 'gemini'],
  providers: {
    groq: {
      enabled: Boolean(process.env.GROQ_API_KEY),
      apiKey: process.env.GROQ_API_KEY || null,
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
    },
    openai: {
      enabled: Boolean(process.env.OPENAI_API_KEY),
      apiKey: process.env.OPENAI_API_KEY || null,
      model: process.env.OPENAI_MODEL || 'gpt-4o'
    },
    claude: {
      enabled: Boolean(process.env.ANTHROPIC_API_KEY),
      apiKey: process.env.ANTHROPIC_API_KEY || null,
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514'
    },
    gemini: {
      enabled: Boolean(process.env.GEMINI_API_KEY),
      apiKey: process.env.GEMINI_API_KEY || null,
      model: process.env.GEMINI_MODEL || 'gemini-1.5-flash'
    }
  },
  cacheTtlMs: 5 * 60 * 1000,
  queueConcurrency: 1
};

module.exports = { AI_CONFIG };
