const express = require('express');
const router = express.Router();
const controller = require('./campaigns.controller');
const { authenticate, checkRole } = require('../../middleware/auth');
const { tenantIsolation } = require('../../middleware/tenantIsolation');

router.use(authenticate, tenantIsolation);

router.get('/templates', controller.listTemplates);
router.post('/templates', controller.createTemplate);
router.patch('/templates/:id', controller.updateTemplate);
router.delete('/templates/:id', controller.deleteTemplate);

router.get('/', controller.listCampaigns);
router.post('/', controller.createCampaign);
router.get('/:id', controller.getCampaign);
router.patch('/:id', controller.updateCampaign);
router.post('/:id/launch', checkRole('admin', 'manager'), controller.launchCampaign);
router.post('/:id/pause', checkRole('admin', 'manager'), controller.pauseCampaign);
router.post('/:id/approve', checkRole('admin', 'super_admin'), controller.approveCampaign);
router.get('/:id/logs', controller.getCampaignLogs);

module.exports = router;
