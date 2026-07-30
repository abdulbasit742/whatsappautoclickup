function tenantIsolation(req, res, next) {
  if (!req.user || !req.user.org_id) {
    return res.status(401).json({ success: false, error: 'Organization context required' });
  }
  req.orgId = req.user.org_id;
  next();
}

module.exports = { tenantIsolation };
