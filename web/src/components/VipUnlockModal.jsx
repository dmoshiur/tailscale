import { useCallback, useEffect, useRef, useState } from 'react';
import Modal from './Modal.jsx';
import { IconCheck, IconCopy, IconCrown, IconShield } from './Icons.jsx';
import { formatDate } from '../lib/format.js';
import { isVipUnlocked, VIP_UNLOCK_EVENT } from '../lib/vipUnlock.js';

const COPY_FEEDBACK_MS = 2000;

/** Clipboard API + textarea fallback for embedded / non-secure contexts. */
async function copyToClipboard(value) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = value;
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

/**
 * VIP unlock card.
 *
 * Opened at the exact moment Dashboard → SessionRunner flips to "complete"
 * (the end of the matrix / terminal handshake), and restored from
 * localStorage afterwards so a refresh does not hide it again.
 *
 * It shows this app's own VIP ID (the licence key issued to the buyer) plus a
 * copyable access summary. Consistent with the scope note in the README, it
 * never displays a third-party (Facebook / game) account password: shipping
 * one in the client bundle would hand it to every visitor who views source.
 */
export default function VipUnlockModal({ active = false, entitlement = null }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(null); // null | 'id' | 'details'
  const timer = useRef(null);

  // Restore after a refresh: the receipt lives in localStorage.
  useEffect(() => {
    if (!active) {
      setOpen(false);
      return;
    }
    setOpen(isVipUnlocked());
  }, [active]);

  // Fired by the dashboard terminal runner when the handshake completes.
  useEffect(() => {
    const onUnlock = () => setOpen(true);
    window.addEventListener(VIP_UNLOCK_EVENT, onUnlock);
    return () => window.removeEventListener(VIP_UNLOCK_EVENT, onUnlock);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  const close = useCallback(() => {
    setOpen(false);
    setCopied(null);
    clearTimeout(timer.current);
  }, []);

  const flash = useCallback((field) => {
    setCopied(field);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(null), COPY_FEEDBACK_MS);
  }, []);

  const key = entitlement?.key ?? '';
  const planName = entitlement?.planName ?? 'FFV2 PRO';
  const expiry = entitlement?.expiresAt ? formatDate(entitlement.expiresAt) : 'Lifetime';
  const slots = `${entitlement?.devices?.length ?? 0} / ${entitlement?.maxDevices ?? '—'}`;

  const summary = [
    `VIP ID: ${key}`,
    `Plan: ${planName}`,
    `Expires: ${expiry}`,
    `Devices: ${slots}`,
  ].join('\n');

  async function handleCopy(field, value) {
    if (!value) return;
    await copyToClipboard(value);
    flash(field);
  }

  if (!open || !key) return null;

  const rows = [
    {
      id: 'id',
      label: 'VIP ID',
      value: key,
      display: key,
      action: 'Copy ID',
      aria: 'Copy VIP ID',
      mono: true,
    },
    {
      id: 'details',
      label: 'Access summary',
      value: summary,
      display: `${planName} · ${expiry} · ${slots} devices`,
      action: 'Copy details',
      aria: 'Copy access summary',
      mono: false,
    },
  ];

  return (
    <Modal open={open} onClose={close} labelledBy="vip-unlock-title" width="max-w-lg">
      <div className="relative overflow-hidden px-6 pb-6 pt-6 sm:px-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-matrix/10 blur-3xl" />

        <button
          type="button"
          onClick={close}
          className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-slate-500 transition hover:bg-white/5 hover:text-white"
          aria-label="Close"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <div className="relative flex flex-col items-center text-center">
          <span className="grid h-16 w-16 place-items-center rounded-2xl border border-cyan/30 bg-cyan/[0.07] shadow-glowCyan">
            <IconCrown className="h-8 w-8 text-cyan animate-pulseGlow" />
          </span>
          <p className="eyebrow mt-4">VIP access granted</p>
          <h2 id="vip-unlock-title" className="mt-2 text-2xl font-bold tracking-tight text-white">
            Tailscale Pro VIP Unlock Successful
          </h2>
          <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-slate-400">
            The handshake finished and this device is now bound to your VIP plan. Copy your VIP
            ID below and keep it safe.
          </p>
        </div>

        <div className="relative mt-5 space-y-2.5">
          {rows.map((row) => {
            const done = copied === row.id;
            return (
              <div
                key={row.id}
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3.5"
              >
                <p className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-slate-500">
                  {row.label}
                </p>
                <div className="mt-1.5 flex items-center gap-3">
                  <span
                    className={`min-w-0 flex-1 truncate ${
                      row.mono
                        ? 'font-mono text-[13.5px] font-bold tracking-[0.08em] text-white'
                        : 'text-[12.5px] font-semibold text-slate-200'
                    }`}
                    title={row.display}
                  >
                    {row.display}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(row.id, row.value)}
                    aria-label={row.aria}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-mono text-[11px] transition ${
                      done
                        ? 'border-matrix/50 bg-matrix/10 text-matrix'
                        : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-cyan/40 hover:text-white'
                    }`}
                  >
                    {done ? (
                      <IconCheck className="h-3.5 w-3.5" />
                    ) : (
                      <IconCopy className="h-3.5 w-3.5" />
                    )}
                    <span aria-live="polite">{done ? 'Copied!' : row.action}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <p className="relative mt-4 flex items-start gap-2 rounded-xl border border-matrix/25 bg-matrix/[0.06] px-4 py-3 text-left text-[11.5px] leading-relaxed text-slate-400">
          <IconShield className="mt-0.5 h-4 w-4 shrink-0 text-matrix" />
          <span>
            Saved on this device — refresh or reopen the page and this card comes back with the
            same VIP ID. We never ask for, store or display a Facebook or game password.
          </span>
        </p>

        <div className="relative mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => handleCopy('id', key)}
            className="btn-primary flex-1"
          >
            {copied === 'id' ? <IconCheck className="h-4 w-4" /> : <IconCopy className="h-4 w-4" />}
            {copied === 'id' ? 'Copied!' : 'Copy ID'}
          </button>
          <button type="button" onClick={close} className="btn-ghost flex-1">
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
}
