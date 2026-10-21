/**
 * End-to-end smoke test against a running server.
 *
 *   npm start                      # terminal 1
 *   node server/scripts/smoke.js   # terminal 2
 *
 * Uses ADMIN_SECRET from the environment (or the .env file via dotenv).
 */
import 'dotenv/config';

const BASE = process.env.SMOKE_BASE_URL ?? `http://127.0.0.1:${process.env.PORT ?? 8080}`;
const SECRET = process.env.ADMIN_SECRET;

let failures = 0;

function check(name, condition, detail = '') {
  const ok = Boolean(condition);
  if (!ok) failures += 1;
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${name}${ok || !detail ? '' : ` — ${detail}`}`);
}

async function call(path, { method = 'GET', body, headers = {} } = {}) {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = {};
  try {
    data = await res.json();
  } catch {
    /* non-JSON */
  }
  return { status: res.status, data };
}

console.log(`\nFFV2 PRO smoke test → ${BASE}\n`);

/* 1. health ---------------------------------------------------------- */
const health = await call('/health');
check('GET /api/health', health.status === 200 && health.data.ok);

/* 2. config ---------------------------------------------------------- */
const config = await call('/config');
check('GET /api/config returns 3 plans', config.data.plans?.length === 3);
const plan = config.data.plans?.find((p) => p.id === 'year');
check('plans are priced server-side', plan?.priceBdt === 1299);

/* 3. order ----------------------------------------------------------- */
const created = await call('/orders', {
  method: 'POST',
  body: { planId: 'year', buyerPhone: '01712345678' },
});
check('POST /api/orders creates an order', created.status === 201 && created.data.claimSecret);
check('amount comes from the plan, not the client', created.data.order?.amountBdt === 1299);

const publicId = created.data.order?.id;
const claimSecret = created.data.claimSecret;

/* 4. authorisation --------------------------------------------------- */
const wrongClaim = await call(`/orders/${publicId}?claim=nope`);
check('status requires the claim secret', wrongClaim.status === 403);

const badPlan = await call('/orders', { method: 'POST', body: { planId: 'enterprise' } });
check('unknown plan is rejected', badPlan.status === 400);

/* 5. trx submission -------------------------------------------------- */
const badTrx = await call(`/orders/${publicId}/trx`, {
  method: 'POST',
  body: { claimSecret, trxId: '!!!', senderMobile: '01712345678' },
});
check('malformed TRX is rejected', badTrx.status === 400);

const trx = `SMOKE${Date.now().toString(36).toUpperCase()}`;
const submitted = await call(`/orders/${publicId}/trx`, {
  method: 'POST',
  body: { claimSecret, trxId: trx, senderMobile: '01712345678' },
});
check('TRX submission moves the order to awaiting_verification', submitted.data.order?.status === 'awaiting_verification');

/* 6. admin auth ------------------------------------------------------ */
if (!SECRET || SECRET === 'change-me-openssl-rand-hex-32') {
  console.log('  skip  admin tests — set ADMIN_SECRET to run them');
} else {
  const noAuth = await call('/payment/confirm-cmd', {
    method: 'POST',
    body: { trxId: trx, secretKey: 'wrong' },
  });
  check('confirm-cmd refuses a bad secret', noAuth.status === 401);

  const confirmed = await call('/payment/confirm-cmd', {
    method: 'POST',
    body: { trxId: trx, userIp: '127.0.0.1', secretKey: SECRET },
  });
  check('confirm-cmd issues a licence', confirmed.data.license?.key?.startsWith('FFV2-'));
  check('licence expiry is ~365 days out', confirmed.data.license?.expiresAt?.slice(0, 4) === String(new Date().getFullYear() + 1));

  const key = confirmed.data.license?.key;

  const reuse = await call('/payment/confirm-cmd', {
    method: 'POST',
    body: { trxId: trx, secretKey: SECRET },
  });
  check('the same TRX cannot be confirmed twice', reuse.status === 409);

  const reuseOrder = await call('/orders', { method: 'POST', body: { planId: 'month' } });
  const dupTrx = await call(`/orders/${reuseOrder.data.order.id}/trx`, {
    method: 'POST',
    body: {
      claimSecret: reuseOrder.data.claimSecret,
      trxId: trx,
      senderMobile: '01712345678',
    },
  });
  check('a used TRX cannot unlock another order', dupTrx.status === 409);

  const act = await call('/license/activate', {
    method: 'POST',
    body: { licenseKey: key, deviceId: 'smoke-device-0001' },
  });
  check('activation binds a device', act.data.entitlement?.devices?.length === 1);
  check('entitlement is server-derived', act.data.entitlement?.planId === 'year');

  const second = await call('/license/activate', {
    method: 'POST',
    body: { licenseKey: key, deviceId: 'smoke-device-0002' },
  });
  check('second device allowed on the year plan', second.data.ok === true);

  const third = await call('/license/activate', {
    method: 'POST',
    body: { licenseKey: key, deviceId: 'smoke-device-0003' },
  });
  check('device limit is enforced', third.status === 409);

  const revoked = await call('/payment/revoke-cmd', {
    method: 'POST',
    body: { licenseKey: key, reason: 'smoke test', secretKey: SECRET },
  });
  check('revoke-cmd kills the licence', revoked.data.license?.status === 'revoked');

  const afterRevoke = await call('/license/activate', {
    method: 'POST',
    body: { licenseKey: key, deviceId: 'smoke-device-0004' },
  });
  check('revoked licence cannot activate', afterRevoke.status === 403);
}

console.log(`\n${failures === 0 ? 'All checks passed.' : `${failures} check(s) failed.`}\n`);
process.exit(failures === 0 ? 0 : 1);
