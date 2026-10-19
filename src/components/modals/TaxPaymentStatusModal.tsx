/**
 * September 20 custom eLedger payment-status sheet.
 * The prominent footer is the RECORDED Ledger total, never verified tax credit.
 */
import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, X } from 'lucide-react';
import { useLedger } from '../../context/LedgerContext.tsx';
import { formatLedgerAmount, groupEntriesByRoute } from '../../domain/calculations.ts';
import { getVisibleRoutesByGroup } from '../../domain/routeRegistry.ts';

interface TaxPaymentStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TaxPaymentStatusModal: React.FC<TaxPaymentStatusModalProps> = ({ isOpen, onClose }) => {
  const { entries, totals } = useLedger();
  const [sourceExpanded, setSourceExpanded] = useState(false);
  const [aitExpanded, setAitExpanded] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const priorFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', dismissOnEscape);
    return () => {
      window.removeEventListener('keydown', dismissOnEscape);
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
        <span>{route.title}</span>
        <span className="eledger-payment-subcount">{grouped[route.id]?.entries.length ?? 0} records</span>
        <strong>{formatLedgerAmount(grouped[route.id]?.totalTax ?? 0)}</strong>
      </div>
    ));

  const expandable = (group: 'Source Tax' | 'AIT', expanded: boolean, setExpanded: (value: boolean) => void, amount: number) => {
    const routes = getVisibleRoutesByGroup(group, entries.map((entry) => entry.routeId));
    const label = group === 'AIT' ? 'Advance Income Tax (AIT)' : 'Source Tax';
    return (
      <>
        <button type="button" className="eledger-payment-row eledger-payment-expandable" aria-expanded={expanded}
          aria-label={`${label} breakdown`} onClick={() => setExpanded(!expanded)}>
          <span className="eledger-payment-row-title">
            <span className="eledger-payment-chevron" aria-hidden="true">{expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</span>
            <span><strong>{label}</strong><small>{routes.length} categories</small></span>
          </span>
          <strong className="eledger-payment-amount">{formatLedgerAmount(amount)}</strong>
        </button>
        {expanded && <div className="eledger-payment-subrows" aria-label={`${label} categories`}>{breakdown(group)}</div>}
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
      <section role="dialog" aria-modal="true" aria-labelledby="eledger-payment-title"
        aria-describedby="eledger-payment-intro" className="eledger-payment-dialog">
        <header className="eledger-payment-header">
          <div>
            <h2 id="eledger-payment-title">Tax Payment Status</h2>
            <p id="eledger-payment-intro">Review all current Ledger tax, AIT and adjustments together.</p>
          </div>
          <button ref={closeButtonRef} type="button" onClick={onClose} className="eledger-payment-close" aria-label="Close Tax Payment Status"><X size={18}/></button>
        </header>

        <div className="eledger-payment-scroll">
          <div className="eledger-payment-panel">
            <div className="eledger-payment-panel-heading">
              <h3>Payment breakdown</h3>
              <p>Expand Source Tax or AIT to review the category-level amounts.</p>
            </div>
            <div className="eledger-payment-columns"><span>Particulars</span><span>Amount</span></div>
            {expandable('Source Tax', sourceExpanded, setSourceExpanded, totals.sourceTaxTotal)}
            {expandable('AIT', aitExpanded, setAitExpanded, totals.aitTotal)}
            {directRow('Tax Paid With Return', totals.taxPaidWithReturnTotal)}
            {directRow('Environmental Surcharge', totals.environmentalSurchargeTotal)}
            {directRow('Adjustment of Tax Refund', totals.refundAdjustmentTotal)}
            {directRow('Adjustment of carry forward tax u/s 163', totals.carryForward163Total)}
            {Math.abs(extraPayments) > 0.005 && directRow('Other recorded tax payments (legacy)', extraPayments)}
            {Math.abs(extraAdjustments) > 0.005 && directRow('Other recorded adjustments (legacy)', extraAdjustments)}
          </div>
        </div>

        <footer className="eledger-payment-footer">
          <div>
            <strong>Total</strong>
            <p>All amounts currently recorded in this Ledger</p>
            <small>Separately authority-verified credit: {formatLedgerAmount(totals.grandTotalCredits)}</small>
          </div>
          <strong className="eledger-payment-total" aria-label={`Recorded Ledger total ${formatLedgerAmount(recordedTotal)}`}>
            {formatLedgerAmount(recordedTotal)}
          </strong>
        </footer>
      </section>
    </div>
  );
};
