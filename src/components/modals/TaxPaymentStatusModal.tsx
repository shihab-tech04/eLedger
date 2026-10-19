/**
 * September 20 custom eLedger payment-status sheet.
 * The prominent footer is the RECORDED Ledger total, never verified tax credit.
 */
import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, X } from 'lucide-react';
import { useLedger } from '../../context/LedgerContext.tsx';
import { useLedgerCopy, useLedgerLanguage } from '../../context/LanguageContext.tsx';
import { formatLedgerAmount, groupEntriesByRoute } from '../../domain/calculations.ts';
import { getVisibleRoutesByGroup } from '../../domain/routeRegistry.ts';

interface TaxPaymentStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TaxPaymentStatusModal: React.FC<TaxPaymentStatusModalProps> = ({ isOpen, onClose }) => {
  const { entries, totals } = useLedger();
  const t = useLedgerCopy();
  const { language } = useLedgerLanguage();
  const [sourceExpanded, setSourceExpanded] = useState(false);
  const [aitExpanded, setAitExpanded] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const priorFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab') return;
      const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled])') ?? [])
        .filter((button) => button.getClientRects().length > 0);
      if (controls.length === 0) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialogRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', dismissOnEscape);
    return () => {
      window.removeEventListener('keydown', dismissOnEscape);
      document.body.style.overflow = originalOverflow;
      priorFocus?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const grouped = groupEntriesByRoute(entries);
  const recordedTotal = Math.round((totals.sourceTaxTotal + totals.aitTotal + totals.paymentsTotal + totals.adjustmentsTotal) * 100) / 100;
  // Historical/legacy routes remain counted even though the screenshot has six primary rows.
  const extraPayments = Math.round((totals.paymentsTotal - totals.taxPaidWithReturnTotal - totals.environmentalSurchargeTotal) * 100) / 100;
  const extraAdjustments = Math.round((totals.adjustmentsTotal - totals.refundAdjustmentTotal - totals.carryForward163Total) * 100) / 100;

  const breakdown = (group: 'Source Tax' | 'AIT') =>
    getVisibleRoutesByGroup(group, entries.map((entry) => entry.routeId)).map((route) => (
      <div className="eledger-payment-subrow" key={route.id}>
        <span>{language === 'bn' ? route.bengaliTitle : route.title}</span>
        <span className="eledger-payment-subcount">{grouped[route.id]?.entries.length ?? 0} {t('records','রেকর্ড')}</span>
        <strong>{formatLedgerAmount(grouped[route.id]?.totalTax ?? 0)}</strong>
      </div>
    ));

  const expandable = (group: 'Source Tax' | 'AIT', expanded: boolean, setExpanded: (value: boolean) => void, amount: number) => {
    const routes = getVisibleRoutesByGroup(group, entries.map((entry) => entry.routeId));
    const label = group === 'AIT' ? t('Advance Income Tax (AIT)','অগ্রিম আয়কর (AIT)') : t('Source Tax','উৎস কর');
    return (
      <>
        <button type="button" className="eledger-payment-row eledger-payment-expandable" aria-expanded={expanded}
          aria-label={`${label} ${t('breakdown','বিস্তারিত')}`} onClick={() => setExpanded(!expanded)}>
          <span className="eledger-payment-row-title">
            <span className="eledger-payment-chevron" aria-hidden="true">{expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</span>
            <span><strong>{label}</strong><small>{routes.length} {t('categories','খাত')}</small></span>
          </span>
          <strong className="eledger-payment-amount">{formatLedgerAmount(amount)}</strong>
        </button>
        {expanded && <div className="eledger-payment-subrows" aria-label={`${label} ${t('categories','খাত')}`}>{breakdown(group)}</div>}
      </>
    );
  };

  const directRow = (label: string, amount: number) => (
    <div className="eledger-payment-row" key={label}>
      <strong>{label}</strong>
      <strong className="eledger-payment-amount">{formatLedgerAmount(amount)}</strong>
    </div>
  );

  return (
    <div className="eledger-payment-scrim" role="presentation">
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="eledger-payment-title" lang={language}
        aria-describedby="eledger-payment-intro" className="eledger-payment-dialog">
        <header className="eledger-payment-header">
          <div>
            <h2 id="eledger-payment-title">{t('Tax Payment Status','কর পরিশোধের অবস্থা')}</h2>
            <p id="eledger-payment-intro">{t('Review all current Ledger tax, AIT and adjustments together.','বর্তমান লেজারের উৎস কর, অগ্রিম কর ও সমন্বয় একসঙ্গে দেখুন।')}</p>
          </div>
          <button ref={closeButtonRef} type="button" onClick={onClose} className="eledger-payment-close" aria-label={t('Close Tax Payment Status','কর পরিশোধের বিবরণ বন্ধ করুন')}><X size={18}/></button>
        </header>

        <div className="eledger-payment-scroll">
          <div className="eledger-payment-panel">
            <div className="eledger-payment-panel-heading">
              <h3>{t('Payment breakdown','কর পরিশোধের বিস্তারিত')}</h3>
              <p>{t('Expand Source Tax or AIT to review the category-level amounts.','খাতভিত্তিক অঙ্ক দেখতে উৎস কর বা অগ্রিম কর প্রসারিত করুন।')}</p>
            </div>
            <div className="eledger-payment-columns"><span>{t('Particulars','বিবরণ')}</span><span>{t('Amount','অঙ্ক')}</span></div>
            {expandable('Source Tax', sourceExpanded, setSourceExpanded, totals.sourceTaxTotal)}
            {expandable('AIT', aitExpanded, setAitExpanded, totals.aitTotal)}
            {directRow(t('Tax Paid With Return','রিটার্নের সঙ্গে প্রদত্ত কর'), totals.taxPaidWithReturnTotal)}
            {directRow(t('Environmental Surcharge','পরিবেশ সারচার্জ'), totals.environmentalSurchargeTotal)}
            {directRow(t('Adjustment of Tax Refund','কর ফেরতের সমন্বয়'), totals.refundAdjustmentTotal)}
            {directRow(t('Adjustment of carry forward tax u/s 163','ধারা ১৬৩ অনুসারে পূর্ববর্তী কর সমন্বয়'), totals.carryForward163Total)}
            {Math.abs(extraPayments) > 0.005 && directRow(t('Other recorded tax payments (legacy)','অন্যান্য পূর্ববর্তী কর পরিশোধ'), extraPayments)}
            {Math.abs(extraAdjustments) > 0.005 && directRow(t('Other recorded adjustments (legacy)','অন্যান্য পূর্ববর্তী সমন্বয়'), extraAdjustments)}
          </div>
        </div>

        <footer className="eledger-payment-footer">
          <div>
            <strong>{t('Total','মোট')}</strong>
            <p>{t('All amounts currently recorded in this Ledger','এই লেজারে বর্তমানে রেকর্ডকৃত সব অঙ্ক')}</p>
            <small>{t('Separately authority-verified credit:','কর্তৃপক্ষের স্বতন্ত্র যাচাইকৃত ক্রেডিট:')} {formatLedgerAmount(totals.grandTotalCredits)}</small>
          </div>
          <strong className="eledger-payment-total" aria-label={`${t('Recorded Ledger total','লেজারে রেকর্ডকৃত মোট')} ${formatLedgerAmount(recordedTotal)}`}>
            {formatLedgerAmount(recordedTotal)}
          </strong>
        </footer>
      </section>
    </div>
  );
};
