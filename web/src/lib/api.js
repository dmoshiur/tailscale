/**
 * Thin fetch wrapper.
 * Every API response is JSON with `{ ok, error?, ... }`.
 */
export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

async function request(path, { method = 'GET', body, signal } = {}) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      signal,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError('Network error — check your connection and try again.', 0, null);
  }

  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { ok: false, error: 'Unexpected response from the server.' };
  }

  if (!res.ok || data.ok === false) {
    throw new ApiError(data.error || `Request failed (${res.status})`, res.status, data);
  }
  return data;
}

export const api = {
  config: (signal) => request('/config', { signal }),

  createOrder: (planId, buyerPhone) =>
    request('/orders', { method: 'POST', body: { planId, buyerPhone } }),

  submitTrx: (publicId, { claimSecret, trxId, senderMobile }) =>
    request(`/orders/${encodeURIComponent(publicId)}/trx`, {
      method: 'POST',
      body: { claimSecret, trxId, senderMobile },
    }),

  orderStatus: (publicId, claimSecret, signal) =>
    request(`/orders/${encodeURIComponent(publicId)}?claim=${encodeURIComponent(claimSecret)}`, {
      signal,
    }),

  activate: (licenseKey, deviceId) =>
    request('/license/activate', { method: 'POST', body: { licenseKey, deviceId } }),

  licenseInfo: (key, signal) =>
    request(`/license/${encodeURIComponent(key)}`, { signal }),

  deactivate: (licenseKey, deviceId) =>
    request('/license/deactivate', { method: 'POST', body: { licenseKey, deviceId } }),
};
