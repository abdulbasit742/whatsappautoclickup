const integrationsService = require('./integrations.service');

async function listIntegrations(req, res, next) {
  try {
    const integrations = await integrationsService.listIntegrations(req.orgId);
    res.json({ success: true, data: integrations });
  } catch (err) { next(err); }
}

async function connect(req, res, next) {
  try {
    const integration = await integrationsService.connect(req.orgId, req.params.provider, req.body, req.user.id);
    res.json({ success: true, data: integration });
  } catch (err) { next(err); }
}

async function disconnect(req, res, next) {
  try {
    const integration = await integrationsService.disconnect(req.orgId, req.params.provider, req.user.id);
    res.json({ success: true, data: integration });
  } catch (err) { next(err); }
}

async function testConnection(req, res, next) {
  try {
    const result = await integrationsService.testConnection(req.orgId, req.params.provider);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

async function getLogs(req, res, next) {
  try {
    const result = await integrationsService.getLogs(req.orgId, req.params.provider, req.query);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
}

async function updateConfig(req, res, next) {
  try {
    const integration = await integrationsService.updateConfig(req.orgId, req.params.provider, req.body);
    res.json({ success: true, data: integration });
  } catch (err) { next(err); }
}

module.exports = { listIntegrations, connect, disconnect, testConnection, getLogs, updateConfig };
