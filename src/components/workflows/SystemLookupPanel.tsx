/**
 * System Lookup Panel Component
 * Supports Workflow Pattern #5: System Lookup (BRTA vehicle registry, A-Challan, etc.)
 * Strictly enforces Fail-Closed and Precedence rules:
 * - Rejects saving on TIN mismatch, not found, or service failure.
 * - Confirmed external lookup records take precedence.
 */

import React, { useState } from 'react';
import { useLedger } from '../../context/LedgerContext.tsx';
import { LedgerRouteId, TaxCategory, ExternalLookupResult } from '../../domain/models.ts';
import { externalLookupService } from '../../services/externalLookupService.ts';
import { validateExternalLookupMatch } from '../../domain/validation.ts';
import { formatCurrencyBDT } from '../../domain/calculations.ts';
import { Search, ShieldCheck, AlertOctagon, CheckCircle2 } from 'lucide-react';

interface SystemLookupPanelProps {
  routeId: LedgerRouteId;
  category: TaxCategory;
  defaultSection: string;
  lookupPlaceholder: string;
  helperText: string;
}

export const SystemLookupPanel: React.FC<SystemLookupPanelProps> = ({
  routeId,
  category,
  defaultSection,
  lookupPlaceholder,
  helperText,
}) => {
  const { taxpayer, assessmentYear, addEntry } = useLedger();
  const [referenceQuery, setReferenceQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [lookupResult, setLookupResult] = useState<ExternalLookupResult | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!referenceQuery.trim()) return;

    setIsSearching(true);
    setLookupResult(null);
    setValidationError(null);
    setSaveSuccess(null);

    try {
      const result = await externalLookupService.lookup({
        routeId,
        referenceNo: referenceQuery.trim(),
        expectedTin: taxpayer.tin,
        assessmentYear,
      });

      setLookupResult(result);

      // Validate according to fail-closed rules
      const validation = validateExternalLookupMatch(
        {
          routeId,
          referenceNo: referenceQuery.trim(),
          expectedTin: taxpayer.tin,
          assessmentYear,
        },
        result
      );

      if (!validation.canSave) {
        setValidationError(validation.reason || 'Verification rejected by revenue validation rules.');
      }
    } catch {
      setValidationError('External registry lookup encountered a fatal communication failure.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSaveToLedger = async () => {
    if (!lookupResult || !lookupResult.found) return;

    const res = await addEntry({
      taxpayerTin: taxpayer.tin,
      assessmentYear,
      category,
      routeId,
      referenceNo: lookupResult.referenceNo,
      sourceEntity: lookupResult.entityName,
      sectionCode: defaultSection,
      grossAmount: lookupResult.grossAmount,
      taxDeducted: lookupResult.taxAmount,
      date: lookupResult.paymentDate || new Date().toISOString().split('T')[0],
      status: 'VERIFIED',
      workflow: 'SYSTEM_LOOKUP',
      isManual: false,
      externalVerified: true,
      remarks: `Verified via ${lookupResult.verificationSource} Token: ${lookupResult.challanOrTokenNo}`,
    });

    if (res.success) {
      setSaveSuccess(`Verified record '${lookupResult.referenceNo}' successfully added to ledger.`);
      setLookupResult(null);
      setReferenceQuery('');
    } else {
      setValidationError(res.validation?.errors.referenceNo || 'Failed to save to ledger.');
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 mb-4 shadow-xs">
      <div className="pb-3 border-b border-slate-200">
        <div className="flex items-center space-x-2">
          <h4 className="text-xs sm:text-sm font-semibold text-slate-800">
            Official System Registry Lookup & Verification
          </h4>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
            Workflow: System Lookup
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">{helperText}</p>
      </div>

      <form onSubmit={handleLookup} className="mt-3 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={referenceQuery}
            onChange={(e) => setReferenceQuery(e.target.value)}
            placeholder={lookupPlaceholder}
            className="w-full text-xs sm:text-sm px-3 py-2 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={isSearching || !referenceQuery.trim()}
          className="inline-flex items-center justify-center space-x-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs sm:text-sm font-semibold shadow-xs transition-colors disabled:opacity-50"
        >
          <Search className="w-4 h-4" />
          <span>{isSearching ? 'Verifying...' : 'Verify Reference'}</span>
        </button>
      </form>

      {/* Suggested Reference Badges for Testing Convenience */}
      <div className="mt-2 text-[11px] text-slate-500 flex flex-wrap items-center gap-1.5">
        <span className="font-medium text-slate-600">Sample references:</span>
        <button
          type="button"
          onClick={() => setReferenceQuery('DHAKA-METRO-JA-11-2044')}
          className="underline hover:text-emerald-700 font-mono text-[11px]"
        >
          DHAKA-METRO-JA-11-2044 (Commercial)
        </button>
        <span>•</span>
        <button
          type="button"
          onClick={() => setReferenceQuery('DHAKA-METRO-GA-34-9182')}
          className="underline hover:text-emerald-700 font-mono text-[11px]"
        >
          DHAKA-METRO-GA-34-9182 (Private Car)
        </button>
        <span>•</span>
        <button
          type="button"
          onClick={() => setReferenceQuery('DHAKA-METRO-KHA-55-1212')}
          className="underline hover:text-rose-700 font-mono text-[11px]"
          title="Tests TIN mismatch rejection"
        >
          DHAKA-METRO-KHA-55-1212 (TIN Mismatch Test)
        </button>
      </div>

      {/* Success Notification */}
      {saveSuccess && (
        <div className="mt-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {/* Fail-Closed Rejection Notification */}
      {validationError && (
        <div className="mt-3 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start space-x-2">
          <AlertOctagon className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-rose-950">Verification Denied (Fail-Closed)</p>
            <p className="text-rose-800 text-[11px] mt-0.5">{validationError}</p>
          </div>
        </div>
      )}

      {/* Verified Record Preview */}
      {lookupResult && lookupResult.found && !validationError && (
        <div className="mt-3 p-4 rounded-lg bg-emerald-50/60 border border-emerald-300 transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span className="text-xs font-bold text-emerald-950">
                  Government Registry Record Verified
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 font-mono">
                  {lookupResult.verificationSource}
                </span>
              </div>
              <p className="text-xs text-slate-800 font-medium">
                {lookupResult.entityName}
              </p>
              <p className="text-[11px] text-slate-600 font-mono">
                Ref: {lookupResult.referenceNo} | Token: {lookupResult.challanOrTokenNo} | Date: {lookupResult.paymentDate}
              </p>
              <p className="text-[11px] text-emerald-800">
                {lookupResult.statusMessage}
              </p>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 border-t sm:border-t-0 pt-2 sm:pt-0 border-emerald-200">
              <div className="text-right">
                <span className="text-[10px] text-slate-500 block uppercase">Verified Tax</span>
                <span className="text-sm font-bold font-mono text-emerald-900">
                  {formatCurrencyBDT(lookupResult.taxAmount)}
                </span>
              </div>
              <button
                type="button"
                onClick={handleSaveToLedger}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-semibold shadow-xs transition-colors"
              >
                Add Verified Record to Ledger
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
