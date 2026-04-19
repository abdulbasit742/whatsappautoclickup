const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|csv|txt|mp4|mp3|zip/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.','');
    if (allowed.test(ext)) cb(null, true);
    else cb(new Error('File type not allowed'));
  },
});

router.use(auth);

// ─── Upload attachment ────────────────────────────────────────
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { entity_type, entity_id } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });
    const url = `/uploads/${file.filename}`;
    const r = await db.query(
      `INSERT INTO attachments (org_id, entity_type, entity_id, filename, original_name, mime_type, file_size, url, uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.owner.org_id, entity_type, entity_id, file.filename, file.originalname, file.mimetype, file.size, url, req.owner.id || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── List attachments for entity ─────────────────────────────
router.get('/:entityType/:entityId', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT * FROM attachments WHERE entity_type=$1 AND entity_id=$2 ORDER BY created_at DESC`,
      [req.params.entityType, req.params.entityId]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Delete attachment ────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM attachments WHERE id=$1 AND org_id=$2`, [req.params.id, req.owner.org_id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
