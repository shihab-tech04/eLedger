import React, { useRef } from 'react';
import { Building, ChevronLeft, Search, ShieldCheck } from 'lucide-react';
import { useLedger } from '../../context/LedgerContext.tsx';
import { getActiveVisibleRouteForGroup, getVisibleRoutesByGroup } from '../../domain/routeRegistry.ts';
import type { LedgerEntry, ClaimEvidence } from '../../domain/models.ts';
import { InlineEditableTable } from '../../components/tables/InlineEditableTable.tsx';
import { SalaryOthersTable } from './SalaryOthersTable.tsx';
import { IncomeSyncPanel } from '../../components/workflows/IncomeSyncPanel.tsx';
import { SystemLookupPanel } from '../../components/workflows/SystemLookupPanel.tsx';
import { CsvImportPanel } from '../../components/workflows/CsvImportPanel.tsx';
import { filterEntriesByRoute } from '../../domain/calculations.ts';

const money = (value: number) => value.toLocaleString('en-IN', { maximumFractionDigits: 2 });

export const SourceTaxView: React.FC = () => {
  const {
    entries, activeRouteId, setActiveRouteId, setActiveNavTab,
    addEntry, updateEntry, deleteEntry, assessmentYear, taxpayer,
  } = useLedger();
  const localClaimsRef = useRef<HTMLDivElement>(null);
  const sourceTaxRoutes = getVisibleRoutesByGroup('Source Tax', entries.map((entry) => entry.routeId));
  const currentRoute = getActiveVisibleRouteForGroup(activeRouteId, 'Source Tax', entries.map((entry) => entry.routeId));
  const routeEntries = filterEntriesByRoute(entries, currentRoute.id);
  const totalTaxForRoute = routeEntries.reduce((sum, entry) => sum + (Number(entry.taxDeducted) || 0), 0);
  const isSalaryOthers = currentRoute.id === 'salary-others';
  const isIbas = currentRoute.id === 'salary-ibas';

  const handleSaveNewEntry = async (entryData: {
    referenceNo: string; sourceEntity: string; sectionCode: string;
    grossAmount: number; taxDeducted: number; date: string;
    remarks?: string; claimEvidence?: ClaimEvidence;
  }) => {
    const res = await addEntry({
      taxpayerTin: taxpayer.tin, assessmentYear, category: 'SOURCE_TAX',
      routeId: currentRoute.id, referenceNo: entryData.referenceNo,
      sourceEntity: entryData.sourceEntity,
      sectionCode: entryData.sectionCode || currentRoute.statutorySection,
      grossAmount: entryData.grossAmount, taxDeducted: entryData.taxDeducted,
      date: entryData.date, status: 'PENDING_VERIFICATION',
      workflow: 'MANUAL_ENTRY', isManual: true, externalVerified: false,
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

  const heading = isIbas ? 'iBAS++ (Salary) TDS' : isSalaryOthers ? 'Salary (Others)' : currentRoute.title;
  const caption = isSalaryOthers ? 'Salary [ Section-86 ]' :
    isIbas ? 'Local iBAS++ payroll references — not connected to CGA' : currentRoute.statutorySection;

  return (
    <div className="eledger-source-page">
      <header className="eledger-source-title">
        <div className="eledger-source-title-line">
          <button type="button" className="eledger-source-back" aria-label="Back to dashboard"
            onClick={() => setActiveNavTab('dashboard')}><ChevronLeft size={20}/></button>
          <h1>{heading}</h1>
        </div>
        <p>{caption}</p>
      </header>

      {/* Legacy route tabs remain accessible on mobile, despite the restored desktop sidebar. */}
      <nav className="eledger-source-mobile-routes" aria-label="Source Tax categories">
        {sourceTaxRoutes.map((route) => (
          <button key={route.id} type="button" className={route.id === currentRoute.id ? 'is-active' : ''}
            onClick={() => setActiveRouteId(route.id)}>{route.title}</button>
        ))}
      </nav>

      {isIbas && (
        <section className="eledger-ibas-workflow">
          <div className="eledger-ibas-search-row">
            <button type="button" onClick={() => localClaimsRef.current?.scrollIntoView({ behavior: 'smooth' })}>
              <Search size={17}/>Search local records
            </button>
          </div>
          <div className="eledger-ibas-facts">
            <div><span>Assessment Year</span><strong>{assessmentYear}</strong></div>
            <div><span>Office Name (local demo record)</span><strong>{routeEntries[0]?.sourceEntity ?? 'Not available'}</strong></div>
            <div><span>Designation</span><strong>Requires CGA/iBAS++ connection</strong></div>
            <div><span>TDS Available (local records only)</span><strong className="is-amount">{money(totalTaxForRoute)}</strong></div>
          </div>
          <div className="eledger-ibas-claim">
            <label htmlFor="eledger-ibas-claimed">TDS Claim</label>
            <input id="eledger-ibas-claimed" value={money(totalTaxForRoute)} readOnly
              aria-describedby="eledger-ibas-integrity-note"/>
            <span id="eledger-ibas-integrity-note">Read-only demonstration data. No live CGA/iBAS++ lookup or official claim submission is connected.</span>
            <button type="button" disabled title="A verified iBAS++ connection is required">Save — official connection required</button>
          </div>
        </section>
      )}

      {isSalaryOthers ? (
        <SalaryOthersTable
          key={currentRoute.id}
          entries={routeEntries}
          defaultSection={currentRoute.statutorySection}
          onSaveNewEntry={handleSaveNewEntry}
          onUpdateEntry={handleUpdateEntry}
          onDeleteEntry={handleDeleteEntry}
        />
      ) : (
        <>
          {!isIbas && (
            <div className="eledger-source-record-summary">
              <span>Total Claimed Amount <strong>{money(totalTaxForRoute)}</strong></span>
              <span>Records <strong>{routeEntries.length}</strong></span>
              <small>{currentRoute.description}</small>
            </div>
          )}
          {currentRoute.supportsIncomeSync && (
            <IncomeSyncPanel routeId={currentRoute.id} defaultSection={currentRoute.statutorySection} title={currentRoute.title}/>
          )}
          {currentRoute.id === 'commercial-source' && (
            <SystemLookupPanel routeId={currentRoute.id} category="SOURCE_TAX"
              defaultSection={currentRoute.statutorySection} lookupPlaceholder="Unique Key (Transaction No.)"
              helperText="Enter the commercial vehicle transaction key to check the available reference record."/>
          )}
          {currentRoute.id === 'system-import' && (
            <div className="eledger-source-import-note">
              <Building size={18}/>
              <div><strong>Customs ASYCUDA World Port Clearance Import</strong>
                <p>Record customs references with Add Entry or the local CSV importer. Live ASYCUDA imports are not connected.</p>
              </div>
            </div>
          )}
          {currentRoute.id === 'system-import' && (
            <CsvImportPanel key={`${taxpayer.tin}-${assessmentYear}-system-import`} routeId="system-import"/>
          )}
          <div ref={localClaimsRef} className="eledger-source-record-list">
            {isIbas && <div className="eledger-source-demo-note"><ShieldCheck size={16}/>
              Saved iBAS++-style records are local demonstration entries; they do not establish authoritative tax credits.</div>}
            <InlineEditableTable
              key={currentRoute.id} entries={routeEntries} category="SOURCE_TAX"
              routeId={currentRoute.id} defaultSection={currentRoute.statutorySection}
              onSaveNewEntry={handleSaveNewEntry} onUpdateEntry={handleUpdateEntry}
              onDeleteEntry={handleDeleteEntry} allowAdd={currentRoute.supportsManualEntry}
              allowEditDelete={currentRoute.supportsManualEntry}
            />
          </div>
        </>
      )}
    </div>
  );
};
