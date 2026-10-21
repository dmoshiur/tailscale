import { Router } from 'express';
import { db, logEvent } from '../db.js';
import { getPlan } from '../lib/plans.js';
import { orderReference, token, safeEqual } from '../lib/ids.js';
import { orderLimiter, trxLimiter } from '../middleware/rateLimits.js';

const router = Router();

const PHONE_RE = /^01[3-9]\d{8}$/;
const TRX_RE = /^[A-Za-z0-9]{6,32}$/;

function publicOrder(row) {
  return {
    id: row.public_id,
    planId: row.plan_id,
    amountBdt: row.amount_bdt,
    status: row.status,
    trxId: row.trx_id,
    createdAt: row.created_at,
    submittedAt: row.submitted_at,
    verifiedAt: row.verified_at,
  };
}

/* -------------------------------------------------------------------------
 * POST /api/orders — create an order for a plan
 * ---------------------------------------------------------------------- */
router.post('/', orderLimiter, async (req, res, next) => {
  try {
    const plan = getPlan(req.body?.planId);
    if (!plan) return res.status(400).json({ ok: false, error: 'Unknown plan.' });

    const buyerPhone = String(req.body?.buyerPhone ?? '').trim();
    if (buyerPhone && !PHONE_RE.test(buyerPhone)) {
      return res
        .status(400)
        .json({ ok: false, error: 'Enter a valid Bangladeshi mobile number (01XXXXXXXXX).' });
    }

    const publicId = orderReference();
    const claimSecret = token(24);
    const now = new Date().toISOString();

    await db().execute({
      sql: `INSERT INTO orders
              (public_id, claim_secret, plan_id, amount_bdt, buyer_phone, status, client_ip, created_at)
            VALUES (?, ?, ?, ?, ?, 'awaiting_payment', ?, ?)`,
      args: [publicId, claimSecret, plan.id, plan.priceBdt, buyerPhone || null, req.ip, now],
    });

    await logEvent({ type: 'order.created', meta: { planId: plan.id, ip: req.ip } });

    // claimSecret is returned exactly once. It is the buyer's proof of
    // ownership over this order and is required to read its status back.
    res.status(201).json({
      ok: true,
      claimSecret,
      order: {
        id: publicId,
        planId: plan.id,
        planName: plan.name,
        amountBdt: plan.priceBdt,
        status: 'awaiting_payment',
        createdAt: now,
      },
    });
  } catch (err) {
    next(err);
  }
});

/* -------------------------------------------------------------------------
 * POST /api/orders/:publicId/trx — buyer submits the bKash TRX ID
 * ---------------------------------------------------------------------- */
router.post('/:publicId/trx', trxLimiter, async (req, res, next) => {
  try {
    const { publicId } = req.params;
    const claimSecret = String(req.body?.claimSecret ?? '');
    const trxId = String(req.body?.trxId ?? '').trim().toUpperCase();
    const senderMobile = String(req.body?.senderMobile ?? '').trim();

    if (!TRX_RE.test(trxId)) {
      return res.status(400).json({
        ok: false,
        error: 'TRX ID should be 6–32 letters or digits (find it in your bKash message).',
      });
    }
    if (!PHONE_RE.test(senderMobile)) {
      return res
        .status(400)
        .json({ ok: false, error: 'Enter the bKash number you paid from (01XXXXXXXXX).' });
    }

    const { rows } = await db().execute({
      sql: 'SELECT * FROM orders WHERE public_id = ?',
      args: [publicId],
    });
    const order = rows[0];
    if (!order) return res.status(404).json({ ok: false, error: 'Order not found.' });

    if (!safeEqual(claimSecret, order.claim_secret)) {
      return res.status(403).json({ ok: false, error: 'This order does not belong to you.' });
    }

    if (order.status === 'paid') {
      return res.status(409).json({ ok: false, error: 'This order is already paid.' });
    }
    if (order.status === 'rejected') {
      return res
        .status(409)
        .json({ ok: false, error: 'This payment was rejected. Please contact support.' });
    }

    // Reject a TRX that already unlocked a different order.
    const { rows: clash } = await db().execute({
      sql: 'SELECT public_id FROM orders WHERE trx_id = ? AND public_id <> ?',
      args: [trxId, publicId],
    });
    if (clash.length) {
      return res.status(409).json({
        ok: false,
        error: 'That transaction ID has already been used for another order.',
      });
    }

    const now = new Date().toISOString();
    await db().execute({
      sql: `UPDATE orders
               SET trx_id = ?, sender_mobile = ?, status = 'awaiting_verification',
                   submitted_at = ?, client_ip = ?
             WHERE id = ?`,
      args: [trxId, senderMobile, now, req.ip, order.id],
    });

    await logEvent({
      orderId: order.id,
      type: 'payment.submitted',
      meta: { trxId, senderMobile },
    });

    res.json({
      ok: true,
      order: {
        ...publicOrder(order),
        status: 'awaiting_verification',
        trxId,
        submittedAt: now,
      },
    });
  } catch (err) {
    if (String(err?.message ?? '').includes('UNIQUE')) {
      return res.status(409).json({
        ok: false,
        error: 'That transaction ID has already been submitted.',
      });
    }
    next(err);
  }
});

/* -------------------------------------------------------------------------
 * GET /api/orders/:publicId?claim=... — polling endpoint
 * Returns the license key once the admin has confirmed the payment.
 * ---------------------------------------------------------------------- */
router.get('/:publicId', async (req, res, next) => {
  try {
    const { rows } = await db().execute({
      sql: 'SELECT * FROM orders WHERE public_id = ?',
      args: [req.params.publicId],
    });
    const order = rows[0];
    if (!order) return res.status(404).json({ ok: false, error: 'Order not found.' });

    if (!safeEqual(String(req.query.claim ?? ''), order.claim_secret)) {
      return res.status(403).json({ ok: false, error: 'This order does not belong to you.' });
    }

    let license = null;
    if (order.license_id) {
      const { rows: lic } = await db().execute({
        sql: 'SELECT * FROM licenses WHERE id = ?',
        args: [order.license_id],
      });
      if (lic[0]) {
        license = {
          key: lic[0].license_key,
          planId: lic[0].plan_id,
          status: lic[0].status,
          issuedAt: lic[0].issued_at,
          expiresAt: lic[0].expires_at,
          maxDevices: lic[0].max_devices,
        };
      }
    }

    res.json({ ok: true, order: publicOrder(order), license });
  } catch (err) {
    next(err);
  }
});

export default router;
