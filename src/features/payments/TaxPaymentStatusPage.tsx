import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useLedger } from '../../context/LedgerContext.tsx';
import { useLedgerCopy, useLedgerLanguage } from '../../context/LanguageContext.tsx';
import { groupEntriesByRoute, formatLedgerAmount } from '../../domain/calculations.ts';
import { getVisibleRoutesByGroup } from '../../domain/routeRegistry.ts';
import { LedgerPageHeader } from '../../components/ui/LedgerPage.tsx';

/** Original PDF p21 dedicated Particulars/Amount page.
 * Keep the approved Dashboard TaxPaymentStatusModal as an additional entry point.
 * All figures are from the browser-local ledger; never official credits.
 */
export const TaxPaymentStatusPage: React.FC = () => {
  const { entries, totals } = useLedger();
  const t = useLedgerCopy();
  const { language } = useLedgerLanguage();
  const [sourceExpanded, setSourceExpanded] = useState(false);
  const [aitExpanded, setAitExpanded] = useState(false);
  const grouped = groupEntriesByRoute(entries);
  const amount = (n: number) => formatLedgerAmount(n);
  const recordedTotal = Math.round((totals.sourceTaxTotal + totals.aitTotal + totals.paymentsTotal + totals.adjustmentsTotal) * 100) / 100;
  const extraPayments = Math.round((totals.paymentsTotal - totals.taxPaidWithReturnTotal - totals.environmentalSurchargeTotal) * 100) / 100;
  const extraAdjustments = Math.round((totals.adjustmentsTotal - totals.refundAdjustmentTotal - totals.carryForward163Total) * 100) / 100;
  const summaryRow = (label: string, value: number) =>
    <tr key={label}><th scope="row">{label}</th><td className="eledger-status-amount">{amount(value)}</td></tr>;
  const routeRows = (group: 'Source Tax' | 'AIT') =>
    getVisibleRoutesByGroup(group, entries.map(e => e.routeId)).map(route =>
      <tr key={route.id} className="eledger-status-subrow">
        <td>{language === 'bn' ? route.bengaliTitle : route.title}</td>
        <td className="eledger-status-amount">{amount(grouped[route.id]?.totalTax ?? 0)}</td>
      </tr>);
  const expandable = (group: 'Source Tax' | 'AIT', expanded: boolean, set: (n: boolean) => void, value: number) => {
    const label = group === 'Source Tax' ? t('Source Tax', 'উৎস কর') : t('Advance Income Tax (AIT)', 'অগ্রিম আয়কর (AIT)');
    return <React.Fragment key={group}>
      <tr><th scope="row"><button type="button" className="eledger-status-expand" aria-expanded={expanded}
        onClick={() => set(!expanded)}>
        {expanded ? <ChevronDown size={15} aria-hidden="true"/> : <ChevronRight size={15} aria-hidden="true"/>}
        {label}
      </button></th><td className="eledger-status-amount">{amount(value)}</td></tr>
      {expanded && routeRows(group)}
    </React.Fragment>;
  };
  return <section className="eledger-financial-page eledger-status-page">
    <LedgerPageHeader title={t('Tax Payment Status', 'কর পরিশোধের অবস্থা')}
      caption={t('Recorded ledger amounts — not independently verified tax credits', 'লেজারের রেকর্ডকৃত অঙ্ক — স্বতন্ত্র যাচাইকৃত কর ক্রেডিট নয়')}/>
    <div className="eledger-panel eledger-status-page-panel">
      <div className="overflow-x-auto">
        <table className="eledger-official-records eledger-status-page-table">
          <thead><tr><th scope="col">{t('Particulars', 'বিবরণ')}</th><th scope="col">{t('Amount', 'অঙ্ক')}</th></tr></thead>
          <tbody>
            {expandable('Source Tax', sourceExpanded, setSourceExpanded, totals.sourceTaxTotal)}
            {expandable('AIT', aitExpanded, setAitExpanded, totals.aitTotal)}
            {summaryRow(t('Tax Paid With Return', 'রিটার্নের সঙ্গে প্রদত্ত কর'), totals.taxPaidWithReturnTotal)}
            {summaryRow(t('Environmental Surcharge', 'পরিবেশ সারচার্জ'), totals.environmentalSurchargeTotal)}
            {summaryRow(t('Adjustment of Tax Refund', 'কর ফেরতের সমন্বয়'), totals.refundAdjustmentTotal)}
            {summaryRow(t('Adjustment of carry forward tax u/s 163', 'ধারা ১৬৩ অনুসারে পূর্ববর্তী কর সমন্বয়'), totals.carryForward163Total)}
            {Math.abs(extraPayments) > 0.005 && summaryRow(t('Other recorded tax payments (legacy)', 'অন্যান্য পূর্ববর্তী কর পরিশোধ'), extraPayments)}
            {Math.abs(extraAdjustments) > 0.005 && summaryRow(t('Other recorded adjustments (legacy)', 'অন্যান্য পূর্ববর্তী সমন্বয়'), extraAdjustments)}
            <tr className="eledger-status-total"><th scope="row">{t('Total', 'মোট')}</th><td className="eledger-status-amount">{amount(recordedTotal)}</td></tr>
          </tbody>
        </table>
      </div>
      <p className="eledger-status-caveat">{t('These are local ledger records. Authority-verified credits are shown separately; no government submission has occurred.', 'এগুলো স্থানীয় লেজার রেকর্ড। কর্তৃপক্ষ যাচাইকৃত ক্রেডিট আলাদাভাবে প্রদর্শিত হয়; কোনো সরকারি দাখিল হয়নি।')} {amount(totals.grandTotalCredits)}</p>
      <div className="eledger-status-next">
        <span>{t('Update tax payment using Menu in left', 'বাম পাশের মেনু থেকে কর পরিশোধের তথ্য সংশোধন করুন')}</span>
        <a href="https://staging.etaxnbr.gov.bd/#/user-panel/home" target="_blank" rel="noopener noreferrer"
          className="eledger-button eledger-button-primary">{t('Go to eReturn', 'ই-রিটার্নে যান')}</a>
      </div>
    </div>
  </section>;
};
