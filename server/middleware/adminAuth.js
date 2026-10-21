import { safeEqual } from '../lib/ids.js';

/**
 * Protects /api/payment/* and /api/admin/*.
 *
 * The secret may arrive as `x-admin-secret` header (preferred — headers do not
 * land in access logs the way query strings do) or as `secretKey` in the
 * JSON body, so the documented one-liner curl command works as-is.
 */
export function requireAdmin(req, res, next) {
  const expected = process.env.ADMIN_SECRET;

  if (!expected || expected === 'change-me-openssl-rand-hex-32') {
    return res.status(503).json({
      ok: false,
      error:
        'ADMIN_SECRET is not configured on the server. Set it in the environment before using admin endpoints.',
    });
  }

  const supplied = req.get('x-admin-secret') ?? req.body?.secretKey;
  if (!safeEqual(supplied, expected)) {
    return res.status(401).json({ ok: false, error: 'Invalid admin secret.' });
  }

  next();
}
