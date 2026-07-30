const settingsService = require('./settings.service');

async function getSettings(req, res, next) {
  try {
    const settings = await settingsService.getSettings(req.orgId);
    res.json({ success: true, data: settings });
  } catch (err) { next(err); }
}

async function updateSettings(req, res, next) {
  try {
    const settings = await settingsService.updateSettings(req.orgId, req.body);
    res.json({ success: true, data: settings });
  } catch (err) { next(err); }
}

async function listApiKeys(req, res, next) {
  try {
    const keys = await settingsService.listApiKeys(req.orgId);
    res.json({ success: true, data: keys });
  } catch (err) { next(err); }
}

async function saveApiKey(req, res, next) {
  try {
    const key = await settingsService.saveApiKey(req.orgId, req.body, req.user.id);
    res.json({ success: true, data: key });
  } catch (err) { next(err); }
}

async function deleteApiKey(req, res, next) {
  try {
    await settingsService.deleteApiKey(req.orgId, req.params.id);
    res.json({ success: true, data: { message: 'API key deleted' } });
  } catch (err) { next(err); }
}

async function testApiKey(req, res, next) {
  try {
    const result = await settingsService.testApiKey(req.orgId, req.params.id);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

module.exports = { getSettings, updateSettings, listApiKeys, saveApiKey, deleteApiKey, testApiKey };
