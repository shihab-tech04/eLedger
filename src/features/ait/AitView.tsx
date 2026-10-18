/**
 * Advance Income Tax (AIT) View
 * Houses the 3 registered AIT routes:
 * 1. Commercial Vehicle AIT (Sec 153)
 * 2. AIT on Private Motor Car (Sec 153(2))
 * 3. AIT under Section 154
 */

import React from 'react';
import { useLedger } from '../../context/LedgerContext.tsx';
import { ROUTE_REGISTRY, getActiveRouteForGroup } from '../../domain/routeRegistry.ts';
import { LedgerRouteId, LedgerEntry } from '../../domain/models.ts';
import { InlineEditableTable } from '../../components/tables/InlineEditableTable.tsx';
import { SystemLookupPanel } from '../../components/workflows/SystemLookupPanel.tsx';
import { formatCurrencyBDT, filterEntriesByRoute } from '../../domain/calculations.ts';
import { Car } from 'lucide-react';

export const AitView: React.FC = () => {
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

  const aitRoutes = ROUTE_REGISTRY.filter((r) => r.group === 'AIT');

  // Check if activeRouteId is in AIT, otherwise default to first
  const currentRoute = getActiveRouteForGroup(activeRouteId, 'AIT');

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
      category: 'AIT',
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

  const getLookupProps = () => {
    if (currentRoute.id === 'commercial-vehicle') {
      return {
        placeholder: 'e.g. DHAKA-METRO-JA-11-2044',
        helper: 'Check sample BRTA commercial vehicle references stored locally (not a live registry query).',
      };
    } else if (currentRoute.id === 'car-ait') {
      return {
        placeholder: 'e.g. DHAKA-METRO-GA-34-9182',
        helper: 'Check sample private car fitness/tax-token references stored locally (not a live BRTA query).',
      };
    } else {
      return {
        placeholder: 'e.g. SEC154-AUCTION-2026-001',
        helper: 'Check sample Section 154 challan references stored locally; external verification is not connected.',
      };
    }
  };

  const lookupProps = getLookupProps();

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-emerald-800 text-white">
              <Car className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                  Advance Income Tax (AIT)
                </h2>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                  3 AIT Categories
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600">
                Advance tax collected by BRTA on commercial and private vehicles, and specialized transactions under Sec 154
              </p>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-right">
            <span className="text-[11px] text-slate-500 uppercase font-semibold block">
              Category Total
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

      {/* 3 Route Tabs */}
      <div className="bg-white rounded-lg border border-slate-200 p-2 shadow-xs">
        <div className="flex items-center space-x-2 overflow-x-auto">
          {aitRoutes.map((route) => {
            const count = filterEntriesByRoute(entries, route.id).length;
            const isSelected = route.id === currentRoute.id;

            return (
              <button
                key={route.id}
                onClick={() => setActiveRouteId(route.id)}
                className={`flex-1 min-w-[200px] flex items-center justify-between px-3.5 py-2.5 rounded-md text-xs sm:text-sm font-medium transition-all ${
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
      <div className="bg-emerald-950 text-emerald-100 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-emerald-900">
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

      {/* System Lookup Panel with Fail-Closed Validation */}
      <SystemLookupPanel
        routeId={currentRoute.id}
        category="AIT"
        defaultSection={currentRoute.statutorySection}
        lookupPlaceholder={lookupProps.placeholder}
        helperText={lookupProps.helper}
      />

      {/* Inline Editable Table (Requirement #6) */}
      <InlineEditableTable
        entries={routeEntries}
        category="AIT"
        routeId={currentRoute.id}
        defaultSection={currentRoute.statutorySection}
        onSaveNewEntry={handleSaveNewEntry}
        onUpdateEntry={handleUpdateEntry}
        onDeleteEntry={handleDeleteEntry}
        allowAdd={true}
      />
    </div>
  );
};
