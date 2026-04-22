const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const auth     = require('../middleware/auth');
const { createUser, bulkImportUsers, assignRoleByAttribute, verifyEmail, listProvisionedUsers } = require('../services/provisioningService');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(auth);

// POST /api/provisioning/users — create user
router.post('/users', async (req, res) => {
  try {
    const user = await createUser(req.body);
    res.status(201).json(user);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// POST /api/provisioning/bulk — bulk CSV upload
router.post('/bulk', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'CSV file required' });
    const csvData = req.file.buffer.toString('utf8');
    const results = await bulkImportUsers(csvData);
    res.json(results);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/provisioning/users — list provisioned users
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const users = await listProvisionedUsers({ page: parseInt(page), limit: parseInt(limit) });
    res.json(users);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/provisioning/verify/:token — email verification (no auth needed)
router.post('/verify/:token', async (req, res) => {
  try {
    const user = await verifyEmail(req.params.token);
    res.json({ success: true, user });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// POST /api/provisioning/role — assign role by attributes
router.post('/role', async (req, res) => {
  try {
    const { userId, attributes } = req.body;
    const result = await assignRoleByAttribute(userId, attributes || {});
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
