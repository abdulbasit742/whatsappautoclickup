const express = require('express');
const router = express.Router();
const controller = require('./issues.controller');
const { authenticate } = require('../../middleware/auth');
const { tenantIsolation } = require('../../middleware/tenantIsolation');

router.use(authenticate, tenantIsolation);

router.get('/', controller.listIssues);
router.post('/', controller.createIssue);
router.get('/:id', controller.getIssue);
router.patch('/:id', controller.updateIssue);
router.post('/:id/resolve', controller.resolveIssue);
router.post('/:id/comments', controller.addComment);
router.get('/:id/comments', controller.listComments);

module.exports = router;
