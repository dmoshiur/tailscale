import rateLimit from 'express-rate-limit';

const message = (msg) => ({ ok: false, error: msg });

/** Creating orders is cheap, but not free — stop casual spam. */
export const orderLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: message('Too many checkout attempts. Please wait a few minutes.'),
});

/** TRX submission is the abuse-prone step (guessing valid transaction IDs). */
export const trxLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 12,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: message('Too many verification attempts. Please wait a few minutes.'),
});

/** Activation lookups: generous, but bounded. */
export const activateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: message('Slow down — too many activation requests.'),
});

/** Admin endpoints: very tight. The secret should never be brute-forced. */
export const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: message('Too many admin requests.'),
});
