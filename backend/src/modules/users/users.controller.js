const usersService = require('./users.service');

async function listUsers(req, res, next) {
  try {
    const result = await usersService.listUsers(req.orgId, req.query);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
}

async function inviteUser(req, res, next) {
  try {
    const user = await usersService.inviteUser(req.orgId, req.body, req.user.id);
    res.status(201).json({ success: true, data: user });
  } catch (err) { next(err); }
}

async function getUser(req, res, next) {
  try {
    const user = await usersService.getUser(req.orgId, req.params.id);
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
}

async function updateUser(req, res, next) {
  try {
    const user = await usersService.updateUser(req.orgId, req.params.id, req.body, req.user);
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
}

async function deleteUser(req, res, next) {
  try {
    await usersService.deleteUser(req.orgId, req.params.id, req.user.id);
    res.json({ success: true, data: { message: 'User deactivated' } });
  } catch (err) { next(err); }
}

async function changeRole(req, res, next) {
  try {
    const user = await usersService.changeRole(req.orgId, req.params.id, req.body.role);
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
}

async function suspendUser(req, res, next) {
  try {
    const user = await usersService.suspendUser(req.orgId, req.params.id, req.user.id);
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
}

module.exports = { listUsers, inviteUser, getUser, updateUser, deleteUser, changeRole, suspendUser };
