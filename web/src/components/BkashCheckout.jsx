import { useCallback, useEffect, useRef, useState } from 'react';
import Modal from './Modal.jsx';
import {
  BkashMark,
  IconArrow,
  IconCheck,
  IconCopy,
  IconRefresh,
  IconShield,
  IconSpin,
  IconX,
} from './Icons.jsx';
import { api } from '../lib/api.js';
import { formatBdt } from '../lib/format.js';

const PHONE_RE = /^01[3-9]\d{8}$/;

function CopyField({ value, mono = true }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      /* clipboard blocked — the value is still selectable */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-bkash transition hover:bg-bkash/5"
      title="Copy"
    >
      <span className={mono ? 'font-mono' : ''}>{value}</span>
      {copied ? <IconCheck className="h-3.5 w-3.5" /> : <IconCopy className="h-3.5 w-3.5" />}
    </button>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-[13px] text-slate-500">{label}</span>
      <span className="text-right text-[13px] font-medium text-slate-900">{children}</span>
    </div>
  );
}

export default function BkashCheckout({
  open,
  plan,
  config,
  initialOrder,
  onClose,
  onPaid,
  onPendingChange,
  onDone,
}) {
  const [step, setStep] = useState('summary'); // summary | pay | waiting | paid
  const [order, setOrder] = useState(null); // { publicId, claimSecret, status }
  const [license, setLicense] = useState(null);
  const [form, setForm] = useState({ senderMobile: '', trxId: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [lastCheck, setLastCheck] = useState(null);
  const pollRef = useRef(null);

  const payment = config?.payment ?? {};
  const amount = plan?.priceBdt ?? order?.amountBdt ?? 0;

  const reset = useCallback(() => {
    setStep('summary');
    setOrder(null);
    setLicense(null);
    setForm({ senderMobile: '', trxId: '' });
    setError('');
    setBusy(false);
    setElapsed(0);
    setLastCheck(null);
  }, []);

  /* Hydrate from a pending order saved in localStorage. */
  useEffect(() => {
    if (!open) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    if (initialOrder?.publicId && initialOrder?.claimSecret) {
      setOrder({
        ...initialOrder,
        publicId: initialOrder.publicId,
        claimSecret: initialOrder.claimSecret,
        amountBdt: initialOrder.order?.amountBdt ?? amount,
        trxId: initialOrder.order?.trxId,
      });
      setForm((f) => ({
        ...f,
        senderMobile: initialOrder.order?.senderMobile ?? f.senderMobile,
        trxId: initialOrder.order?.trxId ?? f.trxId,
      }));
      setStep(initialOrder.order?.status === 'awaiting_verification' ? 'waiting' : 'pay');
    } else {
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /* Step 1 → create the order server-side (fixes the amount + reference). */
  async function createOrder(e) {
    e?.preventDefault?.();
    setBusy(true);
    setError('');
    try {
      const data = await api.createOrder(plan.id, form.senderMobile || undefined);
      const next = {
        publicId: data.order.id,
        claimSecret: data.claimSecret,
        amountBdt: data.order.amountBdt,
        planId: data.order.planId,
        status: data.order.status,
      };
      setOrder(next);
      setStep('pay');
      onPendingChange?.({
        publicId: next.publicId,
        claimSecret: next.claimSecret,
        planId: next.planId,
        order: { ...data.order },
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  /* Step 2 → buyer submits TRX + sender number. */
  async function submitTrx(e) {
    e.preventDefault();
    setError('');

    if (!PHONE_RE.test(form.senderMobile)) {
      setError('Enter the bKash number you sent from, e.g. 01712345678.');
      return;
    }
    if (!/^[A-Za-z0-9]{6,32}$/.test(form.trxId.trim())) {
      setError('Paste the TRX ID from your bKash confirmation message.');
      return;
    }

    setBusy(true);
    try {
      await api.submitTrx(order.publicId, {
        claimSecret: order.claimSecret,
        trxId: form.trxId,
        senderMobile: form.senderMobile,
      });
      setOrder((o) => ({ ...o, status: 'awaiting_verification' }));
      setStep('waiting');
      onPendingChange?.({
        publicId: order.publicId,
        claimSecret: order.claimSecret,
        planId: plan?.id ?? order.planId,
        order: {
          id: order.publicId,
          planId: plan?.id ?? order.planId,
          amountBdt: amount,
          status: 'awaiting_verification',
          trxId: form.trxId.trim().toUpperCase(),
        },
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  /* Step 3 → poll for admin confirmation. */
  const check = useCallback(async () => {
    if (!order?.publicId || !order?.claimSecret) return;
    try {
      const data = await api.orderStatus(order.publicId, order.claimSecret);
      setLastCheck(new Date().toISOString());

      if (data.order?.status === 'rejected') {
        setError(
          'This payment was not found in our bKash statement. Contact support with your order reference.',
        );
        setStep('pay');
        if (pollRef.current) clearInterval(pollRef.current);
        return;
      }
      if (data.license?.key) {
        setLicense(data.license);
        setStep('paid');
        setOrder((o) => ({ ...o, status: 'paid' }));
        if (pollRef.current) clearInterval(pollRef.current);
        try {
          await onPaid?.(data.license.key, data.order);
        } catch (err) {
          // Payment is verified, but this device cannot be bound (usually the
          // device limit). The key is still shown so nothing is lost.
          setError(
            `${err.message} Your key is valid — sign in on another device, or contact support to free a slot.`,
          );
        }
      }
    } catch {
      /* transient network blip — keep polling */
    }
  }, [order?.publicId, order?.claimSecret, onPaid]);

  useEffect(() => {
    if (!open || step !== 'waiting') return undefined;

    const start = Date.now();
    const tick = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);

    check();
    pollRef.current = setInterval(check, 5000);

    return () => {
      clearInterval(tick);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [open, step, check]);

  if (!plan && !order) return null;

  const merchantNumber = payment.merchantNumber ?? '01XXXXXXXXX';
  const merchantName = payment.merchantName ?? 'FFV2 PRO';

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="bkash-title"
      tone="light"
      width="max-w-md"
      dismissible={step !== 'paid'}
    >
      {/* ---------------------------------------------------------- header */}
      <div className="relative overflow-hidden rounded-t-3xl bg-bkash px-6 pb-5 pt-5 text-white">
        <div className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full bg-white/10" />
        <div className="relative flex items-start justify-between">
          <div>
            <BkashMark className="h-7" />
            <h2 id="bkash-title" className="mt-3 text-lg font-semibold">
              {step === 'paid' ? 'Payment verified' : 'Pay with bKash'}
            </h2>
            <p className="mt-0.5 text-[12.5px] text-white/80">
              {step === 'paid'
                ? 'Your licence has been issued.'
                : 'Send Money · manual verification'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-white/80 transition hover:bg-white/15 hover:text-white"
            aria-label="Close"
          >
            <IconX className="h-5 w-5" />
          </button>
        </div>

        <div className="relative mt-4 flex items-center justify-between rounded-xl bg-white/12 px-4 py-3">
          <span className="text-[12px] uppercase tracking-wider text-white/75">Total</span>
          <span className="text-xl font-bold">{formatBdt(amount)}</span>
        </div>
      </div>

      {/* ------------------------------------------------------------ body */}
      <div className="px-6 py-5 text-slate-900">
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] leading-relaxed text-red-700">
            {error}
          </div>
        )}

        {/* ---------------- summary ---------------- */}
        {step === 'summary' && (
          <>
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 px-4">
              <Row label="Plan">{plan?.name}</Row>
              <Row label="Duration">
                {plan?.days ? `${plan.days} days` : 'Lifetime'}
              </Row>
              <Row label="Merchant">{merchantName}</Row>
              <Row label="Method">bKash Send Money</Row>
            </div>

            <ul className="mt-4 space-y-2 text-[12.5px] text-slate-600">
              <li className="flex gap-2">
                <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                You will get an order reference before sending money.
              </li>
              <li className="flex gap-2">
                <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                Verification is manual — your page updates automatically.
              </li>
              <li className="flex gap-2">
                <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                We never ask for your game or Facebook password.
              </li>
            </ul>

            <form onSubmit={createOrder} className="mt-5">
              <label htmlFor="buyer-phone" className="label-light">
                Your bKash number (optional)
              </label>
              <input
                id="buyer-phone"
                className="field-light"
                placeholder="01712345678"
                inputMode="numeric"
                maxLength={11}
                value={form.senderMobile}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    senderMobile: e.target.value.replace(/\D/g, '').slice(0, 11),
                  }))
                }
              />
              <p className="mt-1.5 text-[11.5px] text-slate-400">
                Used only to match your payment if the TRX ID is hard to read.
              </p>

              <button type="submit" disabled={busy} className="btn-bkash mt-5">
                {busy ? <IconSpin /> : null}
                Continue with bKash
              </button>
            </form>
          </>
        )}

        {/* ---------------- pay ---------------- */}
        {step === 'pay' && (
          <>
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4">
              <Row label="Send to">{merchantName}</Row>
              <Row label="bKash number">
                <CopyField value={merchantNumber} />
              </Row>
              <Row label="Amount">
                <CopyField value={String(amount)} mono={false} />
              </Row>
              <Row label="Reference">
                <CopyField value={order?.publicId ?? '—'} />
              </Row>
            </div>

            <div className="mt-4 rounded-xl bg-bkash/5 px-4 py-3 text-[12.5px] leading-relaxed text-slate-700">
              <p className="font-semibold text-slate-900">In the bKash app:</p>
              <ol className="mt-1.5 list-inside list-decimal space-y-0.5">
                <li>Tap <b>Send Money</b> and enter the number above.</li>
                <li>Enter exactly <b>{formatBdt(amount)}</b>.</li>
                <li>
                  Put the reference <span className="font-mono">{order?.publicId}</span> in the
                  reference field if it appears.
                </li>
                <li>Confirm with your PIN, then copy the TRX ID from the SMS.</li>
              </ol>
            </div>

            <form onSubmit={submitTrx} className="mt-5 space-y-3">
              <div>
                <label htmlFor="sender-mobile" className="label-light">
                  Your bKash number
                </label>
                <input
                  id="sender-mobile"
                  className="field-light"
                  placeholder="01712345678"
                  inputMode="numeric"
                  maxLength={11}
                  value={form.senderMobile}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      senderMobile: e.target.value.replace(/\D/g, '').slice(0, 11),
                    }))
                  }
                />
              </div>

              <div>
                <label htmlFor="trx" className="label-light">
                  TRX ID
                </label>
                <input
                  id="trx"
                  className="field-light font-mono uppercase tracking-wider"
                  placeholder="e.g. 9H2K7LQ4MN"
                  maxLength={32}
                  value={form.trxId}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      trxId: e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase(),
                    }))
                  }
                />
                <p className="mt-1.5 text-[11.5px] text-slate-400">
                  Found in the bKash confirmation SMS: “TrxID 9H2K7LQ4MN”.
                </p>
              </div>

              <button type="submit" disabled={busy} className="btn-bkash">
                {busy ? <IconSpin /> : <IconShield className="h-4 w-4" />}
                Submit for verification
              </button>
              <button
                type="button"
                onClick={() => setStep('summary')}
                className="w-full text-center text-[12px] text-slate-500 underline-offset-2 hover:underline"
              >
                Change plan
              </button>
            </form>
          </>
        )}

        {/* ---------------- waiting ---------------- */}
        {step === 'waiting' && (
          <>
            <div className="flex flex-col items-center py-4 text-center">
              <div className="relative grid h-16 w-16 place-items-center">
                <span className="absolute inset-0 animate-pulseGlow rounded-full bg-bkash/15" />
                <IconSpin className="h-9 w-9 text-bkash" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-slate-900">
                Waiting for verification
              </h3>
              <p className="mt-1.5 max-w-xs text-[12.5px] leading-relaxed text-slate-500">
                Our team is matching TRX <span className="font-mono text-slate-700">
                  {form.trxId || order?.trxId || '—'}
                </span>{' '}
                against the bKash statement. This page updates on its own — you can close it and
                come back.
              </p>

              <div className="mt-4 flex items-center gap-4 rounded-full border border-slate-200 px-4 py-1.5 font-mono text-[11px] text-slate-500">
                <span>{String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}</span>
                <span className="h-1 w-1 rounded-full bg-slate-300" />
                <span>checked {lastCheck ? 'just now' : '…'}</span>
              </div>
            </div>

            <div className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 px-4">
              <Row label="Order">{order?.publicId}</Row>
              <Row label="Amount">{formatBdt(amount)}</Row>
              <Row label="Status">
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                  awaiting verification
                </span>
              </Row>
            </div>

            <div className="mt-4 flex gap-2">
              <button onClick={check} className="btn-bkash !mt-0">
                <IconRefresh className="h-4 w-4" /> Check now
              </button>
            </div>
            <p className="mt-3 text-center text-[11.5px] text-slate-400">
              Taking longer than 30 minutes? Contact {payment.support ?? config?.brand?.support}.
            </p>
          </>
        )}

        {/* ---------------- paid ---------------- */}
        {step === 'paid' && (
          <>
            <div className="flex flex-col items-center py-2 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-emerald-50">
                <IconCheck className="h-7 w-7 text-emerald-600" />
              </div>
              <h3 className="mt-3 text-base font-semibold text-slate-900">Licence issued</h3>
              <p className="mt-1 text-[12.5px] text-slate-500">
                Keep this key — it is also stored in your dashboard.
              </p>
            </div>

            <div className="mt-4 rounded-xl border border-dashed border-bkash/40 bg-bkash/[0.04] px-4 py-4 text-center">
              <p className="text-[11px] uppercase tracking-wider text-slate-500">Your licence key</p>
              <p className="mt-1.5 break-all font-mono text-[15px] font-bold tracking-wider text-slate-900">
                {license?.key}
              </p>
              <div className="mt-2 flex justify-center">
                <CopyField value={license?.key ?? ''} />
              </div>
            </div>

            <div className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 px-4">
              <Row label="Plan">{license?.planId ?? plan?.id}</Row>
              <Row label="Expires">{license?.expiresAt?.slice(0, 10) ?? 'Never'}</Row>
              <Row label="Devices">{license?.maxDevices ?? plan?.maxDevices}</Row>
            </div>

            <button onClick={onDone ?? onClose} className="btn-bkash mt-5">
              Open dashboard <IconArrow className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}
