/** Inline SVG icon set — no icon library, no network requests. */

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export function Logo({ className = 'h-9 w-9' }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22E9FF" />
          <stop offset="100%" stopColor="#FF2D55" />
        </linearGradient>
      </defs>
      <path
        d="M24 3.5 41 12v13.2c0 9.3-7 16.4-17 19.3-10-2.9-17-10-17-19.3V12z"
        fill="rgba(34,233,255,0.06)"
        stroke="url(#lg)"
        strokeWidth="2"
      />
      <path d="M16.5 24.5 22 30l10-11.5" stroke="url(#lg)" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BkashMark({ className = 'h-6' }) {
  return (
    <svg viewBox="0 0 120 34" className={className} role="img" aria-label="bKash">
      <rect x="0" y="0" width="120" height="34" rx="7" fill="#D12053" />
      <text
        x="10"
        y="23"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="17"
        fontWeight="800"
        fill="#ffffff"
        letterSpacing="-0.4"
      >
        bKash
      </text>
      <path d="M100 11l6 6-6 6" stroke="#ffffff" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export const IconCheck = (p) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <path d="M4 12.5l5 5L20 6.5" />
  </svg>
);

export const IconShield = (p) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <path d="M12 3l7.5 3.6v6c0 4.6-3.2 8-7.5 9.4-4.3-1.4-7.5-4.8-7.5-9.4v-6z" />
    <path d="M9 12.2l2.3 2.3L15.5 10" />
  </svg>
);

export const IconKey = (p) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <circle cx="8" cy="8" r="3.6" />
    <path d="M10.7 10.7 20 20M16.5 16.5l2-2M13.5 13.5l2-2" />
  </svg>
);

export const IconCopy = (p) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2.5" />
    <path d="M15 6.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h.5" />
  </svg>
);

export const IconSpin = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" className={`animate-spin ${className}`} aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.22" strokeWidth="2.5" fill="none" />
    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
  </svg>
);

export const IconBolt = (p) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <path d="M13 2.5 5 13.5h5l-1 8 8.5-11.5h-5z" />
  </svg>
);

export const IconDevices = (p) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <rect x="2.5" y="5" width="13" height="9" rx="2" />
    <rect x="15.5" y="10" width="6" height="9" rx="1.8" />
    <path d="M6 18h5" />
  </svg>
);

export const IconLock = (p) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    <circle cx="12" cy="15.5" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);

export const IconInfinity = (p) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <path d="M7.5 8.5c2.5 0 3.2 2 4.5 3.5s2 3.5 4.5 3.5a3.5 3.5 0 0 0 0-7c-2.5 0-3.2 2-4.5 3.5S10 15.5 7.5 15.5a3.5 3.5 0 0 1 0-7z" />
  </svg>
);

export const IconArrow = (p) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <path d="M4 12h15M13 6l6 6-6 6" />
  </svg>
);

export const IconX = (p) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const IconTerminal = (p) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <rect x="2.5" y="4" width="19" height="16" rx="2.5" />
    <path d="M7 9.5l3 2.5-3 2.5M12.5 15h4.5" />
  </svg>
);

export const IconCrown = (p) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <path d="M3 8.5l4 3 5-6 5 6 4-3-1.6 10H4.6z" />
  </svg>
);

export const IconRefresh = (p) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <path d="M20 11a8 8 0 1 0-2.4 5.7M20 5.5V11h-5.5" />
  </svg>
);
