import crypto from 'node:crypto';

/** URL-safe random token. */
export function token(bytes = 24) {
  return crypto.randomBytes(bytes).toString('base64url');
}

/** Short, human-quotable public order reference, e.g. FFV2-7K2M-9QX4. */
export function orderReference() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const pick = (n) =>
    Array.from({ length: n }, () => alphabet[crypto.randomInt(alphabet.length)]).join('');
  return `FFV2-${pick(4)}-${pick(4)}`;
}

/**
 * License key: FFV2-XXXX-XXXX-XXXX-XXXX
 * Ambiguous characters (0/O, 1/I) are excluded so keys survive being
 * read off a screen or typed from a screenshot.
 */
export function licenseKey() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const group = (n) =>
    Array.from({ length: n }, () => alphabet[crypto.randomInt(alphabet.length)]).join('');
  return `FFV2-${group(4)}-${group(4)}-${group(4)}-${group(4)}`;
}

/** Constant-time string compare that is safe for unequal lengths. */
export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) {
    // Still burn a comparison so timing does not leak length.
    crypto.timingSafeEqual(ab, ab);
    return false;
  }
  return crypto.timingSafeEqual(ab, bb);
}

/** Normalise user-typed license keys before lookup. */
export function normaliseKey(raw) {
  return String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .replace(/^FFV2/, '')
    .replace(/(.{4})(?=.)/g, '$1-')
    .replace(/^/, 'FFV2-')
    .slice(0, 24);
}
