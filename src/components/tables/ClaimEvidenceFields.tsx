import React, { useState } from 'react';
import { ClaimEvidence, LedgerRouteId } from '../../domain/models.ts';
import { getClaimEvidenceFields } from '../../domain/claimEvidence.ts';
import { useLedgerCopy, useLedgerLanguage } from '../../context/LanguageContext.tsx';
import { LedgerInput, LedgerSelect, LedgerTip } from '../ui/LedgerForm.tsx';

const bengaliEvidenceNames: Partial<Record<keyof ClaimEvidence, string>> = {
  paymentDocumentType: 'পরিশোধ দলিলের ধরন', documentAmount: 'চালান / সনদের মোট অঙ্ক (৳)',
  depositingAuthority: 'জমাদানকারী কর্তৃপক্ষ', bankName: 'ব্যাংকের নাম', branchName: 'শাখার নাম',
  paymentMode: 'পরিশোধ পদ্ধতি', taxZone: 'কর অঞ্চল', taxCircle: 'কর সার্কেল',
  paymentPurpose: 'পরিশোধের উদ্দেশ্য / বিবরণ', attachmentFileName: 'প্রমাণ ফাইলের নাম (শুধু রেফারেন্স)',
  savingsScheme: 'সঞ্চয় প্রকল্প', savingsRegistration: 'নিবন্ধন / সনদ নম্বর', savingsIssueDate: 'সনদ ইস্যুর তারিখ',
  accountType: 'হিসাবের ধরন', accountNumber: 'হিসাব নম্বর',
  registrationNo: 'যানবাহনের নিবন্ধন নম্বর', chassisNo: 'চ্যাসিস নম্বর',
  customsBin: 'বিআইএন', customsOfficeCode: 'কাস্টমস অফিস কোড',
  receiptNo: 'রসিদ নম্বর', receiptDate: 'রসিদের তারিখ',
  invoiceValue: 'ইনভয়েস মূল্য (৳)', totalTaxAndDuties: 'মোট কর ও শুল্ক (৳)',
  refundAssessmentYear: 'ফেরতের করবর্ষ', returnFilingZone: 'রিটার্ন দাখিলের কর অঞ্চল',
  returnFilingCircle: 'রিটার্ন দাখিলের সার্কেল',
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
  const savedEvidenceCount = fields.filter(({ key }) => evidence[key] !== undefined && evidence[key] !== '').length;
  const [expanded, setExpanded] = useState(savedEvidenceCount > 0);
  if (!fields.length) return null;

  return (
    <details className="eledger-evidence-fields border rounded-md p-3" open={expanded}
      onToggle={(event) => setExpanded(event.currentTarget.open)}>
      <summary className="eledger-evidence-summary">
        <span>{t('Supporting document details','সহায়ক দলিলের তথ্য')}{savedEvidenceCount > 0 ? ` (${savedEvidenceCount})` : ''}</span>
        <span className="eledger-evidence-summary-hint">{t('Optional','ঐচ্ছিক')}</span>
      </summary>
      <div className="eledger-form-grid">
        {fields.map(({ key, label, kind, options, helperText }) => (
          <div key={key} className="min-w-0">
            {kind === 'select' ? (
              <LedgerSelect label={fieldName(key, label)}
                value={String(evidence[key] ?? '')}
                onValueChange={(value) => onChange({ ...evidence, [key]: value || undefined })}
              >
                {options?.map(({ value, label: optionLabel }) => <option key={value} value={value}>{language === 'bn' ? ({'': 'দলিলের ধরন বাছুন', CHALLAN: 'চালান', CERTIFICATE: 'সনদ', OTHER: 'অন্যান্য'} as Record<string,string>)[value] ?? optionLabel : optionLabel}</option>)}
              </LedgerSelect>
            ) : (
              <LedgerInput label={fieldName(key, label)}
                type={kind}
                min={kind === 'number' ? 0 : undefined}
                step={kind === 'number' ? 'any' : undefined}
                maxLength={kind === 'text' ? 250 : undefined}
                value={evidence[key] ?? ''}
                onValueChange={(value) => onChange({
                  ...evidence,
                  [key]: kind === 'number'
                    ? value === '' ? undefined : Number(value)
                    : value || undefined,
                })}
              />
            )}
            {helperText && <LedgerTip label={t('Help','সহায়তা')}>{language === 'bn'
              ? key === 'documentAmount' ? 'দলিলে উল্লেখিত মোট অঙ্ক দাবিকৃত অঙ্কের চেয়ে বেশি হতে পারে।' : 'এই ফাইলটি স্থানীয় অ্যাপে আপলোড বা সংরক্ষণ করা হয় না।'
              : helperText}</LedgerTip>}
          </div>
        ))}
      </div>
    </details>
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
    <details className="mt-1 text-xs text-slate-600 max-w-xs">
      <summary className="cursor-pointer text-sky-800">{t('Claim evidence','দাবির প্রমাণ')} ({values.length} {t('fields','তথ্য')})</summary>
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
