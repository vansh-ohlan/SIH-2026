import crypto from 'crypto';

/**
 * Computes a salted PBKDF2 HMAC-SHA512 password hash.
 * Never stores passwords in plaintext.
 */
export function hashPassword(password: string, salt = 'bhusetu2026sihsalt'): string {
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512');
  return `${salt}:${hash.toString('hex')}`;
}

/**
 * Verifies a password against a stored salted PBKDF2 hash using timing-safe comparison.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) return false;
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512');
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}
