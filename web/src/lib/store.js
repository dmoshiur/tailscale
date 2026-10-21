/**
 * Local persistence.
 *
 * IMPORTANT — security model:
 * localStorage is a *cache* so the UI feels instant and survives a refresh.
 * It is NOT the paywall. Anyone can open devtools and write a fake license
 * into here, which is why every privileged action is checked server-side by
 * /api/license/activate before anything unlocks.
 */

const SESSION_KEY = 'ffv2pro.session.v1';
const DEVICE_KEY = 'ffv2pro.device.v1';
const PENDING_KEY = 'ffv2pro.pending.v1';

function read(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full / blocked — non-fatal */
  }
}

export function getDeviceId() {
  let id = read(DEVICE_KEY);
  if (!id) {
    id =
      globalThis.crypto?.randomUUID?.() ??
      `dev_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    write(DEVICE_KEY, id);
  }
  return id;
}

export function loadSession() {
  return read(SESSION_KEY);
}

export function saveSession(session) {
  write(SESSION_KEY, { ...session, savedAt: new Date().toISOString() });
}

export function patchSession(patch) {
  const current = loadSession();
  if (!current) return null;
  const next = { ...current, ...patch, savedAt: new Date().toISOString() };
  write(SESSION_KEY, next);
  return next;
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

/** A checkout awaiting manual verification — survives a page refresh. */
export function loadPendingOrder() {
  return read(PENDING_KEY);
}

export function savePendingOrder(order) {
  write(PENDING_KEY, order);
}

export function clearPendingOrder() {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
}
