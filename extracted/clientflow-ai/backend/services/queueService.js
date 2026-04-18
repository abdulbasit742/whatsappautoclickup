// Message Queue Service using in-memory queue (BullMQ-compatible interface)
// Production: replace with BullMQ + Redis
// Install: npm install bullmq ioredis

let useRedis = false;
let Queue, Worker, QueueEvents;

try {
  ({ Queue, Worker, QueueEvents } = require('bullmq'));
  useRedis = true;
} catch {
  useRedis = false;
}

const { sendText } = require('./whatsappService');
const db = require('../db');

// In-memory fallback queue
const memoryQueue = [];
let processing = false;

async function processMemoryQueue() {
  if (processing || memoryQueue.length === 0) return;
  processing = true;
  while (memoryQueue.length > 0) {
    const job = memoryQueue.shift();
    try {
      await executeJob(job);
      if (job.delay) await new Promise(r => setTimeout(r, job.delay));
    } catch (err) {
      console.error('[Queue] Job failed:', err.message);
    }
  }
  processing = false;
}

async function executeJob(job) {
  const { type, data } = job;
  if (type === 'send_message') {
    const { number, message, clientId, campaignId } = data;
    await sendText(number, message);
    if (clientId) {
      await db.query(
        `INSERT INTO messages (client_id, direction, content) VALUES ($1,'outbound',$2)`,
        [clientId, message]
      ).catch(() => {});
    }
    if (campaignId) {
      await db.query(
        `UPDATE broadcasts SET total_sent = total_sent + 1 WHERE id=$1`,
        [campaignId]
      ).catch(() => {});
    }
  }
}

// BullMQ setup (if Redis available)
let messageQueue = null;

if (useRedis && process.env.REDIS_URL) {
  try {
    const connection = { url: process.env.REDIS_URL };
    messageQueue = new Queue('messages', { connection });

    new Worker('messages', async (job) => {
      await executeJob(job.data);
    }, { connection, concurrency: 5 });

    console.log('[Queue] BullMQ + Redis initialized');
  } catch (err) {
    console.warn('[Queue] Redis unavailable, using in-memory queue:', err.message);
    messageQueue = null;
  }
}

async function addToQueue(type, data, delay = 0) {
  if (messageQueue && useRedis) {
    await messageQueue.add(type, { type, data }, { delay });
  } else {
    // In-memory fallback with setTimeout for delay
    if (delay > 0) {
      setTimeout(() => {
        memoryQueue.push({ type, data });
        processMemoryQueue();
      }, delay);
    } else {
      memoryQueue.push({ type, data });
      processMemoryQueue();
    }
  }
}

async function enqueueCampaign(broadcastId, clients, message, delayBetweenMs = 2000) {
  let totalDelay = 0;
  for (const client of clients) {
    const msg = message.replace(/\{\{client_name\}\}/g, client.name || 'there');
    await addToQueue('send_message', {
      number: client.whatsapp_number,
      message: msg,
      clientId: client.id,
      campaignId: broadcastId,
    }, totalDelay);
    totalDelay += delayBetweenMs;
  }
  return clients.length;
}

module.exports = { addToQueue, enqueueCampaign };
