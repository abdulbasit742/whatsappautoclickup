/**
 * Cloudflare Worker — CDN failover + cache invalidation
 * Deploy via: wrangler deploy
 */

const PRIMARY_ORIGIN   = 'https://aws.clientflow-ai.example.com';
const SECONDARY_ORIGIN = 'https://gcp.clientflow-ai.example.com';
const TERTIARY_ORIGIN  = 'https://azure.clientflow-ai.example.com';
const HEALTH_PATH      = '/api/monitoring/health';
const BYPASS_PREFIXES  = ['/api/', '/webhook'];
const HEALTH_TTL       = 30_000; // 30 seconds

const healthCache = new Map();

async function checkOriginHealth(origin) {
  const cached = healthCache.get(origin);
  if (cached && Date.now() - cached.ts < HEALTH_TTL) return cached.healthy;

  try {
    const resp = await fetch(`${origin}${HEALTH_PATH}`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': 'CloudflareWorker/HealthCheck' },
    });
    const healthy = resp.status >= 200 && resp.status < 400;
    healthCache.set(origin, { healthy, ts: Date.now() });
    return healthy;
  } catch {
    healthCache.set(origin, { healthy: false, ts: Date.now() });
    return false;
  }
}

async function getHealthyOrigin() {
  const origins = [PRIMARY_ORIGIN, SECONDARY_ORIGIN, TERTIARY_ORIGIN];
  const checks  = await Promise.allSettled(origins.map(o => checkOriginHealth(o)));

  for (let i = 0; i < origins.length; i++) {
    if (checks[i].status === 'fulfilled' && checks[i].value) {
      return { origin: origins[i], index: i };
    }
  }
  return { origin: PRIMARY_ORIGIN, index: 0 }; // fallback
}

function shouldBypassCache(url) {
  const path = new URL(url).pathname;
  return BYPASS_PREFIXES.some(prefix => path.startsWith(prefix));
}

async function handleInvalidation(request) {
  const body = await request.json().catch(() => ({}));
  const { paths = ['/*'] } = body;

  // Purge from Cloudflare cache
  const purgeRequests = paths.map(p => `${PRIMARY_ORIGIN}${p}`);
  const results = [];

  for (const url of purgeRequests) {
    try {
      await caches.default.delete(new Request(url));
      results.push({ url, purged: true });
    } catch {
      results.push({ url, purged: false });
    }
  }

  return new Response(JSON.stringify({ results, timestamp: new Date().toISOString() }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handleHealthCheck() {
  const origins = [PRIMARY_ORIGIN, SECONDARY_ORIGIN, TERTIARY_ORIGIN];
  const checks  = await Promise.allSettled(origins.map(o => checkOriginHealth(o)));

  const status = {};
  origins.forEach((o, i) => {
    status[o] = checks[i].status === 'fulfilled' ? checks[i].value : false;
  });

  return new Response(JSON.stringify({ status, timestamp: new Date().toISOString() }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

export default {
  async fetch(request, env) {
    const url  = new URL(request.url);

    // Internal worker routes
    if (url.pathname === '/_cdn/invalidate' && request.method === 'POST') {
      return handleInvalidation(request);
    }
    if (url.pathname === '/_cdn/health') {
      return handleHealthCheck();
    }

    const { origin, index } = await getHealthyOrigin();
    const targetUrl = `${origin}${url.pathname}${url.search}`;

    // Bypass cache for API and webhook routes
    if (shouldBypassCache(request.url)) {
      const proxyRequest = new Request(targetUrl, {
        method:  request.method,
        headers: request.headers,
        body:    ['GET','HEAD'].includes(request.method) ? undefined : request.body,
      });
      const response = await fetch(proxyRequest);
      const resp = new Response(response.body, response);
      resp.headers.set('X-CF-Origin', String(index));
      resp.headers.set('X-CF-Cache', 'BYPASS');
      return resp;
    }

    // Try cache first
    const cache    = caches.default;
    const cacheKey = new Request(targetUrl, { method: 'GET', headers: { 'Accept': request.headers.get('Accept') || '*/*' } });
    const cached   = await cache.match(cacheKey);
    if (cached) {
      const resp = new Response(cached.body, cached);
      resp.headers.set('X-CF-Cache', 'HIT');
      return resp;
    }

    // Fetch from origin
    const proxyResp = await fetch(new Request(targetUrl, { method: request.method, headers: request.headers }));
    const response  = new Response(proxyResp.body, proxyResp);
    response.headers.set('X-CF-Origin', String(index));
    response.headers.set('X-CF-Cache', 'MISS');

    // Cache GET responses
    if (request.method === 'GET' && proxyResp.status === 200) {
      const toCache = response.clone();
      toCache.headers.set('Cache-Control', 'public, max-age=86400');
      await cache.put(cacheKey, toCache);
    }

    return response;
  },
};
