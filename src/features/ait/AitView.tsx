import React from 'react';
import { FileCheck2 } from 'lucide-react';
import { useLedger } from '../../context/LedgerContext.tsx';
import { useLedgerCopy, useLedgerLanguage } from '../../context/LanguageContext.tsx';
import { getActiveVisibleRouteForGroup, getVisibleRoutesByGroup } from '../../domain/routeRegistry.ts';
import type { ClaimEvidence, LedgerEntry } from '../../domain/models.ts';
import { InlineEditableTable } from '../../components/tables/InlineEditableTable.tsx';
import { SystemLookupPanel } from '../../components/workflows/SystemLookupPanel.tsx';
import { CsvImportPanel } from '../../components/workflows/CsvImportPanel.tsx';
import { filterEntriesByRoute } from '../../domain/calculations.ts';
import { RouteMobileTabs } from '../../components/navigation/RouteMobileTabs.tsx';
import { LedgerPageHeader, LedgerSummary } from '../../components/ui/LedgerPage.tsx';

const money = (value: number) => value.toLocaleString('en-IN', { maximumFractionDigits: 2 });

export const AitView: React.FC = () => {
  const {
    entries, activeRouteId, setActiveRouteId,
    addEntry, updateEntry, deleteEntry, assessmentYear, taxpayer,
  } = useLedger();
  const t = useLedgerCopy();
  const { language } = useLedgerLanguage();
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
    <div className="eledger-financial-page">
      <LedgerPageHeader
        title={language === 'bn' ? currentRoute.bengaliTitle : title}
        caption={language === 'bn' ? currentRoute.statutorySection.replace(/^Sec /, 'ধারা ').replace('(ITA 2023)', '(আয়কর আইন ২০২৩)') : currentRoute.statutorySection}/>

      <RouteMobileTabs routes={aitRoutes} activeId={currentRoute.id}
        label={t('AIT categories','অগ্রিম করের খাতসমূহ')} onSelect={setActiveRouteId}/>

      <LedgerSummary amountLabel={t('Total claimed','মোট দাবি')} amount={money(totalTaxForRoute)} count={routeEntries.length}
        note={language === 'bn' ? 'রেকর্ডকৃত দাবি স্বতন্ত্র যাচাই ছাড়া নিশ্চিত কর ক্রেডিট নয়।' : 'Recorded claims require independent verification.'}/>

      {currentRoute.supportsLookup && (
        <SystemLookupPanel
          heading={t('Reference lookup','রেফারেন্স অনুসন্ধান')}
          routeId={currentRoute.id} category="AIT"
          defaultSection={currentRoute.statutorySection}
          lookupPlaceholder={lookupProps.placeholder}
          helperText={`${t('Local demonstration records only; not an official verification response.','শুধু স্থানীয় নমুনা রেকর্ড; সরকারি যাচাই নয়।')} ${language === 'bn' ? 'BRTA/ট্রেজারি যাচাই সংযুক্ত নেই।' : lookupProps.helper}`}
        />
      )}

      {currentRoute.id === 'ait-import' && (
        <div className="eledger-source-import-note">
          <FileCheck2 size={18}/>
          <div><strong>{t('AIT Import (120) — customs tax details','অগ্রিম কর আমদানি (১২০) — শুল্ক সংক্রান্ত তথ্য')}</strong>
            <p>{t('Import claims may be entered individually or by local CSV. Source Tax Import and AIT Import remain distinct; the same Section 120 customs reference cannot be credited twice.','আমদানির দাবি আলাদাভাবে বা স্থানীয় CSV দিয়ে রেকর্ড করা যায়। উৎস কর ও অগ্রিম কর আমদানি পৃথক; একই ধারা ১২০ রেফারেন্স দুবার দাবি করা যায় না।')}</p>
          </div>
        </div>
      )}
      {currentRoute.id === 'ait-import' && (
        <CsvImportPanel key={`${taxpayer.tin}-${assessmentYear}-ait-import`} routeId="ait-import"/>
      )}

      <section className="eledger-ait-records" aria-label={t('Recorded AIT claims','রেকর্ডকৃত অগ্রিম কর দাবি')}>
        <InlineEditableTable
          key={currentRoute.id} entries={routeEntries} category="AIT"
          routeId={currentRoute.id} defaultSection={currentRoute.statutorySection}
          onSaveNewEntry={handleSaveNewEntry} onUpdateEntry={handleUpdateEntry}
          onDeleteEntry={handleDeleteEntry} allowAdd={currentRoute.supportsManualEntry}
          allowEditDelete={currentRoute.supportsManualEntry}
        />
      </section>
    </div>
  );
};
