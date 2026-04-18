const { Redis } = require('ioredis');

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const connection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,  // required by BullMQ
  enableReadyCheck: false,
  lazyConnect: false,
});

connection.on('connect', () => console.log('[Redis] Connected'));
connection.on('error', (err) => console.error('[Redis] Connection error:', err.message));
connection.on('reconnecting', () => console.warn('[Redis] Reconnecting...'));

module.exports = connection;
