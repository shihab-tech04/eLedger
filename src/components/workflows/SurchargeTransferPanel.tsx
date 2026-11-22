import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Eye, Check, X } from 'lucide-react';
import type { ClaimEvidence, LedgerEntry } from '../../domain/models.ts';
import { useLedgerCopy } from '../../context/LanguageContext.tsx';
import { LedgerInput, LedgerTip } from '../ui/LedgerForm.tsx';
import { LedgerFormGrid } from '../ui/LedgerPage.tsx';
import { LedgerFormModal } from '../ui/LedgerFormModal.tsx';
import { NeirRecordDetailsDrawer } from '../neir/NeirRecordDetailsDrawer.tsx';

type LocalSurchargeDetails = Pick<ClaimEvidence, 'registrationNo' | 'bankName' | 'branchName'>;
type SaveResult = { success: boolean; error?: string };
type Draft = { registrationNo: string; reference: string; bankName: string; branchName: string; date: string; amount: string };
const emptyDraft = (): Draft => ({ registrationNo: '', reference: '', bankName: '', branchName: '', date: '', amount: '' });
const formatAmount = (amount: number) => amount.toLocaleString('en-IN', { maximumFractionDigits: 2 });
const formatDate = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.split('-').reverse().join('-') : date;

/**
 * Original Environmental Surcharge page-18 contract: six transaction columns,
 * row actions, total and declared-surcharge status. All additions are LOCAL
 * pending records, never NBR-confirmed payments or calculated tax liability.
 * The current Tax & Payment handoff is preserved as an unverified source.
 */
export const SurchargeTransferPanel: React.FC<{
  entries?: LedgerEntry[];
  onRecord: (referenceNo: string, amount: number, date: string, details?: LocalSurchargeDetails) => Promise<SaveResult>;
  onUpdate?: (id: string, patch: Partial<LedgerEntry>) => Promise<SaveResult>;
  onDelete?: (id: string) => Promise<boolean>;
}> = ({ entries = [], onRecord, onUpdate, onDelete }) => {
  const t = useLedgerCopy();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editing, setEditing] = useState<LedgerEntry | null>(null);
  const [selected, setSelected] = useState<LedgerEntry | null>(null);
  const [open, setOpen] = useState(false);
  const [compactEditor, setCompactEditor] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    const refresh = () => setCompactEditor(mql.matches);
    refresh(); mql.addEventListener('change', refresh);
    return () => mql.removeEventListener('change', refresh);
  }, []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [search, setSearch] = useState('');
  const headers = [
    t('Motor Vehicle Registration No', 'মোটরযানের নিবন্ধন নম্বর'),
    t('Transaction ID', 'লেনদেন আইডি'),
    t('Bank Name', 'ব্যাংকের নাম'),
    t('Branch Name', 'শাখার নাম'),
    t('Payment Date', 'পরিশোধের তারিখ'),
    t('Paid Amount', 'পরিশোধিত অঙ্ক'),
    t('Action', 'কাজ'),
  ];
  const sum = entries.reduce((total, entry) => total + entry.taxDeducted, 0);
  const listed = entries.filter((entry) =>
    [entry.referenceNo, entry.claimEvidence?.registrationNo, entry.claimEvidence?.bankName,
      entry.claimEvidence?.branchName, entry.date, String(entry.taxDeducted)]
      .join(' ').toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())
  );
  const change = (name: keyof Draft, value: string) => {
    setDraft((old) => ({ ...old, [name]: value }));
    setError('');
  };
  const startAdd = () => {
    setDraft(emptyDraft()); setEditing(null); setError(''); setFeedback(''); setOpen(true);
  };
  const startEdit = (entry: LedgerEntry) => {
    setDraft({
      registrationNo: entry.claimEvidence?.registrationNo ?? '',
      reference: entry.referenceNo,
      bankName: entry.claimEvidence?.bankName ?? '',
      branchName: entry.claimEvidence?.branchName ?? '',
      date: entry.date,
      amount: String(entry.taxDeducted),
    });
    setSelected(null); setEditing(entry); setError(''); setFeedback(''); setOpen(true);
  };
  const close = () => { if (!busy) { setOpen(false); setEditing(null); setError(''); } };
  const submit = async () => {
    if (busy) return;
    setError('');
    const reference = draft.reference.trim();
    const amount = Number(draft.amount);
    if (!reference) { setError(t('Enter Transaction ID / Tax & Payment reference.', 'লেনদেন আইডি / কর ও পরিশোধের রেফারেন্স লিখুন।')); return; }
    if (!/^\d+(?:\.\d{1,2})?$/.test(draft.amount) || !Number.isFinite(amount) || amount <= 0) {
      setError(t('Enter a positive recorded amount with up to two decimals.', 'সর্বোচ্চ দুই দশমিকসহ ধনাত্মক রেকর্ডকৃত অঙ্ক লিখুন।'));
      return;
    }
    if (!draft.date) { setError(t('Enter the payment date.', 'পরিশোধের তারিখ লিখুন।')); return; }
    const details: LocalSurchargeDetails = {
      ...(draft.registrationNo.trim() && { registrationNo: draft.registrationNo.trim() }),
      ...(draft.bankName.trim() && { bankName: draft.bankName.trim() }),
      ...(draft.branchName.trim() && { branchName: draft.branchName.trim() }),
    };
    setBusy(true);
    try {
      const result = editing && onUpdate
        ? await onUpdate(editing.id, {
            referenceNo: reference, date: draft.date, grossAmount: amount, taxDeducted: amount,
            sourceEntity: draft.bankName.trim() || editing.sourceEntity,
            claimEvidence: { ...editing.claimEvidence, ...details },
          })
        : await onRecord(reference, amount, draft.date, details);
      if (!result.success) { setError(result.error || t('Local record could not be saved.', 'স্থানীয় রেকর্ড সংরক্ষণ করা যায়নি।')); return; }
      setOpen(false); setEditing(null); setDraft(emptyDraft());
      setFeedback(t('Local surcharge recorded pending verification; no government payment was made.',
        'স্থানীয় সারচার্জ যাচাই অপেক্ষমাণ হিসেবে সংরক্ষিত হয়েছে; কোনো সরকারি পরিশোধ করা হয়নি।'));
    } catch {
      setError(t('The local record could not be saved. No government payment was made.',
        'স্থানীয় রেকর্ড সংরক্ষণ হয়নি। কোনো সরকারি পরিশোধ করা হয়নি।'));
    } finally { setBusy(false); }
  };
  const remove = async (entry: LedgerEntry) => {
    if (!onDelete || !window.confirm(t('Delete this local surcharge entry?', 'স্থানীয় সারচার্জ রেকর্ডটি মুছবেন?'))) return;
    setSelected(null);
    const ok = await onDelete(entry.id);
    setFeedback(ok ? t('Entry deleted.', 'রেকর্ড মুছে ফেলা হয়েছে।') :
      t('Deletion failed. Your record is unchanged.', 'মুছতে ব্যর্থ হয়েছে। রেকর্ড অপরিবর্তিত রয়েছে।'));
  };
  const bankNames = Array.from(new Set([
    'Community Bank Bangladesh PLC', 'AB Bank PLC',
    ...entries.map((entry) => entry.claimEvidence?.bankName || '').filter(Boolean),
  ]));
  const inlineInput = (field: keyof Draft, label: string, type: string = 'text') =>
    <td data-label={label}><input className="eledger-control eledger-inline-input"
      aria-label={label} type={type} required={field === 'reference' || field === 'date' || field === 'amount'}
      min={field === 'amount' ? '0.01' : undefined} step={field === 'amount' ? '0.01' : undefined}
      list={field === 'bankName' ? 'eledger-surcharge-bank-options' : undefined}
      value={draft[field]} onChange={(event) => change(field, event.target.value)}/></td>;
  const inlineRow = <tr key="surcharge-inline" className="eledger-row-being-edited eledger-source-inline-editor">
    {inlineInput('registrationNo', headers[0])}
    {inlineInput('reference', headers[1])}
    {inlineInput('bankName', headers[2])}
    {inlineInput('branchName', headers[3])}
    {inlineInput('date', headers[4], 'date')}
    {inlineInput('amount', headers[5], 'number')}
    <td data-label={headers[6]}><div className="eledger-button-group">
      <button type="button" className="eledger-button eledger-button-primary" disabled={busy}
        onClick={() => void submit()}><Check size={16}/>{t('Save','সংরক্ষণ')}</button>
      <button type="button" className="eledger-button eledger-button-secondary" disabled={busy}
        onClick={close}><X size={16}/>{t('Cancel','বাতিল')}</button>
    </div></td>
  </tr>;
  const cells = (entry: LedgerEntry) => [
    entry.claimEvidence?.registrationNo || '—',
    entry.referenceNo,
    entry.claimEvidence?.bankName || '—',
    entry.claimEvidence?.branchName || '—',
    formatDate(entry.date),
    formatAmount(entry.taxDeducted),
  ];
  return <section className="eledger-panel eledger-official-manual-table"
    aria-label={t('Environmental surcharge records', 'পরিবেশ সারচার্জের রেকর্ড')}>
    <div className="eledger-ledger-toolbar">
      <h2>{t('Recorded Ledger Entries', 'রেকর্ডকৃত লেজার এন্ট্রি')} ({entries.length})</h2>
      <div className="eledger-table-controls">
        <label className="eledger-table-search">
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={t('Search records', 'রেকর্ড খুঁজুন')} aria-label={t('Search records', 'রেকর্ড খুঁজুন')}/>
        </label>
        <div className="eledger-button-group">
          <button type="button" className="eledger-button eledger-button-secondary" disabled={!search}
            onClick={() => setSearch('')}>{t('Reset', 'রিসেট')}</button>
          <button type="button" className="eledger-button eledger-button-primary" onClick={startAdd}>
            <Plus size={16}/>{t('Add Entry', 'রেকর্ড যোগ করুন')}
          </button>
        </div>
      </div>
    </div>
    <p className="eledger-claim-summary-content">
      {t('Tax & Payment reference only. No tax rate is calculated, no NBR service is connected, and no payment is transmitted.',
        'শুধু কর ও পরিশোধের রেফারেন্স। করহার গণনা, এনবিআর সেবা সংযোগ বা অর্থ পরিশোধ করা হয় না।')}
    </p>
    {feedback && <p role="status" className="eledger-claim-feedback">{feedback}</p>}
    {entries.length === 0 && <p className="eledger-entry-empty">
      {t('No Environmental Surcharge Payable. Please set Environmental Surcharge in Tax Payment.',
        'পরিবেশ সারচার্জ পরিশোধযোগ্য নেই। ট্যাক্স পেমেন্টে পরিবেশ সারচার্জ নির্ধারণ করুন।')}
    </p>}
    {error && !compactEditor && <p role="alert" className="eledger-entry-error">{error}</p>}
    <datalist id="eledger-surcharge-bank-options">
      {bankNames.map((name) => <option key={name} value={name}/>)}
    </datalist>
    <div className="overflow-x-auto">
      <table className="eledger-official-records">
        <thead><tr>{headers.map((header) => <th key={header} scope="col">{header}</th>)}</tr></thead>
        <tbody>{listed.length === 0 ? <tr className="eledger-empty-records-row"><td colSpan={headers.length}>
          {t('No Data Found', 'কোনো তথ্য পাওয়া যায়নি')}</td></tr> :
          listed.map((entry) => <tr key={entry.id} className="eledger-neir-record-row">
            {cells(entry).map((value, index) =>
              <td key={index} data-label={headers[index]}>{value}</td>)}
            <td data-label={headers[6]}>
              <div className="eledger-button-group">
                <button type="button" className="eledger-button eledger-button-secondary"
                  aria-label={t('View details', 'বিস্তারিত দেখুন')} onClick={() => setSelected(entry)}>
                  <Eye size={16}/>{t('View', 'দেখুন')}
                </button>
                {onUpdate && <button type="button" className="eledger-button eledger-button-secondary"
                  onClick={() => startEdit(entry)}><Pencil size={16}/>{t('Edit', 'সম্পাদনা')}</button>}
                {onDelete && <button type="button" className="eledger-button eledger-button-danger"
                  onClick={() => void remove(entry)}><Trash2 size={16}/>{t('Delete', 'মুছুন')}</button>}
              </div>
            </td>
          </tr>)}
          {open && !compactEditor && inlineRow}
        </tbody>
      </table>
    </div>
    <div className="eledger-payment-columns">
      <strong>{t('Total Paid Amount', 'মোট পরিশোধিত অঙ্ক')}</strong>
      <strong>{formatAmount(sum)}</strong>
    </div>
    <div className="eledger-payment-columns">
      <span>{t('Surcharge Declared By Assessee', 'করদাতার ঘোষিত সারচার্জ')}</span>
      <span title={t('Tax & Payment data is not connected.', 'কর ও পরিশোধের তথ্য সংযুক্ত নয়।')}>—</span>
    </div>
    <LedgerTip label={t('About this record', 'এই রেকর্ড সম্পর্কে')}>
      {t('Amounts shown are browser-local unverified entries, not an NBR-confirmed payment or credit.',
        'প্রদর্শিত অঙ্ক ব্রাউজারের স্থানীয় অযাচাইকৃত রেকর্ড, এনবিআর নিশ্চিত পরিশোধ বা কর ক্রেডিট নয়।')}
    </LedgerTip>
    {selected && <NeirRecordDetailsDrawer title={t('Record Details', 'রেকর্ডের বিস্তারিত')}
      subtitle={selected.referenceNo} onClose={() => setSelected(null)}
      fields={cells(selected).map((value, index) => ({ label: headers[index], value: String(value) }))}
      footerActions={<div className="eledger-button-group">
        {onUpdate && <button type="button" className="eledger-button eledger-button-secondary"
          onClick={() => startEdit(selected)}>{t('Edit', 'সম্পাদনা')}</button>}
        {onDelete && <button type="button" className="eledger-button eledger-button-danger"
          onClick={() => void remove(selected)}>{t('Delete', 'মুছুন')}</button>}
      </div>} showCaveat={false}/>}
    {open && compactEditor && <LedgerFormModal title={editing ? t('Edit Entry', 'রেকর্ড সম্পাদনা') : t('Add Entry', 'রেকর্ড যোগ করুন')} onClose={close}>
      <form noValidate aria-label={t('Environmental surcharge fields', 'পরিবেশ সারচার্জের তথ্য')} onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <LedgerFormGrid>
          <LedgerInput label={t('Motor Vehicle Registration No', 'মোটরযানের নিবন্ধন নম্বর')}
            value={draft.registrationNo} onValueChange={(value) => change('registrationNo', value)}/>
          <LedgerInput label={t('Transaction ID', 'লেনদেন আইডি')} required
            value={draft.reference} onValueChange={(value) => change('reference', value)}/>
          <LedgerInput label={t('Bank Name', 'ব্যাংকের নাম')}
            value={draft.bankName} onValueChange={(value) => change('bankName', value)}/>
          <LedgerInput label={t('Branch Name', 'শাখার নাম')}
            value={draft.branchName} onValueChange={(value) => change('branchName', value)}/>
          <LedgerInput label={t('Payment Date', 'পরিশোধের তারিখ')} required type="date"
            value={draft.date} onValueChange={(value) => change('date', value)}/>
          <LedgerInput label={t('Paid Amount', 'পরিশোধিত অঙ্ক')} required type="number" min="0.01" step="0.01"
            value={draft.amount} onValueChange={(value) => change('amount', value)}/>
        </LedgerFormGrid>
        {error && <p role="alert" className="eledger-entry-error">{error}</p>}
        <div className="eledger-form-actions">
          <button type="button" className="eledger-button eledger-button-secondary" disabled={busy} onClick={close}>
            <X size={16}/>{t('Cancel', 'বাতিল')}
          </button>
          <button type="submit" className="eledger-button eledger-button-primary" disabled={busy}>
            <Check size={16}/>{busy ? t('Saving…', 'সংরক্ষণ হচ্ছে…') : t('Save', 'সংরক্ষণ')}
          </button>
        </div>
      </form>
    </LedgerFormModal>}
  </section>;
};
