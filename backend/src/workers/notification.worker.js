const { Worker } = require('bullmq');
const { query } = require('../config/database');
const logger = require('../shared/utils/logger');
const emitter = require('../shared/events/eventEmitter');

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

const worker = new Worker(
  'notifications',
  async (job) => {
    const { orgId, userId, type, title, message, metadata } = job.data;
    logger.info(`[NotificationWorker] Sending notification to user ${userId}`);

    const result = await query(
      `INSERT INTO notifications (org_id, user_id, type, title, message, metadata)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [orgId, userId, type, title, message || null, JSON.stringify(metadata || {})]
    );

    const notification = result.rows[0];
    emitter.emit('notification:new', { orgId, userId, notification });

    logger.info(`[NotificationWorker] Notification ${notification.id} sent`);
    return notification;
  },
  { connection, concurrency: 10 }
);

worker.on('failed', (job, err) => {
  logger.error(`[NotificationWorker] Job ${job?.id} failed:`, err.message);
});

module.exports = worker;
