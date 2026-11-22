import React, { useState } from 'react';
import { Check, Plus, Search, X } from 'lucide-react';
import type { ClaimEvidence, LedgerEntry } from '../../domain/models.ts';
import { normalizeClaimEvidence } from '../../domain/claimEvidence.ts';
import { observedDocumentTypeForEdit } from '../../domain/officialLedgerFields.ts';
import { validateDocumentClaimDraft, documentClaimIssueText, type DocumentClaimField, type DocumentClaimIssues } from '../../domain/documentClaimValidation.ts';
import { useLedgerCopy } from '../../context/LanguageContext.tsx';
import { LedgerInput, LedgerSelect, LedgerTip } from '../../components/ui/LedgerForm.tsx';
import { LedgerFormGrid, LedgerPageAction } from '../../components/ui/LedgerPage.tsx';
import { LedgerRecordActions } from '../../components/tables/LedgerRecordActions.tsx';
import { LedgerFormModal } from '../../components/ui/LedgerFormModal.tsx';
import { NeirRecordDetailsDrawer } from '../../components/neir/NeirRecordDetailsDrawer.tsx';

type SalaryDocument = 'CHALLAN' | 'CERTIFICATE' | '';
type SalaryDraft = {
  authority: string;
  documentType: SalaryDocument;
  reference: string;
  date: string;
  documentAmount: string;
  claimedAmount: string;
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
  documentAmount: '', claimedAmount: '',
});
const draftFromEntry = (entry: LedgerEntry): SalaryDraft => ({
  authority: entry.claimEvidence?.depositingAuthority ?? entry.sourceEntity,
  documentType: observedDocumentTypeForEdit(entry.claimEvidence),
  reference: entry.referenceNo,
  date: entry.date,
  documentAmount: String(entry.claimEvidence?.documentAmount ?? entry.grossAmount),
  claimedAmount: String(entry.taxDeducted),
});

export const SalaryOthersTable: React.FC<SalaryOthersTableProps> = ({
  entries, defaultSection, onSaveNewEntry, onUpdateEntry, onDeleteEntry,
}) => {
  const t = useLedgerCopy();
  const [activeId, setActiveId] = useState<string | 'new' | null>(null);
  const [draft, setDraft] = useState<SalaryDraft>(blankDraft);
  const [error, setError] = useState<string | null>(null);
  const [fieldIssues, setFieldIssues] = useState<DocumentClaimIssues>({});
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);

  const openNew = () => { setDraft(blankDraft()); setFieldIssues({}); setError(null); setActiveId('new'); };
  const openEdit = (entry: LedgerEntry) => {
    if (entry.claimEvidence?.paymentDocumentType === 'OTHER') {
      setError(t('This older record uses a document type absent from the current NBR form; it has been preserved unchanged.',
        'পুরোনো রেকর্ডের দলিলের ধরন বর্তমান এনবিআর ফরমে নেই; রেকর্ডটি অপরিবর্তিত রাখা হয়েছে।'));
      return;
    }
    setDraft(draftFromEntry(entry)); setFieldIssues({}); setError(null); setActiveId(entry.id); setDetailId(entry.id);
  };
  const cancel = () => { setActiveId(null); setFieldIssues({}); setError(null); };
  const change = (field: keyof SalaryDraft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setFieldIssues((current) => ({ ...current, [field]: undefined }));
  };
  const fieldError = (field: DocumentClaimField) => documentClaimIssueText(fieldIssues[field], t);

  const save = async () => {
    if (saving) return;
    const documentAmount = Number(draft.documentAmount);
    const claimedAmount = Number(draft.claimedAmount);
    const issues = validateDocumentClaimDraft(draft);
    setFieldIssues(issues);
    if (Object.keys(issues).length > 0) return;
    const oldEvidence = activeId !== 'new'
      ? entries.find((entry) => entry.id === activeId)?.claimEvidence : undefined;
    const evidence = normalizeClaimEvidence({
      ...oldEvidence,
      depositingAuthority: draft.authority.trim(),
      paymentDocumentType: draft.documentType as 'CHALLAN' | 'CERTIFICATE',
      documentAmount,
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
    <form noValidate className="eledger-salary-editor" onSubmit={(event) => { event.preventDefault(); void save(); }}
      aria-label={t('Salary claim editor','বেতনের দাবি সম্পাদনা')}>
      <div className="eledger-salary-editor-heading">
        <strong>{activeId === 'new' ? t('New salary claim','নতুন বেতনের দাবি') : t('Edit salary claim','বেতনের দাবি সম্পাদনা')}</strong>
        <LedgerTip label={t('Date guidance','তারিখ নির্দেশনা')}>
          {t('Enter the date printed on the supporting challan or certificate. Do not assume today is the deduction date.','চালান বা সনদে লেখা তারিখ দিন। আজকের তারিখকে কর্তনের তারিখ ধরে নেবেন না।')}
        </LedgerTip>
      </div>
      <LedgerFormGrid>
        <LedgerInput label={t('Depositing Authority','জমাদানকারী কর্তৃপক্ষ')} error={fieldError('authority')} autoFocus required value={draft.authority} onValueChange={(value) => change('authority', value)}/>
        <LedgerSelect label={t('Payment Document Type','পরিশোধ দলিলের ধরন')} error={fieldError('documentType')} value={draft.documentType} onValueChange={(value) => change('documentType', value)}>
          {activeId !== 'new' && !draft.documentType && <option value="">{t('Select One','নির্বাচন করুন')}</option>}
          <option value="CHALLAN">{t('Challan','চালান')}</option><option value="CERTIFICATE">{t('Certificate','সনদ')}</option>
        </LedgerSelect>
        <LedgerInput label={t('Challan / Certificate Reference No.','চালান / সনদ নম্বর')} error={fieldError('reference')} required value={draft.reference} onValueChange={(value) => change('reference', value)}/>
        <LedgerInput label={t('Challan / Certificate Date','চালান / সনদের তারিখ')} error={fieldError('date')} required type="date" value={draft.date} onValueChange={(value) => change('date', value)}/>
        <LedgerInput label={t('Challan / Certificate Amount','চালান / সনদের অঙ্ক')} error={fieldError('documentAmount')} required type="number" min="0.01" step="any" inputMode="decimal" className="is-number" value={draft.documentAmount} onValueChange={(value) => change('documentAmount', value)}/>
        <LedgerInput label={t('Claimed Amount','দাবিকৃত অঙ্ক')} error={fieldError('claimedAmount')} required type="number" min="0.01" step="any" inputMode="decimal" className="is-number" value={draft.claimedAmount} onValueChange={(value) => change('claimedAmount', value)}/>
      </LedgerFormGrid>
      <div className="eledger-form-actions">
        <button type="button" className="eledger-button eledger-button-secondary" onClick={cancel} disabled={saving}><X size={16}/>{t('Cancel','বাতিল')}</button>
        <button type="submit" className="eledger-button eledger-button-primary" disabled={saving}><Check size={16}/>{activeId === 'new' ? t('Save claim','দাবি সংরক্ষণ') : t('Save Changes','পরিবর্তন সংরক্ষণ')}</button>
      </div>
    </form>
  );

  const filteredEntries = entries.filter((entry) =>
    [entry.referenceNo, entry.sourceEntity, entry.claimEvidence?.depositingAuthority ?? '',
      entry.claimEvidence?.paymentDocumentType ?? '', entry.taxDeducted]
      .join(' ').toLocaleLowerCase().includes(searchQuery.trim().toLocaleLowerCase())
  );
  const detailEntry = detailId ? entries.find((entry) => entry.id === detailId) : undefined;

  return (
    <section className="eledger-salary-table eledger-panel" aria-label={t('Salary Others claims','অন্যান্য বেতনের দাবি')}>
      <div className="eledger-ledger-toolbar">
        <h2>{t('Recorded Ledger Entries','রেকর্ডকৃত লেজার এন্ট্রি')} ({entries.length})</h2>
        <div className="eledger-table-controls">
          <label className="eledger-table-search"><Search size={17} aria-hidden="true"/>
            <input type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)}
              aria-label={t('Search records','রেকর্ড খুঁজুন')} placeholder={t('Search records','রেকর্ড খুঁজুন')}/>
          </label>
          <div className="eledger-button-group">
            <button type="button" className="eledger-button eledger-button-secondary" disabled={!searchQuery}
              onClick={() => setSearchQuery('')}>{t('Reset','রিসেট')}</button>

          </div>
        </div>
      </div>
      <LedgerPageAction>
        <button type="button" className="eledger-button eledger-button-primary" disabled={activeId !== null}
          onClick={openNew}><Plus size={16}/>{t('Add Entry','রেকর্ড যোগ করুন')}</button>
      </LedgerPageAction>
      {error && <div role="alert" className="eledger-salary-error">{error}</div>}
      {activeId === 'new' && <LedgerFormModal
        title={activeId === 'new' ? t('Add Entry','রেকর্ড যোগ করুন') : t('Edit Entry','রেকর্ড সম্পাদনা')}
        onClose={() => { if (!saving) cancel(); }}>
        {error && <div role="alert" className="eledger-salary-error">{error}</div>}
        {renderEditor()}
      </LedgerFormModal>}
      {detailEntry && <NeirRecordDetailsDrawer
        title={activeId === detailEntry.id ? t('Edit Record','রেকর্ড সম্পাদনা') : t('Record Details','রেকর্ডের বিস্তারিত')}
        subtitle={detailEntry.referenceNo} showCaveat={false}
        onClose={() => { if (activeId === detailEntry.id) cancel(); setDetailId(null); }}
        editor={activeId === detailEntry.id ? renderEditor() : undefined}
        fields={[
          { label:t('Depositing Authority','জমাদানকারী কর্তৃপক্ষ'), value:detailEntry.claimEvidence?.depositingAuthority ?? detailEntry.sourceEntity },
          { label:t('Payment Document Type','পরিশোধ দলিলের ধরন'), value:detailEntry.claimEvidence?.paymentDocumentType ?? '—' },
          { label:t('Challan/ Certificate Reference No.','চালান/সনদ নম্বর'), value:detailEntry.referenceNo },
          { label:t('Challan/ Certificate Date','চালান/সনদের তারিখ'), value:humanDate(detailEntry.date) },
          { label:t('Challan/ Certificate Amount','চালান/সনদের অঙ্ক'), value:money(detailEntry.claimEvidence?.documentAmount ?? detailEntry.grossAmount) },
          { label:t('Claimed Amount','দাবিকৃত অঙ্ক'), value:money(detailEntry.taxDeducted) },
        ]}
      />}
      <div className="eledger-salary-scroll">
        <table className="eledger-data-table">
          <thead><tr>
            <th scope="col">{t('SL.','ক্রম')}</th><th scope="col">{t('Depositing Authority','জমাদানকারী কর্তৃপক্ষ')}</th>
            <th scope="col">{t('Payment Document Type','পরিশোধ দলিলের ধরন')}</th>
            <th scope="col">{t('Challan/ Certificate Reference No.','চালান/সনদ নম্বর')}</th>
            <th scope="col">{t('Challan/ Certificate Date','চালান/সনদের তারিখ')}</th>
            <th scope="col">{t('Challan/ Certificate Amount','চালান/সনদের অঙ্ক')}</th>
            <th scope="col">{t('Claimed Amount','দাবিকৃত অঙ্ক')}</th>
            <th scope="col">{t('Action','কাজ')}</th>
          </tr></thead>
          <tbody>
            {filteredEntries.length === 0 && <tr className="eledger-salary-empty-row">
              <td colSpan={8} className="eledger-salary-empty-cell">{t('No Data Found','কোনো তথ্য পাওয়া যায়নি')}</td>
            </tr>}
            {filteredEntries.map((entry, index) => (
              <tr key={entry.id} className={activeId === entry.id ? 'eledger-row-being-edited' : ''}>
                <td data-label={t('SL.','ক্রম')} className="eledger-salary-row-index">{index + 1}</td>
                <td data-label={t('Depositing Authority','জমাদানকারী কর্তৃপক্ষ')}>{entry.claimEvidence?.depositingAuthority ?? entry.sourceEntity}</td>
                <td data-label={t('Payment Document Type','পরিশোধ দলিলের ধরন')}>{entry.claimEvidence?.paymentDocumentType
                  ? entry.claimEvidence.paymentDocumentType[0] + entry.claimEvidence.paymentDocumentType.slice(1).toLowerCase()
                  : '—'}</td>
                <td data-label={t('Challan/ Certificate Reference No.','চালান/সনদ নম্বর')}>{entry.referenceNo}</td>
                <td data-label={t('Challan/ Certificate Date','চালান/সনদের তারিখ')}>{humanDate(entry.date)}</td>
                <td data-label={t('Challan/ Certificate Amount','চালান/সনদের অঙ্ক')} className="eledger-salary-number">{money(entry.claimEvidence?.documentAmount ?? entry.grossAmount)}</td>
                <td data-label={t('Claimed Amount','দাবিকৃত অঙ্ক')} className="eledger-salary-number claimed">{money(entry.taxDeducted)}</td>
                <td data-label={t('Action','কাজ')}>
                  <LedgerRecordActions reference={entry.referenceNo} onView={() => setDetailId(entry.id)}
                    onEdit={() => openEdit(entry)} onDelete={() => void remove(entry)}
                    disabled={activeId !== null || saving}/>
                </td>
              </tr>
            ))}

          </tbody>
        </table>
      </div>
    </section>
  );
};
