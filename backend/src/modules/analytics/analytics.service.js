const { query } = require('../../config/database');

async function getDashboard(orgId, queryParams) {
  const days = parseInt(queryParams.days) || 30;
  const interval = `${days} days`;

  const [contacts, conversations, campaigns, openIssues, followUpsDue, aiRequests] = await Promise.all([
    query(`SELECT COUNT(*) as total,
           SUM(CASE WHEN created_at >= NOW() - INTERVAL '${interval}' THEN 1 ELSE 0 END) as new_count
           FROM contacts WHERE org_id = $1 AND is_deleted = false`, [orgId]),
    query(`SELECT COUNT(*) as total,
           SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_count,
           SUM(CASE WHEN created_at >= NOW() - INTERVAL '${interval}' THEN 1 ELSE 0 END) as new_count
           FROM conversations WHERE org_id = $1`, [orgId]),
    query(`SELECT COUNT(*) as total,
           SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
           FROM campaigns WHERE org_id = $1`, [orgId]),
    query(`SELECT COUNT(*) FROM issues WHERE org_id = $1 AND status = 'open'`, [orgId]),
    query(`SELECT COUNT(*) FROM follow_ups WHERE org_id = $1 AND status = 'pending' AND scheduled_at <= NOW() + INTERVAL '24 hours'`, [orgId]),
    query(`SELECT SUM(request_count) as total FROM ai_usage_daily WHERE org_id = $1 AND date >= CURRENT_DATE - INTERVAL '${interval}'`, [orgId]),
  ]);

  return {
    contacts: contacts.rows[0],
    conversations: conversations.rows[0],
    campaigns: campaigns.rows[0],
    open_issues: parseInt(openIssues.rows[0].count),
    follow_ups_due: parseInt(followUpsDue.rows[0].count),
    ai_requests: parseInt(aiRequests.rows[0].total) || 0,
  };
}

async function getConversationAnalytics(orgId, queryParams) {
  const days = parseInt(queryParams.days) || 30;

  const [byStatus, byChannel, dailyVolume, avgResponseTime] = await Promise.all([
    query(`SELECT status, COUNT(*) as count FROM conversations WHERE org_id = $1 GROUP BY status`, [orgId]),
    query(`SELECT channel, COUNT(*) as count FROM conversations WHERE org_id = $1 GROUP BY channel`, [orgId]),
    query(`SELECT DATE(created_at) as date, COUNT(*) as count
           FROM conversations WHERE org_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'
           GROUP BY DATE(created_at) ORDER BY date`, [orgId]),
    query(`SELECT AVG(EXTRACT(EPOCH FROM (last_message_at - created_at))/60) as avg_minutes
           FROM conversations WHERE org_id = $1 AND last_message_at IS NOT NULL`, [orgId]),
  ]);

  return {
    by_status: byStatus.rows,
    by_channel: byChannel.rows,
    daily_volume: dailyVolume.rows,
    avg_response_time_minutes: parseFloat(avgResponseTime.rows[0].avg_minutes) || 0,
  };
}

async function getCampaignAnalytics(orgId, queryParams) {
  const [overview, byStatus, deliveryStats] = await Promise.all([
    query(`SELECT COUNT(*) as total_campaigns,
           SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
           SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running
           FROM campaigns WHERE org_id = $1`, [orgId]),
    query(`SELECT status, COUNT(*) FROM campaigns WHERE org_id = $1 GROUP BY status`, [orgId]),
    query(`SELECT SUM(total_targets) as total_targets, SUM(sent) as total_sent,
           SUM(delivered) as total_delivered, SUM(failed) as total_failed
           FROM campaign_runs WHERE org_id = $1`, [orgId]),
  ]);

  return {
    overview: overview.rows[0],
    by_status: byStatus.rows,
    delivery: deliveryStats.rows[0],
  };
}

async function getCrmAnalytics(orgId, queryParams) {
  const [byStage, bySource, leadValues, recentActivity] = await Promise.all([
    query(`SELECT lead_stage, COUNT(*) as count, SUM(lead_value) as total_value
           FROM contacts WHERE org_id = $1 AND is_deleted = false GROUP BY lead_stage`, [orgId]),
    query(`SELECT lead_source, COUNT(*) as count FROM contacts WHERE org_id = $1 AND is_deleted = false GROUP BY lead_source`, [orgId]),
    query(`SELECT SUM(lead_value) as total_pipeline, AVG(lead_score) as avg_score
           FROM contacts WHERE org_id = $1 AND is_deleted = false`, [orgId]),
    query(`SELECT COUNT(*) FROM activities WHERE org_id = $1 AND created_at >= NOW() - INTERVAL '7 days'`, [orgId]),
  ]);

  return {
    by_stage: byStage.rows,
    by_source: bySource.rows,
    pipeline: leadValues.rows[0],
    recent_activity_7d: parseInt(recentActivity.rows[0].count),
  };
}

async function getAiAnalytics(orgId, queryParams) {
  const days = parseInt(queryParams.days) || 30;

  const [daily, byProvider, totals] = await Promise.all([
    query(`SELECT date, SUM(request_count) as requests, SUM(token_count) as tokens
           FROM ai_usage_daily WHERE org_id = $1 AND date >= CURRENT_DATE - INTERVAL '${days} days'
           GROUP BY date ORDER BY date`, [orgId]),
    query(`SELECT provider, SUM(request_count) as requests, SUM(token_count) as tokens
           FROM ai_usage_daily WHERE org_id = $1 GROUP BY provider`, [orgId]),
    query(`SELECT SUM(request_count) as total_requests, SUM(token_count) as total_tokens,
           SUM(success_count) as total_success, SUM(failure_count) as total_failures
           FROM ai_usage_daily WHERE org_id = $1`, [orgId]),
  ]);

  return { daily: daily.rows, by_provider: byProvider.rows, totals: totals.rows[0] };
}

async function getTeamAnalytics(orgId, queryParams) {
  const [userStats, topAssigned] = await Promise.all([
    query(`SELECT COUNT(*) as total_agents,
           SUM(CASE WHEN is_active THEN 1 ELSE 0 END) as active_agents
           FROM users WHERE org_id = $1`, [orgId]),
    query(`SELECT u.name, u.email,
           COUNT(DISTINCT c.id) as conversations_assigned,
           COUNT(DISTINCT con.id) as contacts_assigned
           FROM users u
           LEFT JOIN conversations c ON c.assigned_user_id = u.id
           LEFT JOIN contacts con ON con.assigned_user_id = u.id
           WHERE u.org_id = $1
           GROUP BY u.id, u.name, u.email
           ORDER BY conversations_assigned DESC LIMIT 10`, [orgId]),
  ]);

  return { stats: userStats.rows[0], top_agents: topAssigned.rows };
}

async function getBillingAnalytics(orgId) {
  const [subscription, invoices] = await Promise.all([
    query(`SELECT s.status, p.name as plan_name, s.current_period_end
           FROM subscriptions s JOIN plans p ON p.id = s.plan_id WHERE s.org_id = $1`, [orgId]),
    query(`SELECT status, SUM(amount) as total FROM invoices WHERE org_id = $1 GROUP BY status`, [orgId]),
  ]);

  return {
    subscription: subscription.rows[0] || null,
    invoice_summary: invoices.rows,
  };
}

module.exports = {
  getDashboard, getConversationAnalytics, getCampaignAnalytics,
  getCrmAnalytics, getAiAnalytics, getTeamAnalytics, getBillingAnalytics,
};
