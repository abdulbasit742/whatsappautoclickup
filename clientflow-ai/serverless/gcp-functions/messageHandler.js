/**
 * Google Cloud Function — WhatsApp message handler
 */

const https = require('https');

const BACKEND_URL     = process.env.BACKEND_URL    || 'https://api.clientflow-ai.example.com';
const INTERNAL_SECRET = process.env.INTERNAL_SECRET || '';
const VERIFY_TOKEN    = process.env.WHATSAPP_VERIFY_TOKEN || '';

function backendRequest(path, method, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const url     = new URL(BACKEND_URL + path);
    const req     = https.request({
      hostname: url.hostname,
      path:     url.pathname,
      method,
      headers: {
        'Content-Type':      'application/json',
        'Content-Length':    Buffer.byteLength(payload),
        'X-Internal-Secret': INTERNAL_SECRET,
      },
    }, (res) => {
      let data = '';
      res.on('data', c => (data += c));
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve({ raw: data }); } });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

exports.whatsappMessageHandler = async (req, res) => {
  if (req.method === 'GET') {
    const { 'hub.mode': mode, 'hub.challenge': challenge, 'hub.verify_token': token } = req.query;
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Forbidden');
  }

  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    await backendRequest('/webhook', 'POST', req.body || {});
    return res.status(200).json({ status: 'processed' });
  } catch (err) {
    console.error('[GCF] Error forwarding to backend:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
