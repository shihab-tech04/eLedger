/**
 * Payments View
 * Houses the 2 registered Payment routes:
 * 1. Regular Tax under Section 173 (Payment on return of income)
 * 2. Advance Tax under Section 171 (Quarterly advance installments)
 */

import React from 'react';
import { useLedger } from '../../context/LedgerContext.tsx';
import { getActiveVisibleRouteForGroup, getVisibleRoutesByGroup } from '../../domain/routeRegistry.ts';
import { LedgerRouteId, LedgerEntry, ClaimEvidence } from '../../domain/models.ts';
import { InlineEditableTable } from '../../components/tables/InlineEditableTable.tsx';
import { SystemLookupPanel } from '../../components/workflows/SystemLookupPanel.tsx';
import { SurchargeTransferPanel } from '../../components/workflows/SurchargeTransferPanel.tsx';
import { formatCurrencyBDT, filterEntriesByRoute } from '../../domain/calculations.ts';
import { CreditCard, ChevronLeft } from 'lucide-react';

export const PaymentsView: React.FC = () => {
  const {
    entries,
    activeRouteId,
    setActiveRouteId,
    setActiveNavTab,
    addEntry,
    updateEntry,
    deleteEntry,
    assessmentYear,
    taxpayer,
  } = useLedger();

  const paymentRoutes = getVisibleRoutesByGroup('Payment', entries.map((entry) => entry.routeId));
  const currentRoute = getActiveVisibleRouteForGroup(activeRouteId, 'Payment', entries.map((entry) => entry.routeId));

  const routeEntries = filterEntriesByRoute(entries, currentRoute.id);
  const totalTaxForRoute = routeEntries.reduce((sum, e) => sum + (Number(e.taxDeducted) || 0), 0);

  const handleSaveNewEntry = async (entryData: {
    referenceNo: string;
    sourceEntity: string;
    sectionCode: string;
    grossAmount: number;
    taxDeducted: number;
    date: string;
    remarks?: string;
    claimEvidence?: ClaimEvidence;
  }) => {
    const res = await addEntry({
      taxpayerTin: taxpayer.tin,
      assessmentYear,
      category: 'PAYMENT',
      routeId: currentRoute.id,
      referenceNo: entryData.referenceNo,
      sourceEntity: entryData.sourceEntity,
      sectionCode: entryData.sectionCode || currentRoute.statutorySection,
      grossAmount: entryData.grossAmount,
      taxDeducted: entryData.taxDeducted,
      date: entryData.date,
      status: 'PENDING_VERIFICATION',
      workflow: 'MANUAL_ENTRY',
      isManual: true,
      externalVerified: false,
      remarks: entryData.remarks,
      claimEvidence: entryData.claimEvidence,
    });

    if (res.success) {
      return { success: true };
    } else {
      const firstError = Object.values(res.validation?.errors || {})[0];
      return { success: false, error: firstError || 'Validation failed.' };
    }
  };

  const handleUpdateEntry = async (id: string, patch: Partial<LedgerEntry>) => {
    const res = await updateEntry(id, patch);
    if (res.success) {
      return { success: true };
    } else {
      const firstError = Object.values(res.validation?.errors || {})[0];
      return { success: false, error: firstError || 'Update failed.' };
    }
  };

  const handleDeleteEntry = async (id: string) => {
    return await deleteEntry(id);
  };

  const recordLocalSurcharge = async (referenceNo: string, amount: number, date: string) => {
    const response = await addEntry({
      taxpayerTin: taxpayer.tin,
      assessmentYear,
      category: 'PAYMENT',
      routeId: 'environmental-surcharge',
      referenceNo,
      sourceEntity: 'Tax & Payment — taxpayer-entered local stage',
      sectionCode: currentRoute.statutorySection,
      grossAmount: amount,
      taxDeducted: amount,
      date,
      status: 'PENDING_VERIFICATION',
      workflow: 'MANUAL_ENTRY',
      isManual: true,
      externalVerified: false,
      remarks: 'Locally declared surcharge amount. Not an official NBR transfer or payment verification.',
    });
    return { success: response.success, error: Object.values(response.validation?.errors || {})[0] };
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="eledger-feature-header bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-emerald-800 text-white">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                  <button type="button" className="eledger-route-back" aria-label="Back to dashboard" onClick={() => setActiveNavTab('dashboard')}><ChevronLeft size={22}/></button>
                  {currentRoute.title}
                </h2>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Section 173 & Surcharge
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600">
                {currentRoute.description}
              </p>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-right">
            <span className="text-[11px] text-slate-500 uppercase font-semibold block">
              Payment Total
            </span>
            <span className="text-lg font-bold font-mono text-emerald-800">
              {formatCurrencyBDT(totalTaxForRoute)}
            </span>
            <span className="text-[11px] text-slate-500 block">
              {routeEntries.length} {routeEntries.length === 1 ? 'challan' : 'challans'}
            </span>
          </div>
        </div>
      </div>

      {/* 2 Route Tabs */}
      <div className="eledger-route-tabs bg-white rounded-lg border border-slate-200 p-2 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {paymentRoutes.map((route) => {
            const count = filterEntriesByRoute(entries, route.id).length;
            const isSelected = route.id === currentRoute.id;

            return (
              <button
                key={route.id}
                onClick={() => setActiveRouteId(route.id)}
                className={`flex items-center justify-between px-4 py-2.5 rounded-md text-xs sm:text-sm font-medium transition-all ${
                  isSelected
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>{route.title}</span>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                    isSelected ? 'bg-emerald-950 text-emerald-200' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Route Banner */}
      <div className="eledger-route-overview bg-emerald-950 text-emerald-100 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-emerald-900">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-sm sm:text-base font-bold text-white">
              {currentRoute.title}
            </h3>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-800 text-emerald-200 font-mono">
              {currentRoute.statutorySection}
            </span>
          </div>
          <p className="text-xs text-emerald-300 mt-1">{currentRoute.description}</p>
        </div>
        <div className="text-right text-xs text-emerald-300">
          TIN: <strong className="text-white font-mono">{taxpayer.tin}</strong> | AY: <strong className="text-white">{assessmentYear}</strong>
        </div>
      </div>

      {/* Treasury A-Challan Lookup Panel */}
      {currentRoute.supportsLookup && <SystemLookupPanel
        routeId={currentRoute.id}
        category="PAYMENT"
        defaultSection={currentRoute.statutorySection}
        lookupPlaceholder={
          currentRoute.id === 'sec-173'
            ? 'e.g. ACHALLAN-2026-788102'
            : 'e.g. ACHALLAN-Q1-2026-5541'
        }
        helperText="Check local A-Challan reference examples; national treasury verification is not connected."
      />}

      {currentRoute.id === 'environmental-surcharge' && (
        <SurchargeTransferPanel key={`${taxpayer.tin}-${assessmentYear}`} onRecord={recordLocalSurcharge} />
      )}

      {/* Inline Editable Table (Requirement #6) */}
      <InlineEditableTable
        key={currentRoute.id}
        entries={routeEntries}
        category="PAYMENT"
        routeId={currentRoute.id}
        defaultSection={currentRoute.statutorySection}
        onSaveNewEntry={handleSaveNewEntry}
        onUpdateEntry={handleUpdateEntry}
        onDeleteEntry={handleDeleteEntry}
        allowAdd={currentRoute.supportsManualEntry && currentRoute.id !== 'environmental-surcharge'}
        allowEditDelete={currentRoute.supportsManualEntry}
      />
    </div>
  );
};
