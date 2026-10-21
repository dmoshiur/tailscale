export const BDT = new Intl.NumberFormat('en-BD', {
  style: 'currency',
  currency: 'BDT',
  maximumFractionDigits: 0,
});

export function formatBdt(n) {
  return BDT.format(Number(n) || 0).replace('BDT', '৳').replace(/\s/g, '');
}

export function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${formatDate(iso)} · ${d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

export function daysLeft(iso) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86400000));
}

/** FFV2-AB12-CD34-EF56-GH78 -> FFV2-••••-••••-••••-GH78 */
export function maskKey(key) {
  if (!key) return '—';
  const parts = String(key).split('-');
  if (parts.length < 3) return '••••';
  return [parts[0], ...parts.slice(1, -1).map(() => '••••'), parts[parts.length - 1]].join('-');
}

export function timeAgo(iso) {
  if (!iso) return '';
  const secs = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  return `${Math.floor(secs / 3600)}h ago`;
}
