import { useEffect, useRef, useState } from 'react';
import Modal from './Modal.jsx';
import { Logo, IconArrow, IconCheck, IconCopy, IconShield, IconX } from './Icons.jsx';
import { formatDate } from '../lib/format.js';

/**
 * Big confirmation popup shown immediately after a successful redeem /
 * activation (manual key entry, or a verified purchase).
 *
 * Security boundary (see README scope note): this popup only ever shows
 * the player's *own* FFV2 licence key — the value the server issued to
 * them and that they paste into FFV2 → Settings → Redeem Code. It never
 * asks for, stores or displays a Facebook login, a game password, or any
 * other third-party account credential, and no shared account details
 * are bundled into the client.
 */
export default function RedeemSuccessModal({ open, entitlement, licenseKey = '', onClose }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);

  const key = licenseKey || entitlement?.key || '';

  useEffect(() => {
    if (open) setCopied(false);
    return () => clearTimeout(timer.current);
  }, [open, key]);

  async function copyKey() {
    if (!key) return;
    try {
      await navigator.clipboard.writeText(key);
    } catch {
      // Clipboard API is unavailable in some embedded / non-secure
      // contexts — fall back to a temporary textarea so copy still works.
      try {
        const ta = document.createElement('textarea');
        ta.value = key;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      } catch {
        /* the key stays on screen and in the dashboard either way */
      }
    }
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1800);
  }

  if (!open || !key) return null;

  const devices =
    entitlement?.devices && entitlement?.maxDevices
      ? `${entitlement.devices.length} / ${entitlement.maxDevices}`
      : '—';

  return (
    <Modal open={open} onClose={onClose} labelledBy="redeem-success-title" width="max-w-lg">
      <div className="relative overflow-hidden px-6 pb-6 pt-6 sm:px-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-matrix/10 blur-3xl" />

        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-slate-500 transition hover:bg-white/5 hover:text-white"
          aria-label="Close"
        >
          <IconX className="h-5 w-5" />
        </button>

        <div className="relative flex flex-col items-center text-center">
          <Logo className="h-16 w-16 animate-pulseGlow" />
          <p className="eyebrow mt-4">Redeem successful</p>
          <h2 id="redeem-success-title" className="mt-2 text-2xl font-bold tracking-tight text-white">
            PRO access activated
          </h2>
          <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-slate-400">
            This device is now bound to your subscription. Tap the key below to copy it, then
            paste it inside the game.
          </p>
        </div>

        {/* Big tap-to-copy key display */}
        <button
          type="button"
          onClick={copyKey}
          className="relative mt-5 w-full rounded-2xl border border-dashed border-cyan/40 bg-cyan/[0.06] px-4 py-5 text-center transition hover:border-cyan/70 hover:bg-cyan/[0.09] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan/60"
          aria-label={`Copy licence key ${key}`}
        >
          <span className="block font-mono text-[10px] uppercase tracking-[0.24em] text-slate-500">
            Your licence key — tap to copy
          </span>
          <span className="mt-2 block break-all font-mono text-lg font-bold tracking-[0.12em] text-white sm:text-xl">
            {key}
          </span>
          <span
            aria-live="polite"
            className={`mt-2.5 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider ${
              copied ? 'text-matrix' : 'text-cyan/80'
            }`}
          >
            {copied ? <IconCheck className="h-3.5 w-3.5" /> : <IconCopy className="h-3.5 w-3.5" />}
            {copied ? 'Copied to clipboard' : 'Click to copy'}
          </span>
        </button>

        <dl className="relative mt-4 grid grid-cols-3 gap-3 text-center">
          {[
            ['Plan', entitlement?.planName ?? 'FFV2 PRO'],
            ['Expires', entitlement?.expiresAt ? formatDate(entitlement.expiresAt) : 'Lifetime'],
            ['Devices', devices],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-white/10 bg-white/[0.03] px-2 py-3">
              <dt className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-slate-500">
                {label}
              </dt>
              <dd className="mt-1 truncate text-[12.5px] font-semibold text-white" title={String(value)}>
                {value}
              </dd>
            </div>
          ))}
        </dl>

        <ol className="relative mt-4 space-y-2 rounded-xl border border-white/10 bg-black/30 px-4 py-3.5 text-left text-[12.5px] leading-relaxed text-slate-400">
          {[
            'Open FFV2 on this device and sign in to your own player account.',
            'Go to Settings → Redeem Code.',
            'Paste the licence key above and confirm — PRO unlocks instantly.',
          ].map((t, i) => (
            <li key={t} className="flex gap-2.5">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-cyan/30 bg-cyan/10 font-mono text-[10px] text-cyan">
                {i + 1}
              </span>
              {t}
            </li>
          ))}
        </ol>

        <p className="relative mt-4 flex items-start gap-2 rounded-xl border border-matrix/25 bg-matrix/[0.06] px-4 py-3 text-left text-[11.5px] leading-relaxed text-slate-400">
          <IconShield className="mt-0.5 h-4 w-4 shrink-0 text-matrix" />
          <span>
            Only this licence key unlocks PRO. We never ask for, store or show any Facebook or
            game password — and you should keep this key private like a password, because anyone
            who redeems it uses one of your device slots.
          </span>
        </p>

        <div className="relative mt-5 flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={copyKey} className="btn-primary flex-1">
            {copied ? <IconCheck className="h-4 w-4" /> : <IconCopy className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy licence key'}
          </button>
          <button type="button" onClick={onClose} className="btn-ghost flex-1">
            Go to dashboard <IconArrow className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Modal>
  );
}
