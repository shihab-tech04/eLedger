import React, { useRef } from 'react';
import { Building, Search, ShieldCheck } from 'lucide-react';
import { useLedger } from '../../context/LedgerContext.tsx';
import { useLedgerCopy, useLedgerLanguage } from '../../context/LanguageContext.tsx';
import { getActiveVisibleRouteForGroup, getVisibleRoutesByGroup } from '../../domain/routeRegistry.ts';
import type { LedgerEntry, ClaimEvidence } from '../../domain/models.ts';
import { InlineEditableTable } from '../../components/tables/InlineEditableTable.tsx';
import { SalaryOthersTable } from './SalaryOthersTable.tsx';
import { IncomeSyncPanel } from '../../components/workflows/IncomeSyncPanel.tsx';
import { SystemLookupPanel } from '../../components/workflows/SystemLookupPanel.tsx';
import { CsvImportPanel } from '../../components/workflows/CsvImportPanel.tsx';
import { RouteMobileTabs } from '../../components/navigation/RouteMobileTabs.tsx';
import { LedgerTip } from '../../components/ui/LedgerForm.tsx';
import { LedgerPageHeader, LedgerSummary } from '../../components/ui/LedgerPage.tsx';
import { filterEntriesByRoute } from '../../domain/calculations.ts';

const money = (value: number) => value.toLocaleString('en-IN', { maximumFractionDigits: 2 });

export const SourceTaxView: React.FC = () => {
  const {
    entries, activeRouteId, setActiveRouteId,
    addEntry, updateEntry, deleteEntry, assessmentYear, taxpayer,
  } = useLedger();
  const t = useLedgerCopy();
  const { language } = useLedgerLanguage();
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
  const localizedCaption = language === 'bn'
    ? isSalaryOthers ? 'বেতন · ধারা ৮৬'
      : isIbas ? 'স্থানীয় iBAS++ বেতন রেকর্ড — সরকারি সংযোগ নেই'
      : currentRoute.statutorySection.replace(/^Sec /, 'ধারা ').replace('(ITA 2023)', '(আয়কর আইন ২০২৩)')
    : caption;

  return (
    <div className="eledger-financial-page">
      <LedgerPageHeader
        title={language === 'bn' ? currentRoute.bengaliTitle : heading} caption={localizedCaption}/>

      {/* Legacy route tabs remain accessible on mobile, despite the restored desktop sidebar. */}
      <RouteMobileTabs routes={sourceTaxRoutes} activeId={currentRoute.id}
        label={t('Source Tax categories','উৎস করের খাতসমূহ')} onSelect={setActiveRouteId}/>

      <LedgerSummary amountLabel={t('Total claimed','মোট দাবি')} amount={money(totalTaxForRoute)} count={routeEntries.length}
        note={t('These are recorded claims, not independently verified tax credits.','রেকর্ডকৃত দাবি এখনো স্বতন্ত্রভাবে যাচাইকৃত কর ক্রেডিট নয়।')}/>

      {isIbas && (
        <section className="eledger-ibas-workflow">
          <div className="eledger-ibas-search-row">
            <button type="button" onClick={() => localClaimsRef.current?.scrollIntoView({ behavior: 'smooth' })}>
              <Search size={17}/>{t('Search local records','স্থানীয় রেকর্ড খুঁজুন')}
            </button>
          </div>
          <div className="eledger-ibas-facts">
            <div><span>{t('Assessment Year','করবর্ষ')}</span><strong>{assessmentYear}</strong></div>
            <div><span>{t('Office Name (local demo record)','কার্যালয় (স্থানীয় নমুনা)')}</span><strong>{routeEntries[0]?.sourceEntity ?? t('Not available','পাওয়া যায়নি')}</strong></div>
            <div><span>{t('Designation','পদবি')}</span><strong>{t('Requires CGA/iBAS++ connection','CGA/iBAS++ সংযোগ প্রয়োজন')}</strong></div>
            <div><span>{t('TDS Available (local records only)','উৎস কর (শুধু স্থানীয় রেকর্ড)')}</span><strong className="is-amount">{money(totalTaxForRoute)}</strong></div>
          </div>
          <div className="eledger-ibas-claim">
            <label htmlFor="eledger-ibas-claimed">{t('TDS Claim','উৎস কর দাবি')}</label>
            <input id="eledger-ibas-claimed" value={money(totalTaxForRoute)} readOnly className="eledger-control is-readonly"
              aria-describedby="eledger-ibas-integrity-note"/>
            <span id="eledger-ibas-integrity-note">{t('Local record only — no official submission.','শুধু স্থানীয় রেকর্ড — সরকারি দাখিল নয়।')}</span>
            <LedgerTip label={t('Why can’t I save?','সংরক্ষণ বন্ধ কেন?')}>
              {t('Official submission requires a verified CGA/iBAS++ connection, which is not available here.','সরকারি দাখিলের জন্য যাচাইকৃত CGA/iBAS++ সংযোগ প্রয়োজন; এখানে তা নেই।')}
            </LedgerTip>
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
          {currentRoute.supportsIncomeSync && (
            <IncomeSyncPanel routeId={currentRoute.id} defaultSection={currentRoute.statutorySection} title={language === 'bn' ? currentRoute.bengaliTitle : currentRoute.title}/>
          )}
          {currentRoute.id === 'commercial-source' && (
            <SystemLookupPanel routeId={currentRoute.id} category="SOURCE_TAX"
              defaultSection={currentRoute.statutorySection} lookupPlaceholder={t('Unique Key (Transaction No.)','অনন্য কী (লেনদেন নম্বর)')}
              helperText={t('Enter the commercial vehicle transaction key to check the available reference record.','সংশ্লিষ্ট স্থানীয় রেকর্ড খুঁজতে বাণিজ্যিক গাড়ির লেনদেন কী দিন।')}/>
          )}
          {currentRoute.id === 'system-import' && (
            <div className="eledger-source-import-note">
              <Building size={18}/>
              <div><strong>{t('Customs ASYCUDA World Port Clearance Import','কাস্টমস ASYCUDA World আমদানি তথ্য')}</strong>
                <p>{t('Record customs references with Add Entry or the local CSV importer. Live ASYCUDA imports are not connected.','কাস্টমস রেফারেন্স এন্ট্রি যোগ করে বা স্থানীয় CSV দিয়ে রেকর্ড করুন। সরাসরি ASYCUDA সংযোগ নেই।')}</p>
              </div>
            </div>
          )}
          {currentRoute.id === 'system-import' && (
            <CsvImportPanel key={`${taxpayer.tin}-${assessmentYear}-system-import`} routeId="system-import"/>
          )}
          <div ref={localClaimsRef} className="eledger-source-record-list">
            {isIbas && <div className="eledger-source-demo-note"><ShieldCheck size={16}/>
              {t('Saved iBAS++-style records are local demonstration entries; they do not establish authoritative tax credits.','সংরক্ষিত iBAS++-ধাঁচের রেকর্ড স্থানীয় নমুনা মাত্র; এগুলো সরকারি যাচাইকৃত কর ক্রেডিট নয়।')}</div>}
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
