import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { initDb } from './db.js';
import configRouter from './routes/config.js';
import ordersRouter from './routes/orders.js';
import paymentsRouter from './routes/payments.js';
import licenseRouter from './routes/license.js';
import adminRouter from './routes/admin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT) || 8080;

const app = express();

// Render terminates TLS in front of us, so trust its proxy headers for IPs.
app.set('trust proxy', 1);
app.disable('x-powered-by');

/* ------------------------------ CORS ---------------------------------- */
const allowedOrigins = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    /**
     * In production the SPA is served by this same process, so browser calls
     * are same-origin and CORS never applies. The allowlist only matters for
     * cross-origin clients, and there is no cookie auth here — so an origin
     * outside the list simply receives no CORS headers instead of an error.
     * That keeps reverse proxies and preview hosts working.
     */
    origin(origin, callback) {
      if (!origin) return callback(null, true); // curl / server-to-server
      if (allowedOrigins.length === 0) return callback(null, true);
      return callback(null, allowedOrigins.includes(origin));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-admin-secret'],
  }),
);

app.use(express.json({ limit: '32kb' }));

/* ------------------------------ Routes -------------------------------- */
app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'ffv2-pro-access', uptime: Math.round(process.uptime()) });
});

app.use('/api/config', configRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/payment', paymentsRouter);
app.use('/api/license', licenseRouter);
app.use('/api/admin', adminRouter);

app.use('/api', (req, res) => {
  res.status(404).json({ ok: false, error: 'Unknown API route.' });
});

/* --------------------------- Static frontend -------------------------- */
const distDir = path.join(ROOT, 'web', 'dist');
if (fs.existsSync(distDir)) {
  app.use(
    express.static(distDir, {
      index: false,
      setHeaders(res, filePath) {
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      },
    }),
  );

  // SPA fallback — every non-API path renders the React app.
  app.get('*', (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res
      .status(200)
      .type('text/plain')
      .send('FFV2 PRO API is running. Run `npm run build` to serve the web app.');
  });
}

/* --------------------------- Error handler ---------------------------- */
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  console.error('[error]', err);
  res.status(500).json({ ok: false, error: 'Something went wrong on our side.' });
});

/* ------------------------------ Start --------------------------------- */
async function start() {
  await initDb();

  if (!process.env.ADMIN_SECRET || process.env.ADMIN_SECRET === 'change-me-openssl-rand-hex-32') {
    console.warn(
      '[warn] ADMIN_SECRET is unset or still the placeholder — admin confirmation endpoints will refuse requests.',
    );
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[server] listening on http://0.0.0.0:${PORT}`);
  });
}

start().catch((err) => {
  console.error('[fatal] failed to start', err);
  process.exit(1);
});

export default app;
