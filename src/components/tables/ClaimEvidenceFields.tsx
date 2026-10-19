import React from 'react';
import { ClaimEvidence, LedgerRouteId } from '../../domain/models.ts';
import { getClaimEvidenceFields } from '../../domain/claimEvidence.ts';
import { useLedgerCopy, useLedgerLanguage } from '../../context/LanguageContext.tsx';

const bengaliEvidenceNames: Partial<Record<keyof ClaimEvidence, string>> = {
  paymentDocumentType: 'পরিশোধ দলিলের ধরন', documentAmount: 'চালান / সনদের মোট অঙ্ক (৳)',
  depositingAuthority: 'জমাদানকারী কর্তৃপক্ষ', bankName: 'ব্যাংকের নাম', branchName: 'শাখার নাম',
  paymentMode: 'পরিশোধ পদ্ধতি', taxZone: 'কর অঞ্চল', taxCircle: 'কর সার্কেল',
  paymentPurpose: 'পরিশোধের উদ্দেশ্য / বিবরণ', attachmentFileName: 'প্রমাণ ফাইলের নাম (শুধু রেফারেন্স)',
  savingsScheme: 'সঞ্চয় প্রকল্প', savingsRegistration: 'নিবন্ধন / সনদ নম্বর', savingsIssueDate: 'সনদ ইস্যুর তারিখ',
};

interface ClaimEvidenceFieldsProps {
  routeId: LedgerRouteId;
  evidence: ClaimEvidence;
  onChange: (next: ClaimEvidence) => void;
}

export const ClaimEvidenceFields: React.FC<ClaimEvidenceFieldsProps> = ({ routeId, evidence, onChange }) => {
  const t = useLedgerCopy();
  const { language } = useLedgerLanguage();
  const fieldName = (key: keyof ClaimEvidence, label: string) => language === 'bn' ? bengaliEvidenceNames[key] ?? label : label;
  const fields = getClaimEvidenceFields(routeId);
  if (!fields.length) return null;

  return (
    <div className="bg-white/80 border border-emerald-200 rounded-md p-3">
      <p className="text-xs font-semibold text-emerald-950 mb-2">{t('Supporting claim / challan details','দাবি / চালানের সহায়ক তথ্য')}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {fields.map(({ key, label, kind, options, helperText }) => (
          <label key={key} className="block text-xs font-medium text-slate-700">
            <span className="block mb-1">{fieldName(key, label)}</span>
            {kind === 'select' ? (
              <select
                aria-label={fieldName(key, label)}
                value={String(evidence[key] ?? '')}
                onChange={(event) => onChange({ ...evidence, [key]: event.target.value || undefined })}
                className="w-full text-xs px-2 py-1.5 bg-white border border-slate-300 rounded focus:border-emerald-600 outline-none"
              >
                {options?.map(({ value, label: optionLabel }) => <option key={value} value={value}>{language === 'bn' ? ({'': 'দলিলের ধরন বাছুন', CHALLAN: 'চালান', CERTIFICATE: 'সনদ', OTHER: 'অন্যান্য'} as Record<string,string>)[value] ?? optionLabel : optionLabel}</option>)}
              </select>
            ) : (
              <input
                aria-label={fieldName(key, label)}
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
            {helperText && <span className="block text-[11px] font-normal text-slate-500 mt-1">{language === 'bn'
              ? key === 'documentAmount' ? 'দলিলে উল্লেখিত মোট অঙ্ক দাবিকৃত অঙ্কের চেয়ে বেশি হতে পারে।' : 'এই ফাইলটি স্থানীয় অ্যাপে আপলোড বা সংরক্ষণ করা হয় না।'
              : helperText}</span>}
          </label>
        ))}
      </div>
    </div>
  );
};

export const ClaimEvidenceSummary: React.FC<{ routeId: LedgerRouteId; evidence?: ClaimEvidence }> = ({ routeId, evidence }) => {
  const t = useLedgerCopy();
  const { language } = useLedgerLanguage();
  if (!evidence) return null;
  const values = getClaimEvidenceFields(routeId).flatMap(({ key, label }) => {
    const value = evidence[key];
    return value === undefined || value === '' ? [] : [{ label: language === 'bn' ? bengaliEvidenceNames[key] ?? label : label, value }];
  });
  if (!values.length) return null;

  return (
    <details className="mt-1 text-[11px] text-slate-600 max-w-xs">
      <summary className="cursor-pointer text-emerald-800">{t('Claim evidence','দাবির প্রমাণ')} ({values.length} {t('fields','তথ্য')})</summary>
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
