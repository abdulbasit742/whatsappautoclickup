/**
 * GDPR Anonymization Service
 * Handles PII anonymization, data export, deletion with audit logging
 */

const db     = require('../db');
const crypto = require('crypto');

function anonymizeValue(value, type = 'text') {
  if (!value) return value;
  switch (type) {
    case 'name':  return `Anonymous_${crypto.randomBytes(4).toString('hex')}`;
    case 'email': return `anon_${crypto.randomBytes(6).toString('hex')}@anonymized.invalid`;
    case 'phone': return `+00${Math.floor(Math.random() * 9000000000 + 1000000000)}`;
    case 'text':  return '[REDACTED]';
    default:      return '[REDACTED]';
  }
}

async function addAuditLog(clientId, action, performedBy, details = {}) {
  await db.query(
    `INSERT INTO gdpr_audit_log (client_id, action, performed_by, details, created_at)
     VALUES ($1,$2,$3,$4,NOW())`,
    [clientId, action, performedBy || 'system', JSON.stringify(details)]
  );
}

async function anonymizeClient(clientId, performedBy) {
  const r = await db.query(`SELECT * FROM clients WHERE id = $1`, [clientId]);
  const client = r.rows[0];
  if (!client) throw new Error('Client not found');

  const anonName  = anonymizeValue(client.name,  'name');
  const anonEmail = anonymizeValue(client.email, 'email');
  const anonPhone = anonymizeValue(client.whatsapp_number, 'phone');

  await db.query(
    `UPDATE clients SET name=$1, email=$2, whatsapp_number=$3, notes='[REDACTED]'
     WHERE id=$4`,
    [anonName, anonEmail, anonPhone, clientId]
  );

  await db.query(
    `UPDATE messages SET content='[REDACTED BY GDPR REQUEST]' WHERE client_id=$1`,
    [clientId]
  );

  await addAuditLog(clientId, 'anonymize', performedBy, { originalName: client.name, anonPhone });
  return { success: true, clientId, anonymizedAt: new Date().toISOString() };
}

async function exportClientData(clientId, performedBy) {
  const [clientRes, msgRes, payRes, apptRes] = await Promise.all([
    db.query(`SELECT * FROM clients WHERE id = $1`, [clientId]),
    db.query(`SELECT * FROM messages WHERE client_id = $1 ORDER BY created_at ASC`, [clientId]),
    db.query(`SELECT * FROM payments WHERE client_id = $1 ORDER BY created_at ASC`, [clientId]),
    db.query(`SELECT * FROM appointments WHERE client_id = $1 ORDER BY created_at ASC`, [clientId]),
  ]);

  await addAuditLog(clientId, 'export', performedBy);

  return {
    exportedAt:   new Date().toISOString(),
    clientId,
    client:       clientRes.rows[0],
    messages:     msgRes.rows,
    payments:     payRes.rows,
    appointments: apptRes.rows,
  };
}

async function deleteClientData(clientId, performedBy) {
  const r = await db.query(`SELECT name, whatsapp_number FROM clients WHERE id = $1`, [clientId]);
  if (!r.rows[0]) throw new Error('Client not found');

  await addAuditLog(clientId, 'delete', performedBy, { name: r.rows[0].name });

  // Delete in FK order
  await db.query(`DELETE FROM messages WHERE client_id=$1`, [clientId]);
  await db.query(`DELETE FROM payments WHERE client_id=$1`, [clientId]);
  await db.query(`DELETE FROM appointments WHERE client_id=$1`, [clientId]);
  await db.query(`DELETE FROM alerts WHERE client_id=$1`, [clientId]);
  await db.query(`DELETE FROM clients WHERE id=$1`, [clientId]);

  return { success: true, clientId, deletedAt: new Date().toISOString() };
}

async function getAuditLog(clientId, limit = 50) {
  const params = clientId ? [clientId, limit] : [limit];
  const where  = clientId ? `WHERE client_id=$1` : '';
  const limitParam = clientId ? `$2` : `$1`;

  const r = await db.query(
    `SELECT * FROM gdpr_audit_log ${where} ORDER BY created_at DESC LIMIT ${limitParam}`,
    params
  );
  return r.rows;
}

module.exports = { anonymizeClient, exportClientData, deleteClientData, getAuditLog };
