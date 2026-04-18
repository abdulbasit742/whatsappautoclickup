const { Queue } = require('bullmq');
const connection = require('../../config/redis');

// Shared default options: 3 attempts with exponential backoff
const defaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: { count: 100 },
  removeOnFail:    { count: 500 },
};

// ─── Queue Definitions ──────────────────────────────────────────────────────
// whatsapp-messages : individual outbound WhatsApp sends
// broadcasts        : fan-out a broadcast to all target clients
// follow-ups        : scheduled follow-up messages
// ai-tasks          : heavy AI inference tasks (optional off-thread usage)

const messageQueue   = new Queue('whatsapp-messages', { connection, defaultJobOptions });
const broadcastQueue = new Queue('broadcasts',        { connection, defaultJobOptions });
const followupQueue  = new Queue('follow-ups',        { connection, defaultJobOptions });
const aiTaskQueue    = new Queue('ai-tasks',          { connection, defaultJobOptions });

module.exports = { messageQueue, broadcastQueue, followupQueue, aiTaskQueue };
