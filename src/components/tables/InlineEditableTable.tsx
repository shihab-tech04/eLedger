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
import { LedgerEntry, TaxCategory, LedgerRouteId } from '../../domain/models.ts';
import { formatCurrencyBDT } from '../../domain/calculations.ts';
import { Plus, Check, X, Pencil, Trash2, ShieldCheck, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

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
  }) => Promise<{ success: boolean; error?: string }>;
  onUpdateEntry: (
    id: string,
    entryData: Partial<LedgerEntry>
  ) => Promise<{ success: boolean; error?: string }>;
  onDeleteEntry: (id: string) => Promise<boolean>;
  allowAdd?: boolean;
  allowEditDelete?: boolean;
}

export const InlineEditableTable: React.FC<InlineEditableTableProps> = ({
  entries,
  defaultSection,
  onSaveNewEntry,
  onUpdateEntry,
  onDeleteEntry,
  allowAdd = true,
  allowEditDelete = true,
}) => {
  // New row state
  const [isAddingRow, setIsAddingRow] = useState(false);
  const [newRowData, setNewRowData] = useState({
    referenceNo: '',
    sourceEntity: '',
    sectionCode: defaultSection,
    grossAmount: '',
    taxDeducted: '',
    date: new Date().toISOString().split('T')[0],
    remarks: '',
  });
  const [newRowError, setNewRowError] = useState<string | null>(null);

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

  // Start adding new inline row
  const handleStartAdd = () => {
    setIsAddingRow(true);
    setNewRowData({
      referenceNo: '',
      sourceEntity: '',
      sectionCode: defaultSection,
      grossAmount: '',
      taxDeducted: '',
      date: new Date().toISOString().split('T')[0],
      remarks: '',
    });
    setNewRowError(null);
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
    const taxNum = Number(newRowData.taxDeducted);
    if (!Number.isFinite(taxNum) || taxNum <= 0) {
      setNewRowError('Tax Deducted must be a positive number.');
      return;
    }
    const grossNum = Number(newRowData.grossAmount);
    if (!Number.isFinite(grossNum) || grossNum <= 0) {
      setNewRowError('Gross Amount must be a positive number.');
      return;
    }
    if (taxNum > grossNum) {
      setNewRowError('Tax deducted cannot exceed gross amount.');
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
    const taxNum = Number(editRowData.taxDeducted);
    if (!Number.isFinite(taxNum) || taxNum <= 0) {
      setEditRowError('Tax Deducted must be a positive number.');
      return;
    }
    const grossNum = Number(editRowData.grossAmount);
    if (!Number.isFinite(grossNum) || grossNum <= 0) {
      setEditRowError('Gross Amount must be a positive number.');
      return;
    }
    if (taxNum > grossNum) {
      setEditRowError('Tax deducted cannot exceed gross amount.');
      return;
    }

    const res = await onUpdateEntry(id, {
      referenceNo: editRowData.referenceNo.trim(),
      sourceEntity: editRowData.sourceEntity.trim(),
      sectionCode: editRowData.sectionCode.trim(),
      grossAmount: grossNum,
      taxDeducted: taxNum,
      date: editRowData.date,
    });

    if (res.success) {
      setEditingRowId(null);
      setEditRowError(null);
    } else {
      setEditRowError(res.error || 'Failed to update entry. Check for duplicates.');
    }
  };

  const handleDelete = async (id: string, ref: string) => {
    if (window.confirm(`Delete ledger entry for reference '${ref}'?`)) {
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
            Verified
          </span>
        );
      case 'SYNCED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-sky-100 text-sky-800 border border-sky-300">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Income Synced
          </span>
        );
      case 'PENDING_VERIFICATION':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300">
            <Clock className="w-3 h-3 mr-1" />
            Pending Verification
          </span>
        );
      case 'DRAFT':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-300">
            Draft
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      {/* Table Top Action Bar */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <h3 className="text-sm font-semibold text-slate-800">
            Recorded Ledger Entries ({entries.length})
          </h3>
          <span className="text-xs text-slate-500 font-normal">
            Tax Deducted at Source / Credit Records
          </span>
        </div>

        {allowAdd && !isAddingRow && (
          <button
            onClick={handleStartAdd}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Entry</span>
          </button>
        )}
      </div>

      {/* Inline Add Error Banner */}
      {newRowError && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-2 text-xs text-rose-800 flex items-center space-x-1.5">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{newRowError}</span>
        </div>
      )}

      {/* Inline Edit Error Banner */}
      {editRowError && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-2 text-xs text-rose-800 flex items-center space-x-1.5">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{editRowError}</span>
        </div>
      )}

      {/* Table responsive container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm text-slate-700">
          <thead className="bg-slate-100 text-slate-700 uppercase text-[11px] font-semibold tracking-wider border-b border-slate-200">
            <tr>
              <th scope="col" className="px-3 py-2.5">Reference / Challan No</th>
              <th scope="col" className="px-3 py-2.5">Deductor / Source Entity</th>
              <th scope="col" className="px-3 py-2.5">Section</th>
              <th scope="col" className="px-3 py-2.5 text-right">Gross Amount</th>
              <th scope="col" className="px-3 py-2.5 text-right">Tax Deducted (৳)</th>
              <th scope="col" className="px-3 py-2.5">Date</th>
              <th scope="col" className="px-3 py-2.5 text-center">Status</th>
              <th scope="col" className="px-3 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {/* Inline New Entry Row (Requirement #6) */}
            {isAddingRow && (
              <tr className="bg-emerald-50/70 border-2 border-emerald-500 transition-all">
                {/* Reference Input */}
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={newRowData.referenceNo}
                    onChange={(e) =>
                      setNewRowData({ ...newRowData, referenceNo: e.target.value })
                    }
                    placeholder="e.g. CH-2026-901"
                    className="w-full text-xs px-2 py-1 bg-white border border-slate-300 rounded focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none"
                    autoFocus
                  />
                </td>
                {/* Source Entity Input */}
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={newRowData.sourceEntity}
                    onChange={(e) =>
                      setNewRowData({ ...newRowData, sourceEntity: e.target.value })
                    }
                    placeholder="e.g. Bangladesh Bank / Payor"
                    className="w-full text-xs px-2 py-1 bg-white border border-slate-300 rounded focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none"
                  />
                </td>
                {/* Section Code Input */}
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={newRowData.sectionCode}
                    onChange={(e) =>
                      setNewRowData({ ...newRowData, sectionCode: e.target.value })
                    }
                    placeholder="Sec 102"
                    className="w-20 text-xs px-2 py-1 bg-white border border-slate-300 rounded focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none"
                  />
                </td>
                {/* Gross Amount Input */}
                <td className="px-3 py-2 text-right">
                  <input
                    type="number"
                    aria-label="Gross Amount Input"
                    value={newRowData.grossAmount}
                    onChange={(e) =>
                      setNewRowData({ ...newRowData, grossAmount: e.target.value })
                    }
                    placeholder="0.00"
                    min="0"
                    step="any"
                    className="w-24 text-xs px-2 py-1 text-right bg-white border border-slate-300 rounded focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none"
                  />
                </td>
                {/* Tax Deducted Input */}
                <td className="px-3 py-2 text-right">
                  <input
                    type="number"
                    aria-label="Tax Deducted Input"
                    value={newRowData.taxDeducted}
                    onChange={(e) =>
                      setNewRowData({ ...newRowData, taxDeducted: e.target.value })
                    }
                    placeholder="0.00"
                    min="1"
                    step="any"
                    className="w-24 text-xs px-2 py-1 text-right font-semibold bg-white border border-emerald-500 rounded focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none"
                  />
                </td>
                {/* Date Input */}
                <td className="px-3 py-2">
                  <input
                    type="date"
                    value={newRowData.date}
                    onChange={(e) =>
                      setNewRowData({ ...newRowData, date: e.target.value })
                    }
                    className="text-xs px-2 py-1 bg-white border border-slate-300 rounded focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none"
                  />
                </td>
                {/* Initial Status */}
                <td className="px-3 py-2 text-center">
                  <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Pending
                  </span>
                </td>
                {/* Save / Cancel Buttons */}
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end space-x-1.5">
                    <button
                      onClick={handleSaveAdd}
                      title="Save Entry"
                      className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold shadow-xs transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Save</span>
                    </button>
                    <button
                      onClick={handleCancelAdd}
                      title="Cancel"
                      className="inline-flex items-center space-x-1 px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-xs font-semibold transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Cancel</span>
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {/* Existing Rows */}
            {entries.length === 0 && !isAddingRow ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                  <p className="text-sm">No ledger entries recorded for this section.</p>
                  {allowAdd && (
                    <p className="text-xs text-slate-500 mt-1">
                      Click <strong>Add Entry</strong> above to insert a new source deduction.
                    </p>
                  )}
                </td>
              </tr>
            ) : (
              entries.map((entry) => {
                const isEditing = editingRowId === entry.id;

                if (isEditing) {
                  return (
                    <tr
                      key={entry.id}
                      className="bg-amber-50/70 border-2 border-amber-500 transition-all"
                    >
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={editRowData.referenceNo}
                          onChange={(e) =>
                            setEditRowData({ ...editRowData, referenceNo: e.target.value })
                          }
                          className="w-full text-xs px-2 py-1 bg-white border border-slate-300 rounded focus:border-amber-600 outline-none"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={editRowData.sourceEntity}
                          onChange={(e) =>
                            setEditRowData({ ...editRowData, sourceEntity: e.target.value })
                          }
                          className="w-full text-xs px-2 py-1 bg-white border border-slate-300 rounded focus:border-amber-600 outline-none"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={editRowData.sectionCode}
                          onChange={(e) =>
                            setEditRowData({ ...editRowData, sectionCode: e.target.value })
                          }
                          className="w-20 text-xs px-2 py-1 bg-white border border-slate-300 rounded focus:border-amber-600 outline-none"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          value={editRowData.grossAmount}
                          onChange={(e) =>
                            setEditRowData({ ...editRowData, grossAmount: e.target.value })
                          }
                          min="0"
                          step="any"
                          className="w-24 text-xs px-2 py-1 text-right bg-white border border-slate-300 rounded focus:border-amber-600 outline-none"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          value={editRowData.taxDeducted}
                          onChange={(e) =>
                            setEditRowData({ ...editRowData, taxDeducted: e.target.value })
                          }
                          min="1"
                          step="any"
                          className="w-24 text-xs px-2 py-1 text-right font-semibold bg-white border border-amber-500 rounded focus:border-amber-600 outline-none"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="date"
                          value={editRowData.date}
                          onChange={(e) =>
                            setEditRowData({ ...editRowData, date: e.target.value })
                          }
                          className="text-xs px-2 py-1 bg-white border border-slate-300 rounded focus:border-amber-600 outline-none"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        {renderStatusBadge(entry.status)}
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => handleSaveEdit(entry.id)}
                            title="Save Changes"
                            className="inline-flex items-center space-x-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-semibold shadow-xs transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Save</span>
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            title="Cancel Edit"
                            className="inline-flex items-center space-x-1 px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-xs font-semibold transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Cancel</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2.5 font-medium text-slate-900">
                      <div>{entry.referenceNo}</div>
                      {entry.remarks && (
                        <div className="text-[11px] text-slate-500 truncate max-w-xs font-normal">
                          {entry.remarks}
                        </div>
                      )}
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
                        <button
                          onClick={() => handleStartEdit(entry)}
                          className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                          title="Edit row inline"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span className="sr-only">Edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id, entry.referenceNo)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete row"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="sr-only">Delete</span>
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
                  Total for this view ({entries.length} records)
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
      </div>
    </div>
  );
};
