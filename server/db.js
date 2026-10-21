import { createClient } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';

let client = null;

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS orders (
     id            INTEGER PRIMARY KEY AUTOINCREMENT,
     public_id     TEXT    NOT NULL UNIQUE,
     claim_secret  TEXT    NOT NULL,
     plan_id       TEXT    NOT NULL,
     amount_bdt    INTEGER NOT NULL,
     buyer_phone   TEXT,
     status        TEXT    NOT NULL DEFAULT 'awaiting_payment',
     trx_id        TEXT,
     sender_mobile TEXT,
     client_ip     TEXT,
     created_at    TEXT    NOT NULL,
     submitted_at  TEXT,
     verified_at   TEXT,
     verified_by   TEXT,
     license_id    INTEGER
   )`,
  `CREATE TABLE IF NOT EXISTS licenses (
     id           INTEGER PRIMARY KEY AUTOINCREMENT,
     license_key  TEXT    NOT NULL UNIQUE,
     order_id     INTEGER NOT NULL,
     plan_id      TEXT    NOT NULL,
     buyer_phone  TEXT,
     status       TEXT    NOT NULL DEFAULT 'active',
     issued_at    TEXT    NOT NULL,
     expires_at   TEXT,
     max_devices  INTEGER NOT NULL DEFAULT 1,
     revoked_at   TEXT,
     revoked_reason TEXT
   )`,
  `CREATE TABLE IF NOT EXISTS activations (
     id         INTEGER PRIMARY KEY AUTOINCREMENT,
     license_id INTEGER NOT NULL,
     device_id  TEXT    NOT NULL,
     label      TEXT,
     client_ip  TEXT,
     first_seen TEXT    NOT NULL,
     last_seen  TEXT    NOT NULL,
     UNIQUE (license_id, device_id)
   )`,
  `CREATE TABLE IF NOT EXISTS events (
     id         INTEGER PRIMARY KEY AUTOINCREMENT,
     order_id   INTEGER,
     license_id INTEGER,
     type       TEXT    NOT NULL,
     meta       TEXT,
     created_at TEXT    NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status)`,
  `CREATE INDEX IF NOT EXISTS idx_orders_trx ON orders (trx_id)`,
  `CREATE INDEX IF NOT EXISTS idx_licenses_order ON licenses (order_id)`,
  `CREATE INDEX IF NOT EXISTS idx_events_order ON events (order_id)`,
  // One bKash transaction may only ever unlock one order.
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_trx_unique
     ON orders (trx_id) WHERE trx_id IS NOT NULL`,
];

/**
 * Connects to Turso when credentials are present, otherwise falls back to a
 * local SQLite file so `npm run dev:server` works with zero setup.
 */
export async function initDb() {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();

  const target = url || 'file:./data/local.db';

  if (target.startsWith('file:')) {
    const dir = path.resolve(path.dirname(target.slice('file:'.length)));
    fs.mkdirSync(dir, { recursive: true });
  }

  client = createClient({ url: target, authToken: authToken || undefined });

  for (const statement of SCHEMA) {
    await client.execute(statement);
  }

  const mode = url ? 'turso' : 'local-sqlite';
  console.log(`[db] connected (${mode})`);
  return client;
}

export function db() {
  if (!client) throw new Error('Database not initialised — call initDb() first');
  return client;
}

export async function logEvent({ orderId = null, licenseId = null, type, meta = null }) {
  await db().execute({
    sql: `INSERT INTO events (order_id, license_id, type, meta, created_at)
          VALUES (?, ?, ?, ?, ?)`,
    args: [orderId, licenseId, type, meta ? JSON.stringify(meta) : null, new Date().toISOString()],
  });
}
