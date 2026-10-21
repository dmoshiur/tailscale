import { Router } from 'express';
import { db } from '../db.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import { adminLimiter } from '../middleware/rateLimits.js';

const router = Router();
router.use(adminLimiter, requireAdmin);

/**
 * GET /api/admin/orders?status=awaiting_verification&limit=50
 * The verification work queue. Read-only.
 */
router.get('/orders', async (req, res, next) => {
  try {
    const status = String(req.query.status ?? '').trim();
    const limit = Math.min(Number(req.query.limit) || 50, 200);

    const { rows } = status
      ? await db().execute({
          sql: `SELECT o.*, l.license_key
                  FROM orders o LEFT JOIN licenses l ON l.id = o.license_id
                 WHERE o.status = ?
                 ORDER BY o.created_at DESC LIMIT ?`,
          args: [status, limit],
        })
      : await db().execute({
          sql: `SELECT o.*, l.license_key
                  FROM orders o LEFT JOIN licenses l ON l.id = o.license_id
                 ORDER BY o.created_at DESC LIMIT ?`,
          args: [limit],
        });

    res.json({
      ok: true,
      count: rows.length,
      orders: rows.map((r) => ({
        id: r.public_id,
        status: r.status,
        planId: r.plan_id,
        amountBdt: r.amount_bdt,
        buyerPhone: r.buyer_phone,
        trxId: r.trx_id,
        senderMobile: r.sender_mobile,
        createdAt: r.created_at,
        submittedAt: r.submitted_at,
        verifiedAt: r.verified_at,
        licenseKey: r.license_key,
      })),
    });
  } catch (err) {
    next(err);
  }
});

/** GET /api/admin/stats — lightweight dashboard numbers. */
router.get('/stats', async (req, res, next) => {
  try {
    const { rows } = await db().execute(
      `SELECT status, COUNT(*) AS n, COALESCE(SUM(amount_bdt), 0) AS total
         FROM orders GROUP BY status`,
    );
    const byStatus = Object.fromEntries(
      rows.map((r) => [r.status, { count: Number(r.n), total: Number(r.total) }]),
    );
    const paid = byStatus.paid ?? { count: 0, total: 0 };
    res.json({
      ok: true,
      byStatus,
      paidOrders: paid.count,
      grossBdt: paid.total,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
