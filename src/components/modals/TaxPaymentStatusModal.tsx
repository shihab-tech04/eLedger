/**
 * Tax Payment Status Reconciliation Modal
 * Conforms strictly to Requirement #7:
 * - One clear modal header
 * - Expandable Source Tax section
 * - Expandable AIT section
 * - Dynamic, calculated totals
 * - Fixed totals footer
 * - Total label on the left
 * - Amount on the right
 * - Responsive mobile presentation
 * - One consistent close action
 * - NO "Go to eReturn" button
 * - NO hardcoded totals
 */

import React, { useState } from 'react';
import { useLedger } from '../../context/LedgerContext.tsx';
import { formatCurrencyBDT, groupEntriesByRoute } from '../../domain/calculations.ts';
import { getVisibleRoutesByGroup } from '../../domain/routeRegistry.ts';
import {
  X,
  ChevronDown,
  ChevronRight,
  Receipt,
  Car,
  CreditCard,
  SlidersHorizontal,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

interface TaxPaymentStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TaxPaymentStatusModal: React.FC<TaxPaymentStatusModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { entries, totals, taxpayer, assessmentYear } = useLedger();

  // State for expandable sections (Source Tax and AIT expanded by default)
  const [sourceTaxExpanded, setSourceTaxExpanded] = useState<boolean>(true);
  const [aitExpanded, setAitExpanded] = useState<boolean>(true);
  const [paymentsExpanded, setPaymentsExpanded] = useState<boolean>(false);
  const [adjustmentsExpanded, setAdjustmentsExpanded] = useState<boolean>(false);

  if (!isOpen) return null;

  const grouped = groupEntriesByRoute(entries);

  // Helper to render group rows
  const renderRouteBreakdown = (group: 'Source Tax' | 'AIT' | 'Payment' | 'Adjustment') => {
    const routes = getVisibleRoutesByGroup(group, entries.map((entry) => entry.routeId));
    return (
      <div className="space-y-1.5 pt-2 pb-1">
        {routes.map((route) => {
          const groupData = grouped[route.id];
          const count = groupData ? groupData.entries.length : 0;
          const totalTax = groupData ? groupData.totalTax : 0;

          return (
            <div
              key={route.id}
              className={`flex items-center justify-between text-xs px-2.5 py-1.5 rounded ${
                count > 0 ? 'bg-slate-50 text-slate-800 font-medium' : 'text-slate-400'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                <span>{route.title}</span>
                <span className="text-[10px] text-slate-400 font-mono">({route.statutorySection})</span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-slate-500 font-normal">
                  {count} {count === 1 ? 'record' : 'records'}
                </span>
                <span className={`w-28 text-right font-mono ${count > 0 ? 'font-semibold text-emerald-800' : 'text-slate-400'}`}>
                  {formatCurrencyBDT(totalTax)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-headline"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
    >
      <div className="relative bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* 1. Modal Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 flex-shrink-0">
          <div>
            <div className="flex items-center space-x-2">
              <h2 id="modal-headline" className="text-base sm:text-lg font-bold tracking-tight text-white">
                Tax Payment Status & Reconciliation
              </h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-800 text-emerald-100 border border-emerald-600">
                Local Ledger Review
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              TIN: <span className="font-mono text-emerald-300 font-semibold">{taxpayer.tin}</span> | Assessment Year:{' '}
              <span className="font-semibold text-white">{assessmentYear}</span> | Taxpayer: {taxpayer.name}
            </p>
          </div>
          {/* Close Action */}
          <button
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content Area */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3 bg-slate-50/50">
          {/* Audit Verification Status Notice */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-900 flex items-start space-x-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-700 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-950">
                Reconciliation Summary from Recorded Ledger Data
              </p>
              <p className="text-emerald-800 text-[11px] mt-0.5">
                Recorded amounts are shown for review. Only independently confirmed authority-verified entries count toward the verified-credit total; this prototype cannot issue that verification.
              </p>
            </div>
          </div>

          {/* Section 1: Expandable Source Tax (TDS) */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
            <button
              type="button"
              onClick={() => setSourceTaxExpanded(!sourceTaxExpanded)}
              aria-expanded={sourceTaxExpanded}
              className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left transition-colors border-b border-slate-200"
            >
              <div className="flex items-center space-x-2.5">
                <Receipt className="w-4 h-4 text-emerald-700" />
                <div>
                  <span className="text-sm font-bold text-slate-800">
                    Source Tax (TDS) Claims
                  </span>
                  <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                    {totals.sourceTaxCount} {totals.sourceTaxCount === 1 ? 'record' : 'records'}
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-sm font-bold font-mono text-emerald-800">
                  {formatCurrencyBDT(totals.sourceTaxTotal)}
                </span>
                {sourceTaxExpanded ? (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                )}
              </div>
            </button>
            {sourceTaxExpanded && (
              <div className="px-4 py-2 bg-white">
                {renderRouteBreakdown('Source Tax')}
              </div>
            )}
          </div>

          {/* Section 2: Expandable AIT */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
            <button
              type="button"
              onClick={() => setAitExpanded(!aitExpanded)}
              aria-expanded={aitExpanded}
              className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left transition-colors border-b border-slate-200"
            >
              <div className="flex items-center space-x-2.5">
                <Car className="w-4 h-4 text-emerald-700" />
                <div>
                  <span className="text-sm font-bold text-slate-800">
                    Advance Income Tax (AIT)
                  </span>
                  <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                    {totals.aitCount} {totals.aitCount === 1 ? 'record' : 'records'}
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-sm font-bold font-mono text-emerald-800">
                  {formatCurrencyBDT(totals.aitTotal)}
                </span>
                {aitExpanded ? (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                )}
              </div>
            </button>
            {aitExpanded && (
              <div className="px-4 py-2 bg-white">
                {renderRouteBreakdown('AIT')}
              </div>
            )}
          </div>

          {/* Section 3: Tax Payments (Sec 171, 173) */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
            <button
              type="button"
              onClick={() => setPaymentsExpanded(!paymentsExpanded)}
              aria-expanded={paymentsExpanded}
              className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left transition-colors border-b border-slate-200"
            >
              <div className="flex items-center space-x-2.5">
                <CreditCard className="w-4 h-4 text-emerald-700" />
                <div>
                  <span className="text-sm font-bold text-slate-800">
                    Regular & Advance Tax Payments
                  </span>
                  <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                    {totals.paymentsCount} {totals.paymentsCount === 1 ? 'record' : 'records'}
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-sm font-bold font-mono text-emerald-800">
                  {formatCurrencyBDT(totals.paymentsTotal)}
                </span>
                {paymentsExpanded ? (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                )}
              </div>
            </button>
            {paymentsExpanded && (
              <div className="px-4 py-2 bg-white">
                {renderRouteBreakdown('Payment')}
              </div>
            )}
          </div>

          {/* Section 4: Adjustments & Carry-Forward */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
            <button
              type="button"
              onClick={() => setAdjustmentsExpanded(!adjustmentsExpanded)}
              aria-expanded={adjustmentsExpanded}
              className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left transition-colors border-b border-slate-200"
            >
              <div className="flex items-center space-x-2.5">
                <SlidersHorizontal className="w-4 h-4 text-emerald-700" />
                <div>
                  <span className="text-sm font-bold text-slate-800">
                    Refund & Carry-Forward Adjustments
                  </span>
                  <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                    {totals.adjustmentsCount} {totals.adjustmentsCount === 1 ? 'record' : 'records'}
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-sm font-bold font-mono text-emerald-800">
                  {formatCurrencyBDT(totals.adjustmentsTotal)}
                </span>
                {adjustmentsExpanded ? (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                )}
              </div>
            </button>
            {adjustmentsExpanded && (
              <div className="px-4 py-2 bg-white">
                {renderRouteBreakdown('Adjustment')}
              </div>
            )}
          </div>

          {/* The six recorded buckets follow the older eLedger status screen.
              Do not combine surcharge, tax paid with return, and refunds. */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <h3 className="px-4 py-2.5 bg-slate-100 text-xs font-bold text-slate-800 border-b border-slate-200">
              Tax Payment Status — Recorded Amounts
            </h3>
            {[
              ['Source Tax', totals.sourceTaxTotal],
              ['Advance Income Tax (AIT)', totals.aitTotal],
              ['Tax Paid With Return', totals.taxPaidWithReturnTotal],
              ['Environmental Surcharge', totals.environmentalSurchargeTotal],
              ['Adjustment of Tax Refund', totals.refundAdjustmentTotal],
              ['Adjustment of carry forward tax u/s 163', totals.carryForward163Total],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-3 px-4 py-2 border-b last:border-b-0 border-slate-100 text-xs sm:text-sm">
                <span className="text-slate-700">{label}</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">{formatCurrencyBDT(Number(value))}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Fixed Totals Footer (Requirement #7) */}
        <div className="px-5 py-4 bg-slate-900 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
          {/* Total label on left, amount on right */}
          <div className="flex items-center justify-between w-full sm:w-auto sm:space-x-4">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <div>
                <span className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-slate-300">
                  Verified Tax Payments & Deductions:
                </span>
                <span className="hidden sm:inline-block text-[11px] text-slate-400 ml-2">
                  (Pending claims excluded)
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto space-x-4">
            <span className="text-lg sm:text-xl font-bold font-mono text-emerald-300">
              {formatCurrencyBDT(totals.grandTotalCredits)}
            </span>
            {/* Consistent Close Action (NO 'Go to eReturn' button) */}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md text-xs sm:text-sm font-semibold transition-colors border border-slate-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
