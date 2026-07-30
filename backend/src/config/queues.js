const { Queue } = require('bullmq');

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

const queues = {
  campaigns: new Queue('campaigns', { connection }),
  followups: new Queue('followups', { connection }),
  reminders: new Queue('reminders', { connection }),
  ai: new Queue('ai-processing', { connection }),
  notifications: new Queue('notifications', { connection }),
  integrations: new Queue('integrations', { connection }),
  reports: new Queue('reports', { connection }),
};

module.exports = { queues };
