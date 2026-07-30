const followupsService = require('./followups.service');

async function listFollowUps(req, res, next) {
  try {
    const result = await followupsService.listFollowUps(req.orgId, req.query, req.user.id);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
}

async function createFollowUp(req, res, next) {
  try {
    const fu = await followupsService.createFollowUp(req.orgId, req.body, req.user.id);
    res.status(201).json({ success: true, data: fu });
  } catch (err) { next(err); }
}

async function getFollowUp(req, res, next) {
  try {
    const fu = await followupsService.getFollowUp(req.orgId, req.params.id);
    res.json({ success: true, data: fu });
  } catch (err) { next(err); }
}

async function updateFollowUp(req, res, next) {
  try {
    const fu = await followupsService.updateFollowUp(req.orgId, req.params.id, req.body);
    res.json({ success: true, data: fu });
  } catch (err) { next(err); }
}

async function completeFollowUp(req, res, next) {
  try {
    const fu = await followupsService.completeFollowUp(req.orgId, req.params.id, req.user.id);
    res.json({ success: true, data: fu });
  } catch (err) { next(err); }
}

async function listReminders(req, res, next) {
  try {
    const result = await followupsService.listReminders(req.orgId, req.user.id, req.query);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
}

async function createReminder(req, res, next) {
  try {
    const reminder = await followupsService.createReminder(req.orgId, req.body, req.user.id);
    res.status(201).json({ success: true, data: reminder });
  } catch (err) { next(err); }
}

async function updateReminder(req, res, next) {
  try {
    const reminder = await followupsService.updateReminder(req.orgId, req.params.id, req.body, req.user.id);
    res.json({ success: true, data: reminder });
  } catch (err) { next(err); }
}

async function completeReminder(req, res, next) {
  try {
    const reminder = await followupsService.completeReminder(req.orgId, req.params.id, req.user.id);
    res.json({ success: true, data: reminder });
  } catch (err) { next(err); }
}

module.exports = {
  listFollowUps, createFollowUp, getFollowUp, updateFollowUp, completeFollowUp,
  listReminders, createReminder, updateReminder, completeReminder,
};
