/**
 * Data Migration Service
 * Handles CSV-based customer data migration with field mapping, rollback support
 */

const db     = require('../db');
const crypto = require('crypto');

const migrationJobs = new Map();

function transformRow(row, mapping) {
  const result = {};
  for (const [targetField, sourceField] of Object.entries(mapping)) {
    result[targetField] = row[sourceField] ?? row[targetField] ?? null;
  }
  return result;
}

function parseCSV(csvData) {
  const lines  = csvData.trim().split('\n');
  const header = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    return header.reduce((obj, key, i) => { obj[key] = values[i] ?? ''; return obj; }, {});
  });
}

async function migrateClient(sourceData, mapping) {
  const transformed = transformRow(sourceData, mapping);
  const { name, email, whatsapp_number, phone, notes, status } = transformed;

  const phone_number = whatsapp_number || phone;
  if (!phone_number) throw new Error('whatsapp_number or phone is required');

  const r = await db.query(
    `INSERT INTO clients (whatsapp_number, name, email, notes, status, created_at, last_active_at)
     VALUES ($1,$2,$3,$4,$5,NOW(),NOW())
     ON CONFLICT (whatsapp_number) DO UPDATE
       SET name = COALESCE($2, clients.name),
           email = COALESCE($3, clients.email),
           notes = COALESCE($4, clients.notes)
     RETURNING *`,
    [phone_number, name || null, email || null, notes || null, status || 'lead']
  );

  return { success: true, clientId: r.rows[0].id, phone: phone_number };
}

async function batchMigrate(csvData, mapping) {
  const jobId = `mig_${crypto.randomBytes(6).toString('hex')}`;
  const rows  = parseCSV(csvData);

  const job = {
    jobId,
    status:     'running',
    total:      rows.length,
    processed:  0,
    success:    0,
    errors:     [],
    startedAt:  new Date().toISOString(),
    completedAt: null,
    insertedIds: [],
  };

  migrationJobs.set(jobId, job);

  await db.query(
    `INSERT INTO migration_jobs (id, status, total_rows, processed_rows, errors, started_at)
     VALUES ($1,'running',$2,0,'[]',NOW())`,
    [jobId, rows.length]
  );

  // Process asynchronously
  (async () => {
    for (const row of rows) {
      try {
        const result = await migrateClient(row, mapping);
        job.success++;
        if (result.clientId) job.insertedIds.push(result.clientId);
      } catch (err) {
        job.errors.push({ row: JSON.stringify(row).slice(0, 100), error: err.message });
      }
      job.processed++;

      if (job.processed % 10 === 0) {
        await db.query(
          `UPDATE migration_jobs SET processed_rows=$1, errors=$2 WHERE id=$3`,
          [job.processed, JSON.stringify(job.errors), jobId]
        );
      }
    }

    job.status      = 'completed';
    job.completedAt = new Date().toISOString();

    await db.query(
      `UPDATE migration_jobs SET status='completed', processed_rows=$1, errors=$2, completed_at=NOW() WHERE id=$3`,
      [job.processed, JSON.stringify(job.errors), jobId]
    );
  })();

  return { jobId, total: rows.length, status: 'started' };
}

async function getMigrationStatus(jobId) {
  const job = migrationJobs.get(jobId);
  if (job) return job;

  const r = await db.query(`SELECT * FROM migration_jobs WHERE id=$1`, [jobId]);
  if (!r.rows[0]) throw new Error('Job not found');
  return r.rows[0];
}

async function rollbackMigration(jobId) {
  const r = await db.query(`SELECT * FROM migration_jobs WHERE id=$1`, [jobId]);
  const job = r.rows[0];
  if (!job) throw new Error('Job not found');
  if (job.status !== 'completed') throw new Error('Can only rollback completed jobs');

  // Delete inserted records by tracking inserted_ids if available
  const inMemory = migrationJobs.get(jobId);
  if (inMemory?.insertedIds?.length) {
    for (const clientId of inMemory.insertedIds) {
      await db.query(`DELETE FROM clients WHERE id=$1`, [clientId]);
    }
  }

  await db.query(`UPDATE migration_jobs SET status='rolled_back', rolled_back_at=NOW() WHERE id=$1`, [jobId]);
  return { jobId, status: 'rolled_back', rollbackAt: new Date().toISOString() };
}

async function listMigrationJobs() {
  const r = await db.query(`SELECT * FROM migration_jobs ORDER BY started_at DESC LIMIT 50`);
  return r.rows;
}

module.exports = { migrateClient, batchMigrate, getMigrationStatus, rollbackMigration, listMigrationJobs };
