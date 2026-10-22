/**
 * VIP unlock receipt.
 *
 * The terminal handshake in the dashboard is the moment the unlock is
 * "finalised", so that is where we stamp a local receipt. Like the session
 * cache in store.js this is presentation state only — it decides whether the
 * VIP card is shown again after a refresh, and is never trusted by the API.
 */

export const VIP_UNLOCK_EVENT = 'ffv2pro:vip-unlock';
const VIP_KEY = 'ffv2pro.vipUnlock.v1';

export function isVipUnlocked() {
  try {
    const raw = localStorage.getItem(VIP_KEY);
    return raw ? JSON.parse(raw)?.unlocked === true : false;
  } catch {
    return false;
  }
}

export function markVipUnlocked() {
  const record = { unlocked: true, at: new Date().toISOString() };
  try {
    localStorage.setItem(VIP_KEY, JSON.stringify(record));
  } catch {
    /* storage blocked / full — the card still shows for this session */
  }
  return record;
}

export function clearVipUnlocked() {
  try {
    localStorage.removeItem(VIP_KEY);
  } catch {
    /* ignore */
  }
}

/** Persist the receipt, then let the VIP card know it should open. */
export function announceVipUnlock() {
  markVipUnlocked();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(VIP_UNLOCK_EVENT));
  }
}
