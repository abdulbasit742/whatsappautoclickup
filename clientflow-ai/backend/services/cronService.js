const cron = require('node-cron');
const db = require('../db');
const { sendText } = require('./whatsappService');
const { generateAIResponse } = require('./aiService');

const FOLLOW_UP_MIN_INTERVAL_HOURS = 12; // Don't send more than 1 follow-up per 12h per client

async function wasRecentlyContacted(clientId) {
  const r = await db.query(
    `SELECT id FROM follow_ups WHERE client_id=$1 AND status='sent'
     AND sent_at > NOW() - INTERVAL '1 hour' * $2 LIMIT 1`,
    [clientId, FOLLOW_UP_MIN_INTERVAL_HOURS]
  );
  return r.rows.length > 0;
}

// ─── Follow-Up Engine (runs every hour) ─────────────────────────────────────────
async function runFollowUps() {
  try {
    const res = await db.query(
      `SELECT f.*, c.name, c.whatsapp_number, c.status as client_status FROM follow_ups f
       JOIN clients c ON c.id = f.client_id
       WHERE f.status='pending' AND f.scheduled_at <= NOW()
       AND c.status != 'blocked'
       ORDER BY f.scheduled_at ASC LIMIT 50`
    );

    for (const f of res.rows) {
      try {
        // Spam prevention: skip if client was recently contacted
        if (await wasRecentlyContacted(f.client_id)) {
          console.log(`[Cron] Skipping follow-up for ${f.whatsapp_number} — too soon`);
          continue;
        }

        const name = f.name || 'there';
        let message = '';

        if (f.type === 'cold_lead') {
          message = `Hello ${name}! 👋 Just checking in — we noticed you were interested in our services. We're still here to help! Any questions? 😊\n\nType *pricing* to see our services.`;
        } else if (f.type === 'pending_payment') {
          // Skip if already paid
          if (f.client_status === 'paid') {
            await db.query(`UPDATE follow_ups SET status='skipped' WHERE id=$1`, [f.id]);
            continue;
          }
          message = `Hi ${name}! 😊 Friendly reminder — your payment is still pending. No rush, just let us know if you need any help with the process! 💙`;
        } else if (f.type === 'post_delivery') {
          message = `Hi ${name}! 🌟 We hope you're loving your service! Could you rate us from *1–5*? Just reply with the number. Your feedback means the world to us! ⭐`;
        } else if (f.type === 're_engagement') {
          message = `Assalam u Alaikum ${name}! 👋 It's been a while — we miss you! We have exciting new services and offers you might love. Reply to see what's new! 🎉`;
        } else if (f.type === 'upsell') {
          // Skip upsell if client has never paid
          if (f.client_status === 'lead' || f.client_status === 'active') {
            await db.query(`UPDATE follow_ups SET status='skipped' WHERE id=$1`, [f.id]);
            continue;
          }
          // AI-generated upsell
          try {
            const services = (await db.query(`SELECT name, price_pkr FROM services WHERE is_active=true LIMIT 5`)).rows;
            const settings = (await db.query(`SELECT key, value FROM settings`)).rows;
            const biz = settings.find(s => s.key === 'business_name')?.value || 'our business';
            const result = await generateAIResponse({
              systemPrompt: `You are a sales assistant for ${biz}. Write a short, friendly WhatsApp upsell message (max 2 sentences + emoji CTA). No markdown, no asterisks unless for service name.`,
              conversationHistory: [],
              userMessage: `Client ${name} just completed a service. Suggest one of: ${services.map(s => `${s.name} (PKR ${s.price_pkr})`).join(', ')}`,
            });
            message = result.response || `Hi ${name}! 🚀 Loved working with you! We have more amazing services. Reply to see what's available! 😊`;
          } catch {
            message = `Hi ${name}! 🚀 Loved working with you! Check out our other services — great options waiting for you! Reply *pricing* to explore. 😊`;
          }
        }

        if (message) {
          await sendText(f.whatsapp_number, message, f.client_id);
          await db.query(`UPDATE follow_ups SET status='sent', sent_at=NOW() WHERE id=$1`, [f.id]);
          console.log(`[Cron] Follow-up sent to ${f.whatsapp_number} (${f.type})`);
        }
      } catch (innerErr) {
        console.error(`[Cron] Failed follow-up ${f.id}:`, innerErr.message);
        await db.query(`UPDATE follow_ups SET status='failed' WHERE id=$1`, [f.id]);
      }
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
      const time = new Date(a.slot_datetime).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
      await sendText(a.whatsapp_number,
        `⏰ *Appointment Reminder!*\n\nHi ${a.name || 'there'}! Your appointment is in ~1 hour at ${time}.\n\nWe look forward to speaking with you! 😊`,
        a.client_id
      );
      await db.query(`UPDATE appointments SET reminder_sent=true WHERE id=$1`, [a.id]);
    }
  } catch (err) {
    console.error('[Cron] Appointment reminder error:', err.message);
  }
}

// ─── Inactive Client Alerts & Follow-ups (runs every 6 hours) ───────────────────
async function scheduleInactiveAlerts() {
  try {
    // Alert admin about inactive clients (>48h)
    const inactive = await db.query(
      `SELECT id FROM clients
       WHERE last_active_at < NOW() - INTERVAL '48 hours'
       AND status='active'
       AND id NOT IN (SELECT client_id FROM alerts WHERE type='inactive_client' AND is_resolved=false)`
    );
    for (const c of inactive.rows) {
      await db.query(
        `INSERT INTO alerts (type, client_id, message, priority)
         VALUES ('inactive_client',$1,'Client has been inactive for 48+ hours','low')`,
        [c.id]
      );
    }

    // Schedule re-engagement follow-ups for very inactive clients (>7 days)
    const veryInactive = await db.query(
      `SELECT id FROM clients
       WHERE last_active_at < NOW() - INTERVAL '7 days'
       AND status IN ('active','paid')
       AND id NOT IN (
         SELECT client_id FROM follow_ups
         WHERE type='re_engagement' AND status='pending'
       )`
    );
    for (const c of veryInactive.rows) {
      await db.query(
        `INSERT INTO follow_ups (client_id, type, scheduled_at) VALUES ($1,'re_engagement', NOW() + INTERVAL '1 hour')`,
        [c.id]
      ).catch(() => {});
    }
  } catch (err) {
    console.error('[Cron] Inactive alert error:', err.message);
  }
}

// ─── Send Scheduled Broadcasts (runs every 15 min) ──────────────────────────────
async function runScheduledBroadcasts() {
  try {
    const broadcasts = (await db.query(
      `SELECT * FROM broadcasts WHERE status='scheduled' AND scheduled_at <= NOW()`
    )).rows;

    for (const b of broadcasts) {
      let clientQ = `SELECT id, whatsapp_number, name FROM clients WHERE status != 'blocked'`;
      if (b.target_audience === 'paid')       clientQ += ` AND status='paid'`;
      else if (b.target_audience === 'inactive') clientQ += ` AND last_active_at < NOW() - INTERVAL '14 days'`;
      else if (b.target_audience === 'leads')    clientQ += ` AND status='lead'`;

      const clients = (await db.query(clientQ)).rows;
      let sent = 0;
      for (const c of clients) {
        try {
          const msg = b.message.replace(/\{\{client_name\}\}/g, c.name || 'there');
          await sendText(c.whatsapp_number, msg, c.id);
          await db.query(
            `INSERT INTO broadcast_recipients (broadcast_id,client_id,delivered)
             VALUES ($1,$2,true) ON CONFLICT DO NOTHING`,
            [b.id, c.id]
          );
          sent++;
          // Small delay to avoid WhatsApp rate limits
          await new Promise(r => setTimeout(r, 100));
        } catch { /* skip failed individual sends */ }
      }
      await db.query(
        `UPDATE broadcasts SET status='sent', sent_at=NOW(), total_sent=$1 WHERE id=$2`,
        [sent, b.id]
      );
      console.log(`[Cron] Broadcast "${b.title}" sent to ${sent} clients`);
    }
  } catch (err) {
    console.error('[Cron] Broadcast error:', err.message);
  }
}

// ─── Weekly Owner Summary (runs every Monday 9am) ────────────────────────────────
async function sendWeeklySummary() {
  try {
    const settings = (await db.query(`SELECT key, value FROM settings`)).rows;
    const ownerNum = settings.find(s => s.key === 'owner_whatsapp')?.value;
    if (!ownerNum) return;

    const [clients, revenue, reviews, alerts] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM clients WHERE created_at > NOW() - INTERVAL '7 days'`),
      db.query(`SELECT COALESCE(SUM(amount_pkr),0) as total FROM payments WHERE status='confirmed' AND confirmed_at > NOW() - INTERVAL '7 days'`),
      db.query(`SELECT COALESCE(AVG(rating),0) as avg, COUNT(*) as total FROM reviews WHERE created_at > NOW() - INTERVAL '7 days'`),
      db.query(`SELECT COUNT(*) FROM alerts WHERE is_resolved=false`),
    ]);

    const msg = `📊 *ClientFlow AI — Weekly Summary*\n\n` +
      `🆕 New Clients: ${clients.rows[0].count}\n` +
      `💰 Revenue: PKR ${Number(revenue.rows[0].total).toLocaleString()}\n` +
      `⭐ Avg Rating: ${parseFloat(reviews.rows[0].avg).toFixed(1)} (${reviews.rows[0].total} reviews)\n` +
      `🔔 Open Alerts: ${alerts.rows[0].count}\n\n` +
      `Keep it up! 🚀`;

    await sendText(ownerNum, msg);
    console.log('[Cron] Weekly summary sent to owner');
  } catch (err) {
    console.error('[Cron] Weekly summary error:', err.message);
  }
}

// ─── Auto-resolve old low-priority alerts (runs daily at midnight) ───────────────
async function autoResolveOldAlerts() {
  try {
    const r = await db.query(
      `UPDATE alerts SET is_resolved=true, resolved_at=NOW()
       WHERE is_resolved=false AND priority='low' AND created_at < NOW() - INTERVAL '7 days'
       RETURNING id`
    );
    if (r.rows.length > 0) {
      console.log(`[Cron] Auto-resolved ${r.rows.length} old low-priority alerts`);
    }
  } catch (err) {
    console.error('[Cron] Auto-resolve error:', err.message);
  }
}

function initCronJobs() {
  cron.schedule('0 * * * *',       runFollowUps);              // every hour
  cron.schedule('*/15 * * * *',    runAppointmentReminders);   // every 15 min
  cron.schedule('*/15 * * * *',    runScheduledBroadcasts);    // every 15 min
  cron.schedule('0 */6 * * *',     scheduleInactiveAlerts);    // every 6 hours
  cron.schedule('0 9 * * 1',       sendWeeklySummary);         // every Monday 9am
  cron.schedule('0 0 * * *',       autoResolveOldAlerts);      // daily midnight
  console.log('[Cron] All jobs initialized');
}

module.exports = { initCronJobs };
