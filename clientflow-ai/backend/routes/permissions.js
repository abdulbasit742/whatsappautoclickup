const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const { checkPermission, assignRole, getPermissions, updateRolePermissions, getUsersWithRoles, DEFAULT_PERMISSIONS, ROLE_HIERARCHY } = require('../services/permissionService');

router.use(auth);

// GET /api/permissions — list all roles and their default permissions
router.get('/', async (req, res) => {
  try {
    const roles = Object.entries(DEFAULT_PERMISSIONS).map(([role, permissions]) => ({
      role,
      permissions,
      hierarchyLevel: ROLE_HIERARCHY.indexOf(role),
    }));
    const users = await getUsersWithRoles();
    res.json({ roles, users, roleHierarchy: ROLE_HIERARCHY });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/permissions/assign — assign role to user
router.post('/assign', async (req, res) => {
  try {
    const { userId, role } = req.body;
    if (!userId || !role) return res.status(400).json({ error: 'userId and role required' });
    const result = await assignRole(userId, role);
    res.json(result);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// GET /api/permissions/user/:userId — get permissions for a specific user
router.get('/user/:userId', async (req, res) => {
  try {
    const perms = await getPermissions(req.params.userId);
    res.json(perms);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/permissions/role/:role — update role permissions
router.put('/role/:role', async (req, res) => {
  try {
    const { permissions } = req.body;
    if (!permissions) return res.status(400).json({ error: 'permissions required' });
    const result = await updateRolePermissions(req.params.role, permissions);
    res.json(result);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// GET /api/permissions/check — check if current user has permission
router.get('/check', async (req, res) => {
  try {
    const { feature, action } = req.query;
    const userId = req.owner?.id;
    if (!feature || !action || !userId) return res.status(400).json({ error: 'feature, action required' });
    const allowed = await checkPermission(userId, feature, action);
    res.json({ allowed, feature, action });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
