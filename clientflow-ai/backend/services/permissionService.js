/**
 * RBAC Permission Service
 * Roles: super_admin, admin, manager, agent, viewer
 */

const db = require('../db');

const ROLE_HIERARCHY = ['viewer', 'agent', 'manager', 'admin', 'super_admin'];

const DEFAULT_PERMISSIONS = {
  super_admin: {
    clients:      ['read','write','delete','export'],
    payments:     ['read','write','delete','refund'],
    analytics:    ['read','export'],
    broadcasts:   ['read','write','delete','send'],
    templates:    ['read','write','delete'],
    settings:     ['read','write'],
    permissions:  ['read','write','assign'],
    provisioning: ['read','write','delete'],
    gdpr:         ['read','anonymize','delete','export'],
    monitoring:   ['read','write'],
    ai:           ['read','write'],
    segments:     ['read','write','delete'],
    campaigns:    ['read','write','delete','launch'],
  },
  admin: {
    clients:      ['read','write','delete','export'],
    payments:     ['read','write','refund'],
    analytics:    ['read','export'],
    broadcasts:   ['read','write','send'],
    templates:    ['read','write','delete'],
    settings:     ['read','write'],
    permissions:  ['read','assign'],
    provisioning: ['read','write'],
    gdpr:         ['read','export'],
    monitoring:   ['read'],
    ai:           ['read','write'],
    segments:     ['read','write'],
    campaigns:    ['read','write','launch'],
  },
  manager: {
    clients:      ['read','write','export'],
    payments:     ['read','write'],
    analytics:    ['read'],
    broadcasts:   ['read','write','send'],
    templates:    ['read','write'],
    settings:     ['read'],
    permissions:  ['read'],
    provisioning: ['read'],
    gdpr:         ['read'],
    monitoring:   ['read'],
    ai:           ['read','write'],
    segments:     ['read','write'],
    campaigns:    ['read','write'],
  },
  agent: {
    clients:      ['read','write'],
    payments:     ['read'],
    analytics:    ['read'],
    broadcasts:   ['read'],
    templates:    ['read'],
    settings:     ['read'],
    permissions:  [],
    provisioning: [],
    gdpr:         [],
    monitoring:   [],
    ai:           ['read'],
    segments:     ['read'],
    campaigns:    ['read'],
  },
  viewer: {
    clients:      ['read'],
    payments:     ['read'],
    analytics:    ['read'],
    broadcasts:   ['read'],
    templates:    ['read'],
    settings:     ['read'],
    permissions:  [],
    provisioning: [],
    gdpr:         [],
    monitoring:   [],
    ai:           [],
    segments:     ['read'],
    campaigns:    ['read'],
  },
};

async function getPermissions(userId) {
  const r = await db.query(
    `SELECT ur.role, ur.custom_permissions FROM user_roles ur WHERE ur.user_id = $1`,
    [userId]
  );
  if (!r.rows[0]) return { role: 'viewer', permissions: DEFAULT_PERMISSIONS.viewer };

  const { role, custom_permissions } = r.rows[0];
  const base = DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS.viewer;
  const merged = custom_permissions ? { ...base, ...custom_permissions } : base;
  return { role, permissions: merged };
}

async function checkPermission(userId, feature, action) {
  const { permissions } = await getPermissions(userId);
  return !!(permissions[feature] && permissions[feature].includes(action));
}

async function assignRole(userId, role) {
  if (!DEFAULT_PERMISSIONS[role]) throw new Error(`Invalid role: ${role}`);
  await db.query(
    `INSERT INTO user_roles (user_id, role, assigned_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (user_id) DO UPDATE SET role = $2, assigned_at = NOW()`,
    [userId, role]
  );
  return { userId, role };
}

async function updateRolePermissions(role, featureUpdates) {
  if (!DEFAULT_PERMISSIONS[role]) throw new Error(`Invalid role: ${role}`);
  const r = await db.query(
    `INSERT INTO role_overrides (role, permissions, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (role) DO UPDATE SET permissions = $2, updated_at = NOW()
     RETURNING *`,
    [role, JSON.stringify(featureUpdates)]
  );
  return r.rows[0];
}

async function getUsersWithRoles() {
  const r = await db.query(
    `SELECT u.id, u.name, u.email, ur.role, ur.assigned_at
     FROM users u
     LEFT JOIN user_roles ur ON u.id = ur.user_id
     ORDER BY ur.assigned_at DESC`
  );
  return r.rows;
}

module.exports = { checkPermission, assignRole, getPermissions, updateRolePermissions, getUsersWithRoles, DEFAULT_PERMISSIONS, ROLE_HIERARCHY };
