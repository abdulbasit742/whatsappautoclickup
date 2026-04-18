const { Worker } = require('bullmq');
const connection = require('../../../config/redis');
const { sendText, sendTemplate } = require('../../whatsapp/whatsappService');
const db = require('../../../db');

// ─── Message Worker ──────────────────────────────────────────────────────────
// Processes jobs from the "whatsapp-messages" queue.
// Each job.data must contain:
//   { type, to, content?, templateName?, langCode?, components?, clientId? }

const messageWorker = new Worker(
  'whatsapp-messages',
  async (job) => {
    const { type, to, content, templateName, langCode, components, clientId } = job.data;

    if (!to) throw new Error('Missing "to" field in job data');

    if (type === 'template') {
      if (!templateName) throw new Error('Missing "templateName" for template message');
      return await sendTemplate(to, templateName, langCode || 'en', components || []);
    }

    // Default: text message
    if (!content) throw new Error('Missing "content" for text message');
    const result = await sendText(to, content);

    // Mark the stored outbound message as delivered
    if (clientId) {
      await db.query(
        `UPDATE messages
         SET delivered = true
         WHERE client_id = $1
           AND direction = 'outbound'
           AND content = $2
           AND delivered = false
         LIMIT 1`,
        [clientId, content]
      ).catch(() => {});  // non-critical
    }

    return result;
  },
  {
    connection,
    concurrency: 5,
    // Rate-limit to 80 sends per minute to stay within WhatsApp Cloud API limits
    limiter: { max: 80, duration: 60_000 },
  }
);

messageWorker.on('completed', (job) => {
  console.log(`[MessageWorker] ✓ Job ${job.id} — sent to ${job.data.to}`);
});

messageWorker.on('failed', (job, err) => {
  const attempts = job?.attemptsMade ?? '?';
  console.error(`[MessageWorker] ✗ Job ${job?.id} (attempt ${attempts}): ${err.message}`);

  // Log to DB for observability
  db.query(
    `INSERT INTO job_logs (queue_name, job_id, job_type, status, payload, error, attempts)
     VALUES ('whatsapp-messages', $1, $2, 'failed', $3, $4, $5)`,
    [
      job?.id,
      job?.data?.type || 'text',
      JSON.stringify(job?.data ?? {}),
      err.message,
      job?.attemptsMade ?? 0,
    ]
  ).catch(() => {});
});

messageWorker.on('error', (err) => {
  console.error('[MessageWorker] Worker error:', err.message);
});

module.exports = messageWorker;
