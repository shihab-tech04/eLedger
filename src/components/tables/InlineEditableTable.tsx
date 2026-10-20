/**
 * Inline Editable Table Component
 * Conforms strictly to Requirement #6:
 * - Clicking 'Add Entry' inserts an editable row directly inside the table.
 * - Editable row includes relevant inputs, Save, Cancel.
 * - After Save, appears as normal table row.
 * - Preserves row edit and delete behavior.
 * - No separate modal for adding rows!
 */

import React, { useState } from 'react';
import { LedgerEntry, TaxCategory, LedgerRouteId, ClaimEvidence } from '../../domain/models.ts';
import { formatCurrencyBDT } from '../../domain/calculations.ts';
import { getClaimEvidenceFields, normalizeClaimEvidence } from '../../domain/claimEvidence.ts';
import { ClaimEvidenceFields, ClaimEvidenceSummary } from './ClaimEvidenceFields.tsx';
import { useLedgerCopy } from '../../context/LanguageContext.tsx';
import { Plus, Check, X, Pencil, Trash2, ShieldCheck, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { LedgerInput, LedgerTip } from '../ui/LedgerForm.tsx';
import { LedgerFormGrid } from '../ui/LedgerPage.tsx';

interface InlineEditableTableProps {
  entries: LedgerEntry[];
  category: TaxCategory;
  routeId: LedgerRouteId;
  defaultSection: string;
  onSaveNewEntry: (entryData: {
    referenceNo: string;
    sourceEntity: string;
    sectionCode: string;
    grossAmount: number;
    taxDeducted: number;
    date: string;
    remarks?: string;
    claimEvidence?: ClaimEvidence;
  }) => Promise<{ success: boolean; error?: string }>;
  onUpdateEntry: (
    id: string,
    entryData: Partial<LedgerEntry>
  ) => Promise<{ success: boolean; error?: string }>;
  onDeleteEntry: (id: string) => Promise<boolean>;
  allowAdd?: boolean;
  allowEditDelete?: boolean;
}

type EditableRowFields = {
  referenceNo: string;
  sourceEntity: string;
  sectionCode: string;
  grossAmount: string;
  taxDeducted: string;
  date: string;
};

type TableFieldLabels = Pick<Record<keyof EditableRowFields, string>,
  'referenceNo' | 'sourceEntity' | 'grossAmount' | 'taxDeducted'>;

/** Financial workflow terminology must match what a row actually records. */
export const getTableFieldLabels = (
  category: TaxCategory,
  t: (english: string, bengali: string) => string,
  routeId?: LedgerRouteId,
): TableFieldLabels => ({
  referenceNo: category === 'ADJUSTMENT'
    ? t('Order / Adjustment Reference', 'আদেশ / সমন্বয়ের রেফারেন্স')
    : t('Reference / Challan No', 'রেফারেন্স / চালান নম্বর'),
  sourceEntity: category === 'PAYMENT'
    ? t('Receiving Authority / Bank', 'গ্রহণকারী কর্তৃপক্ষ / ব্যাংক')
    : category === 'ADJUSTMENT'
      ? t('Issuing Authority / Circle', 'আদেশ প্রদানকারী কর্তৃপক্ষ / সার্কেল')
      : t('Deductor / Source Entity', 'কর্তনকারী / উৎস প্রতিষ্ঠান'),
  grossAmount: routeId === 'environmental-surcharge'
    ? t('Assessed Surcharge (৳)', 'নির্ধারিত সারচার্জ (৳)')
    : category === 'PAYMENT'
    ? t('Payment Basis (৳)', 'পরিশোধের ভিত্তি (৳)')
    : category === 'ADJUSTMENT'
      ? t('Eligible Amount (৳)', 'যোগ্য অঙ্ক (৳)')
      : t('Gross Amount', 'মোট অঙ্ক'),
  taxDeducted: routeId === 'environmental-surcharge'
    ? t('Recorded Surcharge (৳)', 'রেকর্ডকৃত সারচার্জ (৳)')
    : category === 'PAYMENT'
    ? t('Tax Paid (৳)', 'পরিশোধিত কর (৳)')
    : category === 'ADJUSTMENT'
      ? t('Adjusted Amount (৳)', 'সমন্বিত অঙ্ক (৳)')
      : category === 'AIT'
        ? t('AIT Claimed (৳)', 'দাবিকৃত অগ্রিম কর (৳)')
        : t('Tax Deducted (৳)', 'কর্তিত কর (৳)'),
});

/** Full-width labeled editor shared by all manual ledger routes at every width. */
export const LedgerEntryEditor: React.FC<{
  values: EditableRowFields;
  onFieldChange: (field: keyof EditableRowFields, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  evidence: ClaimEvidence;
  onEvidenceChange: (evidence: ClaimEvidence) => void;
  routeId: LedgerRouteId;
  fieldLabels?: TableFieldLabels;
  isEdit: boolean;
  error?: string | null;
}> = ({ values, onFieldChange, onSave, onCancel, evidence, onEvidenceChange, routeId, fieldLabels, isEdit, error }) => {
  const t = useLedgerCopy();
  const labels = fieldLabels ?? getTableFieldLabels('SOURCE_TAX', t);
  return (
    <form className="eledger-entry-editor" aria-label={isEdit ? t('Edit ledger entry','লেজার রেকর্ড সম্পাদনা') : t('New ledger entry','নতুন লেজার রেকর্ড')}
      onSubmit={(event) => { event.preventDefault(); onSave(); }}>
      <div className="eledger-entry-editor-heading">
        <strong>{isEdit ? t('Edit ledger entry','লেজার রেকর্ড সম্পাদনা') : t('New ledger entry','নতুন লেজার রেকর্ড')}</strong>
        <LedgerTip label={t('Date guidance','তারিখ নির্দেশনা')}>
          {t('Enter the date from the supporting document, not today by default.','সহায়ক দলিলের তারিখ দিন; স্বয়ংক্রিয়ভাবে আজকের তারিখ নয়।')}
        </LedgerTip>
      </div>
      {error && <p role="alert" className="eledger-entry-error">{error}</p>}
      <LedgerFormGrid>
        {([
          ['referenceNo', labels.referenceNo, 'text'],
          ['sourceEntity', labels.sourceEntity, 'text'],
          ['sectionCode', t('Section','ধারা'), 'text'],
          ['grossAmount', labels.grossAmount, 'number'],
          ['taxDeducted', labels.taxDeducted, 'number'],
          ['date', t('Date','তারিখ'), 'date'],
        ] as const).map(([field, label, type], index) => (
          <LedgerInput key={field} label={label} autoFocus={index === 0} required
            type={type} aria-label={`${isEdit ? t('Edit','সম্পাদনা') : t('New','নতুন')} ${label}`}
            value={values[field]} onValueChange={(value) => onFieldChange(field, value)}
            min={type === 'number' ? '0.01' : undefined} step={type === 'number' ? 'any' : undefined}
            className={type === 'number' ? 'is-number' : ''}/>
        ))}
      </LedgerFormGrid>
      {getClaimEvidenceFields(routeId).length > 0 && (
        <ClaimEvidenceFields routeId={routeId} evidence={evidence} onChange={onEvidenceChange} />
      )}
      <div className="eledger-form-actions">
        <button type="button" onClick={onCancel} className="eledger-button eledger-button-secondary"><X size={16}/>{t('Cancel','বাতিল')}</button>
        <button type="submit" className="eledger-button eledger-button-primary"><Check size={16}/>{isEdit ? t('Save Changes','পরিবর্তন সংরক্ষণ') : t('Save Entry','রেকর্ড সংরক্ষণ')}</button>
      </div>
    </form>
  );
};

// Retain the public export for existing integration/test consumers.
export const MobileRowEditor = LedgerEntryEditor;

export const InlineEditableTable: React.FC<InlineEditableTableProps> = ({
  entries,
  category,
  routeId,
  defaultSection,
  onSaveNewEntry,
  onUpdateEntry,
  onDeleteEntry,
  allowAdd = true,
  allowEditDelete = true,
}) => {
  const t = useLedgerCopy();
  const fieldLabels = getTableFieldLabels(category, t, routeId);
  // New row state
  const [isAddingRow, setIsAddingRow] = useState(false);
  const [newRowData, setNewRowData] = useState({
    referenceNo: '',
    sourceEntity: '',
    sectionCode: defaultSection,
    grossAmount: '',
    taxDeducted: '',
    date: '',
    remarks: '',
  });
  const [newRowError, setNewRowError] = useState<string | null>(null);
  const [newClaimEvidence, setNewClaimEvidence] = useState<ClaimEvidence>({});

  // Edit existing row state
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editRowData, setEditRowData] = useState<{
    referenceNo: string;
    sourceEntity: string;
    sectionCode: string;
    grossAmount: string;
    taxDeducted: string;
    date: string;
  }>({
    referenceNo: '',
    sourceEntity: '',
    sectionCode: '',
    grossAmount: '',
    taxDeducted: '',
    date: '',
  });
  const [editRowError, setEditRowError] = useState<string | null>(null);
  const [editClaimEvidence, setEditClaimEvidence] = useState<ClaimEvidence>({});

  // Start adding new inline row
  const handleStartAdd = () => {
    setIsAddingRow(true);
    setNewRowData({
      referenceNo: '',
      sourceEntity: '',
      sectionCode: defaultSection,
      grossAmount: '',
      taxDeducted: '',
      date: '',
      remarks: '',
    });
    setNewRowError(null);
    setNewClaimEvidence({});
  };

  const handleCancelAdd = () => {
    setIsAddingRow(false);
    setNewRowError(null);
  };

  const handleSaveAdd = async () => {
    setNewRowError(null);

    // Basic required validation
    if (!newRowData.referenceNo.trim()) {
      setNewRowError('Reference / Certificate No is required.');
      return;
    }
    if (!newRowData.sourceEntity.trim()) {
      setNewRowError('Deductor / Organization is required.');
      return;
    }
    if (!newRowData.date) {
      setNewRowError(t('Enter the date shown on the source document.','উৎস দলিলে লেখা তারিখ দিন।'));
      return;
    }
    const taxNum = Number(newRowData.taxDeducted);
    if (!Number.isFinite(taxNum) || taxNum <= 0) {
      setNewRowError(`${fieldLabels.taxDeducted} must be a positive number.`);
      return;
    }
    const grossNum = Number(newRowData.grossAmount);
    if (!Number.isFinite(grossNum) || grossNum <= 0) {
      setNewRowError('Gross Amount must be a positive number.');
      return;
    }
    if (taxNum > grossNum) {
      setNewRowError(`${fieldLabels.taxDeducted} cannot exceed ${fieldLabels.grossAmount}.`);
      return;
    }

    const res = await onSaveNewEntry({
      referenceNo: newRowData.referenceNo.trim(),
      sourceEntity: newRowData.sourceEntity.trim(),
      sectionCode: newRowData.sectionCode.trim() || defaultSection,
      grossAmount: grossNum,
      taxDeducted: taxNum,
      date: newRowData.date,
      remarks: newRowData.remarks.trim() || undefined,
      claimEvidence: normalizeClaimEvidence(newClaimEvidence),
    });

    if (res.success) {
      setIsAddingRow(false);
      setNewRowError(null);
    } else {
      setNewRowError(res.error || 'Failed to save entry. Check duplicate or invalid fields.');
    }
  };

  // Start editing existing row
  const handleStartEdit = (entry: LedgerEntry) => {
    setEditingRowId(entry.id);
    setEditClaimEvidence({ ...entry.claimEvidence });
    setEditRowData({
      referenceNo: entry.referenceNo,
      sourceEntity: entry.sourceEntity,
      sectionCode: entry.sectionCode,
      grossAmount: entry.grossAmount ? entry.grossAmount.toString() : '0',
      taxDeducted: entry.taxDeducted.toString(),
      date: entry.date,
    });
    setEditRowError(null);
  };

  const handleCancelEdit = () => {
    setEditingRowId(null);
    setEditRowError(null);
  };

  const handleSaveEdit = async (id: string) => {
    setEditRowError(null);

    if (!editRowData.referenceNo.trim()) {
      setEditRowError('Reference / Certificate No is required.');
      return;
    }
    if (!editRowData.sourceEntity.trim()) {
      setEditRowError('Deductor / Organization is required.');
      return;
    }
    if (!editRowData.date) {
      setEditRowError(t('Enter the date shown on the source document.','উৎস দলিলে লেখা তারিখ দিন।'));
      return;
    }
    const taxNum = Number(editRowData.taxDeducted);
    if (!Number.isFinite(taxNum) || taxNum <= 0) {
      setEditRowError(`${fieldLabels.taxDeducted} must be a positive number.`);
      return;
    }
    const grossNum = Number(editRowData.grossAmount);
    if (!Number.isFinite(grossNum) || grossNum <= 0) {
      setEditRowError('Gross Amount must be a positive number.');
      return;
    }
    if (taxNum > grossNum) {
      setEditRowError(`${fieldLabels.taxDeducted} cannot exceed ${fieldLabels.grossAmount}.`);
      return;
    }

    const res = await onUpdateEntry(id, {
      referenceNo: editRowData.referenceNo.trim(),
      sourceEntity: editRowData.sourceEntity.trim(),
      sectionCode: editRowData.sectionCode.trim(),
      grossAmount: grossNum,
      taxDeducted: taxNum,
      date: editRowData.date,
      claimEvidence: normalizeClaimEvidence(editClaimEvidence),
    });

    if (res.success) {
      setEditingRowId(null);
      setEditRowError(null);
    } else {
      setEditRowError(res.error || 'Failed to update entry. Check for duplicates.');
    }
  };

  const handleDelete = async (id: string, ref: string) => {
    if (window.confirm(t(`Delete ledger entry for reference '${ref}'?`, `রেফারেন্স '${ref}'-এর লেজার রেকর্ড মুছবেন?`))) {
      const deleted = await onDeleteEntry(id);
      if (!deleted) setEditRowError('The ledger entry could not be deleted. It remains in the ledger.');
    }
  };

  const renderStatusBadge = (status: LedgerEntry['status']) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-300">
            <ShieldCheck className="w-3 h-3 mr-1" />
            {t('Verified','যাচাইকৃত')}
          </span>
        );
      case 'SYNCED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-sky-100 text-sky-800 border border-sky-300">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            {t('Income Synced','আয়তথ্য সমন্বিত')}
          </span>
        );
      case 'PENDING_VERIFICATION':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300"
            aria-label={t('Pending Verification','যাচাই অপেক্ষমাণ')} title={t('Pending Verification','যাচাই অপেক্ষমাণ')}>
            <Clock className="w-3 h-3 mr-1" />
            {t('Pending','অপেক্ষমাণ')}
          </span>
        );
      case 'DRAFT':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-300">
            {t('Draft','খসড়া')}
          </span>
        );
    }
  };

  return (
    <div className="eledger-ledger-table eledger-panel">
      {/* Table Top Action Bar */}
      <div className="eledger-ledger-toolbar">
        <div className="flex items-center space-x-2">
          <h2>
            {t('Recorded Ledger Entries','রেকর্ডকৃত লেজার এন্ট্রি')} ({entries.length})
          </h2>
        </div>

        {allowAdd && !isAddingRow && (
          <button
            onClick={handleStartAdd}
            className="eledger-button eledger-button-primary"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('Add Entry','রেকর্ড যোগ করুন')}</span>
          </button>
        )}
      </div>

      {/* Delete errors remain visible even when no editor is open. */}
      {editRowError && !editingRowId && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-2 text-xs text-rose-800 flex items-center space-x-1.5">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{editRowError}</span>
        </div>
      )}

      {isAddingRow && <LedgerEntryEditor
        values={newRowData} onFieldChange={(field, value) => setNewRowData((previous) => ({ ...previous, [field]: value }))}
        onSave={handleSaveAdd} onCancel={handleCancelAdd}
        evidence={newClaimEvidence} onEvidenceChange={setNewClaimEvidence}
        routeId={routeId} fieldLabels={fieldLabels} isEdit={false} error={newRowError}
      />}
      {editingRowId && <LedgerEntryEditor
        values={editRowData} onFieldChange={(field, value) => setEditRowData((previous) => ({ ...previous, [field]: value }))}
        onSave={() => handleSaveEdit(editingRowId)} onCancel={handleCancelEdit}
        evidence={editClaimEvidence} onEvidenceChange={setEditClaimEvidence}
        routeId={routeId} fieldLabels={fieldLabels} isEdit error={editRowError}
      />}

      {entries.length === 0 && !isAddingRow && <p className="eledger-entry-empty">
        {t('No ledger entries yet.','এখনো কোনো লেজার রেকর্ড নেই।')}
        {allowAdd && <span> {t('Use Add Entry to record a claim.','দাবি রেকর্ড করতে রেকর্ড যোগ করুন।')}</span>}
      </p>}

      {/* Table responsive container */}
      {entries.length > 0 && <p className="sm:hidden px-4 py-2 text-xs text-slate-600 bg-sky-50 border-b border-slate-200">
        {t('Swipe the table sideways to see amounts, status and row actions.', 'অঙ্ক, অবস্থা ও সারির কাজ দেখতে টেবিলটি পাশে সরান।')}
      </p>}
      {entries.length > 0 && <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm text-slate-700">
          <thead className="bg-slate-100 text-slate-700 uppercase text-[11px] font-semibold tracking-wider border-b border-slate-200">
            <tr>
              <th scope="col" className="px-3 py-2.5">{fieldLabels.referenceNo}</th>
              <th scope="col" className="px-3 py-2.5">{fieldLabels.sourceEntity}</th>
              <th scope="col" className="px-3 py-2.5">{t('Section','ধারা')}</th>
              <th scope="col" className="px-3 py-2.5 text-right">{fieldLabels.grossAmount}</th>
              <th scope="col" className="px-3 py-2.5 text-right">{fieldLabels.taxDeducted}</th>
              <th scope="col" className="px-3 py-2.5">{t('Date','তারিখ')}</th>
              <th scope="col" className="px-3 py-2.5 text-center">{t('Status','অবস্থা')}</th>
              <th scope="col" className="px-3 py-2.5 text-right">{t('Actions','কাজ')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {/* Existing Rows */}
            {entries.length === 0 && !isAddingRow ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                  <p className="text-sm">{t('No ledger entries recorded for this section.','এই খাতে কোনো লেজার রেকর্ড নেই।')}</p>
                  {allowAdd && (
                    <p className="text-xs text-slate-500 mt-1">
                      {t('Click','উপরে')} <strong>{t('Add Entry','রেকর্ড যোগ করুন')}</strong> {t('above to insert a new ledger claim.','চেপে নতুন লেজার দাবি যোগ করুন।')}
                    </p>
                  )}
                </td>
              </tr>
            ) : (
              entries.map((entry) => {
                const isEditing = editingRowId === entry.id;

                return (
                  <tr key={entry.id} className={`${isEditing ? 'eledger-row-being-edited' : ''} hover:bg-slate-50 transition-colors`}>
                    <td className="px-3 py-2.5 font-medium text-slate-900">
                      <div>{entry.referenceNo}</div>
                      {entry.remarks && (
                        <div className="text-[11px] text-slate-500 truncate max-w-xs font-normal">
                          {entry.remarks}
                        </div>
                      )}
                      <ClaimEvidenceSummary routeId={routeId} evidence={entry.claimEvidence} />
                    </td>
                    <td className="px-3 py-2.5 text-slate-700">
                      {entry.sourceEntity}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 font-mono text-xs">
                      {entry.sectionCode}
                    </td>
                    <td className="px-3 py-2.5 text-right text-slate-600">
                      {entry.grossAmount > 0 ? formatCurrencyBDT(entry.grossAmount) : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-emerald-800">
                      {formatCurrencyBDT(entry.taxDeducted)}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 text-xs">
                      {entry.date}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {renderStatusBadge(entry.status)}
                    </td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      {allowEditDelete && <div className="flex items-center justify-end space-x-1.5">
                        <button disabled={editingRowId !== null || isAddingRow}
                          onClick={() => handleStartEdit(entry)}
                          aria-label={`${t('Edit','সম্পাদনা')} ${entry.referenceNo}`}
                          className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                          title={t('Edit row inline','সারিটি সম্পাদনা করুন')}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span className="sr-only">{t('Edit','সম্পাদনা')}</span>
                        </button>
                        <button disabled={editingRowId !== null || isAddingRow}
                          onClick={() => handleDelete(entry.id, entry.referenceNo)}
                          aria-label={`${t('Delete','মুছুন')} ${entry.referenceNo}`}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title={t('Delete row','সারি মুছুন')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="sr-only">{t('Delete','মুছুন')}</span>
                        </button>
                      </div>}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {/* Table Footer with Totals */}
          {entries.length > 0 && (
            <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-semibold text-slate-800">
              <tr>
                <td colSpan={3} className="px-3 py-2.5 text-xs uppercase tracking-wider text-slate-600">
                  {t('Total','মোট')}
                </td>
                <td className="px-3 py-2.5 text-right text-xs">
                  {formatCurrencyBDT(
                    entries.reduce((sum, e) => sum + (Number(e.grossAmount) || 0), 0)
                  )}
                </td>
                <td className="px-3 py-2.5 text-right text-emerald-900 text-sm font-bold">
                  {formatCurrencyBDT(
                    entries.reduce((sum, e) => sum + (Number(e.taxDeducted) || 0), 0)
                  )}
                </td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>}
    </div>
  );
};
