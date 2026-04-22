const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const auth    = require('../middleware/auth');
const { batchMigrate, getMigrationStatus, rollbackMigration, listMigrationJobs, migrateClient } = require('../services/migrationService');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(auth);

// POST /api/migration/start — start migration job
router.post('/start', upload.single('file'), async (req, res) => {
  try {
    let mapping = {};
    try { mapping = JSON.parse(req.body.mapping || '{}'); } catch {}

    if (req.file) {
      const csvData = req.file.buffer.toString('utf8');
      const result  = await batchMigrate(csvData, mapping);
      return res.status(202).json(result);
    }

    if (req.body.data) {
      const result = await batchMigrate(req.body.data, mapping);
      return res.status(202).json(result);
    }

    res.status(400).json({ error: 'CSV file or data required' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/migration/status/:jobId
router.get('/status/:jobId', async (req, res) => {
  try {
    const status = await getMigrationStatus(req.params.jobId);
    res.json(status);
  } catch (err) { res.status(404).json({ error: err.message }); }
});

// POST /api/migration/rollback/:jobId
router.post('/rollback/:jobId', async (req, res) => {
  try {
    const result = await rollbackMigration(req.params.jobId);
    res.json(result);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// GET /api/migration/jobs — list all jobs
router.get('/jobs', async (req, res) => {
  try {
    const jobs = await listMigrationJobs();
    res.json(jobs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/migration/map — define and test field mapping
router.post('/map', async (req, res) => {
  try {
    const { sampleRow, mapping } = req.body;
    if (!sampleRow || !mapping) return res.status(400).json({ error: 'sampleRow and mapping required' });
    // Preview the transformation
    const transformed = {};
    for (const [target, source] of Object.entries(mapping)) {
      transformed[target] = sampleRow[source] ?? null;
    }
    res.json({ preview: transformed, mapping });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
