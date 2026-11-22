import React, { useEffect, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, Eye, Check, X } from 'lucide-react';
import type { ClaimEvidence, LedgerEntry } from '../../domain/models.ts';
import { useLedgerCopy } from '../../context/LanguageContext.tsx';
import { LedgerInput, LedgerSelect, LedgerTip } from '../ui/LedgerForm.tsx';
import { LedgerFormGrid } from '../ui/LedgerPage.tsx';
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
  const [gridDrafts, setGridDrafts] = useState<Record<string,Draft>>({});
  const [newGridRows, setNewGridRows] = useState<Array<{ key: string; draft: Draft }>>([]);
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
    setError(''); setFeedback('');
    if (!compactEditor) {
      newRowId.current += 1;
      setNewGridRows((rows) => [...rows, {key: 'new-'+newRowId.current, draft: emptyDraft()}]);
      return;
    }
    setDraft(emptyDraft()); setEditing(null); setOpen(true);
  };
  const startEdit = (entry: LedgerEntry) => {
    setError(''); setFeedback('');
    if (!compactEditor) {
      setGridDrafts((drafts) => ({...drafts, [entry.id]: drafts[entry.id] ?? draftFromEntry(entry)}));
      return;
    }
    setDraft(draftFromEntry(entry));
    setSelected(null); setEditing(entry); setOpen(true);
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
  const updateGrid = (key: string, field: keyof Draft, value: string, isNew: boolean) => {
    if (isNew) setNewGridRows((rows) => rows.map((row) => row.key === key ?
      { ...row, draft: {...row.draft,[field]:value} } : row));
    else setGridDrafts((drafts) => ({
      ...drafts, [key]: {...(drafts[key] ?? draftFromEntry(entries.find((e) => e.id === key)!)), [field]: value},
    }));
    setError('');
  };
  const gridChanges = entries.some((entry) => {
    const changed = gridDrafts[entry.id];
    return !!changed && JSON.stringify(changed) !== JSON.stringify(draftFromEntry(entry));
  }) || newGridRows.length > 0;
  const draftTotal = entries.reduce((total, entry) =>
    total + Number((gridDrafts[entry.id] ?? draftFromEntry(entry)).amount || 0), 0) +
    newGridRows.reduce((total, row) => total + Number(row.draft.amount || 0),0);
  const cancelGrid = () => { if (!busy) { setGridDrafts({}); setNewGridRows([]); setError(''); } };
  const validGridDraft = (row: Draft): string | null => {
    if (!row.reference.trim()) return t('Transaction ID is required.', 'লেনদেন আইডি আবশ্যক।');
    if (!row.bankName || !bankNames.includes(row.bankName)) return t('Choose a bank from the list.', 'তালিকা থেকে ব্যাংক নির্বাচন করুন।');
    if (!row.date || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) return t('Enter a valid payment date.', 'সঠিক পরিশোধের তারিখ লিখুন।');
    if (!/^\d+(?:\.\d{1,2})?$/.test(row.amount) || Number(row.amount) <= 0)
      return t('Paid Amount must be positive, with at most two decimals.', 'পরিশোধিত অঙ্ক ধনাত্মক এবং সর্বোচ্চ দুই দশমিকের হতে হবে।');
    return null;
  };
  const saveGrid = async () => {
    if (busy || !gridChanges) return;
    setError('');
    const changedExisting = entries.map((entry) => ({ entry, draft: gridDrafts[entry.id] }))
      .filter(({entry,draft}) => !!draft && JSON.stringify(draft) !== JSON.stringify(draftFromEntry(entry)));
    const changes = [
      ...changedExisting.map(({entry,draft}) => ({key:entry.id,entry,draft:draft!})),
      ...newGridRows.map((row) => ({key:row.key,entry:null as LedgerEntry|null,draft:row.draft})),
    ];
    const changedIds = new Set(changedExisting.map(({entry}) => entry.id));
    const ids = new Set(entries.filter((entry) => !changedIds.has(entry.id))
      .map((entry) => entry.referenceNo.trim().toLowerCase()));
    for (const row of changes) {
      const issue = validGridDraft(row.draft);
      if (issue) { setError(issue); return; }
      const identifier = row.draft.reference.trim().toLowerCase();
      if (ids.has(identifier)) { setError(t('Duplicate transaction ID in this ledger.', 'এই লেজারে একই লেনদেন আইডি একাধিকবার আছে।')); return; }
      ids.add(identifier);
    }
    if (!onUpdate && changedExisting.length > 0) {
      setError(t('Editing is unavailable for these records.', 'রেকর্ড সম্পাদনার অনুমতি নেই।')); return;
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
        if (entry) setGridDrafts((rows) => {
          const next = {...rows}; delete next[entry.id]; return next;
        });
        else setNewGridRows((rows) => rows.filter((row) => row.key !==
          changes[saved - 1]?.key));
      }
      setGridDrafts({});
      setNewGridRows([]);
      setFeedback(t('Local surcharge entries saved; none are government-verified payments.',
        'স্থানীয় সারচার্জ রেকর্ড সংরক্ষিত হয়েছে; এগুলো সরকারি যাচাইকৃত পরিশোধ নয়।'));
    } catch {
      setError(t('Save interrupted; review the records and retry unsaved rows.',
        'সংরক্ষণ বাধাগ্রস্ত হয়েছে; রেকর্ড দেখে বাকি সারি আবার চেষ্টা করুন।'));
    } finally { setBusy(false); }
  };
  const renderGridRow = (key: string, row: Draft, entry?: LedgerEntry) => {
    const field = (name: keyof Draft, index: number, type: string = 'text') =>
      <td key={name} data-label={headers[index]}>
        {name === 'bankName' ? <select className="eledger-control eledger-inline-input"
          aria-label={headers[index]} value={row.bankName} disabled={busy}
          onChange={(event) => updateGrid(key, name, event.target.value, !entry)}>
          <option value="">{t('Select Bank','ব্যাংক নির্বাচন করুন')}</option>
          {bankNames.map((bank) => <option key={bank} value={bank}>{bank}</option>)}
        </select> : <input className="eledger-control eledger-inline-input" type={type}
          aria-label={headers[index]} value={row[name]} disabled={busy}
          min={name === 'amount' ? '0.01' : undefined}
          step={name === 'amount' ? '0.01' : undefined}
          required={name === 'reference' || name === 'date' || name === 'amount'}
          onChange={(event) => updateGrid(key,name,event.target.value,!entry)}/>}
      </td>;
    return <tr key={key} className="eledger-source-inline-editor eledger-surcharge-grid-row"
      aria-label={entry ? t('Editable surcharge record','সম্পাদনাযোগ্য সারচার্জ রেকর্ড') :
        t('New surcharge record','নতুন সারচার্জ রেকর্ড')}>
      {field('registrationNo',0)}
      {field('reference',1)}
      {field('bankName',2)}
      {field('branchName',3)}
      {field('date',4,'date')}
      {field('amount',5,'number')}
      <td data-label={headers[6]}><div className="eledger-surcharge-grid-actions">
        {entry ? <>
          <button type="button" className="eledger-action-icon" disabled={busy}
            aria-label={`${t('View details','বিস্তারিত দেখুন')} ${entry.referenceNo}`}
            onClick={() => setSelected(entry)}><Eye size={17}/></button>
          {onUpdate && <button type="button" className="eledger-action-icon" disabled={busy}
            aria-label={`${t('Edit','সম্পাদনা')} ${entry.referenceNo}`}
            onClick={() => startEdit(entry)}><Pencil size={17}/></button>}
          {onDelete && <button type="button" className="eledger-action-icon is-danger" disabled={busy}
            aria-label={`${t('Delete','মুছুন')} ${entry.referenceNo}`}
            onClick={() => void remove(entry)}><Trash2 size={17}/></button>}
        </> : <button type="button" className="eledger-action-icon is-danger"
          aria-label={t('Remove unsaved row','অসংরক্ষিত সারি সরান')}
          onClick={() => setNewGridRows((rows) => rows.filter((candidate) => candidate.key !== key))}>
          <Trash2 size={17}/></button>}
      </div></td>
    </tr>;
  };
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
    {entries.length === 0 && newGridRows.length === 0 && !open && <p className="eledger-entry-empty">
      {t('No Environmental Surcharge Payable. Please set Environmental Surcharge in Tax Payment.',
        'পরিবেশ সারচার্জ পরিশোধযোগ্য নেই। ট্যাক্স পেমেন্টে পরিবেশ সারচার্জ নির্ধারণ করুন।')}
    </p>}
    {error && !compactEditor && <p role="alert" className="eledger-entry-error">{error}</p>}
    <div className="overflow-x-auto">
      <table className="eledger-official-records">
        <thead><tr>{headers.map((header) => <th key={header} scope="col">{header}</th>)}</tr></thead>
        <tbody>{listed.length === 0 && (compactEditor || newGridRows.length === 0) ? <tr className="eledger-empty-records-row"><td colSpan={headers.length}>
          {t('No Data Found', 'কোনো তথ্য পাওয়া যায়নি')}</td></tr> :
          listed.map((entry) => !compactEditor ? renderGridRow(entry.id, gridDrafts[entry.id] ?? draftFromEntry(entry), entry)
            : <tr key={entry.id} className="eledger-neir-record-row">
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
          {!compactEditor && newGridRows.map((row) => renderGridRow(row.key,row.draft))}
        </tbody>
      </table>
    </div>
    <div className="eledger-payment-columns">
      <strong>{t('Total Paid Amount', 'মোট পরিশোধিত অঙ্ক')}</strong>
      <strong>{formatAmount(!compactEditor && gridChanges ? draftTotal : sum)}</strong>
    </div>
    <div className="eledger-payment-columns">
      <span>{t('Surcharge Declared By Assessee', 'করদাতার ঘোষিত সারচার্জ')}</span>
      <span title={t('Tax & Payment data is not connected.', 'কর ও পরিশোধের তথ্য সংযুক্ত নয়।')}>—</span>
    </div>
    {!compactEditor && <div className="eledger-surcharge-grid-footer">
      <p className="eledger-surcharge-unsaved-note">{gridChanges
        ? t('Draft total — Save to record these local changes.', 'খসড়ার মোট অঙ্ক — স্থানীয় পরিবর্তন সংরক্ষণ করতে Save চাপুন।')
        : t('All changes are browser-local. No payment is transmitted.', 'সব পরিবর্তন ব্রাউজারের স্থানীয়। কোনো পরিশোধ পাঠানো হয় না।')}</p>
      <div className="eledger-surcharge-grid-footer-actions">
        <button type="button" className="eledger-button eledger-button-secondary" disabled={!gridChanges || busy}
          onClick={cancelGrid}><X size={16}/>{t('Discard changes','পরিবর্তন বাতিল করুন')}</button>
        <button type="button" className="eledger-button eledger-button-primary" disabled={!gridChanges || busy}
          onClick={() => void saveGrid()}><Check size={16}/>{busy ? t('Saving…','সংরক্ষণ হচ্ছে…') : t('Save','সংরক্ষণ')}</button>
      </div>
    </div>}
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
            <Check size={16}/>{busy ? t('Saving…', 'সংরক্ষণ হচ্ছে…') : t('Save', 'সংরক্ষণ')}
          </button>
        </div>
      </form>
    </LedgerFormModal>}
  </section>;
};
