const crypto = require('crypto');

// Derive a 32-byte key from the env variable using SHA-256
function getKey() {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ENCRYPTION_KEY environment variable is required in production');
    }
    // In development only, warn loudly and fall back — never commit secrets
    console.warn('[SECURITY] WARNING: ENCRYPTION_KEY is not set. Using an insecure dev fallback. Set ENCRYPTION_KEY before deploying.');
    return crypto.createHash('sha256').update('dev-fallback-key-not-for-production').digest();
  }
  return crypto.createHash('sha256').update(raw).digest();
}

const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypt a plaintext string.
 * Returns: "<ivHex>:<authTagHex>:<ciphertextHex>"
 */
function encrypt(text) {
  if (!text) return '';
  const iv = crypto.randomBytes(12);
  const key = getKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString('hex'), authTag.toString('hex'), encrypted.toString('hex')].join(':');
}

/**
 * Decrypt a value produced by encrypt().
 */
function decrypt(data) {
  if (!data) return '';
  const parts = data.split(':');
  if (parts.length !== 3) return '';
  const [ivHex, authTagHex, encryptedHex] = parts;
  try {
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const key = getKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  } catch (err) {
    console.error('[encryption] Decryption failed:', err.message);
    return '';
  }
}

/**
 * Return a masked version showing only the last 4 characters.
 * e.g. "EAABsbCS…longtoken" → "****oken"
 */
function mask(value) {
  if (!value || value.length <= 4) return '****';
  return '****' + value.slice(-4);
}

module.exports = { encrypt, decrypt, mask };
