const { Worker } = require('bullmq');
const { query } = require('../config/database');
const logger = require('../shared/utils/logger');

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

const worker = new Worker(
  'campaigns',
  async (job) => {
    const { campaignId, orgId, runId, userId } = job.data;
    logger.info(`[CampaignWorker] Processing campaign ${campaignId}, run ${runId}`);

    const campaign = await query(
      `SELECT c.*, t.content as template_content
       FROM campaigns c LEFT JOIN campaign_templates t ON t.id = c.template_id
       WHERE c.id = $1 AND c.org_id = $2`,
      [campaignId, orgId]
    );

    if (!campaign.rows.length) {
      throw new Error(`Campaign ${campaignId} not found`);
    }

    const targets = await query(
      `SELECT ct.id, ct.contact_id, c.phone, c.name
       FROM campaign_targets ct
       JOIN contacts c ON c.id = ct.contact_id
       WHERE ct.campaign_id = $1 AND ct.status = 'pending'`,
      [campaignId]
    );

    let sent = 0;
    let failed = 0;

    for (const target of targets.rows) {
      try {
        // Simulate message delivery (real impl would call WhatsApp API)
        await new Promise((resolve) => setTimeout(resolve, 50));

        await query(
          `UPDATE campaign_targets SET status = 'sent', sent_at = NOW() WHERE id = $1`,
          [target.id]
        );
        sent++;

        await job.updateProgress(Math.floor(((sent + failed) / targets.rows.length) * 100));
      } catch (err) {
        await query(
          `UPDATE campaign_targets SET status = 'failed', error_message = $1 WHERE id = $2`,
          [err.message, target.id]
        );
        failed++;
      }
    }

    await query(
      `UPDATE campaign_runs SET sent = $1, failed = $2, status = 'completed', completed_at = NOW()
       WHERE id = $3`,
      [sent, failed, runId]
    );

    await query(
      `UPDATE campaigns SET status = 'completed', updated_at = NOW() WHERE id = $1`,
      [campaignId]
    );

    logger.info(`[CampaignWorker] Campaign ${campaignId} completed. Sent: ${sent}, Failed: ${failed}`);
    return { sent, failed };
  },
  {
    connection,
    concurrency: 2,
    limiter: { max: 10, duration: 1000 },
  }
);

worker.on('failed', (job, err) => {
  logger.error(`[CampaignWorker] Job ${job?.id} failed:`, err.message);
});

worker.on('error', (err) => {
  logger.error('[CampaignWorker] Worker error:', err.message);
});

module.exports = worker;
