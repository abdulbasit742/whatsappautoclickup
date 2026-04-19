const { query } = require('../../config/database');
const registry = require('./providers/index');

async function logRequest(orgId, userId, provider, feature, result, error) {
  try {
    await query(
      `INSERT INTO ai_requests (org_id, user_id, provider, feature, prompt_tokens, response_tokens, latency_ms, success, error_message)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        orgId, userId, provider, feature,
        result?.promptTokens || 0, result?.responseTokens || 0,
        result?.latencyMs || 0, !error,
        error ? error.message : null,
      ]
    );

    const today = new Date().toISOString().split('T')[0];
    await query(
      `INSERT INTO ai_usage_daily (org_id, date, provider, request_count, token_count, success_count, failure_count)
       VALUES ($1,$2,$3,1,$4,$5,$6)
       ON CONFLICT (org_id, date, provider) DO UPDATE SET
         request_count = ai_usage_daily.request_count + 1,
         token_count = ai_usage_daily.token_count + EXCLUDED.token_count,
         success_count = ai_usage_daily.success_count + EXCLUDED.success_count,
         failure_count = ai_usage_daily.failure_count + EXCLUDED.failure_count`,
      [
        orgId, today, provider,
        (result?.promptTokens || 0) + (result?.responseTokens || 0),
        error ? 0 : 1, error ? 1 : 0,
      ]
    );
  } catch {
    // Non-critical logging failure
  }
}

async function runCompletion(orgId, userId, feature, prompt, options = {}) {
  const providerName = options.provider || 'groq';
  let provider;
  try {
    provider = registry.getProvider(providerName);
  } catch {
    provider = registry.getActiveProvider();
  }

  let result = null;
  let error = null;

  try {
    result = await provider.complete(prompt, options);
  } catch (err) {
    error = err;
    await logRequest(orgId, userId, provider.name, feature, null, err);
    throw err;
  }

  await logRequest(orgId, userId, provider.name, feature, result, null);
  return result;
}

async function generate(orgId, userId, { prompt, provider, maxTokens, temperature }) {
  if (!prompt) {
    const err = new Error('prompt is required');
    err.status = 400;
    throw err;
  }
  return await runCompletion(orgId, userId, 'generate', prompt, { provider, maxTokens, temperature });
}

async function replySuggestion(orgId, userId, { conversationId, context, message }) {
  const prompt = `You are a professional customer support agent. 
Context about this conversation:
${context || 'No context provided'}

Latest customer message: "${message || ''}"

Write a helpful, professional, and empathetic reply. Keep it concise (under 100 words) and action-oriented.`;

  return await runCompletion(orgId, userId, 'reply_suggestion', prompt, { maxTokens: 300 });
}

async function summarize(orgId, userId, { conversationId, messages }) {
  const convText = Array.isArray(messages)
    ? messages.map((m) => `${m.sender_type}: ${m.content}`).join('\n')
    : messages || '';

  const prompt = `Summarize the following customer conversation in 3 concise bullet points. Focus on: 1) Issue raised 2) Actions taken 3) Current status.

Conversation:
${convText}`;

  return await runCompletion(orgId, userId, 'summarize', prompt, { maxTokens: 300 });
}

async function leadScore(orgId, userId, leadData) {
  const prompt = `Analyze the following lead and return a JSON object with fields:
- score: number 0-100
- tier: "hot" | "warm" | "cold"
- reasoning: string (1-2 sentences)
- recommended_action: string

Lead information:
${JSON.stringify(leadData, null, 2)}

Return ONLY valid JSON, no markdown.`;

  const result = await runCompletion(orgId, userId, 'lead_score', prompt, { maxTokens: 500, temperature: 0.3 });

  try {
    const parsed = JSON.parse(result.text);
    return { ...result, parsed };
  } catch {
    return result;
  }
}

async function sentiment(orgId, userId, { text }) {
  if (!text) {
    const err = new Error('text is required');
    err.status = 400;
    throw err;
  }

  const prompt = `Analyze the sentiment of the following text and return a JSON object with:
- sentiment: "positive" | "negative" | "neutral"
- score: number -1 to 1
- emotions: array of detected emotions (e.g. ["frustrated","disappointed"])
- summary: one sentence summary

Text: "${text}"

Return ONLY valid JSON.`;

  const result = await runCompletion(orgId, userId, 'sentiment', prompt, { maxTokens: 300, temperature: 0.2 });

  try {
    const parsed = JSON.parse(result.text);
    return { ...result, parsed };
  } catch {
    return result;
  }
}

async function classifyIssue(orgId, userId, { title, description }) {
  const prompt = `Classify the following customer issue and return a JSON object with:
- category: string (e.g. "billing", "technical", "product", "delivery", "other")
- severity: "critical" | "high" | "medium" | "low"
- suggested_tags: string[]
- summary: one sentence

Issue Title: "${title || ''}"
Description: "${description || ''}"

Return ONLY valid JSON.`;

  const result = await runCompletion(orgId, userId, 'classify_issue', prompt, { maxTokens: 300, temperature: 0.2 });

  try {
    const parsed = JSON.parse(result.text);
    return { ...result, parsed };
  } catch {
    return result;
  }
}

function listProviders() {
  return registry.listProviders();
}

async function getUsage(orgId, queryParams) {
  const days = parseInt(queryParams.days) || 30;
  const result = await query(
    `SELECT date, provider, request_count, token_count, success_count, failure_count
     FROM ai_usage_daily
     WHERE org_id = $1 AND date >= CURRENT_DATE - INTERVAL '${days} days'
     ORDER BY date DESC, provider`,
    [orgId]
  );

  const totals = await query(
    `SELECT
       SUM(request_count) as total_requests,
       SUM(token_count) as total_tokens,
       SUM(success_count) as total_success,
       SUM(failure_count) as total_failures
     FROM ai_usage_daily WHERE org_id = $1 AND date >= CURRENT_DATE - INTERVAL '${days} days'`,
    [orgId]
  );

  return { daily: result.rows, totals: totals.rows[0] };
}

async function listPromptTemplates(orgId, queryParams) {
  const result = await query(
    `SELECT * FROM ai_prompt_templates WHERE (org_id = $1 OR org_id IS NULL) AND is_enabled = true ORDER BY category, name`,
    [orgId]
  );
  return result.rows;
}

async function createPromptTemplate(orgId, data) {
  if (!data.name || !data.prompt_text) {
    const err = new Error('name and prompt_text are required');
    err.status = 400;
    throw err;
  }
  const result = await query(
    `INSERT INTO ai_prompt_templates (org_id, category, name, prompt_text, variables)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [orgId, data.category || 'general', data.name, data.prompt_text, JSON.stringify(data.variables || [])]
  );
  return result.rows[0];
}

async function updatePromptTemplate(orgId, templateId, updates) {
  const allowed = ['name','category','prompt_text','variables','is_enabled'];
  const fields = [];
  const params = [];
  let idx = 1;

  for (const key of allowed) {
    if (updates[key] !== undefined) {
      fields.push(`${key} = $${idx}`);
      params.push(key === 'variables' ? JSON.stringify(updates[key]) : updates[key]);
      idx++;
    }
  }

  if (!fields.length) {
    const err = new Error('No valid fields to update');
    err.status = 400;
    throw err;
  }

  fields.push('updated_at = NOW()');
  params.push(templateId, orgId);

  const result = await query(
    `UPDATE ai_prompt_templates SET ${fields.join(', ')} WHERE id = $${idx} AND org_id = $${idx + 1} RETURNING *`,
    params
  );
  if (!result.rows.length) {
    const err = new Error('Prompt template not found');
    err.status = 404;
    throw err;
  }
  return result.rows[0];
}

async function testPrompt(orgId, userId, { prompt, provider, variables }) {
  if (!prompt) {
    const err = new Error('prompt is required');
    err.status = 400;
    throw err;
  }

  let resolvedPrompt = prompt;
  if (variables) {
    for (const [key, value] of Object.entries(variables)) {
      resolvedPrompt = resolvedPrompt.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
  }

  return await runCompletion(orgId, userId, 'test_prompt', resolvedPrompt, { provider });
}

module.exports = {
  generate, replySuggestion, summarize, leadScore, sentiment,
  classifyIssue, listProviders, getUsage, listPromptTemplates,
  createPromptTemplate, updatePromptTemplate, testPrompt,
};
