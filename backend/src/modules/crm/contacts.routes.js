const express = require('express');
const router = express.Router();
const controller = require('./contacts.controller');
const { authenticate } = require('../../middleware/auth');
const { tenantIsolation } = require('../../middleware/tenantIsolation');
const { importLimiter } = require('../../middleware/rateLimit');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(authenticate, tenantIsolation);

router.get('/', controller.listContacts);
router.post('/', controller.createContact);
router.get('/export', controller.exportContacts);
router.post('/import', importLimiter, upload.single('file'), controller.importContacts);
router.get('/:id', controller.getContact);
router.patch('/:id', controller.updateContact);
router.delete('/:id', controller.deleteContact);
router.post('/:id/notes', controller.addNote);
router.get('/:id/notes', controller.getNotes);
router.post('/:id/activities', controller.logActivity);
router.get('/:id/timeline', controller.getTimeline);

module.exports = router;
