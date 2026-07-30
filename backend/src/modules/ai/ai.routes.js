const express = require('express');
const router = express.Router();
const controller = require('./ai.controller');
const { authenticate, checkRole } = require('../../middleware/auth');
const { tenantIsolation } = require('../../middleware/tenantIsolation');

router.use(authenticate, tenantIsolation);

router.post('/generate', controller.generate);
router.post('/reply-suggestion', controller.replySuggestion);
router.post('/summarize', controller.summarize);
router.post('/lead-score', controller.leadScore);
router.post('/sentiment', controller.sentiment);
router.post('/classify-issue', controller.classifyIssue);
router.get('/providers', controller.listProviders);
router.get('/usage', controller.getUsage);
router.get('/prompt-templates', controller.listPromptTemplates);
router.post('/prompt-templates', controller.createPromptTemplate);
router.patch('/prompt-templates/:id', controller.updatePromptTemplate);
router.post('/test-prompt', controller.testPrompt);

module.exports = router;
