const { Worker } = require('bullmq');
const { query } = require('../config/database');
const logger = require('../shared/utils/logger');

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

const worker = new Worker(
  'followups',
  async (job) => {
    const { followUpId, orgId } = job.data;
    logger.info(`[FollowUpWorker] Processing follow-up ${followUpId}`);

    const result = await query(
      `SELECT fu.*, c.name as contact_name, u.email as user_email
       FROM follow_ups fu
       LEFT JOIN contacts c ON c.id = fu.contact_id
       LEFT JOIN users u ON u.id = fu.assigned_user_id
       WHERE fu.id = $1 AND fu.org_id = $2 AND fu.status = 'pending'`,
      [followUpId, orgId]
    );

    if (!result.rows.length) {
      logger.info(`[FollowUpWorker] Follow-up ${followUpId} not found or already completed`);
      return;
    }

    const followUp = result.rows[0];

    const users = await query(
      'SELECT id FROM users WHERE org_id = $1 AND is_active = true',
      [orgId]
    );

    for (const user of users.rows) {
      if (user.id === followUp.assigned_user_id) {
        await query(
          `INSERT INTO notifications (org_id, user_id, type, title, message, metadata)
           VALUES ($1,$2,'follow_up_due',$3,$4,$5)`,
          [
            orgId, user.id,
            `Follow-up due: ${followUp.contact_name || 'Contact'}`,
            `Your ${followUp.type} follow-up is scheduled for now.`,
            JSON.stringify({ follow_up_id: followUpId, contact_id: followUp.contact_id }),
          ]
        );
      }
    }

    logger.info(`[FollowUpWorker] Follow-up ${followUpId} notifications sent`);
  },
  { connection }
);

worker.on('failed', (job, err) => {
  logger.error(`[FollowUpWorker] Job ${job?.id} failed:`, err.message);
});

module.exports = worker;
