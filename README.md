# FFV2 PRO — Access Center

Subscription and licence-management web app for **FFV2**, our studio's own mobile game.

Players pay in BDT through bKash (manual Send Money + admin verification), receive an
`FFV2-XXXX-XXXX-XXXX-XXXX` licence key, bind it to their devices, and redeem it inside the
game. The dashboard shows plan, expiry, device slots and renewal options.

> **Scope note.** This app only ever unlocks *our own* game. It never asks for, stores, or
> displays a player's game password, social-media password, or any third-party account. That is
> a hard design rule, not a placeholder: no credential fields exist anywhere in the schema, API
> or UI, and the in-game flow is a licence-key redemption.

---

## Stack

| Layer     | Tech                                                          |
| --------- | ------------------------------------------------------------- |
| Frontend  | React 18 + Vite + Tailwind CSS (cyber-HUD dark theme)          |
| Backend   | Node.js 20+ / Express 4, modular routes + middleware           |
| Database  | Turso (LibSQL) via `@libsql/client` — local SQLite in dev      |
| Payments  | bKash merchant Send Money + manual verification (`curl`)       |
| Deploy    | Render (`render.yaml`, single web service, static + API)       |

---

## Quick start (local)

```bash
npm install
cp .env.example .env          # then edit ADMIN_SECRET + bKash numbers
npm run dev:server            # API on http://localhost:8080
npm run dev:web               # Vite dev server on http://localhost:5173 (proxies /api)

# or build once and let Express serve everything on :8080
npm run build && npm start
```

With no Turso credentials the server creates `./data/local.db` (SQLite) automatically, so you can
develop without a cloud database.

### Verify it works

With the server running in another terminal:

```bash
node server/scripts/smoke.js
```

It exercises order creation, TRX submission, admin confirmation, licence issuance, device limits,
TRX reuse rejection and revocation. Admin checks are skipped unless `ADMIN_SECRET` is set.

> The smoke test inserts real rows into whatever database you point it at. Use a dev database,
> not production.

---

## Environment variables

| Name                    | Required | Description                                                       |
| ----------------------- | -------- | ----------------------------------------------------------------- |
| `PORT`                  | no       | Defaults to `8080`; Render injects this.                          |
| `TURSO_DATABASE_URL`    | prod     | `libsql://<db>-<org>.turso.io`. Blank = local SQLite file.         |
| `TURSO_AUTH_TOKEN`      | prod     | Turso database token.                                             |
| `ADMIN_SECRET`          | yes      | Long random string (`openssl rand -hex 32`) for admin endpoints.   |
| `BKASH_MERCHANT_NUMBER` | yes      | Number shown in the checkout modal.                               |
| `BKASH_MERCHANT_NAME`   | no       | Display name in the modal.                                        |
| `SUPPORT_CONTACT`       | no       | Telegram/WhatsApp handle shown in the UI.                          |
| `CORS_ORIGINS`          | no       | Comma-separated allowlist for cross-origin clients.               |

Admin endpoints **refuse to work** while `ADMIN_SECRET` is unset or still the placeholder value,
so a misconfigured deploy cannot issue free licences.

---

## Manual payment flow

1. Player picks a plan → `POST /api/orders` creates an order with a server-side amount and a
   public reference like `FFV2-7K2M-9QX4`.
2. Modal shows merchant number, exact amount and reference. Player sends money in the bKash app.
3. Player submits sender number + TRX ID → `POST /api/orders/:id/trx`. Status becomes
   `awaiting_verification`. A TRX can only ever belong to one order (enforced by a partial unique
   index *and* an explicit check).
4. Admin checks the bKash statement and confirms from a terminal (below).
5. The buyer's tab is polling `GET /api/orders/:id?claim=…` every 5s and flips to “verified”
   automatically, then activates the licence on that device.
6. If they close the tab first, the order is kept in `localStorage` and a banner offers to resume.

### Confirming from CMD / Terminal

```bash
curl -X POST https://<your-app>.onrender.com/api/payment/confirm-cmd \
  -H "Content-Type: application/json" \
  -d '{"trxId":"9H2K7LQ4MN","userIp":"203.0.113.7","secretKey":"YOUR_ADMIN_SECRET"}'
```

Response:

```json
{
  "ok": true,
  "message": "Payment confirmed. 1 Year license issued.",
  "order": { "id": "FFV2-7K2M-9QX4", "status": "paid", "planId": "year", "amountBdt": 1299 },
  "license": { "key": "FFV2-9KQ2-M4TX-7B1Z-3WPL", "expiresAt": "2027-10-21T…", "maxDevices": 2 }
}
```

Accepted body fields: `trxId` **or** `orderId` (either identifies the order), plus optional
`userIp` (recorded as the confirming operator), `note`, and `dryRun: true` to preview without
issuing anything. The secret may also be sent as an `x-admin-secret` header, which keeps it out of
shell history and access logs:

```bash
curl -X POST "$APP/api/payment/confirm-cmd" \
  -H "Content-Type: application/json" -H "x-admin-secret: $ADMIN_SECRET" \
  -d '{"trxId":"9H2K7LQ4MN"}'
```

Other admin commands:

```bash
# reject a submission (nothing issued)
curl -X POST "$APP/api/payment/reject-cmd" -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d '{"orderId":"FFV2-7K2M-9QX4","reason":"no matching bKash transaction"}'

# revoke an issued licence (chargeback / abuse)
curl -X POST "$APP/api/payment/revoke-cmd" -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d '{"licenseKey":"FFV2-9KQ2-M4TX-7B1Z-3WPL","reason":"refunded"}'

# verification work queue + revenue stats
curl -H "x-admin-secret: $ADMIN_SECRET" "$APP/api/admin/orders?status=awaiting_verification"
curl -H "x-admin-secret: $ADMIN_SECRET" "$APP/api/admin/stats"
```

---

## API reference (public)

| Method | Path                          | Purpose                                        |
| ------ | ----------------------------- | ---------------------------------------------- |
| GET    | `/api/health`                 | Render health check                            |
| GET    | `/api/config`                 | Plans, prices, merchant details (no secrets)   |
| POST   | `/api/orders`                 | Create an order for a `planId`                 |
| POST   | `/api/orders/:id/trx`         | Submit TRX ID + sender number                  |
| GET    | `/api/orders/:id?claim=…`     | Poll order status; returns the key when paid   |
| POST   | `/api/license/activate`       | Bind a device to a licence                     |
| GET    | `/api/license/:key`           | Read entitlement (plan, expiry, devices)       |
| POST   | `/api/license/deactivate`     | Free a device slot                             |

Rate limits: 20 orders / 10 min, 12 TRX submissions / 10 min, 30 activation calls / min, 20 admin
calls / min — all per IP.

---

## Security model

- **The server is the only authority.** `localStorage` caches the session for a fast UI and to
  survive refreshes; it is never trusted. Every page load re-validates the key via
  `/api/license/:key`, and the dashboard refuses to render without a server-verified entitlement.
- **Amounts are server-side.** The browser sends a `planId`; the price, duration and device
  allowance come from `server/lib/plans.js`.
- **Order ownership.** Reading an order's status requires the `claimSecret` returned once at
  creation (constant-time compared), so references cannot be enumerated.
- **One TRX, one order.** Enforced by a partial unique index plus a pre-check, which stops one
  bKash payment being replayed across accounts.
- **Admin secret** is compared with `crypto.timingSafeEqual`; admin routes are rate-limited and
  disabled entirely if the secret is left at its placeholder.
- Licence keys avoid `0/O/1/I` so they survive screenshots and manual typing. Device slots are
  counted server-side.

Not included on purpose: third-party credentials, password fields, “hack/breach” simulation, and
any flow that would let a buyer pay to take over somebody else's account.

---

## Deploy to Render

1. Push this repo to GitHub.
2. Create a Turso database and copy its URL + token:
   ```bash
   turso db create ffv2-pro
   turso db show ffv2-pro --url
   turso db tokens create ffv2-pro
   ```
3. Render → **New → Blueprint**, point at the repo; `render.yaml` provisions the service.
   Set the `sync: false` variables: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `ADMIN_SECRET`,
   `BKASH_MERCHANT_NUMBER`, `CORS_ORIGINS`.
4. Health check path is `/api/health`. Build `npm install && npm run build`, start `npm start`.
5. Optionally run the smoke test against the deployed URL:
   ```bash
   SMOKE_BASE_URL=https://your-app.onrender.com ADMIN_SECRET=… node server/scripts/smoke.js
   ```

Tables are created idempotently on boot — no migration step required.

---

## Migrating to a real gateway later

The manual verification step is isolated in `server/routes/payments.js`. When you move to bKash
Tokenized Checkout (or another gateway):

1. Create the payment via the gateway's create-payment API instead of showing a manual number.
2. Replace the `confirm-cmd` handler with a **signed webhook** handler, verifying the gateway's
   signature/checksum before calling the existing `issueLicense()` helper — the licensing code
   itself does not change.
3. Stop trusting `trxId` submission from the client; keep the same order state machine
   (`awaiting_payment → awaiting_verification → paid`).

Because everything already flows through `issueLicense()`, the swap is a contained change and the
manual endpoint can be disabled with one route deletion.

---

## Project layout

```
server/
  index.js                 Express bootstrap, CORS, static SPA, error handling
  db.js                    LibSQL client, schema, event log
  lib/plans.js             Plan catalogue + expiry maths
  lib/ids.js               Order refs, licence keys, constant-time compare
  middleware/adminAuth.js  x-admin-secret / secretKey guard
  middleware/rateLimits.js Per-route limits
  routes/config.js         Public config
  routes/orders.js         Create order, submit TRX, poll status
  routes/payments.js       confirm / reject / revoke (admin)
  routes/license.js        activate / read / deactivate
  routes/admin.js          Work queue + stats
  scripts/smoke.js         End-to-end API test
web/
  src/App.jsx              Boot, session restore, view routing
  src/components/          Landing, BkashCheckout, ActivateModal, Dashboard, MatrixCanvas
  src/lib/                 api client, localStorage store, formatters
```

## Play Store notes

The web app is the purchase and licence portal; the Play Store listing is the FFV2 game itself.
Keep the two consistent: the game should validate keys against `/api/license/:key`, and the
listing must not promise capabilities the game does not have. Google Play requires digital
goods sold inside the app to use Play Billing — this portal is for web purchases and licence
redemption, which is why the game must accept a key rather than deep-link to a web checkout.
