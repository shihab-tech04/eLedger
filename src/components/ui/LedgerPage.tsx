import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useLedgerCopy } from '../../context/LanguageContext.tsx';
import { LedgerTip } from './LedgerForm.tsx';

/** Page title and primary action share the first row; description is always
 * below them, avoiding a duplicate Add control in table toolbars. */
export function LedgerPageHeader({ title, caption, action }: {
  title: string;
  caption?: string;
  action?: ReactNode;
}) {
  return <header className="eledger-page-header">
    <div className="eledger-page-heading"><h1>{title}</h1></div>
    <div id="eledger-page-actions" className="eledger-page-actions">{action}</div>
    {caption && <p className="eledger-page-subheading">{caption}</p>}
  </header>;
}
/** Child record tables own Add modal state. Portal the Add button into the
 * page-heading action row without moving its state out of the owning table. */
export function LedgerPageAction({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  useEffect(() => { setTarget(document.getElementById('eledger-page-actions')); }, []);
  return target ? createPortal(children, target) : null;
}

/** A shared compact record summary; secondary explanations stay optional. */
export function LedgerSummary({ amountLabel, amount, count, note }: {
  amountLabel: string;
  amount: string;
  count: number;
  note?: string;
}) {
  const t = useLedgerCopy();
  return <div className="eledger-summary-strip" role="group" aria-label={t('Record summary','রেকর্ডের সারাংশ')}>
    <div className="eledger-summary-fact"><span>{amountLabel} (৳)</span><strong>{amount}</strong></div>
    <div className="eledger-summary-fact"><span>{t('Records','রেকর্ড')}</span><strong>{count}</strong></div>
    {note && <div className="eledger-summary-help"><LedgerTip label={t('About these records','রেকর্ড সম্পর্কে')}>{note}</LedgerTip></div>}
  </div>;
}

/** Keep field layout identical even when the underlying evidence differs. */
export function LedgerFormGrid({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`eledger-form-grid ${className}`}>{children}</div>;
}
