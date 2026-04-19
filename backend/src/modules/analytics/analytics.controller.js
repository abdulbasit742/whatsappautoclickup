const analyticsService = require('./analytics.service');

async function getDashboard(req, res, next) {
  try {
    const data = await analyticsService.getDashboard(req.orgId, req.query);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function getConversationAnalytics(req, res, next) {
  try {
    const data = await analyticsService.getConversationAnalytics(req.orgId, req.query);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function getCampaignAnalytics(req, res, next) {
  try {
    const data = await analyticsService.getCampaignAnalytics(req.orgId, req.query);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function getCrmAnalytics(req, res, next) {
  try {
    const data = await analyticsService.getCrmAnalytics(req.orgId, req.query);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function getAiAnalytics(req, res, next) {
  try {
    const data = await analyticsService.getAiAnalytics(req.orgId, req.query);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function getTeamAnalytics(req, res, next) {
  try {
    const data = await analyticsService.getTeamAnalytics(req.orgId, req.query);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function getBillingAnalytics(req, res, next) {
  try {
    const data = await analyticsService.getBillingAnalytics(req.orgId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

module.exports = { getDashboard, getConversationAnalytics, getCampaignAnalytics, getCrmAnalytics, getAiAnalytics, getTeamAnalytics, getBillingAnalytics };
