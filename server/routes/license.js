import { Router } from 'express';
import { db, logEvent } from '../db.js';
import { getPlan } from '../lib/plans.js';
import { normaliseKey } from '../lib/ids.js';
import { activateLimiter } from '../middleware/rateLimits.js';

const router = Router();
router.use(activateLimiter);

/**
 * The only authority on whether someone has access.
 * The browser's localStorage is a cache for a nicer UX — never the source of
 * truth, because a user can edit it freely.
 */
function entitlement(row, plan, devices) {
  const expired = row.expires_at ? new Date(row.expires_at) < new Date() : false;
  const status = row.status !== 'active' ? row.status : expired ? 'expired' : 'active';
  return {
    key: row.license_key,
    planId: row.plan_id,
    planName: plan?.name ?? row.plan_id,
    status,
    issuedAt: row.issued_at,
    expiresAt: row.expires_at,
    maxDevices: row.max_devices,
    devices: devices.map((d) => ({
      deviceId: d.device_id,
      label: d.label,
      firstSeen: d.first_seen,
      lastSeen: d.last_seen,
    })),
  };
}

async function loadLicense(key) {
  const { rows } = await db().execute({
    sql: 'SELECT * FROM licenses WHERE license_key = ?',
    args: [key],
  });
  return rows[0] ?? null;
}

async function loadDevices(licenseId) {
  const { rows } = await db().execute({
    sql: 'SELECT * FROM activations WHERE license_id = ? ORDER BY first_seen ASC',
    args: [licenseId],
  });
  return rows;
}

/* -------------------------------------------------------------------------
 * POST /api/license/activate — bind this browser/device to a license
 * ---------------------------------------------------------------------- */
router.post('/activate', async (req, res, next) => {
  try {
    const key = normaliseKey(req.body?.licenseKey);
    const deviceId = String(req.body?.deviceId ?? '').trim().slice(0, 120);

    if (!key) return res.status(400).json({ ok: false, error: 'Enter your license key.' });
    if (deviceId.length < 8) {
      return res.status(400).json({ ok: false, error: 'Missing device identifier.' });
    }

    const row = await loadLicense(key);
    if (!row) {
      return res.status(404).json({
        ok: false,
        error: 'That license key is not recognised. Check it and try again.',
      });
    }

    if (row.status === 'revoked') {
      return res.status(403).json({ ok: false, error: 'This license has been revoked.' });
    }

    const plan = getPlan(row.plan_id);
    const expired = row.expires_at ? new Date(row.expires_at) < new Date() : false;
    if (expired) {
      return res.status(403).json({
        ok: false,
        error: 'This license has expired. Renew to continue.',
        entitlement: entitlement(row, plan, await loadDevices(row.id)),
      });
    }

    const devices = await loadDevices(row.id);
    const now = new Date().toISOString();
    const existing = devices.find((d) => d.device_id === deviceId);

    if (existing) {
      await db().execute({
        sql: 'UPDATE activations SET last_seen = ?, client_ip = ? WHERE id = ?',
        args: [now, req.ip, existing.id],
      });
    } else {
      if (devices.length >= row.max_devices) {
        return res.status(409).json({
          ok: false,
          error: `This license is already active on ${row.max_devices} device${
            row.max_devices === 1 ? '' : 's'
          }. Deactivate one from the dashboard, or upgrade your plan.`,
          entitlement: entitlement(row, plan, devices),
        });
      }
      await db().execute({
        sql: `INSERT INTO activations (license_id, device_id, client_ip, first_seen, last_seen)
              VALUES (?, ?, ?, ?, ?)`,
        args: [row.id, deviceId, req.ip, now, now],
      });
      await logEvent({
        licenseId: row.id,
        orderId: row.order_id,
        type: 'license.activated',
        meta: { deviceId, ip: req.ip },
      });
    }

    res.json({ ok: true, entitlement: entitlement(row, plan, await loadDevices(row.id)) });
  } catch (err) {
    next(err);
  }
});

/* -------------------------------------------------------------------------
 * GET /api/license/:key — read-only status (used by the dashboard refresh)
 * ---------------------------------------------------------------------- */
router.get('/:key', async (req, res, next) => {
  try {
    const row = await loadLicense(normaliseKey(req.params.key));
    if (!row) return res.status(404).json({ ok: false, error: 'License not found.' });
    const plan = getPlan(row.plan_id);
    res.json({ ok: true, entitlement: entitlement(row, plan, await loadDevices(row.id)) });
  } catch (err) {
    next(err);
  }
});

/* -------------------------------------------------------------------------
 * POST /api/license/deactivate — free up a device slot
 * ---------------------------------------------------------------------- */
router.post('/deactivate', async (req, res, next) => {
  try {
    const key = normaliseKey(req.body?.licenseKey);
    const deviceId = String(req.body?.deviceId ?? '').trim();
    const row = await loadLicense(key);
    if (!row) return res.status(404).json({ ok: false, error: 'License not found.' });

    const { rowsAffected } = await db().execute({
      sql: 'DELETE FROM activations WHERE license_id = ? AND device_id = ?',
      args: [row.id, deviceId],
    });
    await logEvent({
      licenseId: row.id,
      type: 'license.deactivated',
      meta: { deviceId },
    });

    res.json({
      ok: true,
      removed: Number(rowsAffected ?? 0),
      entitlement: entitlement(row, getPlan(row.plan_id), await loadDevices(row.id)),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
