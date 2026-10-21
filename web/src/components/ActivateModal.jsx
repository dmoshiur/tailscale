import { useEffect, useState } from 'react';
import Modal from './Modal.jsx';
import { IconKey, IconShield, IconSpin, IconX } from './Icons.jsx';
import { api } from '../lib/api.js';
import { getDeviceId } from '../lib/store.js';

/** Formats user typing into FFV2-XXXX-XXXX-XXXX-XXXX as they go. */
function formatKey(raw) {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^FFV2/, '').slice(0, 16);
  const groups = clean.match(/.{1,4}/g) ?? [];
  return (groups.length ? `FFV2-${groups.join('-')}` : '').slice(0, 24);
}

export default function ActivateModal({ open, onClose, onActivated, initialKey = '', notice }) {
  const [key, setKey] = useState(initialKey);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setKey(initialKey ? formatKey(initialKey) : '');
      setError('');
      setBusy(false);
    }
  }, [open, initialKey]);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const data = await api.activate(key, getDeviceId());
      onActivated?.(data.entitlement, key);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} labelledBy="activate-title" width="max-w-md">
      <div className="flex items-start justify-between px-6 pt-5">
        <div>
          <div className="grid h-10 w-10 place-items-center rounded-xl border border-cyan/25 bg-cyan/10 text-cyan">
            <IconKey className="h-5 w-5" />
          </div>
          <h2 id="activate-title" className="mt-3 text-lg font-semibold text-white">
            Redeem your licence key
          </h2>
          <p className="mt-1 text-[13px] text-slate-400">
            Bind this browser to an active FFV2 PRO subscription.
          </p>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/5 hover:text-white"
          aria-label="Close"
        >
          <IconX className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={submit} className="px-6 pb-6 pt-5">
        {notice && (
          <div className="mb-4 rounded-xl border border-amber-400/25 bg-amber-400/[0.07] px-4 py-3 text-[12.5px] leading-relaxed text-amber-200/90">
            {notice}
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-xl border border-crimson/30 bg-crimson/10 px-4 py-3 text-[12.5px] leading-relaxed text-crimson">
            {error}
          </div>
        )}

        <label htmlFor="licence-key" className="label">
          Licence key
        </label>
        <input
          id="licence-key"
          className="field text-center text-base tracking-[0.14em]"
          placeholder="FFV2-XXXX-XXXX-XXXX-XXXX"
          autoComplete="off"
          spellCheck={false}
          value={key}
          onChange={(e) => setKey(formatKey(e.target.value))}
        />

        <button type="submit" disabled={busy || key.length < 24} className="btn-primary mt-4 w-full">
          {busy ? <IconSpin /> : <IconShield className="h-4 w-4" />}
          Activate on this device
        </button>

        <p className="mt-3 text-center text-[11.5px] leading-relaxed text-slate-500">
          Each key works on a limited number of devices. Activation is checked server-side — the
          browser cache alone will not unlock anything.
        </p>
      </form>
    </Modal>
  );
}
