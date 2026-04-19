/**
 * PROMPT 117 — ClientFlow AI JavaScript SDK
 * A lightweight API client for the ClientFlow AI REST API.
 *
 * Installation:
 *   npm install clientflow-ai-sdk
 *   // or copy this file directly
 *
 * Usage:
 *   const ClientFlow = require('clientflow-ai-sdk');
 *   const cf = new ClientFlow({ baseUrl: 'https://api.clientflow.ai', token: 'your-jwt' });
 *   const clients = await cf.clients.list();
 */

class ClientFlowSDK {
  /**
   * @param {Object} config
   * @param {string} config.baseUrl   API base URL (e.g. 'https://api.clientflow.ai/api/v1')
   * @param {string} [config.token]   JWT token (set after login, or pass directly)
   * @param {number} [config.timeout] Request timeout in ms (default: 30000)
   */
  constructor({ baseUrl, token, timeout = 30000 } = {}) {
    this.baseUrl = (baseUrl || 'http://localhost:5000/api/v1').replace(/\/$/, '');
    this.token   = token || null;
    this.timeout = timeout;

    // Resource namespaces
    this.auth        = new AuthResource(this);
    this.clients     = new ClientsResource(this);
    this.broadcasts  = new BroadcastsResource(this);
    this.payments    = new PaymentsResource(this);
    this.analytics   = new AnalyticsResource(this);
    this.ai          = new AIResource(this);
    this.sessions    = new SessionsResource(this);
    this.experiments = new ExperimentsResource(this);
    this.branding    = new BrandingResource(this);
    this.usage       = new UsageResource(this);
  }

  /** Set token after login */
  setToken(token) {
    this.token = token;
  }

  /** Internal HTTP request */
  async _request(method, path, { body, params } = {}) {
    const url    = new URL(this.baseUrl + path);
    if (params) {
      Object.entries(params).forEach(([k, v]) => v != null && url.searchParams.set(k, v));
    }

    const headers = { 'Content-Type': 'application/json' };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(url.toString(), {
        method,
        headers,
        body:   body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timer);
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const err = new Error(data.error || `HTTP ${res.status}`);
        err.status  = res.status;
        err.code    = data.code;
        err.details = data.details;
        throw err;
      }
      return data;
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  }

  _get(path, params)  { return this._request('GET',    path, { params }); }
  _post(path, body)   { return this._request('POST',   path, { body }); }
  _put(path, body)    { return this._request('PUT',    path, { body }); }
  _patch(path, body)  { return this._request('PATCH',  path, { body }); }
  _delete(path)       { return this._request('DELETE', path); }
}

// ─── Resources ────────────────────────────────────────────────────────────────

class AuthResource {
  constructor(sdk) { this._sdk = sdk; }

  /**
   * Login and automatically set the token on the SDK instance.
   * @param {string} email
   * @param {string} password
   * @param {string} [orgSlug]  Required for multi-tenant mode
   */
  async login(email, password, orgSlug) {
    const data = await this._sdk._post('/auth/login', { email, password, orgSlug });
    if (data.token) this._sdk.setToken(data.token);
    return data;
  }

  /** Register a new organization + owner account */
  registerOrg(orgName, orgSlug, email, password, name) {
    return this._sdk._post('/auth/register-org', { orgName, orgSlug, email, password, name });
  }

  /** Get current authenticated user */
  me() { return this._sdk._get('/auth/me'); }

  /** Logout current session */
  logout() { return this._sdk._post('/auth/logout'); }
}

class ClientsResource {
  constructor(sdk) { this._sdk = sdk; }

  /** List clients with optional filters */
  list({ status, search, page = 1, limit = 50 } = {}) {
    return this._sdk._get('/clients', { status, search, page, limit });
  }

  /** Get a single client by ID */
  get(id) { return this._sdk._get(`/clients/${id}`); }

  /** Create a new client */
  create(data) { return this._sdk._post('/clients', data); }

  /** Update a client */
  update(id, data) { return this._sdk._put(`/clients/${id}`, data); }

  /** Delete a client */
  delete(id) { return this._sdk._delete(`/clients/${id}`); }
}

class BroadcastsResource {
  constructor(sdk) { this._sdk = sdk; }

  list()       { return this._sdk._get('/broadcasts'); }
  get(id)      { return this._sdk._get(`/broadcasts/${id}`); }
  create(data) { return this._sdk._post('/broadcasts', data); }
  send(id)     { return this._sdk._post(`/broadcasts/${id}/send`); }
}

class PaymentsResource {
  constructor(sdk) { this._sdk = sdk; }

  list({ status } = {})   { return this._sdk._get('/payments', { status }); }
  get(id)                 { return this._sdk._get(`/payments/${id}`); }
  create(data)            { return this._sdk._post('/payments', data); }
  confirm(id)             { return this._sdk._post(`/payments/${id}/confirm`); }
}

class AnalyticsResource {
  constructor(sdk) { this._sdk = sdk; }

  dashboard()     { return this._sdk._get('/analytics'); }
  revenue()       { return this._sdk._get('/analytics/revenue'); }
  aiUsage()       { return this._sdk._get('/analytics/ai'); }
}

class AIResource {
  constructor(sdk) { this._sdk = sdk; }

  /** Send a message and get AI reply */
  reply(clientId, message) {
    return this._sdk._post('/ai/reply', { clientId, message });
  }

  /** Get AI reply suggestions */
  suggest(clientId, context) {
    return this._sdk._post('/ai/suggest', { clientId, context });
  }
}

class SessionsResource {
  constructor(sdk) { this._sdk = sdk; }

  list()               { return this._sdk._get('/sessions'); }
  revoke(sessionId)    { return this._sdk._delete(`/sessions/${sessionId}`); }
  revokeAll()          { return this._sdk._delete('/sessions'); }
}

class ExperimentsResource {
  constructor(sdk) { this._sdk = sdk; }

  list()                              { return this._sdk._get('/experiments'); }
  create(data)                        { return this._sdk._post('/experiments', data); }
  start(id)                           { return this._sdk._put(`/experiments/${id}/start`); }
  results(id)                         { return this._sdk._get(`/experiments/${id}/results`); }
  setWinner(id, winner)               { return this._sdk._post(`/experiments/${id}/winner`, { winner }); }
  recordConversion(id, clientId)      { return this._sdk._post(`/experiments/${id}/convert`, { clientId }); }
}

class BrandingResource {
  constructor(sdk) { this._sdk = sdk; }

  get()          { return this._sdk._get('/branding'); }
  update(data)   { return this._sdk._put('/branding', data); }
  initDomain(domain)  { return this._sdk._post('/domains/initiate', { domain }); }
  verifyDomain()      { return this._sdk._post('/domains/verify'); }
  getDomain()         { return this._sdk._get('/domains'); }
}

class UsageResource {
  constructor(sdk) { this._sdk = sdk; }

  monthly()     { return this._sdk._get('/usage/monthly'); }
  topFeatures() { return this._sdk._get('/usage/top-features'); }
}

// ─── Export ───────────────────────────────────────────────────────────────────

// CommonJS + ESM compatible
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ClientFlowSDK;
  module.exports.default = ClientFlowSDK;
}
if (typeof window !== 'undefined') {
  window.ClientFlowSDK = ClientFlowSDK;
}

export default ClientFlowSDK;
