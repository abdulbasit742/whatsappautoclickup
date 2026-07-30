const orgsService = require('./organizations.service');

async function getCurrent(req, res, next) {
  try {
    const org = await orgsService.getOrg(req.orgId);
    res.json({ success: true, data: org });
  } catch (err) { next(err); }
}

async function updateCurrent(req, res, next) {
  try {
    const org = await orgsService.updateOrg(req.orgId, req.body);
    res.json({ success: true, data: org });
  } catch (err) { next(err); }
}

async function listAll(req, res, next) {
  try {
    const result = await orgsService.listOrgs(req.query);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
}

async function assignPlan(req, res, next) {
  try {
    const org = await orgsService.assignPlan(req.params.id, req.body.plan);
    res.json({ success: true, data: org });
  } catch (err) { next(err); }
}

module.exports = { getCurrent, updateCurrent, listAll, assignPlan };
