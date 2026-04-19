const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

router.use(auth);

function toCSV(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  rows.forEach(row => {
    lines.push(headers.map(h => {
      const v = row[h] == null ? '' : String(row[h]);
      return `"${v.replace(/"/g, '""')}"`;
    }).join(','));
  });
  return lines.join('\n');
}

// POST /api/export — create export job and generate file
router.post('/', async (req, res) => {
  try {
    const { entity_type, filters = {}, format = 'csv' } = req.body;

    const job = (await db.query(
      `INSERT INTO export_jobs (entity_type, filters, format, status) VALUES ($1,$2,$3,'processing') RETURNING *`,
      [entity_type, JSON.stringify(filters), format]
    )).rows[0];

    let rows = [];
    if (entity_type === 'clients') {
      const r = await db.query(`SELECT id,name,whatsapp_number,email,status,total_spent_pkr,created_at FROM clients ORDER BY created_at DESC`);
      rows = r.rows;
    } else if (entity_type === 'payments') {
      const r = await db.query(`SELECT p.*,c.name AS client_name FROM payments p LEFT JOIN clients c ON c.id=p.client_id ORDER BY p.created_at DESC`);
      rows = r.rows;
    } else if (entity_type === 'messages') {
      const r = await db.query(`SELECT m.*,c.name AS client_name FROM messages m LEFT JOIN clients c ON c.id=m.client_id ORDER BY m.created_at DESC LIMIT 5000`);
      rows = r.rows;
    } else if (entity_type === 'analytics') {
      const r = await db.query(`SELECT DATE_TRUNC('day',created_at) AS date, COUNT(*) AS messages FROM messages GROUP BY 1 ORDER BY 1`);
      rows = r.rows;
    }

    const dir = 'uploads/exports';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const filename = `export_${entity_type}_${Date.now()}.csv`;
    const filepath = path.join(dir, filename);
    fs.writeFileSync(filepath, toCSV(rows));

    await db.query(
      `UPDATE export_jobs SET status='done', file_url=$1 WHERE id=$2`,
      [`/uploads/exports/${filename}`, job.id]
    );

    res.json({ job_id: job.id, file_url: `/uploads/exports/${filename}`, rows: rows.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/export — list export jobs
router.get('/', async (req, res) => {
  try {
    const r = await db.query(`SELECT * FROM export_jobs ORDER BY created_at DESC LIMIT 20`);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
