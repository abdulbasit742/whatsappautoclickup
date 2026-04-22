const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const { anonymizeClient, exportClientData, deleteClientData, getAuditLog } = require('../services/anonymizationService');

router.use(auth);

// POST /api/gdpr/anonymize/:clientId
router.post('/anonymize/:clientId', async (req, res) => {
  try {
    const performedBy = req.owner?.id;
    const result = await anonymizeClient(req.params.clientId, performedBy);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/gdpr/export/:clientId
router.get('/export/:clientId', async (req, res) => {
  try {
    const performedBy = req.owner?.id;
    const data = await exportClientData(req.params.clientId, performedBy);
    res.setHeader('Content-Disposition', `attachment; filename="client-data-${req.params.clientId}.json"`);
    res.setHeader('Content-Type', 'application/json');
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/gdpr/delete/:clientId
router.delete('/delete/:clientId', async (req, res) => {
  try {
    const performedBy = req.owner?.id;
    const result = await deleteClientData(req.params.clientId, performedBy);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/gdpr/audit-log
router.get('/audit-log', async (req, res) => {
  try {
    const { clientId, limit = 50 } = req.query;
    const log = await getAuditLog(clientId || null, parseInt(limit));
    res.json(log);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
