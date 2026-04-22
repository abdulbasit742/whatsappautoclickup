/**
 * User Provisioning Service
 * Handles user creation, bulk CSV import, role assignment, email verification
 */

const db     = require('../db');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

function parseCSV(csvData) {
  const lines  = csvData.trim().split('\n');
  const header = lines[0].split(',').map(h => h.trim().toLowerCase());
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    return header.reduce((obj, key, i) => { obj[key] = values[i] || ''; return obj; }, {});
  });
}

function inferRoleFromAttributes(attributes) {
  const { department, title, level } = attributes;
  if (!department && !title) return 'agent';
  const t = (title || '').toLowerCase();
  const d = (department || '').toLowerCase();
  if (t.includes('ceo') || t.includes('cto') || t.includes('owner') || level === 'executive') return 'super_admin';
  if (t.includes('manager') || t.includes('head') || d.includes('management')) return 'manager';
  if (t.includes('admin') || t.includes('supervisor')) return 'admin';
  if (t.includes('viewer') || t.includes('analyst')) return 'viewer';
  return 'agent';
}

async function createUser(userData) {
  const { name, email, password, role, phone, department, title } = userData;
  if (!email || !name) throw new Error('name and email are required');

  const existing = await db.query(`SELECT id FROM users WHERE email = $1`, [email]);
  if (existing.rows[0]) throw new Error(`User with email ${email} already exists`);

  const hashedPassword    = await bcrypt.hash(password || crypto.randomBytes(8).toString('hex'), 10);
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const assignedRole      = role || inferRoleFromAttributes({ department, title });

  const r = await db.query(
    `INSERT INTO users (name, email, password_hash, phone, department, title, verification_token, is_verified, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,false,NOW()) RETURNING id, name, email, is_verified, created_at`,
    [name, email, hashedPassword, phone || null, department || null, title || null, verificationToken]
  );

  const user = r.rows[0];
  await db.query(
    `INSERT INTO user_roles (user_id, role, assigned_at) VALUES ($1,$2,NOW())`,
    [user.id, assignedRole]
  );

  return { ...user, role: assignedRole, verificationToken };
}

async function bulkImportUsers(csvData) {
  const rows    = parseCSV(csvData);
  const results = { success: [], errors: [] };

  for (const row of rows) {
    try {
      const user = await createUser({
        name:       row.name || row.full_name,
        email:      row.email,
        phone:      row.phone || row.whatsapp,
        role:       row.role || undefined,
        department: row.department,
        title:      row.title || row.job_title,
      });
      results.success.push({ email: row.email, userId: user.id, role: user.role });
    } catch (err) {
      results.errors.push({ email: row.email, error: err.message });
    }
  }

  return results;
}

async function assignRoleByAttribute(userId, attributes) {
  const role = inferRoleFromAttributes(attributes);
  await db.query(
    `INSERT INTO user_roles (user_id, role, assigned_at) VALUES ($1,$2,NOW())
     ON CONFLICT (user_id) DO UPDATE SET role = $2, assigned_at = NOW()`,
    [userId, role]
  );
  return { userId, role };
}

async function verifyEmail(token) {
  const r = await db.query(
    `UPDATE users SET is_verified = true, verification_token = NULL, verified_at = NOW()
     WHERE verification_token = $1 RETURNING id, name, email`,
    [token]
  );
  if (!r.rows[0]) throw new Error('Invalid or expired verification token');
  return r.rows[0];
}

async function listProvisionedUsers({ page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;
  const r = await db.query(
    `SELECT u.id, u.name, u.email, u.phone, u.department, u.title, u.is_verified, u.created_at,
            ur.role
     FROM users u
     LEFT JOIN user_roles ur ON ur.user_id = u.id
     ORDER BY u.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return r.rows;
}

module.exports = { createUser, bulkImportUsers, assignRoleByAttribute, verifyEmail, listProvisionedUsers };
