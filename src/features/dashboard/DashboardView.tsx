/**
 * Dashboard View (Landing Page)
 * Central Hub of NBR eReturn Ledger
 */

import React from 'react';
import { useLedger } from '../../context/LedgerContext.tsx';
import { ROUTE_REGISTRY } from '../../domain/routeRegistry.ts';
import { formatCurrencyBDT, groupEntriesByRoute } from '../../domain/calculations.ts';
import { LedgerRouteId } from '../../domain/models.ts';
import {
  Receipt,
  Car,
  CreditCard,
  SlidersHorizontal,
  FileCheck2,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const {
    taxpayer,
    assessmentYear,
    totals,
    entries,
    setActiveNavTab,
    setActiveRouteId,
    setIsStatusModalOpen,
  } = useLedger();

  const grouped = groupEntriesByRoute(entries);

  const navigateToRoute = (routeId: LedgerRouteId, group: string) => {
    setActiveRouteId(routeId);
    if (group === 'Source Tax') setActiveNavTab('source-tax');
    else if (group === 'AIT') setActiveNavTab('ait');
    else if (group === 'Payment') setActiveNavTab('payments');
    else if (group === 'Adjustment') setActiveNavTab('adjustments');
    else if (group === 'Tax Payment Status') setIsStatusModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Welcome & Ecosystem Context Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Taxpayer Ledger Dashboard
              </h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Active Return Cycle
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600">
              Taxpayer: <strong className="text-slate-800">{taxpayer.name}</strong> (TIN: <span className="font-mono">{taxpayer.tin}</span>) • {taxpayer.circle}, {taxpayer.taxesZone}
            </p>
            <p className="text-xs text-slate-500">
              System Journey: <strong>eReturn → Tax & Payment → Update Tax Payment Status → eLedger → Tax Payment Status → eReturn</strong>
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsStatusModalOpen(true)}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs sm:text-sm font-semibold shadow-sm transition-colors"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Review Tax Payment Status</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Core Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Source Tax */}
        <div
          onClick={() => setActiveNavTab('source-tax')}
          className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-emerald-600 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Source Tax (TDS)
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100 transition-colors">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-900">
              {formatCurrencyBDT(totals.sourceTaxTotal)}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
              <span>{totals.sourceTaxCount} recorded claims</span>
              <span className="font-medium text-emerald-700 group-hover:underline flex items-center">
                Manage <ArrowRight className="w-3 h-3 ml-0.5" />
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Advance Income Tax (AIT) */}
        <div
          onClick={() => setActiveNavTab('ait')}
          className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-emerald-600 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Advance Tax (AIT)
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100 transition-colors">
              <Car className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-900">
              {formatCurrencyBDT(totals.aitTotal)}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
              <span>{totals.aitCount} verified records</span>
              <span className="font-medium text-emerald-700 group-hover:underline flex items-center">
                Manage <ArrowRight className="w-3 h-3 ml-0.5" />
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Payments */}
        <div
          onClick={() => setActiveNavTab('payments')}
          className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-emerald-600 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Tax Payments
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100 transition-colors">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-900">
              {formatCurrencyBDT(totals.paymentsTotal)}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
              <span>{totals.paymentsCount} treasury challans</span>
              <span className="font-medium text-emerald-700 group-hover:underline flex items-center">
                Manage <ArrowRight className="w-3 h-3 ml-0.5" />
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Adjustments */}
        <div
          onClick={() => setActiveNavTab('adjustments')}
          className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-emerald-600 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Adjustments
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100 transition-colors">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-900">
              {formatCurrencyBDT(totals.adjustmentsTotal)}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
              <span>{totals.adjustmentsCount} prior adjustments</span>
              <span className="font-medium text-emerald-700 group-hover:underline flex items-center">
                Manage <ArrowRight className="w-3 h-3 ml-0.5" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grand Total Credit Bar */}
      <div className="bg-slate-900 text-white rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm border border-slate-800">
        <div>
          <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold block">
            Grand Total Tax Credits & Payments (AY {assessmentYear})
          </span>
          <p className="text-xs text-slate-300 mt-0.5">
            Aggregated sum of all verified and recorded ledger entries claimable against final return tax liability.
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400">
              {formatCurrencyBDT(totals.grandTotalCredits)}
            </span>
            <span className="text-[11px] text-slate-400 block">
              {totals.totalRecordsCount} total ledger items
            </span>
          </div>
          <button
            onClick={() => setIsStatusModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Reconcile
          </button>
        </div>
      </div>

      {/* 18 Functional Routes Inventory & Status Matrix */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-200">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              18 Functional Routes Directory & Ledger Inventory
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Source Tax (10) • AIT (3) • Payments (2) • Adjustments (2) • Reconciliation (1)
            </p>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-medium border border-emerald-200">
              Confirmed (16)
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-medium border border-amber-200">
              Provisional (2)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
          {ROUTE_REGISTRY.map((route) => {
            const data = grouped[route.id];
            const count = data ? data.entries.length : 0;
            const amount = data ? data.totalTax : 0;

            return (
              <div
                key={route.id}
                onClick={() => navigateToRoute(route.id, route.group)}
                className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-emerald-600 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span className="font-semibold text-emerald-800">{route.group}</span>
                    <span className="font-mono text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                      {route.statutorySection}
                    </span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800">
                    {route.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                    {route.description}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    {count} {count === 1 ? 'entry' : 'entries'}
                  </span>
                  <span className={`font-mono ${count > 0 ? 'font-bold text-emerald-800' : 'text-slate-400'}`}>
                    {formatCurrencyBDT(amount)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Ledger Entries Table Summary */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <h3 className="text-sm font-bold text-slate-900">
              Active Ledger Transactions for {assessmentYear} ({entries.length} items)
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            Isolated to TIN {taxpayer.tin}
          </span>
        </div>

        {entries.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">
            No ledger transactions recorded yet for this assessment year.
          </p>
        ) : (
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-semibold">
                <tr>
                  <th className="px-3 py-2">Reference</th>
                  <th className="px-3 py-2">Entity</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2 text-right">Tax Credit (৳)</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.slice(0, 6).map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-mono font-medium text-slate-900">
                      {entry.referenceNo}
                    </td>
                    <td className="px-3 py-2 text-slate-700 truncate max-w-xs">
                      {entry.sourceEntity}
                    </td>
                    <td className="px-3 py-2 text-slate-500 text-[11px]">
                      {entry.category.replace('_', ' ')}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-semibold text-emerald-800">
                      {formatCurrencyBDT(entry.taxDeducted)}
                    </td>
                    <td className="px-3 py-2 text-slate-500">{entry.date}</td>
                    <td className="px-3 py-2 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {entry.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
