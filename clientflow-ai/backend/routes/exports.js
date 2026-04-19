const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { createObjectCsvStringifier } = require('csv-writer').createObjectCsvStringifier
  ? require('csv-writer')
  : { createObjectCsvStringifier: null };

router.use(auth);

// ─── List export jobs ─────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT ej.*, tm.name AS requested_by_name FROM export_jobs ej
       LEFT JOIN team_members tm ON tm.id=ej.requested_by
       WHERE ej.org_id=$1 ORDER BY ej.created_at DESC LIMIT 50`,
      [req.owner.org_id]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Request an export ────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { type } = req.body;
    const validTypes = ['contacts','campaigns','ai_usage','issues','payments','analytics_pdf'];
    if (!validTypes.includes(type)) return res.status(400).json({ error: 'Invalid export type' });

    const job = (await db.query(
      `INSERT INTO export_jobs (org_id, type, status, requested_by) VALUES ($1,$2,'pending',$3) RETURNING *`,
      [req.owner.org_id, type, req.owner.id || null]
    )).rows[0];

    // Immediately process simple CSV exports
    if (type === 'contacts') {
      const rows = (await db.query(`SELECT id, name, email, whatsapp_number, status, created_at FROM clients`)).rows;
      const csv = toCSV(rows);
      const filename = `contacts-${Date.now()}.csv`;
      require('fs').writeFileSync(`uploads/${filename}`, csv);
      await db.query(
        `UPDATE export_jobs SET status='done', file_url=$1, completed_at=NOW() WHERE id=$2`,
        [`/uploads/${filename}`, job.id]
      );
      return res.json({ ...job, status: 'done', file_url: `/uploads/${filename}` });
    }
    if (type === 'issues') {
      const rows = (await db.query(`SELECT id, title, status, priority, created_at FROM issues WHERE org_id=$1`, [req.owner.org_id])).rows;
      const csv = toCSV(rows);
      const filename = `issues-${Date.now()}.csv`;
      require('fs').writeFileSync(`uploads/${filename}`, csv);
      await db.query(
        `UPDATE export_jobs SET status='done', file_url=$1, completed_at=NOW() WHERE id=$2`,
        [`/uploads/${filename}`, job.id]
      );
      return res.json({ ...job, status: 'done', file_url: `/uploads/${filename}` });
    }

    res.json(job);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

function toCSV(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]).join(',');
  const lines = rows.map(r => Object.values(r).map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','));
  return [headers, ...lines].join('\n');
}

module.exports = router;
