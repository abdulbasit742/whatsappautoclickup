const aiService = require('./ai.service');

async function generate(req, res, next) {
  try {
    const result = await aiService.generate(req.orgId, req.user.id, req.body);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

async function replySuggestion(req, res, next) {
  try {
    const result = await aiService.replySuggestion(req.orgId, req.user.id, req.body);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

async function summarize(req, res, next) {
  try {
    const result = await aiService.summarize(req.orgId, req.user.id, req.body);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

async function leadScore(req, res, next) {
  try {
    const result = await aiService.leadScore(req.orgId, req.user.id, req.body);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

async function sentiment(req, res, next) {
  try {
    const result = await aiService.sentiment(req.orgId, req.user.id, req.body);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

async function classifyIssue(req, res, next) {
  try {
    const result = await aiService.classifyIssue(req.orgId, req.user.id, req.body);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

async function listProviders(req, res, next) {
  try {
    const providers = await aiService.listProviders();
    res.json({ success: true, data: providers });
  } catch (err) { next(err); }
}

async function getUsage(req, res, next) {
  try {
    const usage = await aiService.getUsage(req.orgId, req.query);
    res.json({ success: true, data: usage });
  } catch (err) { next(err); }
}

async function listPromptTemplates(req, res, next) {
  try {
    const templates = await aiService.listPromptTemplates(req.orgId, req.query);
    res.json({ success: true, data: templates });
  } catch (err) { next(err); }
}

async function createPromptTemplate(req, res, next) {
  try {
    const template = await aiService.createPromptTemplate(req.orgId, req.body);
    res.status(201).json({ success: true, data: template });
  } catch (err) { next(err); }
}

async function updatePromptTemplate(req, res, next) {
  try {
    const template = await aiService.updatePromptTemplate(req.orgId, req.params.id, req.body);
    res.json({ success: true, data: template });
  } catch (err) { next(err); }
}

async function testPrompt(req, res, next) {
  try {
    const result = await aiService.testPrompt(req.orgId, req.user.id, req.body);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

module.exports = {
  generate, replySuggestion, summarize, leadScore, sentiment,
  classifyIssue, listProviders, getUsage, listPromptTemplates,
  createPromptTemplate, updatePromptTemplate, testPrompt,
};
