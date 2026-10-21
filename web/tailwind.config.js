/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0A0A0C',
        ink2: '#0D0F14',
        panel: '#111319',
        cyan: '#22E9FF',
        crimson: '#FF2D55',
        bkash: '#D12053',
        matrix: '#38FF8A',
      },
      fontFamily: {
        display: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        glowCyan: '0 0 0 1px rgba(34,233,255,0.25), 0 0 40px -8px rgba(34,233,255,0.45)',
        glowCrimson: '0 0 0 1px rgba(255,45,85,0.25), 0 0 40px -8px rgba(255,45,85,0.45)',
        modal: '0 40px 120px -20px rgba(0,0,0,0.9)',
      },
      keyframes: {
        floaty: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        pulseGlow: {
          '0%,100%': { opacity: '0.55', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.04)' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(400%)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        blink: {
          '0%,49%': { opacity: '1' },
          '50%,100%': { opacity: '0' },
        },
        ticker: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        floaty: 'floaty 6s ease-in-out infinite',
        pulseGlow: 'pulseGlow 3.2s ease-in-out infinite',
        scan: 'scan 5s linear infinite',
        shimmer: 'shimmer 2.4s linear infinite',
        blink: 'blink 1s step-end infinite',
        ticker: 'ticker 28s linear infinite',
      },
    },
  },
  plugins: [],
};
