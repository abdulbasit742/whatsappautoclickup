const auditService = require('./audit.service');

async function listAuditLogs(req, res, next) {
  try {
    const result = await auditService.listAuditLogs(req.orgId, req.query);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
}

module.exports = { listAuditLogs };
