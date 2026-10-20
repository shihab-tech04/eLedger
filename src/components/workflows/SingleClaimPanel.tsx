/**
 * Single Claim Workflow Panel
 * Supports Workflow Pattern #7: Single Claim
 * Used for the prior-year Section 163 carry-forward tax adjustment.
 */

import React, { useEffect, useState } from 'react';
import { useLedger } from '../../context/LedgerContext.tsx';
import { useLedgerCopy } from '../../context/LanguageContext.tsx';
import { LedgerEntry } from '../../domain/models.ts';
import { formatCurrencyBDT } from '../../domain/calculations.ts';
import { CARRY_FORWARD_CLASSIFICATIONS, getPriorAssessmentYears, readCarryForwardDetails } from '../../domain/carryForward.ts';
import { localDateInputValue } from '../../domain/localDate.ts';
import { CheckCircle2, AlertCircle, Pencil, Plus } from 'lucide-react';
import { LedgerFormModal } from '../ui/LedgerFormModal.tsx';
import { LedgerInput, LedgerSelect } from '../ui/LedgerForm.tsx';

interface SingleClaimPanelProps {
  existingClaim?: LedgerEntry;
}

export const SingleClaimPanel: React.FC<SingleClaimPanelProps> = ({ existingClaim }) => {
  const t = useLedgerCopy();
  const { taxpayer, assessmentYear, addEntry, updateEntry } = useLedger();
  const priorYearOptions = getPriorAssessmentYears(assessmentYear);
  const existingDetails = readCarryForwardDetails(existingClaim?.remarks, assessmentYear);
  const [priorAssessmentYear, setPriorAssessmentYear] = useState(existingDetails.priorAssessmentYear);
  const [assessmentOrderNo, setAssessmentOrderNo] = useState(
    existingClaim ? existingClaim.referenceNo : ''
  );
  const [assessingCircle, setAssessingCircle] = useState(
    existingClaim ? existingClaim.sourceEntity : ''
  );
  const [unabsorbedCredit, setUnabsorbedCredit] = useState(
    existingClaim ? existingClaim.taxDeducted.toString() : ''
  );
  const [lossOrCreditType, setLossOrCreditType] = useState(existingDetails.classification);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  // The first saved claim or a deleted claim changes this panel from create to
  // edit (or back) without changing routes. Keep fields in the correct mode.
  useEffect(() => {
    const details = readCarryForwardDetails(existingClaim?.remarks, assessmentYear);
    setPriorAssessmentYear(details.priorAssessmentYear);
    setAssessmentOrderNo(existingClaim?.referenceNo ?? '');
    setAssessingCircle(existingClaim?.sourceEntity ?? '');
    setUnabsorbedCredit(existingClaim ? String(existingClaim.taxDeducted) : '');
    setLossOrCreditType(details.classification);
  }, [existingClaim?.id, assessmentYear, taxpayer.tin]);

  const handleSaveClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const amount = Number(unabsorbedCredit);
    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage({ type: 'error', text: t('Please enter a valid unabsorbed credit amount greater than 0.','শূন্যের বেশি বৈধ অব্যবহৃত ক্রেডিটের অঙ্ক লিখুন।') });
      return;
    }
    if (!priorYearOptions.includes(priorAssessmentYear)) {
      setMessage({ type: 'error', text: t('The origin assessment year must precede the selected assessment year.','মূল করবর্ষ নির্বাচিত করবর্ষের আগের হতে হবে।') });
      return;
    }
    if (!assessmentOrderNo.trim()) {
      setMessage({ type: 'error', text: t('Prior Assessment Order / IT-30 Form reference is required.','পূর্ববর্তী কর নির্ধারণ আদেশ / IT-30 ফর্ম রেফারেন্স প্রয়োজন।') });
      return;
    }

    if (existingClaim) {
      const res = await updateEntry(existingClaim.id, {
        referenceNo: assessmentOrderNo.trim(),
        sourceEntity: assessingCircle.trim(),
        grossAmount: amount,
        taxDeducted: amount,
        remarks: `Prior Year: ${priorAssessmentYear} | Type: ${lossOrCreditType}`,
      });
      if (res.success) {
        setMessage({ type: 'success', text: t('Carry-forward claim updated successfully.','পূর্ববর্তী কর সমন্বয় সফলভাবে হালনাগাদ হয়েছে।') });
        setFormOpen(false);
      } else {
        setMessage({ type: 'error', text: Object.values(res.validation?.errors || {})[0] || 'Failed to update claim.' });
      }
    } else {
      const res = await addEntry({
        taxpayerTin: taxpayer.tin,
        assessmentYear,
        category: 'ADJUSTMENT',
        routeId: 'carry-forward',
        referenceNo: assessmentOrderNo.trim(),
        sourceEntity: assessingCircle.trim(),
        sectionCode: 'Sec 163',
        grossAmount: amount,
        taxDeducted: amount,
        date: localDateInputValue(),
        status: 'PENDING_VERIFICATION',
        workflow: 'SINGLE_CLAIM',
        isManual: true,
        externalVerified: false,
        remarks: `Prior Year: ${priorAssessmentYear} | Type: ${lossOrCreditType}`,
      });
      if (res.success) {
        setMessage({ type: 'success', text: t('Carry-forward claim recorded successfully into ledger.','পূর্ববর্তী কর সমন্বয় সফলভাবে লেজারে রেকর্ড হয়েছে।') });
        setFormOpen(false);
      } else {
        setMessage({ type: 'error', text: Object.values(res.validation?.errors || {})[0] || 'Failed to record claim.' });
      }
    }
  };

  return (
    <section className="eledger-panel eledger-claim-summary mb-4">
      <div className="eledger-ledger-toolbar">
        <h2>{t('Carry-forward adjustment · Section 163','পূর্ববর্তী কর সমন্বয় · ধারা ১৬৩')}</h2>
        <button type="button" className="eledger-button eledger-button-primary" onClick={() => { setMessage(null); setFormOpen(true); }}>
          {existingClaim ? <Pencil size={16}/> : <Plus size={16}/>}
          {existingClaim ? t('Edit claim','দাবি সম্পাদনা') : t('Add Entry','রেকর্ড যোগ করুন')}
        </button>
      </div>

      {message?.type === 'success' && (
        <div
          className={`mt-3 p-3 rounded-lg text-xs flex items-center space-x-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <div className="eledger-claim-summary-content">
        {existingClaim ? <><span>{existingClaim.referenceNo}</span><strong>{formatCurrencyBDT(existingClaim.taxDeducted)}</strong></>
          : <p>{t('No carry-forward claim recorded.','কোনো পূর্ববর্তী কর সমন্বয় রেকর্ড নেই।')}</p>}
      </div>
      {formOpen && <LedgerFormModal title={existingClaim ? t('Edit claim','দাবি সম্পাদনা') : t('Add Entry','রেকর্ড যোগ করুন')} onClose={() => setFormOpen(false)}>
      {message?.type === 'error' && <p role="alert" className="eledger-claim-modal-error">{message.text}</p>}
      <form onSubmit={handleSaveClaim} className="eledger-form-grid eledger-single-claim-form">
        <LedgerSelect id="carry-prior-year" label={t('Prior Assessment Year of Origin','পূর্ববর্তী করবর্ষ')}
          value={priorAssessmentYear} onValueChange={setPriorAssessmentYear}>
            {priorYearOptions.map((year, index) => (
              <option key={year} value={year}>
                {year}{index === 0 ? t(' (Immediately Preceding Year)',' (অবিলম্বে পূর্ববর্তী বছর)') : ''}
              </option>
            ))}
        </LedgerSelect>

        <LedgerSelect id="carry-classification" label={t('Credit / Adjustment Classification','ক্রেডিট / সমন্বয়ের ধরন')}
          value={lossOrCreditType} onValueChange={setLossOrCreditType}>
            {(existingClaim ? CARRY_FORWARD_CLASSIFICATIONS : CARRY_FORWARD_CLASSIFICATIONS.slice(0, 1)).map((classification) => (
              <option key={classification} value={classification}>{classification === 'Unabsorbed Minimum Tax Credit (Sec 163)' ? t(classification,'অব্যবহৃত ন্যূনতম কর ক্রেডিট (ধারা ১৬৩)') : classification}</option>
            ))}
        </LedgerSelect>

        <LedgerInput id="carry-order" label={t('Assessment Order / Demand Notice Reference No','কর নির্ধারণ আদেশ / দাবি নোটিশের রেফারেন্স নম্বর')}
          value={assessmentOrderNo} onValueChange={setAssessmentOrderNo}
          placeholder="e.g. CIR-015/ORD/2025-781" required />

        <LedgerInput id="carry-circle" label={t('Assessing Officer / Circle Name','কর নির্ধারণকারী কর্মকর্তা / সার্কেলের নাম')}
          value={assessingCircle} onValueChange={setAssessingCircle}
          placeholder="Circle-015, Taxes Zone-08" required />

        <div className="eledger-full-row">
          <LedgerInput id="carry-credit" label={t('Claimable Credit Amount (৳)','দাবিযোগ্য ক্রেডিটের অঙ্ক (৳)')}
            type="number" value={unabsorbedCredit} onValueChange={setUnabsorbedCredit}
            placeholder="0.00" min="1" step="any" className="is-number" required />
        </div>

        <div className="eledger-full-row eledger-form-actions">
          <button type="button" className="eledger-button eledger-button-secondary" onClick={() => setFormOpen(false)}>
            {t('Cancel','বাতিল')}
          </button>
          <button
            type="submit"
            className="eledger-button eledger-button-primary"
          >
            {existingClaim ? t('Update Carry-Forward Claim','পূর্ববর্তী কর সমন্বয় হালনাগাদ করুন') : t('Save Carry-Forward Claim','পূর্ববর্তী কর সমন্বয় সংরক্ষণ করুন')}
          </button>
        </div>
      </form>
      </LedgerFormModal>}
    </section>
  );
};
