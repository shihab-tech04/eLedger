import React, { useState } from 'react';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import type { ClaimEvidence, LedgerEntry } from '../../domain/models.ts';
import { normalizeClaimEvidence } from '../../domain/claimEvidence.ts';
import { useLedgerCopy } from '../../context/LanguageContext.tsx';
import { LedgerInput, LedgerSelect, LedgerTip } from '../../components/ui/LedgerForm.tsx';
import { LedgerFormGrid } from '../../components/ui/LedgerPage.tsx';
import { LedgerFormModal } from '../../components/ui/LedgerFormModal.tsx';

type SalaryDocument = 'CHALLAN' | 'CERTIFICATE' | 'OTHER';
type SalaryDraft = {
  authority: string;
  documentType: SalaryDocument;
  reference: string;
  date: string;
  documentAmount: string;
  claimedAmount: string;
  bank: string;
  branch: string;
};
type SalaryPayload = {
  referenceNo: string;
  sourceEntity: string;
  sectionCode: string;
  grossAmount: number;
  taxDeducted: number;
  date: string;
  claimEvidence: ClaimEvidence;
};
interface SalaryOthersTableProps {
  entries: LedgerEntry[];
  defaultSection: string;
  onSaveNewEntry: (payload: SalaryPayload) => Promise<{ success: boolean; error?: string }>;
  onUpdateEntry: (id: string, patch: Partial<LedgerEntry>) => Promise<{ success: boolean; error?: string }>;
  onDeleteEntry: (id: string) => Promise<boolean>;
}

const money = (value: number) => value.toLocaleString('en-IN', { maximumFractionDigits: 2 });
const humanDate = (iso: string) => /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso.split('-').reverse().join('-') : iso;
const blankDraft = (): SalaryDraft => ({
  authority: '', documentType: 'CHALLAN', reference: '', date: '',
  documentAmount: '', claimedAmount: '', bank: '', branch: '',
});
const draftFromEntry = (entry: LedgerEntry): SalaryDraft => ({
  authority: entry.claimEvidence?.depositingAuthority ?? entry.sourceEntity,
  documentType: entry.claimEvidence?.paymentDocumentType ?? 'CHALLAN',
  reference: entry.referenceNo,
  date: entry.date,
  documentAmount: String(entry.claimEvidence?.documentAmount ?? entry.grossAmount),
  claimedAmount: String(entry.taxDeducted),
  bank: entry.claimEvidence?.bankName ?? '',
  branch: entry.claimEvidence?.branchName ?? '',
});

export const SalaryOthersTable: React.FC<SalaryOthersTableProps> = ({
  entries, defaultSection, onSaveNewEntry, onUpdateEntry, onDeleteEntry,
}) => {
  const t = useLedgerCopy();
  const [activeId, setActiveId] = useState<string | 'new' | null>(null);
  const [draft, setDraft] = useState<SalaryDraft>(blankDraft);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const openNew = () => { setDraft(blankDraft()); setError(null); setActiveId('new'); };
  const openEdit = (entry: LedgerEntry) => { setDraft(draftFromEntry(entry)); setError(null); setActiveId(entry.id); };
  const cancel = () => { setActiveId(null); setError(null); };
  const change = (field: keyof SalaryDraft, value: string) => setDraft((current) => ({ ...current, [field]: value }));

  const save = async () => {
    if (saving) return;
    const documentAmount = Number(draft.documentAmount);
    const claimedAmount = Number(draft.claimedAmount);
    if (!draft.authority.trim() || !draft.reference.trim() || !draft.date) {
      setError(t('Depositing authority, challan/certificate reference and date are required.','জমাদানকারী কর্তৃপক্ষ, চালান/সনদ নম্বর ও তারিখ প্রয়োজন।'));
      return;
    }
    if (!Number.isFinite(documentAmount) || documentAmount <= 0 ||
        !Number.isFinite(claimedAmount) || claimedAmount <= 0 ||
        claimedAmount > documentAmount) {
      setError(t('Enter positive document and claimed amounts. Claimed amount cannot exceed the document amount.','সনদ ও দাবিকৃত অঙ্ক ধনাত্মক হতে হবে। দাবিকৃত অঙ্ক সনদের অঙ্কের বেশি হতে পারে না।'));
      return;
    }
    const evidence = normalizeClaimEvidence({
      depositingAuthority: draft.authority.trim(),
      paymentDocumentType: draft.documentType,
      documentAmount,
      bankName: draft.bank.trim() || undefined,
      branchName: draft.branch.trim() || undefined,
    }) ?? {};
    const payload: SalaryPayload = {
      referenceNo: draft.reference.trim(),
      sourceEntity: draft.authority.trim(),
      sectionCode: defaultSection,
      // Retain the validated generic amount ceiling alongside the source document amount.
      grossAmount: documentAmount,
      taxDeducted: claimedAmount,
      date: draft.date,
      claimEvidence: evidence,
    };
    setSaving(true);
    try {
      const result = activeId === 'new'
        ? await onSaveNewEntry(payload)
        : activeId ? await onUpdateEntry(activeId, {
          referenceNo: payload.referenceNo,
          sourceEntity: payload.sourceEntity,
          grossAmount: payload.grossAmount,
          taxDeducted: payload.taxDeducted,
          date: payload.date,
          claimEvidence: evidence,
        }) : { success: false, error: 'No selected row.' };
      if (result.success) cancel();
      else setError(result.error ?? 'This claim could not be saved. Check the reference and amount.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (entry: LedgerEntry) => {
    if (!window.confirm(t(`Delete ledger entry for reference '${entry.referenceNo}'?`,`রেফারেন্স '${entry.referenceNo}'-এর লেজার রেকর্ড মুছবেন?`))) return;
    if (!(await onDeleteEntry(entry.id))) setError('This entry could not be deleted and has been preserved.');
  };

  // Reuse the same modal contract as the other ledger record forms.
  const renderEditor = () => (
    <form className="eledger-salary-editor" onSubmit={(event) => { event.preventDefault(); void save(); }}
      aria-label={t('Salary claim editor','বেতনের দাবি সম্পাদনা')}>
      <div className="eledger-salary-editor-heading">
        <strong>{activeId === 'new' ? t('New salary claim','নতুন বেতনের দাবি') : t('Edit salary claim','বেতনের দাবি সম্পাদনা')}</strong>
        <LedgerTip label={t('Date guidance','তারিখ নির্দেশনা')}>
          {t('Enter the date printed on the supporting challan or certificate. Do not assume today is the deduction date.','চালান বা সনদে লেখা তারিখ দিন। আজকের তারিখকে কর্তনের তারিখ ধরে নেবেন না।')}
        </LedgerTip>
      </div>
      <LedgerFormGrid>
        <LedgerInput label={t('Depositing Authority','জমাদানকারী কর্তৃপক্ষ')} autoFocus required value={draft.authority} onValueChange={(value) => change('authority', value)}/>
        <LedgerSelect label={t('Payment Document Type','পরিশোধ দলিলের ধরন')} value={draft.documentType} onValueChange={(value) => change('documentType', value)}>
          <option value="CHALLAN">{t('Challan','চালান')}</option><option value="CERTIFICATE">{t('Certificate','সনদ')}</option><option value="OTHER">{t('Other','অন্যান্য')}</option>
        </LedgerSelect>
        <LedgerInput label={t('Challan / Certificate Reference No.','চালান / সনদ নম্বর')} required value={draft.reference} onValueChange={(value) => change('reference', value)}/>
        <LedgerInput label={t('Challan / Certificate Date','চালান / সনদের তারিখ')} required type="date" value={draft.date} onValueChange={(value) => change('date', value)}/>
        <LedgerInput label={t('Challan / Certificate Amount','চালান / সনদের অঙ্ক')} required type="number" min="0.01" step="any" inputMode="decimal" className="is-number" value={draft.documentAmount} onValueChange={(value) => change('documentAmount', value)}/>
        <LedgerInput label={t('Claimed Amount','দাবিকৃত অঙ্ক')} required type="number" min="0.01" step="any" inputMode="decimal" className="is-number" value={draft.claimedAmount} onValueChange={(value) => change('claimedAmount', value)}/>
        <LedgerInput label={t('Bank Name','ব্যাংকের নাম')} value={draft.bank} onValueChange={(value) => change('bank', value)}/>
        <LedgerInput label={t('Branch Name','শাখার নাম')} value={draft.branch} onValueChange={(value) => change('branch', value)}/>
      </LedgerFormGrid>
      <div className="eledger-form-actions">
        <button type="button" className="eledger-button eledger-button-secondary" onClick={cancel} disabled={saving}><X size={16}/>{t('Cancel','বাতিল')}</button>
        <button type="submit" className="eledger-button eledger-button-primary" disabled={saving}><Check size={16}/>{t('Save claim','দাবি সংরক্ষণ')}</button>
      </div>
    </form>
  );

  return (
    <section className="eledger-salary-table eledger-panel" aria-label={t('Salary Others claims','অন্যান্য বেতনের দাবি')}>
      <div className="eledger-ledger-toolbar">
        <h2>{t('Recorded Ledger Entries','রেকর্ডকৃত লেজার এন্ট্রি')} ({entries.length})</h2>
        <button type="button" className="eledger-button eledger-button-primary" disabled={activeId !== null} onClick={openNew}><Plus size={16}/>{t('Add Entry','রেকর্ড যোগ করুন')}</button>
      </div>
      {error && activeId === null && <div role="alert" className="eledger-salary-error">{error}</div>}
      {activeId !== null && <LedgerFormModal
        title={activeId === 'new' ? t('Add Entry','রেকর্ড যোগ করুন') : t('Edit Entry','রেকর্ড সম্পাদনা')}
        onClose={() => { if (!saving) cancel(); }}>
        {error && <div role="alert" className="eledger-salary-error">{error}</div>}
        {renderEditor()}
      </LedgerFormModal>}
      {entries.length === 0 && activeId === null && <p className="eledger-entry-empty">
        {t('No salary claims yet. Use Add Entry to record one.','এখনো বেতনের দাবি নেই। রেকর্ড যোগ করুন।')}
      </p>}
      {entries.length > 0 && <p className="eledger-salary-mobile-hint">{t('Swipe the table sideways to review certificates, amounts and row actions.','সনদ, অঙ্ক ও সারির কাজ দেখতে টেবিলটি পাশে সরান।')}</p>}
      {entries.length > 0 && <div className="eledger-salary-scroll">
        <table>
          <thead><tr>
            <th scope="col">{t('SL.','ক্রম')}</th><th scope="col">{t('Depositing Authority','জমাদানকারী কর্তৃপক্ষ')}</th>
            <th scope="col">{t('Payment Document Type','পরিশোধ দলিলের ধরন')}</th>
            <th scope="col">{t('Challan/ Certificate Reference No.','চালান/সনদ নম্বর')}</th>
            <th scope="col">{t('Challan/ Certificate Date','চালান/সনদের তারিখ')}</th>
            <th scope="col">{t('Challan/ Certificate Amount','চালান/সনদের অঙ্ক')}</th>
            <th scope="col">{t('Claimed Amount','দাবিকৃত অঙ্ক')}</th><th scope="col">{t('Bank / Branch','ব্যাংক / শাখা')}</th>
            <th scope="col">{t('Action','কাজ')}</th>
          </tr></thead>
          <tbody>
            {entries.map((entry, index) => (
              <tr key={entry.id} className={activeId === entry.id ? 'eledger-row-being-edited' : ''}>
                <td className="eledger-salary-row-index">{index + 1}</td>
                <td>{entry.claimEvidence?.depositingAuthority ?? entry.sourceEntity}</td>
                <td>{entry.claimEvidence?.paymentDocumentType
                  ? entry.claimEvidence.paymentDocumentType[0] + entry.claimEvidence.paymentDocumentType.slice(1).toLowerCase()
                  : '—'}</td>
                <td>{entry.referenceNo}</td>
                <td>{humanDate(entry.date)}</td>
                <td className="eledger-salary-number">{money(entry.claimEvidence?.documentAmount ?? entry.grossAmount)}</td>
                <td className="eledger-salary-number claimed">{money(entry.taxDeducted)}</td>
                <td>{[entry.claimEvidence?.bankName, entry.claimEvidence?.branchName].filter(Boolean).join(' / ') || '—'}</td>
                <td><div className="eledger-salary-row-actions">
                  <button type="button" className="edit" aria-label={`${t('Edit','সম্পাদনা')} ${entry.referenceNo}`} title={t('Edit','সম্পাদনা')} onClick={() => openEdit(entry)} disabled={activeId !== null}><Pencil size={16}/></button>
                  <button type="button" className="delete" aria-label={`${t('Delete','মুছুন')} ${entry.referenceNo}`} title={t('Delete','মুছুন')} onClick={() => remove(entry)} disabled={activeId !== null}><Trash2 size={16}/></button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>}
    </section>
  );
};
