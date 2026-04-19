const billingService = require('./billing.service');

async function listPlans(req, res, next) {
  try {
    const plans = await billingService.listPlans();
    res.json({ success: true, data: plans });
  } catch (err) { next(err); }
}

async function getSubscription(req, res, next) {
  try {
    const sub = await billingService.getSubscription(req.orgId);
    res.json({ success: true, data: sub });
  } catch (err) { next(err); }
}

async function subscribe(req, res, next) {
  try {
    const sub = await billingService.subscribe(req.orgId, req.body.planId);
    res.json({ success: true, data: sub });
  } catch (err) { next(err); }
}

async function upgrade(req, res, next) {
  try {
    const sub = await billingService.upgrade(req.orgId, req.body.planId);
    res.json({ success: true, data: sub });
  } catch (err) { next(err); }
}

async function listInvoices(req, res, next) {
  try {
    const result = await billingService.listInvoices(req.orgId, req.query);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
}

async function getUsage(req, res, next) {
  try {
    const usage = await billingService.getUsage(req.orgId);
    res.json({ success: true, data: usage });
  } catch (err) { next(err); }
}

module.exports = { listPlans, getSubscription, subscribe, upgrade, listInvoices, getUsage };
