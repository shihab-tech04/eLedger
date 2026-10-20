import type { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useLedgerCopy } from '../../context/LanguageContext.tsx';
import { LedgerTip } from './LedgerForm.tsx';

/** The single heading pattern for dashboard, guide and every financial route. */
export function LedgerPageHeader({ title, caption, onBack, action }: {
  title: string;
  caption?: string;
  onBack?: () => void;
  action?: ReactNode;
}) {
  const t = useLedgerCopy();
  return <header className="eledger-page-header">
    <div className="eledger-page-heading">
      {onBack && <button type="button" className="eledger-page-back" onClick={onBack}
        aria-label={t('Back to dashboard','ড্যাশবোর্ডে ফিরুন')}><ChevronLeft size={20}/></button>}
      <div><h1>{title}</h1>{caption && <p>{caption}</p>}</div>
    </div>
    {action && <div className="eledger-page-actions">{action}</div>}
  </header>;
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
