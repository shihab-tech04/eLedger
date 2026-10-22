import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { useLedgerCopy } from '../../context/LanguageContext.tsx';

/** Adapted from the user's NEIR Drawer / RecordDetailsDrawer component contract.
 * Read-only details only. Does not make a tax claim, change a record or certify a credit.
 */
export type NeirRecordField = { label: string; value: string | number };
export function NeirRecordDetailsDrawer({ title, subtitle, fields, onClose }: {
  title: string;
  subtitle?: string;
  fields: readonly NeirRecordField[];
  onClose: () => void;
}) {
  const t = useLedgerCopy();
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>('button:not([disabled])')?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); return; }
      if (event.key !== 'Tab' || !panel) return;
      const items = [...panel.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])')]
        .filter(element => element.getClientRects().length > 0);
      if (items.length === 0) { event.preventDefault(); return; }
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      document.removeEventListener('keydown', keydown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  return <div className="eledger-neir-drawer-root" role="presentation">
    <button type="button" className="eledger-neir-drawer-backdrop"
      aria-label={t('Close record details','রেকর্ডের বিস্তারিত বন্ধ করুন')} onClick={onClose}/>
    <aside ref={panelRef} className="eledger-neir-drawer-panel" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <header className="eledger-neir-drawer-header">
        <div className="eledger-neir-drawer-heading">
          <h2 id={titleId}>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <button type="button" className="eledger-neir-drawer-close"
          aria-label={t('Close drawer','ড্রয়ার বন্ধ করুন')} onClick={onClose}><X size={20} aria-hidden="true"/></button>
      </header>
      <div className="eledger-neir-drawer-content">
        <section aria-label={t('Record information','রেকর্ডের তথ্য')} className="eledger-neir-drawer-section">
          <h3>{t('Record information','রেকর্ডের তথ্য')}</h3>
          <dl className="eledger-neir-drawer-fields">
            {fields.map((field, index) => <div key={index}>
              <dt>{field.label}</dt><dd>{field.value === '' ? '—' : field.value}</dd>
            </div>)}
          </dl>
        </section>
        <p className="eledger-neir-drawer-caveat">
          {t('Details shown here are local ledger records, not independently authorized tax credits.',
            'এখানে দেখানো তথ্য স্থানীয় লেজারের রেকর্ড, কর্তৃপক্ষের স্বতন্ত্র যাচাইকৃত কর ক্রেডিট নয়।')}
        </p>
      </div>
      <footer className="eledger-neir-drawer-footer">
        <button type="button" className="eledger-button eledger-button-secondary" onClick={onClose}>
          {t('Close','বন্ধ করুন')}
        </button>
      </footer>
    </aside>
  </div>;
}
