/**
 * Plan catalogue.
 *
 * Prices are stored server-side and are the single source of truth —
 * the browser never tells the API how much something costs.
 */
export const PLANS = [
  {
    id: 'month',
    name: '1 Month',
    tagline: 'Try the full arsenal',
    priceBdt: 220,
    days: 30,
    maxDevices: 1,
    featured: false,
    features: [
      'Full FFV2 PRO access for 30 days',
      '1 linked device',
      'All in-game PRO cosmetics',
      'Manual bKash activation',
    ],
  },
  {
    id: 'year',
    name: '1 Year',
    tagline: 'The squad standard',
    priceBdt: 1299,
    days: 365,
    maxDevices: 2,
    featured: true,
    features: [
      'Full FFV2 PRO access for 365 days',
      '2 linked devices',
      'Every seasonal PRO drop included',
      'Priority activation queue',
    ],
  },
  {
    id: 'lifetime',
    name: 'Lifetime',
    tagline: 'Buy once, keep forever',
    priceBdt: 2249,
    days: null,
    maxDevices: 3,
    featured: false,
    features: [
      'Permanent FFV2 PRO access',
      '3 linked devices',
      'All future PRO content',
      'Priority support',
    ],
  },
];

export const PLAN_IDS = PLANS.map((p) => p.id);

export function getPlan(id) {
  return PLANS.find((p) => p.id === id) ?? null;
}

/** Turn a plan into an expiry timestamp. `null` means lifetime. */
export function expiryFor(plan, from = new Date()) {
  if (plan.days === null) return null;
  const d = new Date(from.getTime());
  d.setUTCDate(d.getUTCDate() + plan.days);
  return d.toISOString();
}
