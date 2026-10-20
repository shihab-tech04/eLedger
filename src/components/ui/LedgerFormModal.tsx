import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useLedgerCopy } from '../../context/LanguageContext.tsx';

/** One accessible entry dialog shared by ledger categories, imports and adjustments. */
export function LedgerFormModal({ title, children, onClose }: {
  title: string;
  children?: ReactNode;
  onClose: () => void;
}) {
  const t = useLedgerCopy();
  const titleId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const firstField = dialogRef.current?.querySelector<HTMLElement>('input:not([disabled]),select:not([disabled]),textarea:not([disabled])');
    (firstField ?? dialogRef.current?.querySelector<HTMLElement>('button'))?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current();
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href]'
      ) ?? []).filter((element) => element.getClientRects().length > 0);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialogRef.current?.contains(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current?.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
      previousFocus?.focus();
    };
  }, []);

  return <div className="eledger-form-modal-scrim" onMouseDown={(event) => {
    if (event.target === event.currentTarget) onClose();
  }}>
    <section ref={dialogRef} className="eledger-form-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <header className="eledger-form-modal-header">
        <h2 id={titleId}>{title}</h2>
        <button type="button" className="eledger-form-modal-close" aria-label={t('Close form','ফর্ম বন্ধ করুন')} onClick={onClose}><X size={18}/></button>
      </header>
      <div className="eledger-form-modal-body">{children}</div>
    </section>
  </div>;
}
