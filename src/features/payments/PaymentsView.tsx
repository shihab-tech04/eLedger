/**
 * Payments View
 * Houses the 2 registered Payment routes:
 * 1. Regular Tax under Section 173 (Payment on return of income)
 * 2. Advance Tax under Section 171 (Quarterly advance installments)
 */

import React from 'react';
import { useLedger } from '../../context/LedgerContext.tsx';
import { useLedgerCopy, useLedgerLanguage } from '../../context/LanguageContext.tsx';
import { getActiveVisibleRouteForGroup, getVisibleRoutesByGroup } from '../../domain/routeRegistry.ts';
import { LedgerEntry, ClaimEvidence } from '../../domain/models.ts';
import { InlineEditableTable } from '../../components/tables/InlineEditableTable.tsx';
import { SystemLookupPanel } from '../../components/workflows/SystemLookupPanel.tsx';
import { SurchargeTransferPanel } from '../../components/workflows/SurchargeTransferPanel.tsx';
import { formatLedgerAmount, filterEntriesByRoute } from '../../domain/calculations.ts';
import { RouteMobileTabs } from '../../components/navigation/RouteMobileTabs.tsx';
import { LedgerPageHeader, LedgerSummary } from '../../components/ui/LedgerPage.tsx';

export const PaymentsView: React.FC = () => {
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
  const t = useLedgerCopy();
  const { language } = useLedgerLanguage();

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
    <div className="eledger-financial-page">
      <LedgerPageHeader
        title={language === 'bn' ? currentRoute.bengaliTitle : currentRoute.id === 'sec-173' ? 'Tax Paid with Return (173)' : currentRoute.title}
        caption={language === 'bn' ? currentRoute.statutorySection.replace(/^Sec /, 'ধারা ').replace('(ITA 2023)', '(আয়কর আইন ২০২৩)') : currentRoute.statutorySection}/>

      <RouteMobileTabs routes={paymentRoutes} activeId={currentRoute.id}
        label={t('Payment categories','কর পরিশোধের খাতসমূহ')} onSelect={setActiveRouteId}/>

      <LedgerSummary amountLabel={t('Total payment','মোট পরিশোধ')} amount={formatLedgerAmount(totalTaxForRoute)} count={routeEntries.length}
        note={language === 'bn' ? 'রেকর্ডকৃত পরিশোধের সরকারি নিশ্চিতকরণ আলাদাভাবে প্রয়োজন।' : 'Recorded payments require separate official confirmation.'}/>

      {currentRoute.supportsLookup && (
        <SystemLookupPanel routeId={currentRoute.id} category="PAYMENT"
            heading={t('A-Challan reference lookup','এ-চালান রেফারেন্স অনুসন্ধান')}
            defaultSection={currentRoute.statutorySection}
            lookupPlaceholder={currentRoute.id === 'sec-173' ? 'e.g. ACHALLAN-2026-788102' : 'e.g. ACHALLAN-Q1-2026-5541'}
            helperText={t('Local demonstration records only; national treasury verification is not connected.','শুধু স্থানীয় নমুনা রেকর্ড; জাতীয় ট্রেজারি যাচাই সংযুক্ত নেই।')} />
      )}

      {currentRoute.id === 'environmental-surcharge' && (
        <SurchargeTransferPanel key={`${taxpayer.tin}-${assessmentYear}`} onRecord={recordLocalSurcharge} />
      )}

      <section className="eledger-ait-records" aria-label={t('Recorded tax payments','রেকর্ডকৃত কর পরিশোধ')}>
        <InlineEditableTable key={currentRoute.id} entries={routeEntries} category="PAYMENT"
          routeId={currentRoute.id} defaultSection={currentRoute.statutorySection}
          onSaveNewEntry={handleSaveNewEntry} onUpdateEntry={handleUpdateEntry}
          onDeleteEntry={handleDeleteEntry}
          allowAdd={currentRoute.supportsManualEntry && currentRoute.id !== 'environmental-surcharge'}
          allowEditDelete={currentRoute.supportsManualEntry} />
      </section>
    </div>
  );
};
