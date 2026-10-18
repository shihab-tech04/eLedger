/**
 * Source Tax View
 * Houses the 10 registered Source Tax routes with workflow patterns:
 * - System Claim (iBAS++)
 * - Manual Entry (inline row Add/Save/Cancel)
 * - Sync from Income (Bank, Dividend, Sanchayapatra)
 * - Hybrid Sync + Manual Entry (Service Payment, Contractor)
 * - System Records / Import (Customs TDS)
 */

import React, { useState } from 'react';
import { useLedger } from '../../context/LedgerContext.tsx';
import { ROUTE_REGISTRY, getRouteById } from '../../domain/routeRegistry.ts';
import { LedgerRouteId, LedgerEntry } from '../../domain/models.ts';
import { InlineEditableTable } from '../../components/tables/InlineEditableTable.tsx';
import { IncomeSyncPanel } from '../../components/workflows/IncomeSyncPanel.tsx';
import { formatCurrencyBDT, filterEntriesByRoute } from '../../domain/calculations.ts';
import { Receipt, ShieldCheck, Building, Sparkles } from 'lucide-react';

export const SourceTaxView: React.FC = () => {
  const {
    entries,
    activeRouteId,
    setActiveRouteId,
    addEntry,
    updateEntry,
    deleteEntry,
    assessmentYear,
    taxpayer,
  } = useLedger();

  // All 10 Source Tax routes
  const sourceTaxRoutes = ROUTE_REGISTRY.filter((r) => r.group === 'Source Tax');

  // Active route
  const currentRoute = getRouteById(activeRouteId) || sourceTaxRoutes[0];
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
  }) => {
    const res = await addEntry({
      taxpayerTin: taxpayer.tin,
      assessmentYear,
      category: 'SOURCE_TAX',
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

  return (
    <div className="space-y-5">
      {/* View Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-emerald-800 text-white">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                  Source Tax (TDS) Claims
                </h2>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                  10 Functional Categories
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600">
                Tax withheld at source on salary, bank profit, dividends, national savings, and services
              </p>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-right">
            <span className="text-[11px] text-slate-500 uppercase font-semibold block">
              Active Category Total
            </span>
            <span className="text-lg font-bold font-mono text-emerald-800">
              {formatCurrencyBDT(totalTaxForRoute)}
            </span>
            <span className="text-[11px] text-slate-500 block">
              {routeEntries.length} {routeEntries.length === 1 ? 'record' : 'records'}
            </span>
          </div>
        </div>
      </div>

      {/* 10 Route Sub-Tabs / Horizontal Route Selector */}
      <div className="bg-white rounded-lg border border-slate-200 p-2 shadow-xs">
        <div className="flex items-center space-x-1 overflow-x-auto pb-1 scrollbar-thin">
          {sourceTaxRoutes.map((route) => {
            const count = filterEntriesByRoute(entries, route.id).length;
            const isSelected = route.id === currentRoute.id;

            return (
              <button
                key={route.id}
                onClick={() => setActiveRouteId(route.id)}
                className={`flex-shrink-0 flex items-center space-x-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/60'
                }`}
              >
                <span>{route.title}</span>
                {count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected
                        ? 'bg-emerald-950 text-emerald-200'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Route Overview & Statutory Section */}
      <div className="bg-emerald-950 text-emerald-100 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-emerald-900">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-sm sm:text-base font-bold text-white">
              {currentRoute.title}
            </h3>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-800 text-emerald-200 font-mono">
              {currentRoute.statutorySection}
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-900 text-emerald-300 font-medium">
              {currentRoute.workflow.replace(/_/g, ' ')}
            </span>
          </div>
          <p className="text-xs text-emerald-300 mt-1">{currentRoute.description}</p>
        </div>
        <div className="text-right text-xs text-emerald-300">
          AY: <strong className="text-white">{assessmentYear}</strong> | TIN: <strong className="text-white font-mono">{taxpayer.tin}</strong>
        </div>
      </div>

      {/* Special Workflow: iBAS++ System Claim Info */}
      {currentRoute.id === 'salary-ibas' && (
        <div className="bg-sky-50 border border-sky-200 rounded-lg p-4 text-xs text-sky-900">
          <div className="flex items-center space-x-2 mb-1.5">
            <ShieldCheck className="w-4 h-4 text-sky-700" />
            <strong className="text-sm font-semibold text-sky-950">
              iBAS++ Payroll Ledger Reference (Demo)
            </strong>
          </div>
          <p className="text-sky-800 leading-relaxed">
            These salary TDS records are local demonstration data. No CGA iBAS++ connection or automatic government verification is active; real discrepancies must be resolved with the appropriate Drawing and Disbursing Officer (DDO).
          </p>
        </div>
      )}

      {/* Special Workflow: Income Synchronization Panel */}
      {currentRoute.supportsIncomeSync && (
        <IncomeSyncPanel
          routeId={currentRoute.id}
          defaultSection={currentRoute.statutorySection}
          title={currentRoute.title}
        />
      )}

      {/* Special Workflow: System Import for Customs Bill of Entry */}
      {currentRoute.id === 'system-import' && (
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-200">
            <Building className="w-4 h-4 text-emerald-700" />
            <h4 className="text-xs sm:text-sm font-semibold text-slate-800">
              Customs ASYCUDA World Port Clearance Import
            </h4>
          </div>
          <p className="text-xs text-slate-600 mt-2">
            Import records are pulled from NBR Customs Bill-of-Entry database. Enter custom clearing challans or Bill of Entry numbers below using Add Entry.
          </p>
        </div>
      )}

      {/* Requirement #6: Inline Editable Table with Add Entry inserting row directly inside */}
      <InlineEditableTable
        entries={routeEntries}
        category="SOURCE_TAX"
        routeId={currentRoute.id}
        defaultSection={currentRoute.statutorySection}
        onSaveNewEntry={handleSaveNewEntry}
        onUpdateEntry={handleUpdateEntry}
        onDeleteEntry={handleDeleteEntry}
        allowAdd={currentRoute.supportsManualEntry}
      />
    </div>
  );
};
