const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

router.use(auth);

const upload = multer({ dest: 'uploads/imports/' });

// POST /api/import/upload — upload CSV/Excel file, return preview
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    // Read and parse CSV (basic)
    const content = fs.readFileSync(file.path, 'utf8');
    const lines = content.split('\n').filter(l => l.trim());
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const preview = lines.slice(1, 6).map(line => {
      const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const obj = {};
      headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
      return obj;
    });

    const job = await db.query(
      `INSERT INTO import_jobs (filename, file_url, total_rows, status, preview_data)
       VALUES ($1,$2,$3,'mapping',$4) RETURNING *`,
      [file.originalname, `/uploads/imports/${file.filename}`, lines.length - 1, JSON.stringify(preview)]
    );
    res.json({ job: job.rows[0], headers, preview });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/import/:id/map — set column mapping and start import
router.post('/:id/map', async (req, res) => {
  try {
    const { column_map } = req.body;
    await db.query(
      `UPDATE import_jobs SET column_map=$1, status='importing' WHERE id=$2`,
      [JSON.stringify(column_map), req.params.id]
    );

    const job = (await db.query(`SELECT * FROM import_jobs WHERE id=$1`, [req.params.id])).rows[0];
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const content = fs.readFileSync(job.file_url.replace('/uploads', 'uploads'), 'utf8');
    const lines = content.split('\n').filter(l => l.trim());
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

    let imported = 0;
    let skipped = 0;
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const row = {};
      headers.forEach((h, idx) => { row[h] = vals[idx] || ''; });

      const phone = row[column_map.whatsapp_number || 'whatsapp_number'];
      if (!phone) { skipped++; continue; }

      try {
        await db.query(
          `INSERT INTO clients (whatsapp_number, name, email, status)
           VALUES ($1,$2,$3,$4) ON CONFLICT(whatsapp_number) DO NOTHING`,
          [phone, row[column_map.name || 'name'] || null, row[column_map.email || 'email'] || null, 'lead']
        );
        imported++;
      } catch (e) {
        errors.push({ row: i, error: e.message });
        skipped++;
      }
    }

    await db.query(
      `UPDATE import_jobs SET status='done', imported=$1, skipped=$2, errors=$3 WHERE id=$4`,
      [imported, skipped, JSON.stringify(errors), req.params.id]
    );

    res.json({ imported, skipped, errors });
  } catch (err) {
    await db.query(`UPDATE import_jobs SET status='failed' WHERE id=$1`, [req.params.id]).catch(() => {});
    res.status(500).json({ error: err.message });
  }
});

// GET /api/import — list import jobs
router.get('/', async (req, res) => {
  try {
    const r = await db.query(`SELECT * FROM import_jobs ORDER BY created_at DESC LIMIT 20`);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/import/:id
router.get('/:id', async (req, res) => {
  try {
    const r = await db.query(`SELECT * FROM import_jobs WHERE id=$1`, [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
