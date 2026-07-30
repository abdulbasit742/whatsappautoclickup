const campaignsService = require('./campaigns.service');

async function listCampaigns(req, res, next) {
  try {
    const result = await campaignsService.listCampaigns(req.orgId, req.query);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
}

async function createCampaign(req, res, next) {
  try {
    const campaign = await campaignsService.createCampaign(req.orgId, req.body, req.user.id);
    res.status(201).json({ success: true, data: campaign });
  } catch (err) { next(err); }
}

async function getCampaign(req, res, next) {
  try {
    const campaign = await campaignsService.getCampaign(req.orgId, req.params.id);
    res.json({ success: true, data: campaign });
  } catch (err) { next(err); }
}

async function updateCampaign(req, res, next) {
  try {
    const campaign = await campaignsService.updateCampaign(req.orgId, req.params.id, req.body);
    res.json({ success: true, data: campaign });
  } catch (err) { next(err); }
}

async function launchCampaign(req, res, next) {
  try {
    const result = await campaignsService.launchCampaign(req.orgId, req.params.id, req.user.id);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

async function pauseCampaign(req, res, next) {
  try {
    const result = await campaignsService.pauseCampaign(req.orgId, req.params.id);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

async function approveCampaign(req, res, next) {
  try {
    const result = await campaignsService.approveCampaign(req.orgId, req.params.id, req.user.id);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

async function getCampaignLogs(req, res, next) {
  try {
    const result = await campaignsService.getCampaignLogs(req.orgId, req.params.id, req.query);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
}

async function listTemplates(req, res, next) {
  try {
    const result = await campaignsService.listTemplates(req.orgId, req.query);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
}

async function createTemplate(req, res, next) {
  try {
    const template = await campaignsService.createTemplate(req.orgId, req.body);
    res.status(201).json({ success: true, data: template });
  } catch (err) { next(err); }
}

async function updateTemplate(req, res, next) {
  try {
    const template = await campaignsService.updateTemplate(req.orgId, req.params.id, req.body);
    res.json({ success: true, data: template });
  } catch (err) { next(err); }
}

async function deleteTemplate(req, res, next) {
  try {
    await campaignsService.deleteTemplate(req.orgId, req.params.id);
    res.json({ success: true, data: { message: 'Template deleted' } });
  } catch (err) { next(err); }
}

module.exports = {
  listCampaigns, createCampaign, getCampaign, updateCampaign,
  launchCampaign, pauseCampaign, approveCampaign, getCampaignLogs,
  listTemplates, createTemplate, updateTemplate, deleteTemplate,
};
