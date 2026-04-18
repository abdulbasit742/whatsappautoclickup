const cron = require('node-cron');
const db = require('../db');
const { messageQueue, broadcastQueue, followupQueue } = require('../modules/queue/queues');

// ─── Follow-Up Engine (runs every hour) ─────────────────────────────────────────
async function runFollowUps() {
  try {
    const res = await db.query(
      `SELECT f.*, c.name, c.whatsapp_number FROM follow_ups f
       JOIN clients c ON c.id = f.client_id
       WHERE f.status='pending' AND f.scheduled_at <= NOW()`
    );

    for (const f of res.rows) {
      await followupQueue.add(
        `followup-${f.type}`,
        {
          followUpId:     f.id,
          clientId:       f.client_id,
          type:           f.type,
          whatsappNumber: f.whatsapp_number,
          name:           f.name,
        },
        { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
      );
      // Mark as sent immediately to prevent duplicate pick-up on next tick
      await db.query(`UPDATE follow_ups SET status='sent' WHERE id=$1`, [f.id]);
      console.log(`[Cron] Follow-up queued for ${f.whatsapp_number} (${f.type})`);
    }
  } catch (err) {
    console.error('[Cron] Follow-up error:', err.message);
  }
}

// ─── Appointment Reminders (runs every 15 min) ──────────────────────────────────
async function runAppointmentReminders() {
  try {
    const res = await db.query(
      `SELECT a.*, c.name, c.whatsapp_number FROM appointments a
       JOIN clients c ON c.id = a.client_id
       WHERE a.status='confirmed' AND a.reminder_sent=false
       AND a.slot_datetime BETWEEN NOW() AND NOW() + INTERVAL '1 hour'`
    );

    for (const a of res.rows) {
      const time = new Date(a.slot_datetime).toLocaleTimeString('en-PK', {
        hour: '2-digit', minute: '2-digit',
      });
      await messageQueue.add('appointment-reminder', {
        type: 'text',
        to: a.whatsapp_number,
        content: `⏰ Reminder: Your appointment is in ~1 hour at ${time}. We look forward to speaking with you, ${a.name || 'there'}! 😊`,
        clientId: a.client_id,
      });
      await db.query(`UPDATE appointments SET reminder_sent=true WHERE id=$1`, [a.id]);
    }
  } catch (err) {
    console.error('[Cron] Appointment reminder error:', err.message);
  }
}

// ─── Inactive Client Alerts (runs every 6 hours) ────────────────────────────────
async function scheduleInactiveAlerts() {
  try {
    const res = await db.query(
      `SELECT id FROM clients
       WHERE last_active_at < NOW() - INTERVAL '48 hours'
       AND status='active'
       AND id NOT IN (
         SELECT client_id FROM alerts WHERE type='inactive_client' AND is_resolved=false
       )`
    );
    for (const c of res.rows) {
      await db.query(
        `INSERT INTO alerts (type, client_id, message)
         VALUES ('inactive_client', $1, 'Client has been inactive for 48+ hours')`,
        [c.id]
      );
    }
  } catch (err) {
    console.error('[Cron] Inactive alert error:', err.message);
  }
}

// ─── Send Scheduled Broadcasts (runs every 15 min) ──────────────────────────────
async function runScheduledBroadcasts() {
  try {
    const broadcasts = (
      await db.query(`SELECT * FROM broadcasts WHERE status='scheduled' AND scheduled_at <= NOW()`)
    ).rows;

    for (const b of broadcasts) {
      await broadcastQueue.add('send-broadcast', { broadcastId: b.id });
      // Temporarily update status to prevent double-queuing on next cron tick
      await db.query(`UPDATE broadcasts SET status='sent' WHERE id=$1`, [b.id]);
      console.log(`[Cron] Broadcast "${b.title}" enqueued`);
    }
  } catch (err) {
    console.error('[Cron] Broadcast error:', err.message);
  }
}

// ─── Weekly Owner Summary (runs every Monday 9am) ────────────────────────────────
async function sendWeeklySummary() {
  try {
    const settings = (await db.query(`SELECT key, value FROM settings`)).rows;
    const ownerNum = settings.find((s) => s.key === 'owner_whatsapp')?.value;
    if (!ownerNum) return;

    const [clients, revenue, reviews, alerts] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM clients WHERE created_at > NOW() - INTERVAL '7 days'`),
      db.query(`SELECT COALESCE(SUM(amount_pkr),0) AS total FROM payments WHERE status='confirmed' AND confirmed_at > NOW() - INTERVAL '7 days'`),
      db.query(`SELECT COALESCE(AVG(rating),0) AS avg, COUNT(*) AS total FROM reviews WHERE created_at > NOW() - INTERVAL '7 days'`),
      db.query(`SELECT COUNT(*) FROM alerts WHERE is_resolved=false`),
    ]);

    const msg =
      `�� *ClientFlow AI — Weekly Summary*\n\n` +
      `🆕 New Clients: ${clients.rows[0].count}\n` +
      `💰 Revenue: PKR ${Number(revenue.rows[0].total).toLocaleString()}\n` +
      `⭐ Avg Rating: ${parseFloat(reviews.rows[0].avg).toFixed(1)} (${reviews.rows[0].total} reviews)\n` +
      `🔔 Open Alerts: ${alerts.rows[0].count}\n\n` +
      `Keep it up! 🚀`;

    await messageQueue.add('weekly-summary', { type: 'text', to: ownerNum, content: msg });
    console.log('[Cron] Weekly summary queued');
  } catch (err) {
    console.error('[Cron] Weekly summary error:', err.message);
  }
}

function initCronJobs() {
  cron.schedule('0 * * * *',    runFollowUps);             // every hour
  cron.schedule('*/15 * * * *', runAppointmentReminders);  // every 15 min
  cron.schedule('*/15 * * * *', runScheduledBroadcasts);   // every 15 min
  cron.schedule('0 */6 * * *',  scheduleInactiveAlerts);   // every 6 hours
  cron.schedule('0 9 * * 1',    sendWeeklySummary);        // every Monday 9am
  console.log('[Cron] All jobs initialized');
}

module.exports = { initCronJobs };
