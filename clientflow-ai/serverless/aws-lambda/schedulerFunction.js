/**
 * AWS Lambda — Scheduled cron jobs (follow-ups, broadcasts, segment refresh)
 */

const https = require('https');

const BACKEND_URL      = process.env.BACKEND_URL || 'https://api.clientflow-ai.example.com';
const INTERNAL_SECRET  = process.env.INTERNAL_SECRET || '';

function triggerBackendJob(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(BACKEND_URL + path);
    const req = https.request({
      hostname: url.hostname,
      path:     url.pathname,
      method:   'POST',
      headers: {
        'Content-Type':      'application/json',
        'Content-Length':    '2',
        'X-Internal-Secret': INTERNAL_SECRET,
      },
    }, (res) => {
      let data = '';
      res.on('data', c => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    req.write('{}');
    req.end();
  });
}

const JOBS = {
  'followup-check':    '/api/followups/cron/due',
  'broadcast-queue':   '/api/broadcasts/cron/process',
  'segment-refresh':   '/api/segments/cron/refresh',
  'winback-check':     '/api/winback/cron/check',
  'engagement-scan':   '/api/engagement/cron/scan',
};

exports.handler = async (event) => {
  console.log('[Scheduler] Triggered:', JSON.stringify(event));

  const jobName = event.jobName || event.detail?.jobName || 'followup-check';
  const jobPath = JOBS[jobName];

  if (!jobPath) {
    console.warn('[Scheduler] Unknown job:', jobName);
    return { statusCode: 400, body: `Unknown job: ${jobName}` };
  }

  try {
    const result = await triggerBackendJob(jobPath);
    console.info(`[Scheduler] Job ${jobName} completed:`, result.status);
    return { statusCode: 200, body: JSON.stringify({ job: jobName, result }) };
  } catch (err) {
    console.error(`[Scheduler] Job ${jobName} failed:`, err.message);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
