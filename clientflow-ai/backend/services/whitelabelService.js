/**
 * PROMPT 110 — White-Label System
 * PROMPT 111 — Custom Domain System
 * Manages organization branding and custom domain verification.
 */

const crypto = require('crypto');
const db = require('../db/index');
const cache = require('./cacheService');
const logger = require('./loggerService');

/**
 * Get branding config for an org.
 * Cached for 24h — invalidated on update.
 */
async function getBranding(orgId) {
  const cacheKey = cache.key(orgId, 'whitelabel');
  return cache.getOrFetch(cacheKey, cache.TTL.WHITELABEL, async () => {
    const { rows } = await db.query(
      `SELECT brand_name, brand_logo_url, brand_primary_color,
              brand_secondary_color, brand_custom_css, slug
       FROM organizations WHERE id = $1`,
      [orgId]
    );
    return rows[0] || null;
  });
}

/**
 * Update branding for an org.
 */
async function updateBranding(orgId, { brandName, logoUrl, primaryColor, secondaryColor, customCss }) {
  await db.query(
    `UPDATE organizations
     SET brand_name = $1, brand_logo_url = $2,
         brand_primary_color = $3, brand_secondary_color = $4,
         brand_custom_css = $5, updated_at = NOW()
     WHERE id = $6`,
    [brandName, logoUrl, primaryColor, secondaryColor, customCss, orgId]
  );
  // Invalidate cache
  await cache.invalidateOrg(orgId, 'whitelabel');
  logger.info('Branding updated', { orgId });
}

/**
 * Initiate custom domain verification.
 * Generates a TXT record token and stores it.
 * The user must add: TXT _clientflow-verify.<domain> = <token>
 */
async function initiateCustomDomain(orgId, domain) {
  const token = `clientflow-verify=${crypto.randomBytes(16).toString('hex')}`;

  // Upsert into custom_domains
  await db.query(
    `INSERT INTO custom_domains (org_id, domain, txt_record)
     VALUES ($1, $2, $3)
     ON CONFLICT (org_id) DO UPDATE SET domain = $2, txt_record = $3, verified = FALSE, verified_at = NULL`,
    [orgId, domain, token]
  );

  // Also update organizations table
  await db.query(
    `UPDATE organizations
     SET custom_domain = $1, domain_verified = FALSE, domain_txt_record = $2, updated_at = NOW()
     WHERE id = $3`,
    [domain, token, orgId]
  );

  logger.info('Custom domain initiated', { orgId, domain });
  return {
    domain,
    txtRecord: token,
    instructions: `Add a DNS TXT record:\n  Host: _clientflow-verify.${domain}\n  Value: ${token}\n\nThen call POST /api/domains/verify to confirm.`,
  };
}

/**
 * Verify custom domain via DNS TXT lookup.
 * In production, use a DNS library (e.g. dns.promises.resolveTxt).
 * Returns true on success, false on failure.
 */
async function verifyCustomDomain(orgId) {
  const { rows } = await db.query(
    `SELECT domain, txt_record FROM custom_domains WHERE org_id = $1`,
    [orgId]
  );
  if (!rows.length) throw new Error('No custom domain configured for this organization.');

  const { domain, txt_record } = rows[0];

  // Perform DNS TXT lookup
  const dns = require('dns').promises;
  try {
    const records = await dns.resolveTxt(`_clientflow-verify.${domain}`);
    const flat = records.flat();
    const verified = flat.includes(txt_record);

    if (verified) {
      await db.query(
        `UPDATE custom_domains SET verified = TRUE, verified_at = NOW() WHERE org_id = $1`,
        [orgId]
      );
      await db.query(
        `UPDATE organizations SET domain_verified = TRUE, domain_verified_at = NOW() WHERE id = $1`,
        [orgId]
      );
      logger.info('Custom domain verified', { orgId, domain });
    }
    return { verified, domain };
  } catch (err) {
    logger.warn('Domain DNS lookup failed', { orgId, domain, error: err.message });
    return { verified: false, domain, error: 'DNS lookup failed — TXT record not found yet.' };
  }
}

/**
 * Resolve org from a hostname (subdomain or custom domain).
 * Used by subdomain middleware (PROMPT 112).
 */
async function resolveOrgFromHost(hostname) {
  const appBase = process.env.APP_DOMAIN || 'app.clientflow.ai';

  // Check if it's a custom domain first
  const customDomainResult = await db.query(
    `SELECT id, slug, brand_name, brand_primary_color, plan_id
     FROM organizations
     WHERE custom_domain = $1 AND domain_verified = TRUE AND is_active = TRUE`,
    [hostname]
  );
  if (customDomainResult.rows.length) return customDomainResult.rows[0];

  // Check subdomain: e.g. company1.app.clientflow.ai
  if (hostname.endsWith('.' + appBase)) {
    const slug = hostname.replace('.' + appBase, '');
    const subdomainResult = await db.query(
      `SELECT id, slug, brand_name, brand_primary_color, plan_id
       FROM organizations
       WHERE slug = $1 AND is_active = TRUE`,
      [slug]
    );
    if (subdomainResult.rows.length) return subdomainResult.rows[0];
  }

  return null;
}

module.exports = { getBranding, updateBranding, initiateCustomDomain, verifyCustomDomain, resolveOrgFromHost };
