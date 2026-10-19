import React, { useState } from 'react';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import type { ClaimEvidence, LedgerEntry } from '../../domain/models.ts';
import { localDateInputValue } from '../../domain/localDate.ts';
import { normalizeClaimEvidence } from '../../domain/claimEvidence.ts';

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
      setError('Depositing authority, challan/certificate reference and date are required.');
      return;
    }
    if (!Number.isFinite(documentAmount) || documentAmount <= 0 ||
        !Number.isFinite(claimedAmount) || claimedAmount <= 0 ||
        claimedAmount > documentAmount) {
      setError('Enter positive document and claimed amounts. Claimed amount cannot exceed the document amount.');
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
    if (!window.confirm(`Delete ledger entry for reference '${entry.referenceNo}'?`)) return;
    if (!(await onDeleteEntry(entry.id))) setError('This entry could not be deleted and has been preserved.');
  };

  const renderEditor = (key: string) => (
    <tr key={key} className="eledger-salary-editor-row">
      <td className="eledger-salary-row-index">{activeId === 'new' ? entries.length + 1 : entries.findIndex((entry) => entry.id === activeId) + 1}</td>
      <td><input aria-label="Depositing Authority" autoFocus value={draft.authority} onChange={(event) => change('authority', event.target.value)} placeholder="Enter Depositing Authority"/></td>
      <td><select aria-label="Payment Document Type" value={draft.documentType} onChange={(event) => change('documentType', event.target.value)}>
        <option value="CHALLAN">Challan</option><option value="CERTIFICATE">Certificate</option><option value="OTHER">Other</option>
      </select></td>
      <td><input aria-label="Challan / Certificate Reference No." value={draft.reference} onChange={(event) => change('reference', event.target.value)} placeholder="Enter Challan/Certificate Reference"/></td>
      <td><input aria-label="Challan / Certificate Date" type="date" value={draft.date} onChange={(event) => change('date', event.target.value)}/></td>
      <td><input aria-label="Challan / Certificate Amount" type="number" min="0" step="any" value={draft.documentAmount} onChange={(event) => change('documentAmount', event.target.value)} placeholder="Enter Amount"/></td>
      <td><input aria-label="Claimed Amount" type="number" min="0" step="any" value={draft.claimedAmount} onChange={(event) => change('claimedAmount', event.target.value)} placeholder="Enter Claimed Amount"/></td>
      <td className="eledger-salary-bank-fields"><input aria-label="Bank Name" value={draft.bank} onChange={(event) => change('bank', event.target.value)} placeholder="Bank Name"/>
        <input aria-label="Branch Name" value={draft.branch} onChange={(event) => change('branch', event.target.value)} placeholder="Branch Name"/></td>
      <td><div className="eledger-salary-row-actions">
        <button type="button" className="save" aria-label="Save Salary claim" title="Save" disabled={saving} onClick={save}><Check size={16}/></button>
        <button type="button" className="cancel" aria-label="Cancel Salary edit" title="Cancel" disabled={saving} onClick={cancel}><X size={16}/></button>
      </div></td>
    </tr>
  );

  return (
    <section className="eledger-salary-table" aria-label="Salary Others claims">
      <div className="eledger-salary-toolbar">
        <div className="eledger-salary-stat"><span>Total Claimed Amount</span><strong>{money(entries.reduce((sum, entry) => sum + Number(entry.taxDeducted), 0))}</strong></div>
        <div className="eledger-salary-stat"><span>Records</span><strong>{entries.length}</strong></div>
        <button type="button" className="eledger-salary-add" disabled={activeId !== null} onClick={openNew}><Plus size={16}/>Add new</button>
      </div>
      {error && <div role="alert" className="eledger-salary-error">{error}</div>}
      <div className="eledger-salary-scroll">
        <table>
          <thead><tr>
            <th scope="col">SL.</th><th scope="col">Depositing Authority</th>
            <th scope="col">Payment Document Type</th>
            <th scope="col">Challan/ Certificate Reference No.</th>
            <th scope="col">Challan/ Certificate Date</th>
            <th scope="col">Challan/ Certificate Amount</th>
            <th scope="col">Claimed Amount</th><th scope="col">Bank / Branch</th>
            <th scope="col">Action</th>
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
                  <button type="button" className="edit" aria-label={`Edit ${entry.referenceNo}`} title="Edit" onClick={() => openEdit(entry)} disabled={activeId !== null}><Pencil size={16}/></button>
                  <button type="button" className="delete" aria-label={`Delete ${entry.referenceNo}`} title="Delete" onClick={() => remove(entry)} disabled={activeId !== null}><Trash2 size={16}/></button>
                </div></td>
              </tr>
            ))}
            {activeId === 'new' && renderEditor('new')}
            {entries.length === 0 && activeId === null && <tr><td colSpan={9} className="eledger-salary-empty">No salary claims recorded for this taxpayer and year. Use Add new to create a local claim.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="eledger-salary-disclaimer">These are recorded claims, not confirmed credits. Payment verification requires an independent authoritative source.</p>
    </section>
  );
};
