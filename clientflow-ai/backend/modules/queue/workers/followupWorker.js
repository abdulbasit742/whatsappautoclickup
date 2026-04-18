const { Worker } = require('bullmq');
const connection = require('../../../config/redis');
const { messageQueue } = require('../queues');
const db = require('../../../db');

// ─── Follow-up Worker ────────────────────────────────────────────────────────
// Processes jobs from the "follow-ups" queue.
// Each job.data must contain:
//   { followUpId, clientId, type, whatsappNumber, name }

const followupWorker = new Worker(
  'follow-ups',
  async (job) => {
    const { followUpId, clientId, type, whatsappNumber, name } = job.data;
    const clientName = name || 'there';
    let message = '';

    switch (type) {
      case 'cold_lead':
        message = `Hello ${clientName}! 👋 Just checking in — we noticed you were interested in our services. We're still here to help! Any questions? 😊`;
        break;

      case 'pending_payment':
        message = `Hi ${clientName}! 😊 We noticed your payment is still pending. No worries — just send whenever you're ready. Let us know if you need any help! 💙`;
        break;

      case 'post_delivery':
        message = `Hi ${clientName}! 🌟 We hope you're loving your service. Could you please rate us from 1–5 and share any feedback? It really helps us improve! ⭐`;
        break;

      case 're_engagement':
        message = `Assalam u Alaikum ${clientName}! 👋 It's been a while — we miss you! We have some exciting new services and offers you might love. Reply to see what's new! 🎉`;
        break;

      case 'upsell': {
        // Lazy-load AI service inside the case to avoid circular imports at startup
        const { generateAIResponse } = require('../../ai/aiService');
        const services = (
          await db.query(`SELECT name, price_pkr FROM services WHERE is_active = true LIMIT 5`)
        ).rows;
        const bizName =
          (await db.query(`SELECT value FROM settings WHERE key = 'business_name'`)).rows[0]
            ?.value || 'our business';

        const result = await generateAIResponse({
          systemPrompt: `You are a sales assistant for ${bizName}. Write a short, friendly WhatsApp upsell message (max 2 sentences). No markdown.`,
          history: [],
          userMessage: `Client ${clientName} just completed a service. Suggest one of: ${services
            .map((s) => `${s.name} (PKR ${s.price_pkr})`)
            .join(', ')}`,
        });
        message =
          result.response ||
          `Hi ${clientName}! 🚀 Loved working with you! We have more amazing services you might love. Reply to see what's available! 😊`;
        break;
      }

      default:
        throw new Error(`Unknown follow-up type: ${type}`);
    }

    // Enqueue the actual WhatsApp send
    await messageQueue.add('send-followup', {
      type: 'text',
      to: whatsappNumber,
      content: message,
      clientId,
    });

    // Mark follow-up as sent
    await db.query(
      `UPDATE follow_ups SET status = 'sent', sent_at = NOW() WHERE id = $1`,
      [followUpId]
    );

    return { sent: true, type };
  },
  { connection, concurrency: 3 }
);

followupWorker.on('completed', (job, result) => {
  console.log(`[FollowupWorker] ✓ Job ${job.id} — type: ${result.type}`);
});

followupWorker.on('failed', (job, err) => {
  console.error(`[FollowupWorker] ✗ Job ${job?.id}: ${err.message}`);

  if (job?.data?.followUpId) {
    db.query(
      `UPDATE follow_ups SET status = 'failed' WHERE id = $1`,
      [job.data.followUpId]
    ).catch(() => {});
  }

  db.query(
    `INSERT INTO job_logs (queue_name, job_id, job_type, status, payload, error, attempts)
     VALUES ('follow-ups', $1, $2, 'failed', $3, $4, $5)`,
    [
      job?.id,
      job?.data?.type || 'unknown',
      JSON.stringify(job?.data ?? {}),
      err.message,
      job?.attemptsMade ?? 0,
    ]
  ).catch(() => {});
});

followupWorker.on('error', (err) => {
  console.error('[FollowupWorker] Worker error:', err.message);
});

module.exports = followupWorker;
