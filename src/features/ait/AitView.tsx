import React from 'react';
import { ChevronLeft, FileCheck2 } from 'lucide-react';
import { useLedger } from '../../context/LedgerContext.tsx';
import { getActiveVisibleRouteForGroup, getVisibleRoutesByGroup } from '../../domain/routeRegistry.ts';
import type { ClaimEvidence, LedgerEntry } from '../../domain/models.ts';
import { InlineEditableTable } from '../../components/tables/InlineEditableTable.tsx';
import { SystemLookupPanel } from '../../components/workflows/SystemLookupPanel.tsx';
import { CsvImportPanel } from '../../components/workflows/CsvImportPanel.tsx';
import { filterEntriesByRoute } from '../../domain/calculations.ts';

const money = (value: number) => value.toLocaleString('en-IN', { maximumFractionDigits: 2 });

export const AitView: React.FC = () => {
  const {
    entries, activeRouteId, setActiveRouteId, setActiveNavTab,
    addEntry, updateEntry, deleteEntry, assessmentYear, taxpayer,
  } = useLedger();
  const aitRoutes = getVisibleRoutesByGroup('AIT', entries.map((entry) => entry.routeId));
  const currentRoute = getActiveVisibleRouteForGroup(activeRouteId, 'AIT', entries.map((entry) => entry.routeId));
  const routeEntries = filterEntriesByRoute(entries, currentRoute.id);
  const totalTaxForRoute = routeEntries.reduce((sum, entry) => sum + (Number(entry.taxDeducted) || 0), 0);

  const handleSaveNewEntry = async (entryData: {
    referenceNo: string; sourceEntity: string; sectionCode: string;
    grossAmount: number; taxDeducted: number; date: string;
    remarks?: string; claimEvidence?: ClaimEvidence;
  }) => {
    const res = await addEntry({
      taxpayerTin: taxpayer.tin, assessmentYear, category: 'AIT',
      routeId: currentRoute.id, referenceNo: entryData.referenceNo,
      sourceEntity: entryData.sourceEntity,
      sectionCode: entryData.sectionCode || currentRoute.statutorySection,
      grossAmount: entryData.grossAmount,
      taxDeducted: entryData.taxDeducted,
      date: entryData.date,
      status: 'PENDING_VERIFICATION', workflow: 'MANUAL_ENTRY',
      isManual: true, externalVerified: false,
      remarks: entryData.remarks, claimEvidence: entryData.claimEvidence,
    });
    return res.success ? { success: true } : {
      success: false, error: Object.values(res.validation?.errors || {})[0] || 'Validation failed.',
    };
  };
  const handleUpdateEntry = async (id: string, patch: Partial<LedgerEntry>) => {
    const res = await updateEntry(id, patch);
    return res.success ? { success: true } : {
      success: false, error: Object.values(res.validation?.errors || {})[0] || 'Update failed.',
    };
  };
  const handleDeleteEntry = (id: string) => deleteEntry(id);

  const lookupProps = currentRoute.id === 'commercial-vehicle' ? {
    placeholder: 'e.g. DHAKA-METRO-JA-11-2044',
    helper: 'Check locally stored BRTA-style commercial vehicle examples; no live registry query.',
  } : currentRoute.id === 'car-ait' ? {
    placeholder: 'e.g. DHAKA-METRO-GA-34-9182',
    helper: 'Check locally stored private-car tax-token examples; no live BRTA query.',
  } : {
    placeholder: 'Enter Section 154 Challan No.',
    helper: 'Check locally stored challan examples; official treasury verification is not connected.',
  };

  const title = currentRoute.id === 'car-ait' ? 'AIT on Car' :
    currentRoute.id === 'sec-154' ? 'AIT (154)' : currentRoute.title;

  return (
    <div className="eledger-ait-page">
      <header className="eledger-source-title">
        <div className="eledger-source-title-line">
          <button type="button" className="eledger-source-back" aria-label="Back to dashboard"
            onClick={() => setActiveNavTab('dashboard')}><ChevronLeft size={20}/></button>
          <h1>{title}</h1>
        </div>
        <p>{currentRoute.statutorySection}</p>
      </header>

      <nav className="eledger-source-mobile-routes" aria-label="AIT categories">
        {aitRoutes.map((route) => (
          <button type="button" key={route.id} className={route.id === currentRoute.id ? 'is-active' : ''}
            onClick={() => setActiveRouteId(route.id)}>{route.title}</button>
        ))}
      </nav>

      <div className="eledger-ait-summary">
        <div><span>Total Claimed Amount</span><strong>{money(totalTaxForRoute)}</strong></div>
        <div><span>Records</span><strong>{routeEntries.length}</strong></div>
        <p>{currentRoute.description}</p>
      </div>

      {currentRoute.supportsLookup && (
        <section className="eledger-ait-lookup" aria-label="Local AIT reference lookup">
          <header><FileCheck2 size={16}/><div><strong>Reference lookup</strong>
            <span>Local demonstration records only; not an official verification response.</span></div></header>
          <SystemLookupPanel
            routeId={currentRoute.id} category="AIT"
            defaultSection={currentRoute.statutorySection}
            lookupPlaceholder={lookupProps.placeholder} helperText={lookupProps.helper}
          />
        </section>
      )}

      {currentRoute.id === 'ait-import' && (
        <div className="eledger-source-import-note">
          <FileCheck2 size={18}/>
          <div><strong>AIT Import (120) — customs tax details</strong>
            <p>Import claims may be entered individually or by local CSV. Source Tax Import and AIT Import remain distinct; the same Section 120 customs reference cannot be credited twice.</p>
          </div>
        </div>
      )}
      {currentRoute.id === 'ait-import' && (
        <CsvImportPanel key={`${taxpayer.tin}-${assessmentYear}-ait-import`} routeId="ait-import"/>
      )}

      <section className="eledger-ait-records" aria-label="Recorded AIT claims">
        <InlineEditableTable
          key={currentRoute.id} entries={routeEntries} category="AIT"
          routeId={currentRoute.id} defaultSection={currentRoute.statutorySection}
          onSaveNewEntry={handleSaveNewEntry} onUpdateEntry={handleUpdateEntry}
          onDeleteEntry={handleDeleteEntry} allowAdd={currentRoute.supportsManualEntry}
          allowEditDelete={currentRoute.supportsManualEntry}
        />
      </section>
      <p className="eledger-ait-integrity">Locally recorded AIT claims remain pending until independently verified. No government registry connection is configured.</p>
    </div>
  );
};
