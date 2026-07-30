const contactsService = require('./contacts.service');

async function listContacts(req, res, next) {
  try {
    const result = await contactsService.listContacts(req.orgId, req.query);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
}

async function createContact(req, res, next) {
  try {
    const contact = await contactsService.createContact(req.orgId, req.body, req.user.id);
    res.status(201).json({ success: true, data: contact });
  } catch (err) { next(err); }
}

async function getContact(req, res, next) {
  try {
    const contact = await contactsService.getContact(req.orgId, req.params.id);
    res.json({ success: true, data: contact });
  } catch (err) { next(err); }
}

async function updateContact(req, res, next) {
  try {
    const contact = await contactsService.updateContact(req.orgId, req.params.id, req.body, req.user.id);
    res.json({ success: true, data: contact });
  } catch (err) { next(err); }
}

async function deleteContact(req, res, next) {
  try {
    await contactsService.deleteContact(req.orgId, req.params.id, req.user.id);
    res.json({ success: true, data: { message: 'Contact deleted' } });
  } catch (err) { next(err); }
}

async function importContacts(req, res, next) {
  try {
    const result = await contactsService.importContacts(req.orgId, req.file, req.body, req.user.id);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

async function exportContacts(req, res, next) {
  try {
    const csv = await contactsService.exportContacts(req.orgId, req.query);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="contacts.csv"');
    res.send(csv);
  } catch (err) { next(err); }
}

async function addNote(req, res, next) {
  try {
    const note = await contactsService.addNote(req.orgId, req.params.id, req.body.content, req.user.id);
    res.status(201).json({ success: true, data: note });
  } catch (err) { next(err); }
}

async function getNotes(req, res, next) {
  try {
    const notes = await contactsService.getNotes(req.orgId, req.params.id);
    res.json({ success: true, data: notes });
  } catch (err) { next(err); }
}

async function logActivity(req, res, next) {
  try {
    const activity = await contactsService.logActivity(req.orgId, req.params.id, req.body, req.user.id);
    res.status(201).json({ success: true, data: activity });
  } catch (err) { next(err); }
}

async function getTimeline(req, res, next) {
  try {
    const timeline = await contactsService.getTimeline(req.orgId, req.params.id, req.query);
    res.json({ success: true, data: timeline });
  } catch (err) { next(err); }
}

module.exports = {
  listContacts, createContact, getContact, updateContact, deleteContact,
  importContacts, exportContacts, addNote, getNotes, logActivity, getTimeline,
};
