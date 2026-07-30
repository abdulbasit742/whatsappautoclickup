const Redis = require('ioredis');

let redis;

function getRedis() {
  if (!redis) {
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      retryDelayOnFailover: 1000,
      maxRetriesPerRequest: null,
    });
    redis.on('error', (err) => console.error('[Redis] Error:', err.message));
    redis.on('connect', () => console.log('[Redis] Connected'));
  }
  return redis;
}

module.exports = { getRedis };
