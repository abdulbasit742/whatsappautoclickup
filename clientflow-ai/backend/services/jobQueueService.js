const db = require('../db');
const { sendText } = require('./whatsappService');

let workerHandle = null;
let bullMqQueue = null;
let bullMqWorker = null;
let bullMqReady = false;

async function ensureBullMq() {
  if (bullMqReady) return true;
  if (!process.env.REDIS_URL) return false;
  try {
    const { Queue, Worker } = require('bullmq');
    const IORedis = require('ioredis');
    const connection = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null });
    bullMqQueue = new Queue('message-jobs', { connection });
    bullMqWorker = new Worker(
      'message-jobs',
      async (job) => {
        await processDbJobById(job.data.dbJobId);
      },
      { connection, concurrency: Number(process.env.MESSAGE_WORKER_CONCURRENCY || 5) }
    );
    bullMqReady = true;
    return true;
  } catch (err) {
    console.warn('[Queue] BullMQ unavailable, fallback poller enabled:', err.message);
    bullMqReady = false;
    return false;
  }
}

async function enqueueMessageJob({ type = 'direct', clientId = null, broadcastId = null, payload, runAfter = null }) {
  const r = await db.query(
    `INSERT INTO message_jobs (type, client_id, broadcast_id, payload, run_after)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING *`,
    [type, clientId, broadcastId, payload, runAfter || new Date()]
  );
  const dbJob = r.rows[0];

  const hasBull = await ensureBullMq();
  if (hasBull && bullMqQueue) {
    await bullMqQueue.add('send-message', { dbJobId: dbJob.id }, {
      attempts: dbJob.max_attempts || 3,
      backoff: { type: 'exponential', delay: 15000 },
      removeOnComplete: 1000,
      removeOnFail: 1000
    }).catch(() => {});
  }
  return dbJob;
}

async function processDbJobById(jobId) {
  const row = await db.query(`SELECT * FROM message_jobs WHERE id=$1`, [jobId]);
  const job = row.rows[0];
  if (!job) return false;
  if (job.status !== 'queued' || new Date(job.run_after) > new Date()) return false;

  await db.query(`UPDATE message_jobs SET status='processing', attempts=attempts+1, updated_at=NOW() WHERE id=$1`, [job.id]);

  try {
    const payload = job.payload || {};
    await sendText(payload.to, payload.message);

    await db.query(`UPDATE message_jobs SET status='done', updated_at=NOW() WHERE id=$1`, [job.id]);
    if (job.client_id) {
      await db.query(
        `INSERT INTO messages (client_id, direction, content) VALUES ($1,'outbound',$2)`,
        [job.client_id, payload.message]
      );
    }
    if (job.broadcast_id && job.client_id) {
      await db.query(
        `UPDATE broadcast_recipients
         SET delivered=true, failed=false, error_message=NULL
         WHERE broadcast_id=$1 AND client_id=$2`,
        [job.broadcast_id, job.client_id]
      );
      await maybeCompleteBroadcast(job.broadcast_id);
    }
  } catch (err) {
    const retryDelayMinutes = Math.min(Math.pow(2, job.attempts || 1), 30);
    await db.query(
      `UPDATE message_jobs
       SET status=CASE WHEN attempts >= max_attempts THEN 'failed' ELSE 'queued' END,
           run_after=CASE WHEN attempts >= max_attempts THEN run_after ELSE NOW() + ($2 || ' minutes')::interval END,
           last_error=$3,
           updated_at=NOW()
       WHERE id=$1`,
      [job.id, String(retryDelayMinutes), err.message]
    );
    if (job.broadcast_id && job.client_id) {
      await db.query(
        `UPDATE broadcast_recipients
         SET failed=true, error_message=$3
         WHERE broadcast_id=$1 AND client_id=$2`,
        [job.broadcast_id, job.client_id, err.message]
      );
      await maybeCompleteBroadcast(job.broadcast_id);
    }
  }
  return true;
}

async function processOneJob() {
  const lock = await db.query(
    `SELECT * FROM message_jobs
     WHERE status='queued' AND run_after <= NOW()
     ORDER BY created_at ASC
     LIMIT 1`
  );
  const job = lock.rows[0];
  if (!job) return false;
  return processDbJobById(job.id);
}

async function maybeCompleteBroadcast(broadcastId) {
  const check = await db.query(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE delivered=true)::int AS delivered_count,
       COUNT(*) FILTER (WHERE failed=true)::int AS failed_count
     FROM broadcast_recipients
     WHERE broadcast_id=$1`,
    [broadcastId]
  );
  const row = check.rows[0];
  if (row.total > 0 && row.delivered_count + row.failed_count >= row.total) {
    await db.query(
      `UPDATE broadcasts
       SET status='sent',
           sent_at=NOW(),
           total_delivered=$2
       WHERE id=$1`,
      [broadcastId, row.delivered_count]
    );
  }
}

async function startQueueWorker() {
  const hasBull = await ensureBullMq();
  if (hasBull) {
    console.log('[Queue] BullMQ worker started');
    return;
  }
  if (workerHandle) return;
  workerHandle = setInterval(() => {
    processOneJob().catch(() => {});
  }, 1000);
  console.log('[Queue] Polling worker started');
}

function stopQueueWorker() {
  if (bullMqWorker) {
    bullMqWorker.close().catch(() => {});
    bullMqWorker = null;
  }
  if (bullMqQueue) {
    bullMqQueue.close().catch(() => {});
    bullMqQueue = null;
  }
  if (!workerHandle) return;
  clearInterval(workerHandle);
  workerHandle = null;
}

module.exports = { enqueueMessageJob, startQueueWorker, stopQueueWorker };
