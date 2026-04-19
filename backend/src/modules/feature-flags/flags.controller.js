const flagsService = require('./flags.service');

async function listFlags(req, res, next) {
  try {
    const flags = await flagsService.listFlags(req.orgId);
    res.json({ success: true, data: flags });
  } catch (err) { next(err); }
}

async function createFlag(req, res, next) {
  try {
    const flag = await flagsService.createFlag(req.orgId, req.body);
    res.status(201).json({ success: true, data: flag });
  } catch (err) { next(err); }
}

async function updateFlag(req, res, next) {
  try {
    const flag = await flagsService.updateFlag(req.orgId, req.params.key, req.body);
    res.json({ success: true, data: flag });
  } catch (err) { next(err); }
}

async function deleteFlag(req, res, next) {
  try {
    await flagsService.deleteFlag(req.orgId, req.params.key);
    res.json({ success: true, data: { message: 'Flag deleted' } });
  } catch (err) { next(err); }
}

module.exports = { listFlags, createFlag, updateFlag, deleteFlag };
