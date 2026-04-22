/**
 * Activity Tracking Service
 * Records and streams real-time user activity
 */

const db = require('../db');

const activityBuffer = [];
const MAX_BUFFER     = 2000;
const sseClients     = new Set();

function broadcastActivity(activity) {
  const data = `data: ${JSON.stringify(activity)}\n\n`;
  for (const res of sseClients) {
    try { res.write(data); } catch { sseClients.delete(res); }
  }
}

async function recordActivity(userId, action, metadata = {}) {
  const activity = {
    id:        `act_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    userId,
    action,
    metadata,
    page:      metadata.page || '/',
    ip:        metadata.ip || 'unknown',
    userAgent: metadata.userAgent || '',
    timestamp: new Date().toISOString(),
  };

  activityBuffer.unshift(activity);
  if (activityBuffer.length > MAX_BUFFER) activityBuffer.pop();

  broadcastActivity(activity);

  await db.query(
    `INSERT INTO activity_logs (id, user_id, action, metadata, page, ip, user_agent, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
    [activity.id, userId || null, action, JSON.stringify(metadata), activity.page, activity.ip, activity.userAgent]
  ).catch(() => {}); // graceful fallback

  return activity;
}

async function getActivityStream({ page = 1, limit = 50, userId, action } = {}) {
  const offset = (page - 1) * limit;

  let q = `SELECT * FROM activity_logs WHERE 1=1`;
  const params = [];
  if (userId) { params.push(userId); q += ` AND user_id=$${params.length}`; }
  if (action) { params.push(action); q += ` AND action=$${params.length}`; }
  params.push(parseInt(limit)); q += ` ORDER BY created_at DESC LIMIT $${params.length}`;
  params.push(offset);          q += ` OFFSET $${params.length}`;

  try {
    const r = await db.query(q, params);
    return r.rows;
  } catch {
    return activityBuffer.slice(offset, offset + parseInt(limit));
  }
}

async function getEngagementMetrics(userId) {
  try {
    const [pageViewRes, sessionRes, topPagesRes] = await Promise.all([
      db.query(
        `SELECT COUNT(*) AS views FROM activity_logs WHERE action='page_view' AND created_at > NOW() - INTERVAL '24 hours'${userId ? ' AND user_id=$1' : ''}`,
        userId ? [userId] : []
      ),
      db.query(
        `SELECT COUNT(DISTINCT user_id) AS dau FROM activity_logs WHERE created_at > NOW() - INTERVAL '24 hours'`
      ),
      db.query(
        `SELECT page, COUNT(*) AS views FROM activity_logs
         WHERE action='page_view' AND created_at > NOW() - INTERVAL '24 hours'
         GROUP BY page ORDER BY views DESC LIMIT 10`
      ),
    ]);

    return {
      pageViews:  parseInt(pageViewRes.rows[0].views),
      dau:        parseInt(sessionRes.rows[0].dau),
      topPages:   topPagesRes.rows,
      timestamp:  new Date().toISOString(),
    };
  } catch {
    const recent = activityBuffer.filter(a => Date.now() - new Date(a.timestamp).getTime() < 86400000);
    return {
      pageViews: recent.filter(a => a.action === 'page_view').length,
      dau:       new Set(recent.map(a => a.userId).filter(Boolean)).size,
      topPages:  [],
      timestamp: new Date().toISOString(),
    };
  }
}

async function aggregatePageViews() {
  try {
    const r = await db.query(
      `SELECT date_trunc('hour', created_at) AS hour, COUNT(*) AS views
       FROM activity_logs
       WHERE action = 'page_view' AND created_at > NOW() - INTERVAL '24 hours'
       GROUP BY hour ORDER BY hour ASC`
    );
    return r.rows;
  } catch {
    return [];
  }
}

function addSSEClient(res) {
  sseClients.add(res);
  return () => sseClients.delete(res);
}

module.exports = { recordActivity, getActivityStream, getEngagementMetrics, aggregatePageViews, addSSEClient };
