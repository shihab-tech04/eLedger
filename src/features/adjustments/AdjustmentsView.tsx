/**
 * Adjustments View
 * Houses the 2 registered Adjustment routes:
 * 1. Refund Adjustment under Section 214
 * 2. Carry-Forward / Prior-Return Adjustment under Section 70 / 215
 */

import React from 'react';
import { useLedger } from '../../context/LedgerContext.tsx';
import { useLedgerCopy, useLedgerLanguage } from '../../context/LanguageContext.tsx';
import { getActiveVisibleRouteForGroup, getVisibleRoutesByGroup } from '../../domain/routeRegistry.ts';
import { LedgerEntry } from '../../domain/models.ts';
import { InlineEditableTable } from '../../components/tables/InlineEditableTable.tsx';
import { SingleClaimPanel } from '../../components/workflows/SingleClaimPanel.tsx';
import { formatLedgerAmount, filterEntriesByRoute } from '../../domain/calculations.ts';
import { RouteMobileTabs } from '../../components/navigation/RouteMobileTabs.tsx';
import { LedgerPageHeader, LedgerSummary } from '../../components/ui/LedgerPage.tsx';

export const AdjustmentsView: React.FC = () => {
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
  const t = useLedgerCopy();
  const { language } = useLedgerLanguage();

  const adjustmentRoutes = getVisibleRoutesByGroup('Adjustment', entries.map((entry) => entry.routeId));
  const currentRoute = getActiveVisibleRouteForGroup(activeRouteId, 'Adjustment', entries.map((entry) => entry.routeId));

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
      category: 'ADJUSTMENT',
      routeId: currentRoute.id,
      referenceNo: entryData.referenceNo,
      sourceEntity: entryData.sourceEntity,
      sectionCode: entryData.sectionCode || currentRoute.statutorySection,
      grossAmount: entryData.grossAmount,
      taxDeducted: entryData.taxDeducted,
      date: entryData.date,
      status: 'PENDING_VERIFICATION',
      workflow: currentRoute.workflow,
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
    <div className="eledger-financial-page">
      <LedgerPageHeader onBack={() => setActiveNavTab('dashboard')}
        title={language === 'bn' ? currentRoute.bengaliTitle : currentRoute.id === 'refund' ? 'Adjustment of Tax Refund' : 'Adjustment of carry forward tax u/s 163'}
        caption={language === 'bn' ? currentRoute.statutorySection.replace(/^Sec /, 'ধারা ').replace('(ITA 2023)', '(আয়কর আইন ২০২৩)') : currentRoute.statutorySection}/>

      <RouteMobileTabs routes={adjustmentRoutes} activeId={currentRoute.id}
        label={t('Adjustment categories','কর সমন্বয়ের খাতসমূহ')} onSelect={setActiveRouteId}/>

      <LedgerSummary amountLabel={t('Total adjustment','মোট সমন্বয়')} amount={formatLedgerAmount(totalTaxForRoute)} count={routeEntries.length}
        note={language === 'bn' ? 'সমন্বয় দাবির সহায়ক প্রমাণ সংরক্ষণ করুন।' : 'Keep supporting evidence for adjustment claims.'}/>

      {currentRoute.id === 'carry-forward' && <SingleClaimPanel existingClaim={routeEntries[0]}/>}

      <section className="eledger-ait-records" aria-label={t('Recorded tax adjustments','রেকর্ডকৃত কর সমন্বয়')}>
        <InlineEditableTable key={currentRoute.id} entries={routeEntries} category="ADJUSTMENT"
          routeId={currentRoute.id} defaultSection={currentRoute.statutorySection}
          onSaveNewEntry={handleSaveNewEntry} onUpdateEntry={handleUpdateEntry}
          onDeleteEntry={handleDeleteEntry} allowAdd={currentRoute.id === 'refund'} />
      </section>
    </div>
  );
};
