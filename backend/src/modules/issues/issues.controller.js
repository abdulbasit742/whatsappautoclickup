const issuesService = require('./issues.service');

async function listIssues(req, res, next) {
  try {
    const result = await issuesService.listIssues(req.orgId, req.query);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
}

async function createIssue(req, res, next) {
  try {
    const issue = await issuesService.createIssue(req.orgId, req.body, req.user.id);
    res.status(201).json({ success: true, data: issue });
  } catch (err) { next(err); }
}

async function getIssue(req, res, next) {
  try {
    const issue = await issuesService.getIssue(req.orgId, req.params.id);
    res.json({ success: true, data: issue });
  } catch (err) { next(err); }
}

async function updateIssue(req, res, next) {
  try {
    const issue = await issuesService.updateIssue(req.orgId, req.params.id, req.body);
    res.json({ success: true, data: issue });
  } catch (err) { next(err); }
}

async function resolveIssue(req, res, next) {
  try {
    const issue = await issuesService.resolveIssue(req.orgId, req.params.id, req.body.resolution_notes, req.user.id);
    res.json({ success: true, data: issue });
  } catch (err) { next(err); }
}

async function addComment(req, res, next) {
  try {
    const comment = await issuesService.addComment(req.orgId, req.params.id, req.body, req.user.id);
    res.status(201).json({ success: true, data: comment });
  } catch (err) { next(err); }
}

async function listComments(req, res, next) {
  try {
    const comments = await issuesService.listComments(req.orgId, req.params.id);
    res.json({ success: true, data: comments });
  } catch (err) { next(err); }
}

module.exports = { listIssues, createIssue, getIssue, updateIssue, resolveIssue, addComment, listComments };
