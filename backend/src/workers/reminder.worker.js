const { Worker } = require('bullmq');
const { query } = require('../config/database');
const logger = require('../shared/utils/logger');

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

const worker = new Worker(
  'reminders',
  async (job) => {
    const { reminderId, orgId } = job.data;
    logger.info(`[ReminderWorker] Processing reminder ${reminderId}`);

    const result = await query(
      `SELECT r.*, c.name as contact_name
       FROM reminders r
       LEFT JOIN contacts c ON c.id = r.contact_id
       WHERE r.id = $1 AND r.org_id = $2 AND r.is_completed = false`,
      [reminderId, orgId]
    );

    if (!result.rows.length) return;

    const reminder = result.rows[0];
    await query(
      `INSERT INTO notifications (org_id, user_id, type, title, message, metadata)
       VALUES ($1,$2,'reminder',$3,$4,$5)`,
      [
        orgId, reminder.user_id,
        `Reminder: ${reminder.title}`,
        reminder.description || `Reminder is due now.`,
        JSON.stringify({ reminder_id: reminderId, contact_id: reminder.contact_id }),
      ]
    );

    logger.info(`[ReminderWorker] Reminder ${reminderId} notification sent`);
  },
  { connection }
);

worker.on('failed', (job, err) => {
  logger.error(`[ReminderWorker] Job ${job?.id} failed:`, err.message);
});

module.exports = worker;
