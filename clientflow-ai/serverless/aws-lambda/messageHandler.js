/**
 * AWS Lambda — WhatsApp message handler
 * Receives incoming message events, calls AI service, sends replies.
 */

const https = require('https');

const BACKEND_URL = process.env.BACKEND_URL || 'https://api.clientflow-ai.example.com';
const INTERNAL_SECRET = process.env.INTERNAL_SECRET || '';

function backendRequest(path, method, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const url     = new URL(BACKEND_URL + path);
    const req     = https.request({
      hostname: url.hostname,
      path:     url.pathname + (url.search || ''),
      method,
      headers: {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'X-Internal-Secret': INTERNAL_SECRET,
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve({ raw: data }); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

exports.handler = async (event) => {
  console.log('[Lambda] Received event:', JSON.stringify(event, null, 2));

  let body;
  try {
    body = typeof event.body === 'string' ? JSON.parse(event.body) : (event.body || event);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  // WhatsApp Cloud API webhook verification
  if (event.httpMethod === 'GET') {
    const { 'hub.mode': mode, 'hub.challenge': challenge, 'hub.verify_token': token } = event.queryStringParameters || {};
    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      return { statusCode: 200, body: challenge };
    }
    return { statusCode: 403, body: 'Forbidden' };
  }

  // Forward webhook payload to backend
  try {
    await backendRequest('/webhook', 'POST', body);
    return { statusCode: 200, body: JSON.stringify({ status: 'processed' }) };
  } catch (err) {
    console.error('[Lambda] Backend error:', err.message);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
