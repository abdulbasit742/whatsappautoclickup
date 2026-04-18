// ─── Lightweight structured logger ───────────────────────────────────────────
const isProd = process.env.NODE_ENV === 'production';

function format(level, message, meta) {
  if (isProd) {
    return JSON.stringify({ ts: new Date().toISOString(), level, message, ...meta });
  }
  const metaStr = meta && Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}${metaStr}`;
}

const logger = {
  info:  (msg, meta = {}) => console.log(format('info',  msg, meta)),
  warn:  (msg, meta = {}) => console.warn(format('warn',  msg, meta)),
  error: (msg, meta = {}) => console.error(format('error', msg, meta)),
  debug: (msg, meta = {}) => { if (!isProd) console.debug(format('debug', msg, meta)); },
};

module.exports = logger;
