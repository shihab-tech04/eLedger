import React, { useRef } from 'react';
import { ArrowRight, BookOpen, FileSearch, List, ShieldCheck } from 'lucide-react';
import { useLedger } from '../../context/LedgerContext.tsx';
import { useLedgerCopy, useLedgerLanguage } from '../../context/LanguageContext.tsx';
import { getActiveVisibleRouteForGroup, getVisibleRoutesByGroup } from '../../domain/routeRegistry.ts';
import type { LedgerEntry, ClaimEvidence, LedgerRouteId } from '../../domain/models.ts';
import { InlineEditableTable } from '../../components/tables/InlineEditableTable.tsx';
import { SalaryOthersTable } from './SalaryOthersTable.tsx';
import { OfficialManualClaimsTable } from '../../components/tables/OfficialManualClaimsTable.tsx';
import { OfficialReadOnlyTable, isOfficialReadOnlyRoute } from '../../components/tables/OfficialReadOnlyTable.tsx';
import { IncomeSyncPanel } from '../../components/workflows/IncomeSyncPanel.tsx';
import { SystemLookupPanel } from '../../components/workflows/SystemLookupPanel.tsx';
import { RouteMobileTabs } from '../../components/navigation/RouteMobileTabs.tsx';
import { LedgerTip } from '../../components/ui/LedgerForm.tsx';
import { LedgerPageHeader, LedgerSummary } from '../../components/ui/LedgerPage.tsx';
import { filterEntriesByRoute } from '../../domain/calculations.ts';

/** Source-observed page copy. Legal metadata stays in the route registry. */
export const OBSERVED_SOURCE_TAX_HEADINGS: Readonly<Record<string, string>> = {
  'salary-ibas': 'Salary (iBAS++)',
  'salary-others': 'Salary (Others)',
  'bank-fi': 'Bank TDS',
  dividend: 'Dividend',
  'service-payment': 'Service Payment',
  sanchayapatra: 'Sanchayapatra',
  'system-import': 'Import (120) TDS Details',
  'source-ltu': 'Source Tax LTU',
  'commercial-source': 'Commercial Vehicle',
  'other-tds': 'Other TDS Entry',
};

const money = (value: number) => value.toLocaleString('en-IN', { maximumFractionDigits: 2 });

/** Routes whose income-fed claims are read-only in the original NBR ledger.
 * Expose only the existing local Sync from Income disclosure, never manual Add.
 */
export const hasReadOnlyIncomeSync = (id: LedgerRouteId): boolean =>
  id === 'bank-fi' || id === 'dividend' || id === 'sanchayapatra';



export const SourceTaxView: React.FC = () => {
  const {
    entries, activeRouteId, setActiveRouteId, setActiveNavTab,
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
  const isServicePayment = currentRoute.id === 'service-payment';
  const isOfficialManual = currentRoute.id === 'service-payment' ||
    currentRoute.id === 'other-tds' || currentRoute.id === 'source-ltu';

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

  const heading = OBSERVED_SOURCE_TAX_HEADINGS[currentRoute.id] ?? currentRoute.title;
  const caption = isSalaryOthers ? 'Salary [ Section-86 ]' :
    isIbas ? (routeEntries.length > 0 ? 'Locally recorded payroll information' : undefined) :
    isServicePayment ? 'Meeting Fees, Honorarium, Professional Service, Consultancy etc. [Section-90]' : undefined;
  const localizedCaption = language === 'bn'
    ? isSalaryOthers ? 'বেতন · ধারা ৮৬'
      : isIbas ? (routeEntries.length > 0 ? 'স্থানীয়ভাবে রেকর্ডকৃত বেতনের তথ্য' : undefined)
      : isServicePayment
        ? currentRoute.statutorySection.replace(/^Sec /, 'ধারা ').replace('(ITA 2023)', '(আয়কর আইন ২০২৩)')
        : undefined
    : caption;

  return (
    <div className="eledger-financial-page">
      <LedgerPageHeader
        title={language === 'bn' ? currentRoute.bengaliTitle : heading} caption={localizedCaption}/>

      {/* Legacy route tabs remain accessible on mobile, despite the restored desktop sidebar. */}
      <RouteMobileTabs routes={sourceTaxRoutes} activeId={currentRoute.id}
        label={t('Source Tax categories','উৎস করের খাতসমূহ')} onSelect={setActiveRouteId}/>

      <LedgerSummary amountLabel={isIbas ? t('Locally recorded TDS','স্থানীয়ভাবে রেকর্ডকৃত উৎস কর') : t('Total claimed','মোট দাবি')}
        amount={money(totalTaxForRoute)} count={routeEntries.length}
        note={isIbas ? undefined : t('These are recorded claims, not independently verified tax credits.','রেকর্ডকৃত দাবি এখনো স্বতন্ত্রভাবে যাচাইকৃত কর ক্রেডিট নয়।')}/>

      {isIbas && routeEntries.length > 0 && (
        <section className="eledger-ibas-workflow">
          <div className="eledger-ibas-search-row">
            <button type="button" onClick={() => localClaimsRef.current?.scrollIntoView({ behavior: 'smooth' })}>
              <List size={17}/>{t('View local records','স্থানীয় রেকর্ড দেখুন')}
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
      ) : isOfficialManual ? (
        <>
          {currentRoute.supportsIncomeSync && (
            <IncomeSyncPanel routeId={currentRoute.id} defaultSection={currentRoute.statutorySection}
              title={language === 'bn' ? currentRoute.bengaliTitle : currentRoute.title}/>
          )}
          <OfficialManualClaimsTable key={currentRoute.id} entries={routeEntries}
            routeId={currentRoute.id as 'service-payment' | 'other-tds' | 'source-ltu'}
            assessmentYear={assessmentYear} defaultSection={currentRoute.statutorySection}
            onSaveNewEntry={handleSaveNewEntry} onUpdateEntry={handleUpdateEntry}
            onDeleteEntry={handleDeleteEntry}/>
        </>
      ) : (
        <>
          {hasReadOnlyIncomeSync(currentRoute.id) && (
            <IncomeSyncPanel routeId={currentRoute.id} defaultSection={currentRoute.statutorySection} title={language === 'bn' ? currentRoute.bengaliTitle : currentRoute.title}/>
          )}
          {currentRoute.id === 'commercial-source' && (
            <SystemLookupPanel routeId={currentRoute.id} category="SOURCE_TAX"
              defaultSection={currentRoute.statutorySection} lookupPlaceholder={t('Unique Key (Transaction No.)','অনন্য কী (লেনদেন নম্বর)')}
              helperText={t('Enter the commercial vehicle transaction key to check the available reference record.','সংশ্লিষ্ট স্থানীয় রেকর্ড খুঁজতে বাণিজ্যিক গাড়ির লেনদেন কী দিন।')}/>
          )}
          <div ref={localClaimsRef} className="eledger-source-record-list">
            {isIbas && routeEntries.length > 0 && <div className="eledger-source-demo-note"><ShieldCheck size={16}/>
              {t('These locally recorded salary deductions are not authority-verified tax credits.','স্থানীয়ভাবে রেকর্ডকৃত এই বেতন-উৎস কর কর্তৃপক্ষের যাচাইকৃত কর ক্রেডিট নয়।')}</div>}
            {isOfficialReadOnlyRoute(currentRoute.id) ? (
              <OfficialReadOnlyTable routeId={currentRoute.id} entries={routeEntries}/>
            ) : isIbas && routeEntries.length === 0 ? (
              <section className="eledger-panel eledger-ibas-empty" aria-labelledby="eledger-ibas-empty-title">
                <span className="eledger-ibas-empty-icon" aria-hidden="true"><FileSearch size={24}/></span>
                <div className="eledger-ibas-empty-copy">
                  <h2 id="eledger-ibas-empty-title">{t('No local iBAS++ payroll records available','স্থানীয় iBAS++ বেতনের তথ্য পাওয়া যায়নি')}</h2>
                  <p>{t('This does not mean that no tax was deducted. This standalone ledger is not connected to the official CGA/iBAS++ payroll system.','এর অর্থ এই নয় যে কোনো উৎস কর কাটা হয়নি। এই স্বতন্ত্র লেজার সরকারি CGA/iBAS++ বেতন ব্যবস্থার সঙ্গে সংযুক্ত নয়।')}</p>
                  <p>{t('Government payroll deductions must be checked through the authorized eReturn iBAS++ workflow. For salary outside iBAS++, review Salary (Others) where applicable.','সরকারি বেতনের উৎস কর অনুমোদিত ই-রিটার্ন iBAS++ প্রক্রিয়ায় যাচাই করতে হবে। iBAS++-এর বাইরের বেতনের ক্ষেত্রে প্রযোজ্য হলে অন্যান্য বেতন খাত দেখুন।')}</p>
                  <div className="eledger-ibas-empty-actions">
                    <button type="button" className="eledger-button eledger-button-primary" onClick={() => {
                      setActiveRouteId('salary-others'); setActiveNavTab('source-tax');
                    }}>{t('Review Salary (Others)','অন্যান্য বেতন দেখুন')}<ArrowRight size={16} aria-hidden="true"/></button>
                    <button type="button" className="eledger-button eledger-button-secondary"
                      onClick={() => setActiveNavTab('ledger-guide')}>
                      <BookOpen size={16} aria-hidden="true"/>{t('How eLedger works','ই-লেজার যেভাবে কাজ করে')}</button>
                  </div>
                </div>
              </section>
            ) : (
            <InlineEditableTable
              key={currentRoute.id} entries={routeEntries} category="SOURCE_TAX"
              routeId={currentRoute.id} defaultSection={currentRoute.statutorySection}
              onSaveNewEntry={handleSaveNewEntry} onUpdateEntry={handleUpdateEntry}
              onDeleteEntry={handleDeleteEntry}
              // The authenticated Bank/FI view is populated from Income;
              // preserve editing old manual rows but don't create new ones.
              allowAdd={false}
              allowEditDelete={false}
            />
            )}
          </div>
        </>
      )}
    </div>
  );
};
