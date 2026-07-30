const { Worker } = require('bullmq');
const { query } = require('../config/database');
const logger = require('../shared/utils/logger');
const registry = require('../modules/ai/providers/index');

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

const worker = new Worker(
  'ai-processing',
  async (job) => {
    const { orgId, userId, feature, prompt, options, resourceId, resourceType } = job.data;
    logger.info(`[AIWorker] Processing AI job: ${feature}`);

    let provider;
    try {
      provider = options?.provider ? registry.getProvider(options.provider) : registry.getActiveProvider();
    } catch (err) {
      logger.error('[AIWorker] No provider available:', err.message);
      throw err;
    }

    const start = Date.now();
    let result;
    try {
      result = await provider.complete(prompt, options || {});

      await query(
        `INSERT INTO ai_requests (org_id, user_id, provider, feature, prompt_tokens, response_tokens, latency_ms, success)
         VALUES ($1,$2,$3,$4,$5,$6,$7,true)`,
        [orgId, userId, provider.name, feature,
         result.promptTokens, result.responseTokens, result.latencyMs]
      );
    } catch (err) {
      await query(
        `INSERT INTO ai_requests (org_id, user_id, provider, feature, latency_ms, success, error_message)
         VALUES ($1,$2,$3,$4,$5,false,$6)`,
        [orgId, userId, provider.name, feature, Date.now() - start, err.message]
      );
      throw err;
    }

    logger.info(`[AIWorker] AI job ${feature} completed in ${result.latencyMs}ms`);
    return result;
  },
  { connection, concurrency: 5 }
);

worker.on('failed', (job, err) => {
  logger.error(`[AIWorker] Job ${job?.id} failed:`, err.message);
});

module.exports = worker;
