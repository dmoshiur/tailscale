import { useState } from 'react';
import {
  Logo,
  BkashMark,
  IconArrow,
  IconBolt,
  IconCheck,
  IconCrown,
  IconDevices,
  IconInfinity,
  IconKey,
  IconLock,
  IconRefresh,
  IconShield,
} from './Icons.jsx';
import { formatBdt, maskKey } from '../lib/format.js';

/* ------------------------------------------------------------------ */
/* Navigation                                                          */
/* ------------------------------------------------------------------ */
function Nav({ session, onActivate, onDashboard }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-ink/80 backdrop-blur-xl">
      <div className="shell flex h-16 items-center justify-between gap-4">
        <a href="#top" className="flex items-center gap-2.5">
          <Logo className="h-8 w-8" />
          <span className="font-mono text-sm font-bold tracking-[0.22em] text-white">
            FFV2<span className="text-cyan">PRO</span>
          </span>
        </a>

        <nav className="hidden items-center gap-7 md:flex">
          {[
            ['#features', 'Features'],
            ['#pricing', 'Plans'],
            ['#how', 'How it works'],
            ['#faq', 'FAQ'],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="text-sm text-slate-400 transition hover:text-white"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {session ? (
            <button onClick={onDashboard} className="btn-primary hidden sm:inline-flex">
              Dashboard <IconArrow className="h-4 w-4" />
            </button>
          ) : (
            <>
              <button onClick={onActivate} className="btn-ghost hidden sm:inline-flex">
                <IconKey className="h-4 w-4" /> Redeem key
              </button>
              <a href="#pricing" className="btn-primary">
                Get PRO
              </a>
            </>
          )}
          <button
            onClick={() => setOpen((v) => !v)}
            className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 md:hidden"
            aria-label="Menu"
          >
            <span className="space-y-1">
              <span className="block h-px w-4 bg-white" />
              <span className="block h-px w-4 bg-white" />
              <span className="block h-px w-4 bg-white" />
            </span>
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-white/5 px-5 pb-4 pt-2 md:hidden">
          <div className="flex flex-col gap-1">
            {[
              ['#features', 'Features'],
              ['#pricing', 'Plans'],
              ['#how', 'How it works'],
              ['#faq', 'FAQ'],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-2.5 text-sm text-slate-300 hover:bg-white/5"
              >
                {label}
              </a>
            ))}
          </div>
          {!session && (
            <button onClick={onActivate} className="btn-ghost mt-2 w-full">
              <IconKey className="h-4 w-4" /> Redeem a key
            </button>
          )}
        </div>
      )}
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */
function Hero({ onActivate, session, onDashboard }) {
  const entitle = session?.entitlement;

  return (
    <section id="top" className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 grid-bg" />
      <div className="pointer-events-none absolute -left-24 top-10 h-64 w-64 rounded-full bg-cyan/20 blur-[110px]" />
      <div className="pointer-events-none absolute right-0 top-40 h-64 w-64 rounded-full bg-crimson/20 blur-[110px]" />

      <div className="shell relative grid gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-24">
        <div>
          <span className="chip">
            <span className="h-1.5 w-1.5 animate-pulseGlow rounded-full bg-matrix" />
            bKash · manual verification
          </span>

          <h1 className="mt-6 text-balance text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
            FFV2 PRO,
            <br />
            <span className="bg-gradient-to-r from-cyan via-white to-crimson bg-clip-text text-transparent">
              unlocked in minutes.
            </span>
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-400">
            FFV2 is our studio's own battle-royale shooter. The PRO tier adds the full cosmetic
            arsenal, matchmaking priority and every seasonal drop. Pay with bKash, submit your
            transaction ID, and your license key is issued to your account.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {entitle ? (
              <button onClick={onDashboard} className="btn-primary">
                Open dashboard <IconArrow className="h-4 w-4" />
              </button>
            ) : (
              <a href="#pricing" className="btn-primary">
                <IconBolt className="h-4 w-4" /> Unlock PRO
              </a>
            )}
            <button onClick={onActivate} className="btn-ghost">
              <IconKey className="h-4 w-4" /> I have a key
            </button>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-slate-500">
            <span className="flex items-center gap-2">
              <IconShield className="h-4 w-4 text-cyan" /> Server-verified entitlements
            </span>
            <span className="flex items-center gap-2">
              <IconDevices className="h-4 w-4 text-cyan" /> Device-bound licensing
            </span>
            <span className="flex items-center gap-2">
              <IconRefresh className="h-4 w-4 text-cyan" /> Renew without losing progress
            </span>
          </div>
        </div>

        {/* Terminal preview */}
        <div className="relative">
          <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-cyan/20 via-transparent to-crimson/20 blur-2xl" />
          <div className="glass relative overflow-hidden p-1.5">
            <div className="flex items-center gap-2 border-b border-white/5 px-3 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-crimson/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-matrix/70" />
              <span className="ml-2 font-mono text-[11px] text-slate-500">
                ffv2-pro — license-console
              </span>
            </div>
            <div className="term m-1.5 !border-matrix/10 !bg-black/70">
              <p className="term-line text-slate-500">$ ffv2 license status</p>
              <p className="term-line mt-2 text-cyan">
                plan ......... {entitle?.planName ?? 'PRO · 1 Year'}
              </p>
              <p className="term-line text-cyan">
                key .......... {entitle ? maskKey(entitle.key) : 'FFV2-••••-••••-••••-9KQ2'}
              </p>
              <p className="term-line text-cyan">
                devices ...... {entitle ? `${entitle.devices.length}/${entitle.maxDevices}` : '1/2'}
              </p>
              <p className="term-line text-cyan">
                expires ...... {entitle ? entitle.expiresAt?.slice(0, 10) ?? 'never' : '2027-10-21'}
              </p>
              <p className="term-line mt-2 text-matrix">[ok] entitlement signed</p>
              <p className="term-line text-matrix">
                [ok] PRO cosmetics bundle attached
              </p>
              <p className="term-line mt-2 text-slate-500">
                $ <span className="animate-blink text-matrix">▌</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Features                                                            */
/* ------------------------------------------------------------------ */
const FEATURES = [
  {
    icon: IconCrown,
    title: 'Everything in PRO',
    body: 'Full cosmetic arsenal, season pass drops, matchmaking priority and ad-free lobbies — across every game mode.',
  },
  {
    icon: IconKey,
    title: 'Your own license key',
    body: 'A single FFV2-XXXX key issued after verification. No passwords shared, no third-party logins, ever.',
  },
  {
    icon: IconDevices,
    title: 'Multi-device binding',
    body: 'Bind the plan to the phones you actually play on. Remove a device yourself and free the slot instantly.',
  },
  {
    icon: IconShield,
    title: 'Server-verified access',
    body: 'Entitlements are checked against the license server on every launch, so a cleared cache never locks you out.',
  },
];

function Features() {
  return (
    <section id="features" className="relative py-16 sm:py-20">
      <div className="shell">
        <div className="max-w-2xl">
          <p className="eyebrow">What you get</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Built like a real product, not a promise.
          </h2>
          <p className="mt-3 text-slate-400">
            Every unlock is backed by a license record on our servers — with an expiry date, a
            device list and support if anything goes wrong.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="glass glass-hover group p-5">
              <div className="grid h-10 w-10 place-items-center rounded-xl border border-cyan/20 bg-cyan/10 text-cyan transition group-hover:bg-cyan/15">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-white">{title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-400">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Pricing                                                             */
/* ------------------------------------------------------------------ */
function PlanIcon({ planId }) {
  if (planId === 'month') return <IconBolt className="h-5 w-5" />;
  if (planId === 'year') return <IconCrown className="h-5 w-5" />;
  return <IconInfinity className="h-5 w-5" />;
}

function Pricing({ plans, onBuy }) {
  return (
    <section id="pricing" className="relative py-16 sm:py-20">
      <div className="shell">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">Plans</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            One-time payment. Real access.
          </h2>
          <p className="mt-3 text-slate-400">
            Pay in BDT with bKash. Verification is manual — most orders clear within minutes
            during support hours.
          </p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border p-6 transition duration-300 ${
                plan.featured
                  ? 'border-cyan/40 bg-gradient-to-b from-cyan/[0.10] to-white/[0.02] shadow-glowCyan'
                  : 'border-white/10 bg-white/[0.03] hover:border-white/20'
              }`}
            >
              {plan.featured && (
                <span className="absolute -top-3 left-6 rounded-full bg-cyan px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ink">
                  Best value
                </span>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-cyan">
                  <PlanIcon planId={plan.id} />
                  <span className="font-mono text-[11px] uppercase tracking-[0.2em]">
                    {plan.name}
                  </span>
                </div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                  {plan.maxDevices} device{plan.maxDevices > 1 ? 's' : ''}
                </span>
              </div>

              <div className="mt-5 flex items-end gap-2">
                <span className="text-4xl font-extrabold tracking-tight text-white">
                  {formatBdt(plan.priceBdt)}
                </span>
                <span className="pb-1 font-mono text-[11px] uppercase tracking-wider text-slate-500">
                  / {plan.days ? `${plan.days} days` : 'forever'}
                </span>
              </div>
              <p className="mt-1 text-[13px] text-slate-400">{plan.tagline}</p>

              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2.5 text-[13px] text-slate-300">
                    <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => onBuy(plan)}
                className={`mt-7 w-full ${plan.featured ? 'btn-primary' : 'btn-ghost'}`}
              >
                Buy Now / Unlock
                <IconArrow className="h-4 w-4" />
              </button>

              <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-wider text-slate-600">
                bKash · manual verification
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs text-slate-500">
          <span className="flex items-center gap-2">
            <BkashMark className="h-4" /> bKash merchant payment
          </span>
          <span className="flex items-center gap-2">
            <IconLock className="h-4 w-4" /> Transaction IDs verified manually
          </span>
          <span className="flex items-center gap-2">
            <IconRefresh className="h-4 w-4" /> 7-day replacement on unverifiable payments
          </span>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* How it works                                                        */
/* ------------------------------------------------------------------ */
const STEPS = [
  {
    n: '01',
    title: 'Pick a plan',
    body: 'Choose 1 month, 1 year or lifetime. Prices are fixed in BDT — no hidden conversion fees.',
  },
  {
    n: '02',
    title: 'Send money via bKash',
    body: 'Use Send Money to our merchant number shown in checkout, then paste the TRX ID from your bKash message.',
  },
  {
    n: '03',
    title: 'We verify the payment',
    body: 'Our team matches your TRX ID against the bKash statement. The page updates itself the moment it clears.',
  },
  {
    n: '04',
    title: 'Redeem your key',
    body: 'Your license key appears in the dashboard. Enter it in FFV2 → Settings → Redeem Code to unlock PRO.',
  },
];

function HowItWorks() {
  return (
    <section id="how" className="relative py-16 sm:py-20">
      <div className="shell">
        <div className="max-w-2xl">
          <p className="eyebrow">Process</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Four steps, no surprises.
          </h2>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <div key={s.n} className="glass glass-hover relative overflow-hidden p-5">
              <span className="font-mono text-3xl font-bold text-white/10">{s.n}</span>
              <h3 className="mt-2 text-sm font-semibold text-white">{s.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-400">{s.body}</p>
              <div className="mt-4 h-px w-full bg-gradient-to-r from-cyan/40 to-transparent" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* FAQ                                                                 */
/* ------------------------------------------------------------------ */
const FAQS = [
  {
    q: 'Is FFV2 the same as Garena Free Fire?',
    a: 'No. FFV2 is an independent game built and published by our own studio. We are not affiliated with Garena, Free Fire, or any other publisher, and we do not sell or transfer accounts for third-party games.',
  },
  {
    q: 'Does PRO need my game password?',
    a: 'Never. You pay with bKash, we issue a licence key, and you redeem that key inside FFV2. Nobody on our side ever asks for your game or social-media credentials.',
  },
  {
    q: 'How long does manual verification take?',
    a: 'Usually 2–10 minutes between 10:00 and 23:00 (GMT+6). Outside those hours it can take until the next morning. Your checkout page keeps checking in the background and also survives a refresh.',
  },
  {
    q: 'What if I send the wrong amount?',
    a: 'Submit the TRX ID anyway and message support with your order reference. We top up the difference or refund the payment to your bKash number within 7 days.',
  },
  {
    q: 'Can I move my licence to a new phone?',
    a: 'Yes. Open the dashboard, remove the old device, then activate on the new one. Your plan and expiry date are unaffected.',
  },
];

function Faq({ support }) {
  const [open, setOpen] = useState(0);
  return (
    <section id="faq" className="relative py-16 sm:py-20">
      <div className="shell grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="eyebrow">FAQ</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Questions, answered.
          </h2>
          <p className="mt-3 text-sm text-slate-400">
            Still stuck? Message{' '}
            <span className="font-mono text-cyan">{support}</span> with your order reference and
            we will sort it out.
          </p>
        </div>

        <div className="divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">
          {FAQS.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q}>
                <button
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="text-sm font-medium text-white">{item.q}</span>
                  <span
                    className={`font-mono text-lg leading-none text-cyan transition ${
                      isOpen ? 'rotate-45' : ''
                    }`}
                  >
                    +
                  </span>
                </button>
                {isOpen && (
                  <p className="px-5 pb-5 text-[13px] leading-relaxed text-slate-400">
                    {item.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Footer + pending banner                                             */
/* ------------------------------------------------------------------ */
function Footer({ brand, support }) {
  return (
    <footer className="border-t border-white/5 py-10">
      <div className="shell flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <Logo className="h-7 w-7" />
            <span className="font-mono text-xs font-bold tracking-[0.22em] text-white">
              FFV2<span className="text-cyan">PRO</span>
            </span>
          </div>
          <p className="mt-3 max-w-md text-xs leading-relaxed text-slate-500">
            {brand.product} is a subscription for the FFV2 mobile game, developed and published by
            our studio. Not affiliated with Garena, Free Fire, Tencent, or Tailscale. Licence keys
            are personal and non-transferable.
          </p>
        </div>
        <div className="space-y-2 text-xs text-slate-500">
          <p>
            Support · <span className="font-mono text-slate-300">{support}</span>
          </p>
          <p>Payments · bKash (manual verification)</p>
          <p>Hours · 10:00–23:00 GMT+6</p>
        </div>
      </div>
      <div className="shell mt-8 border-t border-white/5 pt-5 text-[11px] text-slate-600">
        © {new Date().getFullYear()} FFV2 Studio. All rights reserved.
      </div>
    </footer>
  );
}

function PendingBanner({ pending, onResume }) {
  if (!pending) return null;
  return (
    <div className="border-b border-amber-400/20 bg-amber-400/[0.06]">
      <div className="shell flex flex-wrap items-center justify-between gap-3 py-3">
        <p className="text-[13px] text-amber-200/90">
          Order <span className="font-mono">{pending.publicId}</span> is awaiting verification.
          Status: <span className="font-mono">{pending.order?.status ?? 'pending'}</span>.
        </p>
        <button onClick={onResume} className="btn-ghost !py-1.5 !text-xs">
          View status <IconArrow className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
export default function Landing({
  config,
  session,
  pending,
  onBuy,
  onActivate,
  onDashboard,
  onResume,
}) {
  const plans = config?.plans ?? [];
  const support = config?.brand?.support ?? '@ffv2pro';

  return (
    <div className="min-h-screen">
      <PendingBanner pending={pending} onResume={onResume} />
      <Nav session={session} onActivate={onActivate} onDashboard={onDashboard} />
      <main>
        <Hero onActivate={onActivate} session={session} onDashboard={onDashboard} />
        <Features />
        <Pricing plans={plans} onBuy={onBuy} />
        <HowItWorks />
        <Faq support={support} />
      </main>
      <Footer brand={config?.brand ?? { product: 'FFV2 PRO Access' }} support={support} />
    </div>
  );
}
