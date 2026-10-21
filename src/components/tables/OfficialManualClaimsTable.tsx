import React, { useState } from 'react';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import type { ClaimEvidence, LedgerEntry, LedgerRouteId } from '../../domain/models.ts';
import { LTU_SECTIONS, OTHER_TDS_PURPOSES, REFUND_TAX_ZONES, observedDocumentTypeForEdit } from '../../domain/officialLedgerFields.ts';
import { refundCirclesForZone } from '../../domain/refundCircleOptions.ts';
import { normalizeClaimEvidence } from '../../domain/claimEvidence.ts';
import { validateDocumentClaimDraft, documentClaimIssueText, type DocumentClaimField, type DocumentClaimIssues, type DocumentClaimIssue } from '../../domain/documentClaimValidation.ts';
import { validateLtuAdd, validateRefundAdd, type ManualAddIssue } from '../../domain/manualAddValidation.ts';
import { localDateInputValue } from '../../domain/localDate.ts';
import { resolveLtuRecordedDate } from '../../domain/ltuRecordDate.ts';
import { useLedgerCopy } from '../../context/LanguageContext.tsx';
import { LedgerInput, LedgerSelect } from '../ui/LedgerForm.tsx';
import { LedgerFormGrid } from '../ui/LedgerPage.tsx';
import { LedgerFormModal } from '../ui/LedgerFormModal.tsx';

type ManualRoute = Extract<LedgerRouteId, 'service-payment' | 'other-tds' | 'source-ltu' | 'refund'>;
type Draft = {
  authority: string;
  documentType: string;
  reference: string;
  date: string;
  total: string;
  claim: string;
  purpose: string;
  assessmentYear: string;
  zone: string;
  circle: string;
  description: string;
  fileName: string;
  section: string;
};
type Payload = {
  referenceNo: string; sourceEntity: string; sectionCode: string; grossAmount: number;
  taxDeducted: number; date: string; claimEvidence?: ClaimEvidence;
};
interface Props {
  entries: LedgerEntry[];
  routeId: ManualRoute;
  defaultSection: string;
  assessmentYear: string;
  onSaveNewEntry: (payload: Payload) => Promise<{ success: boolean; error?: string }>;
  onUpdateEntry: (id: string, patch: Partial<LedgerEntry>) => Promise<{ success: boolean; error?: string }>;
  onDeleteEntry: (id: string) => Promise<boolean>;
}

const blank = (routeId: ManualRoute, ay: string): Draft => ({
  authority: '', documentType: routeId === 'service-payment' ? '' : 'CHALLAN',
  reference: '', date: '', total: '', claim: '', purpose: '',
  assessmentYear: `${Number(ay.slice(0, 4)) - 1}-${Number(ay.slice(0, 4))}`,
  zone: '', circle: '', description: '', fileName: '', section: '',
});
const money = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
const dateLabel = (iso: string) => /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso.split('-').reverse().join('-') : iso;
export const hasUnsupportedLegacyDocumentType = (entry: LedgerEntry, routeId: ManualRoute): boolean =>
  (routeId === 'service-payment' || routeId === 'other-tds') &&
  entry.claimEvidence?.paymentDocumentType === 'OTHER';
const cols: Record<ManualRoute, string[]> = {
  'service-payment': ['SL.', 'Depositing Authority', 'Payment Document Type', 'Challan/ Certificate Reference No.', 'Challan/ Certificate Date', 'Challan/ Certificate Amount', 'Claimed Amount', 'Action'],
  'other-tds': ['SL.', 'Purpose of the Payment', 'Depositing Authority', 'Payment Document Type', 'Challan/ Certificate Reference No.', 'Challan/ Certificate Date', 'Challan/ Certificate Amount', 'Claimed Amount', 'Action'],
  'source-ltu': ['SL.', 'Section', 'Claim Amount', 'Challan No', 'Action'],
  refund: ['SL.', 'Assessment Year', 'Return Register No. / Reference No.', 'Date of Submission', 'Return Filing Zone', 'Return Filing Circle', 'Refund Amount', 'Adjustment Claim Amount', 'Action'],
};

const fromEntry = (entry: LedgerEntry, routeId: ManualRoute, ay: string): Draft => ({
  ...blank(routeId, ay),
  authority: entry.claimEvidence?.depositingAuthority ?? entry.sourceEntity,
  documentType: observedDocumentTypeForEdit(entry.claimEvidence),
  reference: entry.referenceNo,
  date: entry.date,
  total: String(entry.claimEvidence?.documentAmount ?? entry.grossAmount),
  claim: String(entry.taxDeducted),
  purpose: entry.claimEvidence?.paymentPurpose ?? '',
  section: entry.sectionCode,
  description: entry.claimEvidence?.paymentPurpose ?? '',
  fileName: entry.claimEvidence?.attachmentFileName ?? '',
  assessmentYear: entry.claimEvidence?.refundAssessmentYear ?? blank(routeId, ay).assessmentYear,
  zone: entry.claimEvidence?.returnFilingZone ?? '',
  circle: entry.claimEvidence?.returnFilingCircle ?? '',
});

type ManualFieldIssues = Partial<Record<keyof Draft | DocumentClaimField, ManualAddIssue | DocumentClaimIssue>>;

/** Clear only the edited field's error; preserve unrelated required/invalid errors.
 * An amount ceiling error may be reconsidered when its supporting total changes.
 * This is UI state handling only: validation still runs again on Save.
 */
export function clearManualFieldIssueAfterEdit(
  routeId: ManualRoute, issues: ManualFieldIssues, name: keyof Draft,
): ManualFieldIssues {
  const next = { ...issues };
  const isDocumentRoute = routeId === 'service-payment' || routeId === 'other-tds';
  const key = isDocumentRoute && name === 'total' ? 'documentAmount'
    : isDocumentRoute && name === 'claim' ? 'claimedAmount' : name;
  delete next[key];

  if (name === 'total') {
    if (isDocumentRoute && next.claimedAmount === 'exceedsDocument') delete next.claimedAmount;
    if (routeId === 'refund' && next.claim === 'exceedsSupportingAmount') delete next.claim;
  }
  return next;
}

export const OfficialManualClaimsTable: React.FC<Props> = ({
  entries, routeId, defaultSection, assessmentYear, onSaveNewEntry, onUpdateEntry, onDeleteEntry,
}) => {
  const t = useLedgerCopy();
  const [active, setActive] = useState<string | 'new' | null>(null);
  const [draft, setDraft] = useState<Draft>(() => blank(routeId, assessmentYear));
  const [error, setError] = useState<string | null>(null);
  const [fieldIssues, setFieldIssues] = useState<ManualFieldIssues>({});
  const [saving, setSaving] = useState(false);
  const change = (name: keyof Draft, value: string) => {
    setDraft((prev) => ({ ...prev, [name]: value }));
    setFieldIssues((prev) => clearManualFieldIssueAfterEdit(routeId, prev, name));
  };
  const fieldError = (field: keyof Draft | DocumentClaimField): string | undefined => {
    const issue = fieldIssues[field];
    if (issue === 'invalidCircle') return t('Select a Circle in the selected Tax Zone', 'নির্বাচিত কর অঞ্চলের সার্কেল দিন');
    if (issue === 'exceedsSupportingAmount') return t('Cannot exceed refund amount', 'ফেরতের অঙ্কের বেশি নয়');
    return documentClaimIssueText(issue, t);
  };
  const cancel = () => { setActive(null); setFieldIssues({}); setError(null); };
  const openNew = () => { setDraft(blank(routeId, assessmentYear)); setFieldIssues({}); setError(null); setActive('new'); };
  const openEdit = (entry: LedgerEntry) => {
    if (hasUnsupportedLegacyDocumentType(entry, routeId)) {
      setError(t('This older record uses a document type absent from the current form; it was preserved unchanged.',
        'পুরোনো রেকর্ডের দলিলের ধরন বর্তমান ফরমে নেই; রেকর্ডটি অপরিবর্তিত রাখা হয়েছে।'));
      return;
    }
    setDraft(fromEntry(entry, routeId, assessmentYear)); setFieldIssues({}); setError(null); setActive(entry.id);
  };

  const buildPayload = (): Payload | null => {
    if (routeId === 'source-ltu' || routeId === 'refund') {
      const issues = routeId === 'source-ltu' ? validateLtuAdd(draft) : validateRefundAdd(draft);
      setFieldIssues(issues);
      if (Object.keys(issues).length > 0) return null;
    }
    if (routeId === 'service-payment' || routeId === 'other-tds') {
      const issues: DocumentClaimIssues & { purpose?: DocumentClaimIssue } = validateDocumentClaimDraft({
        authority: draft.authority,
        documentType: draft.documentType,
        reference: draft.reference,
        date: draft.date,
        documentAmount: draft.total,
        claimedAmount: draft.claim,
      });
      if (routeId === 'other-tds' &&
          !OTHER_TDS_PURPOSES.includes(draft.purpose as typeof OTHER_TDS_PURPOSES[number])) {
        issues.purpose = 'required';
      }
      setFieldIssues(issues);
      if (Object.keys(issues).length > 0) return null;
    }
    const total = Number(draft.total);
    const claim = Number(draft.claim);
    if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(claim) || claim <= 0 || claim > total) {
      setError(t('Enter positive amounts; the claim cannot exceed the supporting amount.', 'ধনাত্মক অঙ্ক দিন; দাবি দলিলের অঙ্কের বেশি হতে পারবে না।'));
      return null;
    }
    if (routeId === 'source-ltu') {
      if (!draft.section || !draft.reference.trim() || !draft.description.trim()) {
        setError(t('Section, challan number and description are required.', 'ধারা, চালান নম্বর এবং বিবরণ দিন।'));
        return null;
      }
      // The original LTU Add has no date field. Keep the original local record
      // date when editing; only a newly added local record gets today's date.
      return {
        referenceNo: draft.reference.trim(), sourceEntity: 'Large Taxpayers Unit',
        sectionCode: draft.section, grossAmount: claim, taxDeducted: claim,
        date: resolveLtuRecordedDate(
          active !== 'new' ? entries.find((entry) => entry.id === active) : undefined,
        ),
        claimEvidence: normalizeClaimEvidence({
          paymentPurpose: draft.description.trim(),
          attachmentFileName: draft.fileName.trim() || undefined,
        }),
      };
    }
    if (routeId === 'refund') {
      if (!draft.reference.trim() || !draft.date || !draft.assessmentYear ||
          !draft.zone || !draft.circle) {
        setError(t('Enter all seven refund details.', 'ফেরত সমন্বয়ের সাতটি তথ্য পূরণ করুন।'));
        return null;
      }
      if (!refundCirclesForZone(draft.zone).includes(draft.circle)) {
        setError(t('Select a Circle belonging to the selected Tax Zone.',
          'নির্বাচিত কর অঞ্চলের অন্তর্ভুক্ত সার্কেল নির্বাচন করুন।'));
        return null;
      }
      return {
        referenceNo: draft.reference.trim(), sourceEntity: draft.zone,
        sectionCode: defaultSection, grossAmount: total, taxDeducted: claim,
        date: draft.date,
        claimEvidence: normalizeClaimEvidence({
          refundAssessmentYear: draft.assessmentYear,
          returnFilingZone: draft.zone, returnFilingCircle: draft.circle,
        }),
      };
    }
    if (!draft.authority.trim() || !draft.reference.trim() || !draft.date ||
        !['CHALLAN', 'CERTIFICATE'].includes(draft.documentType) ||
        (routeId === 'other-tds' && !OTHER_TDS_PURPOSES.includes(draft.purpose as typeof OTHER_TDS_PURPOSES[number]))) {
      setError(t('Complete the document details for this tax category.', 'এই করের খাতের দলিলের সব তথ্য পূরণ করুন।'));
      return null;
    }
    return {
      referenceNo: draft.reference.trim(), sourceEntity: draft.authority.trim(),
      sectionCode: routeId === 'other-tds' ? draft.purpose : defaultSection,
      grossAmount: total, taxDeducted: claim, date: draft.date,
      claimEvidence: normalizeClaimEvidence({
        depositingAuthority: draft.authority.trim(),
        paymentDocumentType: draft.documentType as 'CHALLAN' | 'CERTIFICATE',
        documentAmount: total,
        ...(routeId === 'other-tds' ? { paymentPurpose: draft.purpose } : {}),
      }),
    };
  };

  const save = async () => {
    if (saving) return;
    setError(null);
    const payload = buildPayload();
    if (!payload) return;
    setSaving(true);
    try {
      const oldEvidence = entries.find((entry) => entry.id === active)?.claimEvidence;
      const result = active === 'new' ? await onSaveNewEntry(payload)
        : active ? await onUpdateEntry(active, {
          ...payload,
          claimEvidence: normalizeClaimEvidence({ ...oldEvidence, ...payload.claimEvidence }),
        }) : { success: false, error: 'No selected entry.' };
      if (result.success) cancel();
      else setError(result.error ?? 'Unable to save this entry.');
    } finally { setSaving(false); }
  };

  const remove = async (entry: LedgerEntry) => {
    if (!window.confirm(t(`Delete ledger entry for reference '${entry.referenceNo}'?`, `রেফারেন্স '${entry.referenceNo}'-এর রেকর্ড মুছবেন?`))) return;
    if (!(await onDeleteEntry(entry.id))) setError('Delete failed; the record was preserved.');
  };

  const fieldSet = () => (
    <LedgerFormGrid>
      {routeId === 'other-tds' && (
        <LedgerSelect label={t('Purpose of the Payment','পরিশোধের উদ্দেশ্য')} error={fieldError('purpose')} value={draft.purpose} required
          onValueChange={(v) => change('purpose', v)}>
          <option value="">{t('Select One','নির্বাচন করুন')}</option>
          {OTHER_TDS_PURPOSES.map((option) => <option key={option} value={option}>{option}</option>)}
        </LedgerSelect>
      )}
      {(routeId === 'service-payment' || routeId === 'other-tds') && <>
        <LedgerInput label={t('Depositing Authority','জমাদানকারী কর্তৃপক্ষ')} error={fieldError('authority')} required
          value={draft.authority} onValueChange={(v) => change('authority', v)}/>
        <LedgerSelect label={t('Payment Document Type','পরিশোধ দলিলের ধরন')} error={fieldError('documentType')} required
          value={draft.documentType} onValueChange={(v) => change('documentType', v)}>
          {(routeId === 'service-payment' || (active !== 'new' && !draft.documentType)) &&
            <option value="">{t('Select One','নির্বাচন করুন')}</option>}
          <option value="CHALLAN">{t('Challan','চালান')}</option>
          <option value="CERTIFICATE">{t('Certificate','সনদ')}</option>
        </LedgerSelect>
        <LedgerInput label={t('Challan/ Certificate Reference No.','চালান/সনদ নম্বর')} error={fieldError('reference')} required
          value={draft.reference} onValueChange={(v) => change('reference', v)}/>
        <LedgerInput label={t('Challan/ Certificate Date','চালান/সনদের তারিখ')} error={fieldError('date')} type="date" required
          value={draft.date} onValueChange={(v) => change('date', v)}/>
        <LedgerInput label={t('Challan/ Certificate Amount','চালান/সনদের অঙ্ক')} error={fieldError('documentAmount')} type="number" min="0.01" step="any" required
          value={draft.total} onValueChange={(v) => change('total', v)}/>
        <LedgerInput label={t('Claimed Amount','দাবিকৃত অঙ্ক')} error={fieldError('claimedAmount')} type="number" min="0.01" step="any" required
          value={draft.claim} onValueChange={(v) => change('claim', v)}/>
      </>}
      {routeId === 'source-ltu' && <>
        <LedgerSelect label={t('Section','ধারা')} error={fieldError('section')} required value={draft.section} onValueChange={(v) => change('section', v)}>
          <option value="">{t('Select One','নির্বাচন করুন')}</option>
          {LTU_SECTIONS.map((section) => <option value={section} key={section}>{section}</option>)}
        </LedgerSelect>
        <LedgerInput label={t('Amount','অঙ্ক')} error={fieldError('claim')} type="number" min="0.01" step="any" required
          value={draft.claim} onValueChange={(v) => { setDraft((p) => ({ ...p, claim: v, total: v })); setFieldIssues((p) => ({ ...p, claim: undefined })); }}/>
        <LedgerInput label={t('Challan No','চালান নম্বর')} error={fieldError('reference')} required value={draft.reference}
          onValueChange={(v) => change('reference', v)}/>
        <LedgerInput label={t('Description','বিবরণ')} error={fieldError('description')} required value={draft.description}
          onValueChange={(v) => change('description', v)}/>
        <label className="eledger-form-field"><span>{t('File','ফাইল')}</span>
          <input className="eledger-control" type="file" aria-label={t('File','ফাইল')}
            onChange={(event) => change('fileName', event.target.files?.[0]?.name ?? '')}/>
        </label>
      </>}
      {routeId === 'refund' && <>
        <LedgerInput label={t('Assessment Year','করবর্ষ')} error={fieldError('assessmentYear')} required value={draft.assessmentYear}
          onValueChange={(v) => change('assessmentYear', v)}/>
        <LedgerInput label={t('Return Register No. / Reference No.','রিটার্ন রেজিস্টার / রেফারেন্স নম্বর')} error={fieldError('reference')} required
          value={draft.reference} onValueChange={(v) => change('reference', v)}/>
        <LedgerInput label={t('Date of Submission','দাখিলের তারিখ')} error={fieldError('date')} type="date" required
          value={draft.date} onValueChange={(v) => change('date', v)}/>
        <LedgerSelect label={t('Return Filing Zone','রিটার্ন দাখিল অঞ্চল')} error={fieldError('zone')} required
          value={draft.zone} onValueChange={(v) => { setDraft((p) => ({ ...p, zone: v, circle: '' })); setFieldIssues((p) => ({ ...p, zone: undefined, circle: undefined })); }}>
          <option value="">{t('Select One','নির্বাচন করুন')}</option>
          {REFUND_TAX_ZONES.map((zone) => <option key={zone} value={zone}>{zone}</option>)}
        </LedgerSelect>
        <LedgerSelect label={t('Return Filing Circle','রিটার্ন দাখিল সার্কেল')} error={fieldError('circle')} required value={draft.circle}
          onValueChange={(v) => change('circle', v)}>
          <option value="">{t('Select One','নির্বাচন করুন')}</option>
          {refundCirclesForZone(draft.zone).map((circle) =>
            <option key={circle} value={circle}>{circle}</option>)}
        </LedgerSelect>
        <LedgerInput label={t('Refund Amount','ফেরতের অঙ্ক')} error={fieldError('total')} type="number" min="0.01" step="any" required
          value={draft.total} onValueChange={(v) => change('total', v)}/>
        <LedgerInput label={t('Adjustment Claim Amount','সমন্বয়ের দাবিকৃত অঙ্ক')} error={fieldError('claim')} type="number" min="0.01" step="any" required
          value={draft.claim} onValueChange={(v) => change('claim', v)}/>
      </>}
    </LedgerFormGrid>
  );

  const rowValues = (entry: LedgerEntry): React.ReactNode[] => {
    const ev = entry.claimEvidence;
    if (routeId === 'source-ltu') return [entry.sectionCode, money(entry.taxDeducted), entry.referenceNo];
    if (routeId === 'refund') return [
      ev?.refundAssessmentYear ?? '—', entry.referenceNo, dateLabel(entry.date),
      ev?.returnFilingZone ?? '—', ev?.returnFilingCircle ?? '—',
      money(entry.grossAmount), money(entry.taxDeducted),
    ];
    const doc = ev?.paymentDocumentType ? ev.paymentDocumentType[0] + ev.paymentDocumentType.slice(1).toLowerCase() : '—';
    const common = [
      ev?.depositingAuthority ?? entry.sourceEntity, doc, entry.referenceNo,
      dateLabel(entry.date), money(ev?.documentAmount ?? entry.grossAmount),
      money(entry.taxDeducted),
    ];
    return routeId === 'other-tds' ? [ev?.paymentPurpose ?? '—', ...common] : common;
  };

  return <section className="eledger-panel eledger-official-manual-table" aria-label={t('Recorded ledger entries','রেকর্ডকৃত লেজার এন্ট্রি')}>
    <div className="eledger-ledger-toolbar">
      <h2>{t('Recorded Ledger Entries','রেকর্ডকৃত লেজার এন্ট্রি')} ({entries.length})</h2>
      <button type="button" className="eledger-button eledger-button-primary" disabled={active !== null} onClick={openNew}>
        <Plus size={16}/>{routeId === 'source-ltu' ? t('Add Source Tax','উৎস কর যোগ করুন') : t('Add Entry','রেকর্ড যোগ করুন')}
      </button>
    </div>
    {error && active === null && <p role="alert" className="eledger-entry-error">{error}</p>}
    {active !== null && <LedgerFormModal title={active === 'new' ? t('Add Entry','রেকর্ড যোগ করুন') : t('Edit Entry','রেকর্ড সম্পাদনা')}
      onClose={() => { if (!saving) cancel(); }}>
      <form noValidate aria-label={t('Official category fields','খাতভিত্তিক তথ্য')} className="eledger-entry-editor"
        onSubmit={(event) => { event.preventDefault(); void save(); }}>
        {error && <p role="alert" className="eledger-entry-error">{error}</p>}
        {fieldSet()}
        <div className="eledger-form-actions">
          <button type="button" disabled={saving} className="eledger-button eledger-button-secondary" onClick={cancel}><X size={16}/>{t('Cancel','বাতিল')}</button>
          <button type="submit" disabled={saving} className="eledger-button eledger-button-primary"><Check size={16}/>{t('Save','সংরক্ষণ')}</button>
        </div>
      </form>
    </LedgerFormModal>}
    <div className="overflow-x-auto">
      <table className="eledger-official-records">
        <thead><tr>{cols[routeId].map((col) => <th scope="col" key={col}>{col}</th>)}</tr></thead>
        <tbody>{entries.length === 0 ? <tr className="eledger-empty-records-row"><td colSpan={cols[routeId].length}>{t('No Data Found','কোনো তথ্য পাওয়া যায়নি')}</td></tr> :
          entries.map((entry, index) => <tr key={entry.id}>
            <td data-label="SL.">{index + 1}</td>
            {rowValues(entry).map((value, i) => <td key={i} data-label={cols[routeId][i + 1]}>{value}</td>)}
            <td data-label="Action">
              <div className="eledger-salary-row-actions">
                <button type="button" className="edit" disabled={active !== null} onClick={() => openEdit(entry)} aria-label={`Edit ${entry.referenceNo}`}><Pencil size={16}/></button>
                <button type="button" className="delete" disabled={active !== null} onClick={() => void remove(entry)} aria-label={`Delete ${entry.referenceNo}`}><Trash2 size={16}/></button>
              </div>
            </td>
          </tr>)}
        </tbody>
      </table>
    </div>
  </section>;
};
