/**
 * Single Claim Workflow Panel
 * Supports Workflow Pattern #7: Single Claim
 * Used for Carry-Forward / Prior-Return adjustments (Sec 70 / 215)
 */

import React, { useEffect, useState } from 'react';
import { useLedger } from '../../context/LedgerContext.tsx';
import { LedgerEntry } from '../../domain/models.ts';
import { formatCurrencyBDT } from '../../domain/calculations.ts';
import { CARRY_FORWARD_CLASSIFICATIONS, getPriorAssessmentYears, readCarryForwardDetails } from '../../domain/carryForward.ts';
import { SlidersHorizontal, CheckCircle2, AlertCircle } from 'lucide-react';

interface SingleClaimPanelProps {
  existingClaim?: LedgerEntry;
}

export const SingleClaimPanel: React.FC<SingleClaimPanelProps> = ({ existingClaim }) => {
  const { taxpayer, assessmentYear, addEntry, updateEntry } = useLedger();
  const priorYearOptions = getPriorAssessmentYears(assessmentYear);
  const existingDetails = readCarryForwardDetails(existingClaim?.remarks, assessmentYear);
  const [priorAssessmentYear, setPriorAssessmentYear] = useState(existingDetails.priorAssessmentYear);
  const [assessmentOrderNo, setAssessmentOrderNo] = useState(
    existingClaim ? existingClaim.referenceNo : ''
  );
  const [assessingCircle, setAssessingCircle] = useState(
    existingClaim ? existingClaim.sourceEntity : `${taxpayer.circle}, ${taxpayer.taxesZone}`
  );
  const [unabsorbedCredit, setUnabsorbedCredit] = useState(
    existingClaim ? existingClaim.taxDeducted.toString() : ''
  );
  const [lossOrCreditType, setLossOrCreditType] = useState(existingDetails.classification);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // The first saved claim or a deleted claim changes this panel from create to
  // edit (or back) without changing routes. Keep fields in the correct mode.
  useEffect(() => {
    const details = readCarryForwardDetails(existingClaim?.remarks, assessmentYear);
    setPriorAssessmentYear(details.priorAssessmentYear);
    setAssessmentOrderNo(existingClaim?.referenceNo ?? '');
    setAssessingCircle(existingClaim?.sourceEntity ?? `${taxpayer.circle}, ${taxpayer.taxesZone}`);
    setUnabsorbedCredit(existingClaim ? String(existingClaim.taxDeducted) : '');
    setLossOrCreditType(details.classification);
  }, [existingClaim?.id, assessmentYear, taxpayer.circle, taxpayer.taxesZone]);

  const handleSaveClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const amount = Number(unabsorbedCredit);
    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid unabsorbed credit amount greater than 0.' });
      return;
    }
    if (!priorYearOptions.includes(priorAssessmentYear)) {
      setMessage({ type: 'error', text: 'The origin assessment year must precede the selected assessment year.' });
      return;
    }
    if (!assessmentOrderNo.trim()) {
      setMessage({ type: 'error', text: 'Prior Assessment Order / IT-30 Form reference is required.' });
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
        setMessage({ type: 'success', text: 'Carry-forward claim updated successfully.' });
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
        sectionCode: 'Sec 70/215',
        grossAmount: amount,
        taxDeducted: amount,
        date: new Date().toISOString().split('T')[0],
        status: 'PENDING_VERIFICATION',
        workflow: 'SINGLE_CLAIM',
        isManual: true,
        externalVerified: false,
        remarks: `Prior Year: ${priorAssessmentYear} | Type: ${lossOrCreditType}`,
      });
      if (res.success) {
        setMessage({ type: 'success', text: 'Carry-forward claim recorded successfully into ledger.' });
      } else {
        setMessage({ type: 'error', text: Object.values(res.validation?.errors || {})[0] || 'Failed to record claim.' });
      }
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs mb-4">
      <div className="pb-3 border-b border-slate-200">
        <div className="flex items-center space-x-2">
          <SlidersHorizontal className="w-4 h-4 text-emerald-700" />
          <h4 className="text-sm font-semibold text-slate-800">
            Single Claim Workflow: Prior-Return Carry-Forward Adjustment
          </h4>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
            Statutory Rule: Sec 70 / 215
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          Adjust unabsorbed minimum tax credits or verified business loss carry-forward determined in prior assessment orders.
        </p>
      </div>

      {message && (
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

      <form onSubmit={handleSaveClaim} className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Prior Assessment Year of Origin
          </label>
          <select
            value={priorAssessmentYear}
            onChange={(e) => setPriorAssessmentYear(e.target.value)}
            className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:border-emerald-600 outline-none"
          >
            {priorYearOptions.map((year, index) => (
              <option key={year} value={year}>
                {year}{index === 0 ? ' (Immediately Preceding Year)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Credit / Adjustment Classification
          </label>
          <select
            value={lossOrCreditType}
            onChange={(e) => setLossOrCreditType(e.target.value)}
            className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:border-emerald-600 outline-none"
          >
            {CARRY_FORWARD_CLASSIFICATIONS.map((classification) => (
              <option key={classification} value={classification}>{classification}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Assessment Order / Demand Notice Reference No
          </label>
          <input
            type="text"
            value={assessmentOrderNo}
            onChange={(e) => setAssessmentOrderNo(e.target.value)}
            placeholder="e.g. CIR-015/ORD/2025-781"
            className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:border-emerald-600 outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Assessing Officer / Circle Name
          </label>
          <input
            type="text"
            value={assessingCircle}
            onChange={(e) => setAssessingCircle(e.target.value)}
            placeholder="Circle-015, Taxes Zone-08"
            className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:border-emerald-600 outline-none"
            required
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Claimable Credit Amount (৳)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-xs font-bold text-slate-500">৳</span>
            <input
              type="number"
              value={unabsorbedCredit}
              onChange={(e) => setUnabsorbedCredit(e.target.value)}
              placeholder="0.00"
              min="1"
              step="any"
              className="w-full text-xs pl-8 pr-3 py-2 font-mono font-semibold bg-slate-50 border border-slate-300 rounded focus:bg-white focus:border-emerald-600 outline-none"
              required
            />
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Subject to statutory limitation rules under Income Tax Act 2023.
          </span>
        </div>

        <div className="sm:col-span-2 flex items-center justify-between pt-2">
          <div className="text-xs text-slate-600">
            {existingClaim ? (
              <span>Currently Recorded: <strong>{formatCurrencyBDT(existingClaim.taxDeducted)}</strong></span>
            ) : (
              <span>No carry-forward claim currently registered for AY {assessmentYear}.</span>
            )}
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-semibold shadow-xs transition-colors"
          >
            {existingClaim ? 'Update Carry-Forward Claim' : 'Save Carry-Forward Claim'}
          </button>
        </div>
      </form>
    </div>
  );
};
