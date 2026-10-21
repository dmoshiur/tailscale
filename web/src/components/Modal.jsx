import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * Accessible modal shell: portal, backdrop click, Escape to close,
 * scroll lock, and focus moved into the dialog on open.
 */
export default function Modal({
  open,
  onClose,
  children,
  labelledBy,
  width = 'max-w-lg',
  dismissible = true,
  tone = 'dark', // 'dark' | 'light'
}) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const onKey = (e) => {
      if (e.key === 'Escape' && dismissible) onClose?.();
    };
    document.addEventListener('keydown', onKey);

    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus the first focusable element inside the dialog.
    const t = setTimeout(() => {
      const el = panelRef.current?.querySelector(
        'input, button, [href], select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      el?.focus();
    }, 40);

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
      clearTimeout(t);
    };
  }, [open, onClose, dismissible]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-6"
      role="presentation"
    >
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        onClick={() => dismissible && onClose?.()}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`relative z-10 w-full ${width} ${
          tone === 'dark'
            ? 'rounded-t-3xl border border-white/10 bg-panel shadow-modal sm:rounded-3xl'
            : 'rounded-t-3xl bg-white shadow-modal sm:rounded-3xl'
        } animate-[floaty_0.35s_ease-out]`}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
