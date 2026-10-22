import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MatrixCanvas from './MatrixCanvas.jsx';
import {
  Logo,
  IconArrow,
  IconBolt,
  IconCheck,
  IconCopy,
  IconDevices,
  IconKey,
  IconLock,
  IconRefresh,
  IconShield,
  IconTerminal,
  IconX,
} from './Icons.jsx';
import { api } from '../lib/api.js';
import { getDeviceId } from '../lib/store.js';
import { announceVipUnlock } from '../lib/vipUnlock.js';
import { daysLeft, formatDate, formatDateTime, maskKey } from '../lib/format.js';

/* ------------------------------------------------------------------ */
/* Small shared bits                                                   */
/* ------------------------------------------------------------------ */
function StatusPill({ status }) {
  const map = {
    active: 'border-matrix/30 bg-matrix/10 text-matrix',
    expired: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
    revoked: 'border-crimson/30 bg-crimson/10 text-crimson',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] ${
        map[status] ?? map.expired
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

function CopyButton({ value, label = 'Copy' }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
        } catch {
          /* ignore */
        }
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 font-mono text-[11px] text-slate-300 transition hover:border-cyan/40 hover:text-white"
    >
      {done ? <IconCheck className="h-3.5 w-3.5 text-matrix" /> : <IconCopy className="h-3.5 w-3.5" />}
      {done ? 'Copied' : label}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Header                                                              */
/* ------------------------------------------------------------------ */
function Header({ entitlement, onSignOut, onHome }) {
  const [copied, setCopied] = useState(false);
  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-ink/85 backdrop-blur-xl">
      <div className="shell flex h-16 items-center justify-between gap-3">
        <button onClick={onHome} className="flex items-center gap-2.5">
          <Logo className="h-8 w-8" />
          <span className="hidden font-mono text-sm font-bold tracking-[0.22em] text-white sm:block">
            FFV2<span className="text-cyan">PRO</span>
          </span>
        </button>

        <div className="flex items-center gap-2">
          <StatusPill status={entitlement.status} />
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(entitlement.key);
              } catch {
                /* ignore */
              }
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="hidden items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono text-[11px] text-slate-400 transition hover:text-white sm:flex"
            title="Copy licence key"
          >
            {copied ? <IconCheck className="h-3.5 w-3.5 text-matrix" /> : <IconKey className="h-3.5 w-3.5" />}
            {maskKey(entitlement.key)}
          </button>
          <button onClick={onSignOut} className="btn-ghost !px-3 !py-2 !text-xs">
            <IconLock className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Licence card                                                        */
/* ------------------------------------------------------------------ */
function LicenseCard({ entitlement, onRenew }) {
  const left = daysLeft(entitlement.expiresAt);
  const expired = entitlement.status !== 'active';

  return (
    <section className="glass relative overflow-hidden p-6">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan/10 blur-3xl" />

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Active plan</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">
            {entitlement.planName}
          </h2>
        </div>
        <IconShield className={`h-8 w-8 ${expired ? 'text-crimson' : 'text-cyan'}`} />
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-white/10 pt-5">
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
            Expires
          </dt>
          <dd className="mt-1 text-sm font-medium text-white">
            {entitlement.expiresAt ? formatDate(entitlement.expiresAt) : 'Lifetime'}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
            {left === null ? 'Validity' : 'Days left'}
          </dt>
          <dd className="mt-1 text-sm font-medium text-white">
            {left === null ? 'Never expires' : left}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
            Devices
          </dt>
          <dd className="mt-1 text-sm font-medium text-white">
            {entitlement.devices.length} / {entitlement.maxDevices}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
            Issued
          </dt>
          <dd className="mt-1 text-sm font-medium text-white">
            {formatDate(entitlement.issuedAt)}
          </dd>
        </div>
      </dl>

      <div className="mt-5 rounded-xl border border-dashed border-white/15 bg-black/30 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
              Licence key
            </p>
            <p className="mt-1 truncate font-mono text-[13px] tracking-wider text-cyan">
              {entitlement.key}
            </p>
          </div>
          <CopyButton value={entitlement.key} />
        </div>
      </div>

      {expired && (
        <button onClick={onRenew} className="btn-primary mt-4 w-full">
          <IconRefresh className="h-4 w-4" /> Renew access
        </button>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Device list                                                         */
/* ------------------------------------------------------------------ */
function DevicesCard({ entitlement, onRemoved, notify }) {
  const deviceId = getDeviceId();
  const [busyId, setBusyId] = useState(null);

  async function remove(id) {
    setBusyId(id);
    try {
      const data = await api.deactivate(entitlement.key, id);
      onRemoved?.(data.entitlement);
      notify?.('Device removed. The slot is free.');
    } catch (err) {
      notify?.(err.message, 'error');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="glass p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="eyebrow">Devices</p>
          <h3 className="mt-2 text-base font-semibold text-white">
            {entitlement.devices.length} of {entitlement.maxDevices} in use
          </h3>
        </div>
        <IconDevices className="h-5 w-5 text-slate-500" />
      </div>

      <ul className="mt-4 divide-y divide-white/5">
        {entitlement.devices.length === 0 && (
          <li className="py-4 text-[13px] text-slate-500">No devices bound yet.</li>
        )}
        {entitlement.devices.map((d) => {
          const isThis = d.deviceId === deviceId;
          return (
            <li key={d.deviceId} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 truncate font-mono text-[12px] text-slate-200">
                  {d.deviceId.slice(0, 8)}…{d.deviceId.slice(-4)}
                  {isThis && (
                    <span className="rounded bg-cyan/15 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-cyan">
                      this device
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Added {formatDate(d.firstSeen)} · seen {formatDateTime(d.lastSeen)}
                </p>
              </div>
              <button
                onClick={() => remove(d.deviceId)}
                disabled={busyId === d.deviceId}
                className="rounded-lg border border-white/10 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-400 transition hover:border-crimson/40 hover:text-crimson disabled:opacity-40"
              >
                {busyId === d.deviceId ? '…' : 'Remove'}
              </button>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-[11.5px] leading-relaxed text-slate-500">
        Removing a device frees a slot immediately. Your plan and expiry date are unchanged.
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Session runner — terminal + matrix overlay                          */
/* ------------------------------------------------------------------ */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function buildScript(entitlement) {
  return [
    { d: 350, t: '[boot] ffv2-access-terminal v2.4.1', c: 'text-slate-400' },
    { d: 320, t: `[key]  ${maskKey(entitlement.key)}`, c: 'text-cyan' },
    { d: 520, t: '[net]  contacting licence server …', c: 'text-slate-400' },
    { d: 620, t: '[net]  200 OK · entitlement signature valid', c: 'text-matrix' },
    { d: 380, t: `[plan] ${entitlement.planName} · ${entitlement.expiresAt ? `expires ${formatDate(entitlement.expiresAt)}` : 'lifetime'}`, c: 'text-cyan' },
    { d: 560, t: '[dev]  binding device fingerprint', c: 'text-slate-400' },
    { d: 600, t: '[cfg]  attaching PRO cosmetic bundle', c: 'text-slate-400' },
    { d: 480, t: '[cfg]  matchmaking priority = enabled', c: 'text-slate-400' },
    { d: 440, t: '[cfg]  seasonal cache warmed (season 04)', c: 'text-slate-400' },
    { d: 520, t: '[auth] session token issued · ttl 24h', c: 'text-matrix' },
    { d: 380, t: '[done] ACCESS GRANTED', c: 'text-matrix font-bold' },
  ];
}

function SessionRunner({ entitlement, notify }) {
  const [phase, setPhase] = useState('idle'); // idle | running | complete
  const [shown, setShown] = useState([]);
  const [progress, setProgress] = useState(0);
  const cancelled = useRef(false);

  const script = useMemo(() => buildScript(entitlement), [entitlement]);

  useEffect(() => () => { cancelled.current = true; }, []);

  async function run() {
    if (phase === 'running') return;
    cancelled.current = false;
    setShown([]);
    setProgress(0);
    setPhase('running');

    for (let i = 0; i < script.length; i += 1) {
      await sleep(script[i].d);
      if (cancelled.current) return;
      setShown((prev) => [...prev, script[i]]);
      setProgress(Math.round(((i + 1) / script.length) * 100));
    }

    await sleep(500);
    if (cancelled.current) return;
    setPhase('complete');
    // Unlock is finalised here — persist the receipt and open the VIP card.
    announceVipUnlock();
    notify?.('Session initialised — PRO access is live.');
  }

  function stop() {
    cancelled.current = true;
    setPhase('idle');
    setShown([]);
    setProgress(0);
  }

  return (
    <>
      <section className="glass overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-3">
          <div className="flex items-center gap-2">
            <IconTerminal className="h-4 w-4 text-cyan" />
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-400">
              Access terminal
            </span>
          </div>
          <span className="font-mono text-[10px] text-slate-600">localhost · secure</span>
        </div>

        <div className="p-5">
          <div className="term min-h-[168px] !border-matrix/15">
            {shown.length === 0 && phase === 'idle' && (
              <p className="term-line text-slate-500">
                $ Ready. Initialise the session to bind your licence and download your PRO
                profile.
              </p>
            )}
            {shown.map((line, i) => (
              <p key={i} className={`term-line ${line.c ?? 'text-matrix/90'}`}>
                {line.t}
              </p>
            ))}
            {phase === 'running' && (
              <p className="term-line text-matrix">
                <span className="animate-blink">▌</span>
              </p>
            )}
            {phase === 'complete' && (
              <>
                <p className="term-line mt-2 text-slate-500">
                  $ Enter this key in FFV2 → Settings → Redeem Code:
                </p>
                <p className="term-line font-bold tracking-wider text-white">{entitlement.key}</p>
              </>
            )}
          </div>

          {phase === 'running' ? (
            <div className="mt-4">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan to-matrix transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-slate-500">
                <span>initialising</span>
                <span>{progress}%</span>
              </div>
            </div>
          ) : phase === 'complete' ? (
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <a
                href="#redeem"
                className="btn-primary flex-1"
                onClick={(e) => e.preventDefault()}
              >
                <IconCheck className="h-4 w-4" /> PRO is active
              </a>
              <button onClick={run} className="btn-ghost">
                <IconRefresh className="h-4 w-4" /> Run again
              </button>
            </div>
          ) : (
            <button onClick={run} className="btn-primary mt-4 w-full">
              <IconBolt className="h-4 w-4" /> Initialise PRO session
            </button>
          )}
        </div>
      </section>

      {/* Full-screen matrix overlay while the handshake plays */}
      {phase === 'running' && (
        <div className="fixed inset-0 z-50 bg-black">
          <MatrixCanvas className="absolute inset-0 h-full w-full opacity-70" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/90" />

          <div className="relative flex h-full flex-col justify-center px-5 py-10 sm:px-10">
            <div className="mx-auto w-full max-w-3xl">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Logo className="h-7 w-7" />
                  <span className="font-mono text-xs font-bold tracking-[0.24em] text-white">
                    FFV2<span className="text-matrix">PRO</span>
                  </span>
                </div>
                <button
                  onClick={stop}
                  className="pointer-events-auto rounded-lg border border-white/15 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-300 transition hover:border-crimson/50 hover:text-crimson"
                >
                  <IconX className="mr-1 inline h-3 w-3" /> abort
                </button>
              </div>

              <div className="rounded-xl border border-matrix/25 bg-black/70 p-5 backdrop-blur-sm">
                {shown.map((line, i) => (
                  <p
                    key={i}
                    className={`whitespace-pre-wrap break-words font-mono text-[12.5px] leading-relaxed ${
                      line.c ?? 'text-matrix/90'
                    }`}
                  >
                    {line.t}
                  </p>
                ))}
                <p className="font-mono text-[12.5px] text-matrix">
                  <span className="animate-blink">▌</span>
                </p>
              </div>

              <div className="mt-5 h-1 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-matrix/80 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-[0.28em] text-matrix/60">
                establishing secure channel · {progress}%
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Redeem instructions + support                                       */
/* ------------------------------------------------------------------ */
function RedeemCard({ entitlement }) {
  return (
    <section id="redeem" className="glass p-6">
      <p className="eyebrow">Redeem in game</p>
      <h3 className="mt-2 text-base font-semibold text-white">Unlock PRO on your phone</h3>
      <ol className="mt-4 space-y-3 text-[13px] leading-relaxed text-slate-400">
        {[
          'Open FFV2 on your bound device and sign in to your player account.',
          'Go to Settings → Redeem Code.',
          'Paste the licence key below and confirm.',
          'PRO content appears in your inventory immediately — no restart needed.',
        ].map((t, i) => (
          <li key={t} className="flex gap-3">
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-cyan/30 bg-cyan/10 font-mono text-[10px] text-cyan">
              {i + 1}
            </span>
            {t}
          </li>
        ))}
      </ol>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-3">
        <code className="truncate font-mono text-[13px] tracking-wider text-cyan">
          {entitlement.key}
        </code>
        <CopyButton value={entitlement.key} />
      </div>

      <p className="mt-3 flex items-start gap-2 text-[11.5px] leading-relaxed text-slate-500">
        <IconLock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-600" />
        Keep this key private. Anyone who redeems it on another device uses one of your slots, and
        support cannot restore slots lost to sharing.
      </p>
    </section>
  );
}

function SupportCard({ config, onSignOut }) {
  return (
    <section className="glass p-6">
      <p className="eyebrow">Need help?</p>
      <p className="mt-2 text-[13px] leading-relaxed text-slate-400">
        Message <span className="font-mono text-cyan">{config?.brand?.support}</span> with your
        licence key and the last four characters of your device ID. Manual verification issues are
        usually resolved the same day.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <a href="#pricing" className="btn-ghost !py-2 !text-xs">
          <IconRefresh className="h-3.5 w-3.5" /> Renew or upgrade
        </a>
        <button onClick={onSignOut} className="btn-ghost !py-2 !text-xs">
          <IconLock className="h-3.5 w-3.5" /> Sign out of this device
        </button>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Toast                                                               */
/* ------------------------------------------------------------------ */
function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className="fixed bottom-5 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2">
      <div
        className={`rounded-xl border px-4 py-3 text-[13px] shadow-modal backdrop-blur-xl ${
          toast.tone === 'error'
            ? 'border-crimson/40 bg-crimson/15 text-crimson'
            : 'border-matrix/30 bg-matrix/10 text-matrix'
        }`}
      >
        {toast.message}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
export default function Dashboard({
  config,
  entitlement,
  onEntitlementChange,
  onSignOut,
  onHome,
  onRenew,
}) {
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const notify = useCallback((message, tone = 'ok') => {
    setToast({ message, tone });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3800);
  }, []);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  return (
    <div className="min-h-screen">
      <Header entitlement={entitlement} onSignOut={onSignOut} onHome={onHome} />

      <main className="shell py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Dashboard</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Welcome back, player.
            </h1>
            <p className="mt-1 text-[13px] text-slate-400">
              Session status is verified against the licence server on every page load.
            </p>
          </div>
          <button onClick={onHome} className="text-[12px] text-slate-400 hover:text-white">
            View plans <IconArrow className="ml-1 inline h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            <LicenseCard entitlement={entitlement} onRenew={onRenew} />
            <SessionRunner entitlement={entitlement} notify={notify} />
          </div>
          <div className="space-y-5">
            <DevicesCard
              entitlement={entitlement}
              onRemoved={(next) => onEntitlementChange(next)}
              notify={notify}
            />
            <RedeemCard entitlement={entitlement} />
            <SupportCard config={config} onSignOut={onSignOut} />
          </div>
        </div>

        <p className="mt-8 text-center text-[11px] text-slate-600">
          FFV2 PRO · entitlement records are kept on our servers. Clearing browser storage does not
          cancel your subscription.
        </p>
      </main>

      <Toast toast={toast} />
    </div>
  );
}
