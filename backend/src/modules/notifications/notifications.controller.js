const notificationsService = require('./notifications.service');

async function listNotifications(req, res, next) {
  try {
    const result = await notificationsService.listNotifications(req.orgId, req.user.id, req.query);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
}

async function markRead(req, res, next) {
  try {
    await notificationsService.markRead(req.orgId, req.params.id, req.user.id);
    res.json({ success: true, data: { message: 'Notification marked as read' } });
  } catch (err) { next(err); }
}

async function markAllRead(req, res, next) {
  try {
    await notificationsService.markAllRead(req.orgId, req.user.id);
    res.json({ success: true, data: { message: 'All notifications marked as read' } });
  } catch (err) { next(err); }
}

module.exports = { listNotifications, markRead, markAllRead };
