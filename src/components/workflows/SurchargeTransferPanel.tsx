import React, { useRef, useState } from 'react';
import { Plus, Trash2, Check, X } from 'lucide-react';
import type { ClaimEvidence, LedgerEntry } from '../../domain/models.ts';
import { useLedgerCopy } from '../../context/LanguageContext.tsx';
import { LedgerInput, LedgerSelect, LedgerTip } from '../ui/LedgerForm.tsx';
import { LedgerFormGrid, LedgerPageAction } from '../ui/LedgerPage.tsx';
import { LedgerRecordActions } from '../tables/LedgerRecordActions.tsx';
import { LedgerFormModal } from '../ui/LedgerFormModal.tsx';
import { NeirRecordDetailsDrawer } from '../neir/NeirRecordDetailsDrawer.tsx';

type LocalSurchargeDetails = Pick<ClaimEvidence, 'registrationNo' | 'bankName' | 'branchName'>;
type SaveResult = { success: boolean; error?: string };
type Draft = { registrationNo: string; reference: string; bankName: string; branchName: string; date: string; amount: string };
const emptyDraft = (): Draft => ({ registrationNo: '', reference: '', bankName: '', branchName: '', date: '', amount: '' });
const draftFromEntry = (entry: LedgerEntry): Draft => ({
  registrationNo: entry.claimEvidence?.registrationNo ?? '', reference: entry.referenceNo,
  bankName: entry.claimEvidence?.bankName ?? '', branchName: entry.claimEvidence?.branchName ?? '',
  date: entry.date, amount: String(entry.taxDeducted),
});
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
  const newRowId = useRef(0);

  const [newGridRows, setNewGridRows] = useState<Array<{ key: string; draft: Draft }>>([]);
  const [editing, setEditing] = useState<LedgerEntry | null>(null);
  const [selected, setSelected] = useState<LedgerEntry | null>(null);
  const [open, setOpen] = useState(false);
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
    setError(''); setFeedback(''); setEditing(null); setOpen(true);
    newRowId.current += 1;
    setNewGridRows([{key:'new-'+newRowId.current, draft:emptyDraft()}]);
  };
  const startEdit = (entry: LedgerEntry) => {
    setError(''); setFeedback(''); setOpen(false);
    setDraft(draftFromEntry(entry)); setEditing(entry); setSelected(entry);
  };
  const close = () => {
    if (busy) return;
    setOpen(false); setEditing(null); setSelected(null);
    setNewGridRows([]); setError('');
  };
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
    if (!draft.bankName || !bankNames.includes(draft.bankName)) {
      setError(t('Choose a bank from the list.', 'তালিকা থেকে ব্যাংক নির্বাচন করুন।')); return;
    }
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
      setOpen(false); setEditing(null); setSelected(null); setDraft(emptyDraft());
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
  const updateGrid = (key: string, field: keyof Draft, value: string, isNew: boolean) => {
    if (isNew) setNewGridRows((rows) => rows.map((row) => row.key === key ?
      { ...row, draft: {...row.draft,[field]:value} } : row));
    else setDraft((previous)=>({...previous,[field]:value}));
    setError('');
  };
  const validGridDraft = (row: Draft): string | null => {
    if (!row.reference.trim()) return t('Transaction ID is required.', 'লেনদেন আইডি আবশ্যক।');
    if (!row.bankName || !bankNames.includes(row.bankName)) return t('Choose a bank from the list.', 'তালিকা থেকে ব্যাংক নির্বাচন করুন।');
    if (!row.date || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) return t('Enter a valid payment date.', 'সঠিক পরিশোধের তারিখ লিখুন।');
    if (!/^\d+(?:\.\d{1,2})?$/.test(row.amount) || Number(row.amount) <= 0)
      return t('Paid Amount must be positive, with at most two decimals.', 'পরিশোধিত অঙ্ক ধনাত্মক এবং সর্বোচ্চ দুই দশমিকের হতে হবে।');
    return null;
  };
  const saveGrid = async () => {
    if (busy || newGridRows.length === 0) return;
    setError('');
    const changes = newGridRows.map((row)=>({key:row.key,entry:null as LedgerEntry|null,draft:row.draft}));
    const ids = new Set(entries.map((entry)=>entry.referenceNo.trim().toLowerCase()));
    for (const row of changes) {
      const issue = validGridDraft(row.draft);
      if (issue) { setError(issue); return; }
      const identifier = row.draft.reference.trim().toLowerCase();
      if (ids.has(identifier)) { setError(t('Duplicate transaction ID in this ledger.', 'এই লেজারে একই লেনদেন আইডি একাধিকবার আছে।')); return; }
      ids.add(identifier);
    }

    setBusy(true);
    let saved = 0;
    try {
      for (const {entry,draft:row} of changes) {
        const details: LocalSurchargeDetails = {
          ...(row.registrationNo.trim() && {registrationNo:row.registrationNo.trim()}),
          ...(row.bankName.trim() && {bankName:row.bankName.trim()}),
          ...(row.branchName.trim() && {branchName:row.branchName.trim()}),
        };
        const amount = Number(row.amount);
        const outcome = entry && onUpdate
          ? await onUpdate(entry.id, {
              referenceNo: row.reference.trim(), date: row.date, taxDeducted: amount, grossAmount: amount,
              sourceEntity: row.bankName,
              claimEvidence: {...entry.claimEvidence, ...details},
            })
          : await onRecord(row.reference.trim(), amount, row.date, details);
        if (!outcome.success) {
          setError((outcome.error || t('Save failed.', 'সংরক্ষণ ব্যর্থ।')) + ' ' +
            t('Earlier rows may have saved; unsaved drafts remain for recovery.',
              'পূর্ববর্তী সারিগুলো সংরক্ষিত হতে পারে; বাকি খসড়া পুনরুদ্ধারের জন্য রাখা হয়েছে।'));
          return;
        }
        saved += 1;
        setNewGridRows((rows)=>rows.filter((row)=>row.key!==changes[saved-1]?.key));
      }

      setNewGridRows([]); setOpen(false);
      setFeedback(t('Local surcharge entries saved; none are government-verified payments.',
        'স্থানীয় সারচার্জ রেকর্ড সংরক্ষিত হয়েছে; এগুলো সরকারি যাচাইকৃত পরিশোধ নয়।'));
    } catch {
      setError(t('Save interrupted; review the records and retry unsaved rows.',
        'সংরক্ষণ বাধাগ্রস্ত হয়েছে; রেকর্ড দেখে বাকি সারি আবার চেষ্টা করুন।'));
    } finally { setBusy(false); }
  };
  const renderSingleEditor = () => (<form noValidate aria-label={t('Environmental surcharge fields', 'পরিবেশ সারচার্জের তথ্য')} onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <LedgerFormGrid>
          <LedgerInput label={t('Motor Vehicle Registration No', 'মোটরযানের নিবন্ধন নম্বর')}
            value={draft.registrationNo} onValueChange={(value) => change('registrationNo', value)}/>
          <LedgerInput label={t('Transaction ID', 'লেনদেন আইডি')} required
            value={draft.reference} onValueChange={(value) => change('reference', value)}/>
          <LedgerSelect label={t('Bank Name', 'ব্যাংকের নাম')} required
            value={draft.bankName} onValueChange={(value) => change('bankName', value)}>
            <option value="">{t('Select Bank','ব্যাংক নির্বাচন করুন')}</option>
            {bankNames.map((bank) => <option key={bank} value={bank}>{bank}</option>)}
          </LedgerSelect>
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
            <Check size={16}/>{busy ? t('Saving…', 'সংরক্ষণ হচ্ছে…') : t('Save Changes', 'পরিবর্তন সংরক্ষণ')}
          </button>
        </div>
      </form>);
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

        </div>
      </div>
    </div>
    <LedgerPageAction><button type="button" className="eledger-button eledger-button-primary"
      disabled={busy || open || !!editing} onClick={startAdd}>
      <Plus size={16}/>{t('Add Entry','রেকর্ড যোগ করুন')}
    </button></LedgerPageAction>
    <p className="eledger-claim-summary-content">
      {t('Tax & Payment reference only. No tax rate is calculated, no NBR service is connected, and no payment is transmitted.',
        'শুধু কর ও পরিশোধের রেফারেন্স। করহার গণনা, এনবিআর সেবা সংযোগ বা অর্থ পরিশোধ করা হয় না।')}
    </p>
    {feedback && <p role="status" className="eledger-claim-feedback">{feedback}</p>}
    {entries.length === 0 && newGridRows.length === 0 && !open && <p className="eledger-entry-empty">
      {t('No Environmental Surcharge Payable. Please set Environmental Surcharge in Tax Payment.',
        'পরিবেশ সারচার্জ পরিশোধযোগ্য নেই। ট্যাক্স পেমেন্টে পরিবেশ সারচার্জ নির্ধারণ করুন।')}
    </p>}
    {error && !open && <p role="alert" className="eledger-entry-error">{error}</p>}
    <div className="overflow-x-auto">
      <table className="eledger-official-records eledger-data-table">
        <thead><tr>{headers.map((header) => <th key={header} scope="col">{header}</th>)}</tr></thead>
        <tbody>{listed.length === 0 ? <tr className="eledger-empty-records-row"><td colSpan={headers.length}>
          {t('No Data Found','কোনো তথ্য পাওয়া যায়নি')}</td></tr> :
          listed.map((entry) => <tr key={entry.id} className="eledger-neir-record-row">
            {cells(entry).map((value,index)=><td key={index} data-label={headers[index]}>{value}</td>)}
            <td data-label={headers[6]}>
              <LedgerRecordActions reference={entry.referenceNo}
                onView={() => setSelected(entry)}
                onEdit={onUpdate ? () => startEdit(entry) : undefined}
                onDelete={onDelete ? () => void remove(entry) : undefined}
                disabled={busy}/>
            </td>
          </tr>)}
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
    {selected && <NeirRecordDetailsDrawer
      title={editing?.id === selected.id ? t('Edit Record','রেকর্ড সম্পাদনা') : t('Record Details','রেকর্ডের বিস্তারিত')}
      subtitle={selected.referenceNo} onClose={close}
      editor={editing?.id === selected.id ? renderSingleEditor() : undefined}
      fields={cells(selected).map((value,index)=>({label:headers[index],value:String(value)}))}
      showCaveat={false}/>}
    {open && <LedgerFormModal title={t('Add Entry','রেকর্ড যোগ করুন')} onClose={close}>
      <div className="eledger-surcharge-batch-modal">
        {newGridRows.map((row,index) => <section className="eledger-surcharge-batch-item" key={row.key}>
          <div className="eledger-surcharge-batch-heading">
            <strong>{t('Transaction','লেনদেন')} {index+1}</strong>
            {newGridRows.length>1 && <button type="button" className="eledger-button eledger-button-secondary"
              disabled={busy} onClick={() => setNewGridRows((rows)=>rows.filter(item=>item.key!==row.key))}>
              <Trash2 size={16}/>{t('Remove','সরান')}</button>}
          </div>
          <LedgerFormGrid>
            <LedgerInput label={t('Motor Vehicle Registration No','মোটরযানের নিবন্ধন নম্বর')}
              value={row.draft.registrationNo} onValueChange={v=>updateGrid(row.key,'registrationNo',v,true)}/>
            <LedgerInput label={t('Transaction ID','লেনদেন আইডি')} required
              value={row.draft.reference} onValueChange={v=>updateGrid(row.key,'reference',v,true)}/>
            <LedgerSelect label={t('Bank Name','ব্যাংকের নাম')} required
              value={row.draft.bankName} onValueChange={v=>updateGrid(row.key,'bankName',v,true)}>
              <option value="">{t('Select Bank','ব্যাংক নির্বাচন করুন')}</option>
              {bankNames.map(bank=><option key={bank} value={bank}>{bank}</option>)}
            </LedgerSelect>
            <LedgerInput label={t('Branch Name','শাখার নাম')}
              value={row.draft.branchName} onValueChange={v=>updateGrid(row.key,'branchName',v,true)}/>
            <LedgerInput label={t('Payment Date','পরিশোধের তারিখ')} required type="date"
              value={row.draft.date} onValueChange={v=>updateGrid(row.key,'date',v,true)}/>
            <LedgerInput label={t('Paid Amount','পরিশোধিত অঙ্ক')} required type="number" min="0.01" step="0.01"
              value={row.draft.amount} onValueChange={v=>updateGrid(row.key,'amount',v,true)}/>
          </LedgerFormGrid>
        </section>)}
        <button type="button" className="eledger-button eledger-button-secondary" disabled={busy}
          onClick={() => {newRowId.current++;setNewGridRows(rows=>[...rows,{key:'new-'+newRowId.current,draft:emptyDraft()}]);}}>
          <Plus size={16}/>{t('Add another transaction','আরেকটি লেনদেন যোগ করুন')}
        </button>
        <div className="eledger-payment-columns">
          <strong>{t('Total Paid Amount','মোট পরিশোধিত অঙ্ক')}</strong>
          <strong>{formatAmount(newGridRows.reduce((total,row)=>total+Number(row.draft.amount||0),0))}</strong>
        </div>
        {error && <p role="alert" className="eledger-entry-error">{error}</p>}
        <p className="eledger-surcharge-unsaved-note">{t('Local records only; no payment is transmitted.','শুধু স্থানীয় রেকর্ড; কোনো পরিশোধ পাঠানো হয় না।')}</p>
        <div className="eledger-form-actions">
          <button type="button" className="eledger-button eledger-button-secondary" disabled={busy} onClick={close}>
            <X size={16}/>{t('Cancel','বাতিল')}</button>
          <button type="button" className="eledger-button eledger-button-primary"
            disabled={busy||newGridRows.length===0} onClick={()=>void saveGrid()}>
            <Check size={16}/>{busy?t('Saving…','সংরক্ষণ হচ্ছে…'):t('Save all transactions','সব লেনদেন সংরক্ষণ')}</button>
        </div>
      </div>
    </LedgerFormModal>}
  </section>;
};
