/**
 * Region-specific routing logic based on client IP geolocation.
 * Uses MaxMind GeoIP or ip-api.com for IP-to-country mapping.
 */

const https = require('https');

const REGION_CLOUD_MAP = {
  // North America → AWS us-east-1
  US: 'aws', CA: 'aws', MX: 'aws',
  // Europe → Azure eastus / West Europe
  GB: 'azure', DE: 'azure', FR: 'azure', NL: 'azure', SE: 'azure',
  NO: 'azure', DK: 'azure', FI: 'azure', IT: 'azure', ES: 'azure',
  PL: 'azure', RO: 'azure', UA: 'azure', TR: 'azure',
  // Asia-Pacific → GCP us-central1 / asia-southeast1
  PK: 'gcp', IN: 'gcp', BD: 'gcp', CN: 'gcp', JP: 'gcp',
  KR: 'gcp', SG: 'gcp', MY: 'gcp', ID: 'gcp', TH: 'gcp',
  AU: 'gcp', NZ: 'gcp',
  // Middle East → GCP
  SA: 'gcp', AE: 'gcp', QA: 'gcp', KW: 'gcp', BH: 'gcp', OM: 'gcp',
  // Africa → Azure (South Africa region)
  ZA: 'azure', NG: 'azure', KE: 'azure', EG: 'azure', GH: 'azure',
  // Latin America → AWS
  BR: 'aws', AR: 'aws', CO: 'aws', CL: 'aws', PE: 'aws',
};

const CLOUD_ENDPOINTS = {
  aws:   process.env.AWS_ENDPOINT   || 'https://aws.clientflow-ai.example.com',
  gcp:   process.env.GCP_ENDPOINT   || 'https://gcp.clientflow-ai.example.com',
  azure: process.env.AZURE_ENDPOINT || 'https://azure.clientflow-ai.example.com',
  default: process.env.DEFAULT_ENDPOINT || 'https://clientflow-ai.example.com',
};

const ipCache = new Map();
const CACHE_TTL_MS = 3600_000; // 1 hour

function getCachedGeo(ip) {
  const entry = ipCache.get(ip);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    ipCache.delete(ip);
    return null;
  }
  return entry.data;
}

function getClientIp(req) {
  return (
    req.headers['cf-connecting-ip'] ||
    req.headers['x-real-ip'] ||
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    '127.0.0.1'
  );
}

function lookupGeo(ip) {
  return new Promise((resolve) => {
    const cached = getCachedGeo(ip);
    if (cached) return resolve(cached);

    const url = `https://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,countryCode,country,regionName,city,timezone,isp`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.status === 'success') {
            ipCache.set(ip, { data: parsed, timestamp: Date.now() });
            resolve(parsed);
          } else {
            resolve({ countryCode: 'UNKNOWN' });
          }
        } catch {
          resolve({ countryCode: 'UNKNOWN' });
        }
      });
    }).on('error', () => resolve({ countryCode: 'UNKNOWN' }));
  });
}

function resolveCloudForCountry(countryCode, cloudStatus = null) {
  const preferred = REGION_CLOUD_MAP[countryCode] || 'aws';
  if (!cloudStatus) return preferred;

  // Fallback to next healthy cloud if preferred is down
  if (cloudStatus[preferred]?.healthy) return preferred;

  const fallbackOrder = ['aws', 'gcp', 'azure'].filter(c => c !== preferred);
  for (const cloud of fallbackOrder) {
    if (cloudStatus[cloud]?.healthy) return cloud;
  }
  return preferred; // last resort
}

async function geoRoute(req, cloudStatus = null) {
  const ip = getClientIp(req);

  // Skip geo lookup for private/loopback IPs
  if (ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('127.') || ip === '::1') {
    return { ip, countryCode: 'LOCAL', cloud: 'aws', endpoint: CLOUD_ENDPOINTS.aws };
  }

  const geo     = await lookupGeo(ip);
  const cloud   = resolveCloudForCountry(geo.countryCode, cloudStatus);
  const endpoint = CLOUD_ENDPOINTS[cloud] || CLOUD_ENDPOINTS.default;

  return {
    ip,
    countryCode: geo.countryCode,
    country:     geo.country,
    region:      geo.regionName,
    timezone:    geo.timezone,
    cloud,
    endpoint,
  };
}

/**
 * Express middleware that sets req.geoRoute with routing info.
 */
function geoRouterMiddleware(cloudStatus = null) {
  return async (req, _res, next) => {
    try {
      req.geoRoute = await geoRoute(req, cloudStatus);
    } catch {
      req.geoRoute = { cloud: 'aws', endpoint: CLOUD_ENDPOINTS.aws };
    }
    next();
  };
}

module.exports = { geoRoute, geoRouterMiddleware, resolveCloudForCountry, getClientIp };
