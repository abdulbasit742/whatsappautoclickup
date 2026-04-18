const { Worker } = require('bullmq');
const connection = require('../../../config/redis');
const { messageQueue } = require('../queues');
const db = require('../../../db');

// ─── Broadcast Worker ────────────────────────────────────────────────────────
// Processes jobs from the "broadcasts" queue.
// Each job.data must contain: { broadcastId }
// The worker resolves the target clients and fans out individual message jobs.

const broadcastWorker = new Worker(
  'broadcasts',
  async (job) => {
    const { broadcastId } = job.data;
    if (!broadcastId) throw new Error('Missing broadcastId');

    const broadcast = (
      await db.query(`SELECT * FROM broadcasts WHERE id = $1`, [broadcastId])
    ).rows[0];

    if (!broadcast) throw new Error(`Broadcast ${broadcastId} not found`);

    // Build target client query
    let clientQ = `SELECT id, whatsapp_number, name FROM clients WHERE status != 'blocked'`;
    if (broadcast.target_audience === 'paid') {
      clientQ += ` AND status = 'paid'`;
    } else if (broadcast.target_audience === 'inactive') {
      clientQ += ` AND last_active_at < NOW() - INTERVAL '14 days'`;
    } else if (broadcast.target_audience === 'leads') {
      clientQ += ` AND status = 'lead'`;
    }

    const clients = (await db.query(clientQ)).rows;
    if (!clients.length) {
      await db.query(
        `UPDATE broadcasts SET status = 'sent', sent_at = NOW(), total_sent = 0 WHERE id = $1`,
        [broadcastId]
      );
      return { queued: 0 };
    }

    // Fan out: create one message job per recipient
    const bulkJobs = clients.map((c) => ({
      name: 'broadcast-message',
      data: {
        type: 'text',
        to: c.whatsapp_number,
        content: broadcast.message.replace(/\{\{client_name\}\}/g, c.name || 'there'),
        clientId: c.id,
        broadcastId,
      },
      opts: {
        attempts: 2,
        backoff: { type: 'fixed', delay: 10_000 },
      },
    }));

    await messageQueue.addBulk(bulkJobs);

    // Mark broadcast as sent with total queued count
    await db.query(
      `UPDATE broadcasts SET status = 'sent', sent_at = NOW(), total_sent = $1 WHERE id = $2`,
      [clients.length, broadcastId]
    );

    console.log(`[BroadcastWorker] Queued ${clients.length} messages for broadcast "${broadcast.title}"`);
    return { queued: clients.length };
  },
  { connection, concurrency: 3 }
);

broadcastWorker.on('completed', (job, result) => {
  console.log(`[BroadcastWorker] ✓ Job ${job.id} — ${result.queued} messages queued`);
});

broadcastWorker.on('failed', (job, err) => {
  console.error(`[BroadcastWorker] ✗ Job ${job?.id}: ${err.message}`);

  // Revert broadcast status to failed
  if (job?.data?.broadcastId) {
    db.query(
      `UPDATE broadcasts SET status = 'failed' WHERE id = $1`,
      [job.data.broadcastId]
    ).catch(() => {});
  }

  db.query(
    `INSERT INTO job_logs (queue_name, job_id, job_type, status, payload, error, attempts)
     VALUES ('broadcasts', $1, 'fan-out', 'failed', $2, $3, $4)`,
    [
      job?.id,
      JSON.stringify(job?.data ?? {}),
      err.message,
      job?.attemptsMade ?? 0,
    ]
  ).catch(() => {});
});

broadcastWorker.on('error', (err) => {
  console.error('[BroadcastWorker] Worker error:', err.message);
});

module.exports = broadcastWorker;
