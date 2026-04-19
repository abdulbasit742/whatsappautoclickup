const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

router.use(auth);

async function runBackup() {
  const tables = ['clients','messages','payments','services','templates','broadcasts','appointments','reviews','referrals','follow_ups','alerts','ai_logs'];
  const dump = {};
  for (const t of tables) {
    const r = await db.query(`SELECT * FROM ${t}`);
    dump[t] = r.rows;
  }
  const dir = 'uploads/backups';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filename = `backup_${Date.now()}.json`;
  const filepath = path.join(dir, filename);
  const content = JSON.stringify(dump, null, 2);
  fs.writeFileSync(filepath, content);
  return { filename, filepath, size: Buffer.byteLength(content) };
}

// POST /api/backup — trigger manual backup
router.post('/', async (req, res) => {
  try {
    const job = (await db.query(
      `INSERT INTO backup_jobs (type, status) VALUES ('manual','running') RETURNING *`
    )).rows[0];

    const { filename, size } = await runBackup();

    await db.query(
      `UPDATE backup_jobs SET status='done', file_url=$1, size_bytes=$2 WHERE id=$3`,
      [`/uploads/backups/${filename}`, size, job.id]
    );

    res.json({ job_id: job.id, file_url: `/uploads/backups/${filename}`, size_bytes: size });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/backup — list backup jobs
router.get('/', async (req, res) => {
  try {
    const r = await db.query(`SELECT * FROM backup_jobs ORDER BY created_at DESC LIMIT 20`);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = { router, runBackup };
