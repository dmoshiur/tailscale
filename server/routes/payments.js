import { Router } from 'express';
import { db, logEvent } from '../db.js';
import { getPlan, expiryFor } from '../lib/plans.js';
import { licenseKey } from '../lib/ids.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import { adminLimiter } from '../middleware/rateLimits.js';

const router = Router();

router.use(adminLimiter);

/**
 * Finds the order an admin is trying to confirm.
 * Admins can reference an order by its public reference (FFV2-XXXX-XXXX)
 * or by the TRX ID the buyer submitted.
 */
async function findOrder({ orderId, trxId }) {
  if (orderId) {
    const { rows } = await db().execute({
      sql: 'SELECT * FROM orders WHERE public_id = ?',
      args: [String(orderId).trim().toUpperCase()],
    });
    if (rows[0]) return rows[0];
  }
  if (trxId) {
    const { rows } = await db().execute({
      sql: 'SELECT * FROM orders WHERE trx_id = ?',
      args: [String(trxId).trim().toUpperCase()],
    });
    if (rows[0]) return rows[0];
  }
  return null;
}

/** Insert a license, retrying in the unlikely event of a key collision. */
async function issueLicense(order, actor) {
  const plan = getPlan(order.plan_id);
  if (!plan) throw new Error(`Order references unknown plan "${order.plan_id}"`);

  const issuedAt = new Date();
  const expiresAt = expiryFor(plan, issuedAt);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const key = licenseKey();
    try {
      const result = await db().execute({
        sql: `INSERT INTO licenses
                (license_key, order_id, plan_id, buyer_phone, status, issued_at, expires_at, max_devices)
              VALUES (?, ?, ?, ?, 'active', ?, ?, ?)`,
        args: [
          key,
          order.id,
          plan.id,
          order.buyer_phone,
          issuedAt.toISOString(),
          expiresAt,
          plan.maxDevices,
        ],
      });

      const licenseId = Number(result.lastInsertRowid);

      await db().execute({
        sql: `UPDATE orders
                 SET status = 'paid', verified_at = ?, verified_by = ?, license_id = ?
               WHERE id = ?`,
        args: [issuedAt.toISOString(), actor, licenseId, order.id],
      });

      await logEvent({
        orderId: order.id,
        licenseId,
        type: 'payment.confirmed',
        meta: { planId: plan.id, actor },
      });
      await logEvent({
        orderId: order.id,
        licenseId,
        type: 'license.issued',
        meta: { planId: plan.id, expiresAt },
      });

      return { key, licenseId, plan, issuedAt, expiresAt };
    } catch (err) {
      if (String(err?.message ?? '').includes('UNIQUE') && attempt < 4) continue;
      throw err;
    }
  }
  throw new Error('Could not allocate a unique license key');
}

/* -------------------------------------------------------------------------
 * POST /api/payment/confirm-cmd
 *
 * The one-liner from a local terminal:
 *
 *   curl -X POST https://<app>.onrender.com/api/payment/confirm-cmd \
 *     -H "Content-Type: application/json" \
 *     -d '{"trxId":"TRX12345","userIp":"1.2.3.4","secretKey":"ADMIN_SECRET"}'
 *
 * Optional fields: "orderId":"FFV2-XXXX-XXXX", "note":"verified in bKash app".
 * ---------------------------------------------------------------------- */
router.post('/confirm-cmd', requireAdmin, async (req, res, next) => {
  try {
    const { trxId, orderId, userIp, note, dryRun } = req.body ?? {};

    if (!trxId && !orderId) {
      return res.status(400).json({
        ok: false,
        error: 'Provide "trxId" or "orderId" so the order can be identified.',
      });
    }

    const order = await findOrder({ orderId, trxId });
    if (!order) {
      return res.status(404).json({
        ok: false,
        error: 'No order matches that TRX ID or order reference.',
        hint: 'The buyer must submit their TRX ID from the checkout modal before you can confirm it.',
      });
    }

    if (order.status === 'paid') {
      const { rows } = await db().execute({
        sql: 'SELECT * FROM licenses WHERE id = ?',
        args: [order.license_id],
      });
      return res.status(409).json({
        ok: false,
        error: 'That order is already paid.',
        license: rows[0] ? { key: rows[0].license_key, expiresAt: rows[0].expires_at } : null,
      });
    }

    if (dryRun) {
      return res.json({
        ok: true,
        dryRun: true,
        order: {
          id: order.public_id,
          status: order.status,
          planId: order.plan_id,
          amountBdt: order.amount_bdt,
          trxId: order.trx_id,
        },
        wouldIssue: getPlan(order.plan_id),
      });
    }

    const actor = userIp ? `cmd:${userIp}` : 'cmd';
    const issued = await issueLicense(order, actor);

    if (note) {
      await logEvent({
        orderId: order.id,
        licenseId: issued.licenseId,
        type: 'payment.note',
        meta: { note },
      });
    }

    res.json({
      ok: true,
      message: `Payment confirmed. ${issued.plan.name} license issued.`,
      order: {
        id: order.public_id,
        status: 'paid',
        planId: issued.plan.id,
        amountBdt: order.amount_bdt,
        trxId: order.trx_id,
      },
      license: {
        key: issued.key,
        planId: issued.plan.id,
        planName: issued.plan.name,
        issuedAt: issued.issuedAt.toISOString(),
        expiresAt: issued.expiresAt,
        maxDevices: issued.plan.maxDevices,
      },
    });
  } catch (err) {
    next(err);
  }
});

/* -------------------------------------------------------------------------
 * POST /api/payment/reject-cmd — mark a submission as unpaid
 * ---------------------------------------------------------------------- */
router.post('/reject-cmd', requireAdmin, async (req, res, next) => {
  try {
    const { trxId, orderId, reason } = req.body ?? {};
    const order = await findOrder({ orderId, trxId });
    if (!order) return res.status(404).json({ ok: false, error: 'Order not found.' });

    if (order.status === 'paid') {
      return res.status(409).json({
        ok: false,
        error: 'Order is already paid. Revoke the license instead of rejecting the payment.',
      });
    }

    await db().execute({
      sql: `UPDATE orders SET status = 'rejected', verified_at = ?, verified_by = ? WHERE id = ?`,
      args: [new Date().toISOString(), 'cmd', order.id],
    });
    await logEvent({
      orderId: order.id,
      type: 'payment.rejected',
      meta: { reason: reason ?? null },
    });

    res.json({ ok: true, order: { id: order.public_id, status: 'rejected' } });
  } catch (err) {
    next(err);
  }
});

/* -------------------------------------------------------------------------
 * POST /api/payment/revoke-cmd — kill an active license (chargeback, abuse)
 * ---------------------------------------------------------------------- */
router.post('/revoke-cmd', requireAdmin, async (req, res, next) => {
  try {
    const key = String(req.body?.licenseKey ?? '').trim().toUpperCase();
    const reason = String(req.body?.reason ?? 'revoked by admin');
    if (!key) return res.status(400).json({ ok: false, error: 'licenseKey is required.' });

    const { rows } = await db().execute({
      sql: 'SELECT * FROM licenses WHERE license_key = ?',
      args: [key],
    });
    const lic = rows[0];
    if (!lic) return res.status(404).json({ ok: false, error: 'License not found.' });

    await db().execute({
      sql: `UPDATE licenses SET status = 'revoked', revoked_at = ?, revoked_reason = ? WHERE id = ?`,
      args: [new Date().toISOString(), reason, lic.id],
    });
    await logEvent({
      licenseId: lic.id,
      orderId: lic.order_id,
      type: 'license.revoked',
      meta: { reason },
    });

    res.json({ ok: true, license: { key: lic.license_key, status: 'revoked' } });
  } catch (err) {
    next(err);
  }
});

export default router;
