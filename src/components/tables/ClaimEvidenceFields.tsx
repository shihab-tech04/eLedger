import React from 'react';
import { ClaimEvidence, LedgerRouteId } from '../../domain/models.ts';
import { getClaimEvidenceFields } from '../../domain/claimEvidence.ts';

interface ClaimEvidenceFieldsProps {
  routeId: LedgerRouteId;
  evidence: ClaimEvidence;
  onChange: (next: ClaimEvidence) => void;
}

export const ClaimEvidenceFields: React.FC<ClaimEvidenceFieldsProps> = ({ routeId, evidence, onChange }) => {
  const fields = getClaimEvidenceFields(routeId);
  if (!fields.length) return null;

  return (
    <div className="bg-white/80 border border-emerald-200 rounded-md p-3">
      <p className="text-xs font-semibold text-emerald-950 mb-2">Supporting claim / challan details</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {fields.map(({ key, label, kind, options, helperText }) => (
          <label key={key} className="block text-xs font-medium text-slate-700">
            <span className="block mb-1">{label}</span>
            {kind === 'select' ? (
              <select
                aria-label={label}
                value={String(evidence[key] ?? '')}
                onChange={(event) => onChange({ ...evidence, [key]: event.target.value || undefined })}
                className="w-full text-xs px-2 py-1.5 bg-white border border-slate-300 rounded focus:border-emerald-600 outline-none"
              >
                {options?.map(({ value, label: optionLabel }) => <option key={value} value={value}>{optionLabel}</option>)}
              </select>
            ) : (
              <input
                aria-label={label}
                type={kind}
                min={kind === 'number' ? 0 : undefined}
                step={kind === 'number' ? 'any' : undefined}
                maxLength={kind === 'text' ? 250 : undefined}
                value={evidence[key] ?? ''}
                onChange={(event) => onChange({
                  ...evidence,
                  [key]: kind === 'number'
                    ? event.target.value === '' ? undefined : Number(event.target.value)
                    : event.target.value || undefined,
                })}
                className="w-full text-xs px-2 py-1.5 bg-white border border-slate-300 rounded focus:border-emerald-600 outline-none"
              />
            )}
            {helperText && <span className="block text-[11px] font-normal text-slate-500 mt-1">{helperText}</span>}
          </label>
        ))}
      </div>
    </div>
  );
};

export const ClaimEvidenceSummary: React.FC<{ routeId: LedgerRouteId; evidence?: ClaimEvidence }> = ({ routeId, evidence }) => {
  if (!evidence) return null;
  const values = getClaimEvidenceFields(routeId).flatMap(({ key, label }) => {
    const value = evidence[key];
    return value === undefined || value === '' ? [] : [{ label, value }];
  });
  if (!values.length) return null;

  return (
    <details className="mt-1 text-[11px] text-slate-600 max-w-xs">
      <summary className="cursor-pointer text-emerald-800">Claim evidence ({values.length} fields)</summary>
      <dl className="pt-1 space-y-1">
        {values.map(({ label, value }) => (
          <div key={label}>
            <dt className="font-semibold text-slate-600">{label}</dt>
            <dd className="break-all">{value}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
};
