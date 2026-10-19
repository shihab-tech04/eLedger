import React, { useState } from 'react';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import type { ClaimEvidence, LedgerEntry } from '../../domain/models.ts';
import { localDateInputValue } from '../../domain/localDate.ts';
import { normalizeClaimEvidence } from '../../domain/claimEvidence.ts';
import { useLedgerCopy } from '../../context/LanguageContext.tsx';

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
  authority: '', documentType: 'CHALLAN', reference: '', date: localDateInputValue(),
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

  const renderEditor = (key: string) => (
    <tr key={key} className="eledger-salary-editor-row">
      <td className="eledger-salary-row-index">{activeId === 'new' ? entries.length + 1 : entries.findIndex((entry) => entry.id === activeId) + 1}</td>
      <td><input aria-label={t('Depositing Authority','জমাদানকারী কর্তৃপক্ষ')} autoFocus value={draft.authority} onChange={(event) => change('authority', event.target.value)} placeholder={t('Enter Depositing Authority','কর্তৃপক্ষের নাম লিখুন')}/></td>
      <td><select aria-label={t('Payment Document Type','পরিশোধ দলিলের ধরন')} value={draft.documentType} onChange={(event) => change('documentType', event.target.value)}>
        <option value="CHALLAN">{t('Challan','চালান')}</option><option value="CERTIFICATE">{t('Certificate','সনদ')}</option><option value="OTHER">{t('Other','অন্যান্য')}</option>
      </select></td>
      <td><input aria-label={t('Challan / Certificate Reference No.','চালান / সনদ নম্বর')} value={draft.reference} onChange={(event) => change('reference', event.target.value)} placeholder={t('Enter Challan/Certificate Reference','চালান / সনদ নম্বর লিখুন')}/></td>
      <td><input aria-label={t('Challan / Certificate Date','চালান / সনদের তারিখ')} type="date" value={draft.date} onChange={(event) => change('date', event.target.value)}/></td>
      <td><input aria-label={t('Challan / Certificate Amount','চালান / সনদের অঙ্ক')} type="number" min="0" step="any" value={draft.documentAmount} onChange={(event) => change('documentAmount', event.target.value)} placeholder={t('Enter Amount','অঙ্ক লিখুন')}/></td>
      <td><input aria-label={t('Claimed Amount','দাবিকৃত অঙ্ক')} type="number" min="0" step="any" value={draft.claimedAmount} onChange={(event) => change('claimedAmount', event.target.value)} placeholder={t('Enter Claimed Amount','দাবিকৃত অঙ্ক লিখুন')}/></td>
      <td className="eledger-salary-bank-fields"><input aria-label={t('Bank Name','ব্যাংকের নাম')} value={draft.bank} onChange={(event) => change('bank', event.target.value)} placeholder={t('Bank Name','ব্যাংকের নাম')}/>
        <input aria-label={t('Branch Name','শাখার নাম')} value={draft.branch} onChange={(event) => change('branch', event.target.value)} placeholder={t('Branch Name','শাখার নাম')}/></td>
      <td><div className="eledger-salary-row-actions">
        <button type="button" className="save" aria-label={t('Save Salary claim','বেতনের দাবি সংরক্ষণ')} title={t('Save','সংরক্ষণ')} disabled={saving} onClick={save}><Check size={16}/></button>
        <button type="button" className="cancel" aria-label={t('Cancel Salary edit','সম্পাদনা বাতিল')} title={t('Cancel','বাতিল')} disabled={saving} onClick={cancel}><X size={16}/></button>
      </div></td>
    </tr>
  );

  return (
    <section className="eledger-salary-table" aria-label={t('Salary Others claims','অন্যান্য বেতনের দাবি')}>
      <div className="eledger-salary-toolbar">
        <div className="eledger-salary-stat"><span>{t('Total Claimed Amount','মোট দাবিকৃত অঙ্ক')}</span><strong>{money(entries.reduce((sum, entry) => sum + Number(entry.taxDeducted), 0))}</strong></div>
        <div className="eledger-salary-stat"><span>{t('Records','রেকর্ড')}</span><strong>{entries.length}</strong></div>
        <button type="button" className="eledger-salary-add" disabled={activeId !== null} onClick={openNew}><Plus size={16}/>{t('Add new','নতুন যোগ করুন')}</button>
      </div>
      {error && <div role="alert" className="eledger-salary-error">{error}</div>}
      <p className="eledger-salary-mobile-hint">{t('Swipe the table sideways to review certificates, amounts and row actions.','সনদ, অঙ্ক ও সারির কাজ দেখতে টেবিলটি পাশে সরান।')}</p>
      <div className="eledger-salary-scroll">
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
            {entries.map((entry, index) => activeId === entry.id ? renderEditor(entry.id) : (
              <tr key={entry.id}>
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
            {activeId === 'new' && renderEditor('new')}
            {entries.length === 0 && activeId === null && <tr><td colSpan={9} className="eledger-salary-empty">{t('No salary claims recorded for this taxpayer and year. Use Add new to create a local claim.','এই করদাতা ও করবর্ষে কোনো বেতনের দাবি রেকর্ড নেই। স্থানীয় দাবি যোগ করতে নতুন যোগ করুন চাপুন।')}</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="eledger-salary-disclaimer">{t('These are recorded claims, not confirmed credits. Payment verification requires an independent authoritative source.','এগুলো রেকর্ডকৃত দাবি, নিশ্চিত ক্রেডিট নয়। পরিশোধ যাচাইয়ের জন্য স্বতন্ত্র সরকারি প্রমাণ প্রয়োজন।')}</p>
    </section>
  );
};
