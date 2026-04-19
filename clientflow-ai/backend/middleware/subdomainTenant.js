/**
 * PROMPT 112 — Subdomain Multi-Tenant Routing
 * Detects organization from hostname (subdomain or custom domain).
 * Attaches org to req.tenantOrg for downstream use.
 */

const whitelabelService = require('../services/whitelabelService');
const cache = require('../services/cacheService');
const logger = require('../services/loggerService');

module.exports = async function subdomainTenant(req, res, next) {
  const hostname = req.hostname; // e.g. 'acme.app.clientflow.ai' or 'portal.acme.com'
  const appDomain = process.env.APP_DOMAIN || 'app.clientflow.ai';

  // Skip for the main app domain itself (no subdomain)
  if (hostname === appDomain || hostname === 'localhost' || hostname === '127.0.0.1') {
    return next();
  }

  try {
    // Cache org resolution for 5 minutes
    const cacheKey = `tenant:host:${hostname}`;
    let org = await cache.get(cacheKey);

    if (!org) {
      org = await whitelabelService.resolveOrgFromHost(hostname);
      if (org) await cache.set(cacheKey, org, 300);
    }

    if (org) {
      req.tenantOrg = org;
      // If request has no Authorization but has tenant org, expose branding only
    } else {
      logger.warn('Unknown tenant hostname', { hostname });
    }
  } catch (err) {
    logger.warn('Subdomain tenant resolution failed', { hostname, error: err.message });
  }

  next();
};
