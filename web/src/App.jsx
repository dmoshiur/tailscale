import { useCallback, useEffect, useState } from 'react';
import Landing from './components/Landing.jsx';
import Dashboard from './components/Dashboard.jsx';
import BkashCheckout from './components/BkashCheckout.jsx';
import ActivateModal from './components/ActivateModal.jsx';
import RedeemSuccessModal from './components/RedeemSuccessModal.jsx';
import VipUnlockModal from './components/VipUnlockModal.jsx';
import { Logo, IconRefresh } from './components/Icons.jsx';
import { api } from './lib/api.js';
import {
  clearPendingOrder,
  clearSession,
  getDeviceId,
  loadPendingOrder,
  loadSession,
  savePendingOrder,
  saveSession,
} from './lib/store.js';

function BootScreen({ label = 'Loading secure session…' }) {
  return (
    <div className="grid min-h-screen place-items-center">
      <div className="flex flex-col items-center gap-4">
        <Logo className="h-12 w-12 animate-pulseGlow" />
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-slate-500">{label}</p>
      </div>
    </div>
  );
}

export default function App() {
  const [config, setConfig] = useState(null);
  const [configError, setConfigError] = useState('');
  const [session, setSession] = useState(null); // { entitlement, key }
  const [booted, setBooted] = useState(false);
  const [view, setView] = useState('landing');

  const [checkout, setCheckout] = useState({ open: false, plan: null, initialOrder: null });
  const [activateOpen, setActivateOpen] = useState(false);
  const [activateNotice, setActivateNotice] = useState('');
  const [pending, setPending] = useState(null);
  // { entitlement, key } once a redeem/purchase succeeds — drives the big
  // tap-to-copy confirmation popup. Holds only the player's own key.
  const [redeemSuccess, setRedeemSuccess] = useState(null);

  /* ---------------------------------------------------------------- */
  /* Boot: load public config, then verify any cached session.         */
  /* ---------------------------------------------------------------- */
  const loadConfig = useCallback(async () => {
    setConfigError('');
    try {
      const data = await api.config();
      setConfig(data);
    } catch (err) {
      setConfigError(err.message);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await loadConfig();

      const stored = loadSession();
      setPending(loadPendingOrder());

      if (stored?.key) {
        try {
          const data = await api.licenseInfo(stored.key);
          if (!cancelled) {
            const next = { key: stored.key, entitlement: data.entitlement };
            setSession(next);
            saveSession(next);
            if (window.location.hash.includes('dashboard')) setView('dashboard');
          }
        } catch (err) {
          // Expired / revoked still returns an entitlement — show it so the
          // user can renew rather than silently dropping their plan.
          if (err.payload?.entitlement && !cancelled) {
            const next = { key: stored.key, entitlement: err.payload.entitlement };
            setSession(next);
            saveSession(next);
            if (window.location.hash.includes('dashboard')) setView('dashboard');
          } else if (!cancelled) {
            clearSession();
          }
        }
      }

      if (!cancelled) setBooted(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [loadConfig]);

  /* ---------------------------------------------------------------- */
  /* Checkout                                                          */
  /* ---------------------------------------------------------------- */
  function buy(plan) {
    setCheckout({ open: true, plan, initialOrder: null });
  }

  function resumePending() {
    if (!pending) return;
    const plan = config?.plans?.find((p) => p.id === pending.planId) ?? null;
    setCheckout({ open: true, plan, initialOrder: pending });
  }

  function handlePendingChange(record) {
    if (!record) {
      clearPendingOrder();
      setPending(null);
      return;
    }
    savePendingOrder(record);
    setPending(record);
  }

  /**
   * Called by the checkout the moment the admin confirmation lands.
   * Binds the new key to this browser; throws a readable message if the
   * device limit is already reached.
   */
  const handlePaid = useCallback(async (key) => {
    const data = await api.activate(key, getDeviceId());
    const next = { key, entitlement: data.entitlement };
    setSession(next);
    saveSession(next);

    clearPendingOrder();
    setPending(null);
    return next;
  }, []);

  function closeCheckout() {
    setCheckout({ open: false, plan: null, initialOrder: null });
  }

  function goDashboardAfterPurchase() {
    closeCheckout();
    if (session) {
      setView('dashboard');
      // Same big redeem confirmation as manual activation: the buyer's own
      // licence key, large and copyable, on top of the dashboard.
      setRedeemSuccess(session);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /* ---------------------------------------------------------------- */
  /* Activation (manual redeem)                                        */
  /* ---------------------------------------------------------------- */
  async function handleActivated(entitlement, key) {
    const next = { key, entitlement };
    setSession(next);
    saveSession(next);
    setActivateOpen(false);
    setView('dashboard');
    setRedeemSuccess(next);
    window.scrollTo({ top: 0 });
  }

  function signOut() {
    clearSession();
    setSession(null);
    setView('landing');
    setActivateNotice('');
    setRedeemSuccess(null);
  }

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */
  if (!booted) return <BootScreen />;

  if (configError && !config) {
    return (
      <div className="grid min-h-screen place-items-center px-6">
        <div className="glass max-w-sm p-6 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-crimson">
            connection failed
          </p>
          <p className="mt-3 text-sm text-slate-300">{configError}</p>
          <button onClick={loadConfig} className="btn-primary mt-5 w-full">
            <IconRefresh className="h-4 w-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  const showDashboard = view === 'dashboard' && session?.entitlement;

  return (
    <>
      {showDashboard ? (
        <Dashboard
          config={config}
          entitlement={session.entitlement}
          onEntitlementChange={(entitlement) => {
            const next = { ...session, entitlement };
            setSession(next);
            saveSession(next);
          }}
          onSignOut={signOut}
          onHome={() => setView('landing')}
          onRenew={() => {
            setView('landing');
            setTimeout(() => {
              document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
            }, 60);
          }}
        />
      ) : (
        <Landing
          config={config}
          session={session}
          pending={pending}
          onBuy={buy}
          onActivate={() => {
            setActivateNotice('');
            setActivateOpen(true);
          }}
          onDashboard={() => setView('dashboard')}
          onResume={resumePending}
        />
      )}

      <BkashCheckout
        open={checkout.open}
        plan={checkout.plan}
        config={config}
        initialOrder={checkout.initialOrder}
        onClose={closeCheckout}
        onDone={goDashboardAfterPurchase}
        onPaid={handlePaid}
        onPendingChange={handlePendingChange}
      />

      <ActivateModal
        open={activateOpen}
        initialKey={session?.key ?? ''}
        notice={activateNotice}
        onClose={() => setActivateOpen(false)}
        onActivated={handleActivated}
      />

      <RedeemSuccessModal
        open={!!redeemSuccess}
        entitlement={redeemSuccess?.entitlement}
        licenseKey={redeemSuccess?.key ?? ''}
        onClose={() => setRedeemSuccess(null)}
      />

      {/* VIP card — opens when the dashboard terminal handshake completes,
          and is restored from localStorage on refresh. */}
      <VipUnlockModal
        active={!!session?.entitlement}
        entitlement={session?.entitlement}
      />
    </>
  );
}
