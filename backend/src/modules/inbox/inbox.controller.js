const inboxService = require('./inbox.service');

async function listConversations(req, res, next) {
  try {
    const result = await inboxService.listConversations(req.orgId, req.query);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
}

async function createConversation(req, res, next) {
  try {
    const conv = await inboxService.createConversation(req.orgId, req.body, req.user.id);
    res.status(201).json({ success: true, data: conv });
  } catch (err) { next(err); }
}

async function getConversation(req, res, next) {
  try {
    const conv = await inboxService.getConversation(req.orgId, req.params.id);
    res.json({ success: true, data: conv });
  } catch (err) { next(err); }
}

async function updateConversation(req, res, next) {
  try {
    const conv = await inboxService.updateConversation(req.orgId, req.params.id, req.body, req.user.id);
    res.json({ success: true, data: conv });
  } catch (err) { next(err); }
}

async function sendMessage(req, res, next) {
  try {
    const message = await inboxService.sendMessage(req.orgId, req.params.id, req.body, req.user.id);
    res.status(201).json({ success: true, data: message });
  } catch (err) { next(err); }
}

async function listMessages(req, res, next) {
  try {
    const result = await inboxService.listMessages(req.orgId, req.params.id, req.query);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
}

async function addInternalNote(req, res, next) {
  try {
    const note = await inboxService.addInternalNote(req.orgId, req.params.id, req.body.content, req.user.id);
    res.status(201).json({ success: true, data: note });
  } catch (err) { next(err); }
}

module.exports = { listConversations, createConversation, getConversation, updateConversation, sendMessage, listMessages, addInternalNote };
