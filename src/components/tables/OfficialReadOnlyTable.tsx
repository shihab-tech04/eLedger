import React, { useEffect, useState } from 'react';
import { LedgerRecordActions } from './LedgerRecordActions.tsx';
import { NeirRecordDetailsDrawer } from '../neir/NeirRecordDetailsDrawer.tsx';
import type { LedgerEntry, LedgerRouteId } from '../../domain/models.ts';
import { useLedgerCopy } from '../../context/LanguageContext.tsx';

type ReadOnlyRoute = Extract<LedgerRouteId,
  'bank-fi' | 'dividend' | 'sanchayapatra' | 'system-import' | 'ait-import' |
  'commercial-source' | 'commercial-vehicle' | 'car-ait' | 'sec-154' | 'sec-173'>;

export const OFFICIAL_READONLY_COLUMNS: Record<ReadOnlyRoute, readonly string[]> = {
  'bank-fi': ['SL.', 'Bank Name', 'Account Type', 'Branch Name', 'Account Number', 'Interest Amount', 'TDS'],
  dividend: ['SL.', 'Depositing Authority/Person/Company', 'Certificate Reference No', 'Certificate Reference Date', 'Challan/Certificate Amount', 'Claimed Amount', 'Action'],
  sanchayapatra: ['SL.', 'Name of Scheme', 'Registration No.', 'Issue Date', 'Value', 'TDS Claim', 'Status'],
  'system-import': ['SL.', 'Bin', 'Office Code', 'Bill of Entry', 'Bill of Entry Date', 'Receipt No', 'Receipt Date', 'Invoice Value', 'Assessable Value', 'Total Tax & Duties', 'TDS Claimed'],
  'ait-import': ['SL.', 'Bin', 'Office Code', 'Bill of Entry', 'Bill of Entry Date', 'Receipt No', 'Receipt Date', 'Invoice Value', 'Assessable Value', 'Total Tax & Duties', 'TDS Claimed'],
  'commercial-source': ['SL.', 'Registration No', 'Unique Key', 'Chasis No', 'TDS Claim', 'Action'],
  'commercial-vehicle': ['SL.', 'Registration No', 'Unique Key', 'Chasis No', 'TDS Claim', 'Action'],
  'car-ait': ['SL.', 'Registration No', 'Unique Key', 'Chasis No', 'TDS Claim', 'Action'],
  'sec-154': ['SL.', 'Challan No.', 'Date', 'Amount', 'Payment Mode', 'Bank', 'Branch', 'Zone', 'Circle', 'Action'],
  'sec-173': ['SL.', 'Challan No.', 'Date', 'Amount', 'Payment Mode', 'Bank', 'Branch', 'Zone', 'Circle', 'Action'],
};

/** Preserve original English headers and provide Bengali labels for table,
 * mobile data-labels, and record details without altering financial values. */
const OFFICIAL_BENGALI_COLUMN_LABELS: Record<string, string> = {
  'SL.': 'ক্রম',
  'Bank Name': 'ব্যাংকের নাম',
  'Account Type': 'হিসাবের ধরন',
  'Branch Name': 'শাখার নাম',
  'Account Number': 'হিসাব নম্বর',
  'Interest Amount': 'সুদের অঙ্ক',
  TDS: 'উৎস কর',
  'Depositing Authority/Person/Company': 'জমাদানকারী কর্তৃপক্ষ/ব্যক্তি/প্রতিষ্ঠান',
  'Certificate Reference No': 'সনদের রেফারেন্স নম্বর',
  'Certificate Reference Date': 'সনদের রেফারেন্স তারিখ',
  'Challan/Certificate Amount': 'চালান/সনদের অঙ্ক',
  'Claimed Amount': 'দাবিকৃত অঙ্ক',
  Action: 'কাজ',
  'Name of Scheme': 'স্কিমের নাম',
  'Registration No.': 'নিবন্ধন নম্বর',
  'Issue Date': 'ইস্যুর তারিখ',
  Value: 'মূল্য',
  'TDS Claim': 'উৎস করের দাবি',
  Status: 'অবস্থা',
  Bin: 'বিআইএন',
  'Office Code': 'অফিস কোড',
  'Bill of Entry': 'বিল অব এন্ট্রি',
  'Bill of Entry Date': 'বিল অব এন্ট্রির তারিখ',
  'Receipt No': 'রসিদ নম্বর',
  'Receipt Date': 'রসিদের তারিখ',
  'Invoice Value': 'ইনভয়েস মূল্য',
  'Assessable Value': 'কর নির্ধারণযোগ্য মূল্য',
  'Total Tax & Duties': 'মোট কর ও শুল্ক',
  'TDS Claimed': 'দাবিকৃত উৎস কর',
  'Registration No': 'নিবন্ধন নম্বর',
  'Unique Key': 'ইউনিক কী',
  'Chasis No': 'চেসিস নম্বর',
  'Challan No.': 'চালান নম্বর',
  Date: 'তারিখ',
  Amount: 'অঙ্ক',
  'Payment Mode': 'পরিশোধের পদ্ধতি',
  Bank: 'ব্যাংক',
  Branch: 'শাখা',
  Zone: 'কর অঞ্চল',
  Circle: 'কর সার্কেল',
};

const money = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
const dated = (iso: string) => /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso.split('-').reverse().join('-') : iso;
const empty = '—';

function recordValues(
  entry: LedgerEntry, routeId: ReadOnlyRoute,
  labelStatus: (status: LedgerEntry['status']) => string,
): Array<string | number> {
  const e = entry.claimEvidence;
  switch (routeId) {
    case 'bank-fi':
      return [entry.sourceEntity, e?.accountType || empty, e?.branchName || empty,
        e?.accountNumber || empty, money(entry.grossAmount), money(entry.taxDeducted)];
    case 'dividend':
      return [e?.depositingAuthority || entry.sourceEntity, entry.referenceNo, dated(entry.date),
        money(e?.documentAmount ?? entry.grossAmount), money(entry.taxDeducted), empty];
    case 'sanchayapatra':
      return [e?.savingsScheme || entry.sourceEntity, e?.savingsRegistration || entry.referenceNo,
        e?.savingsIssueDate ? dated(e.savingsIssueDate) : empty, money(entry.grossAmount),
        money(entry.taxDeducted), labelStatus(entry.status)];
    case 'system-import':
    case 'ait-import':
      return [e?.customsBin || empty, e?.customsOfficeCode || empty,
        entry.referenceNo, dated(entry.date), e?.receiptNo || empty,
        e?.receiptDate ? dated(e.receiptDate) : empty,
        e?.invoiceValue == null ? empty : money(e.invoiceValue),
        money(entry.grossAmount),
        e?.totalTaxAndDuties == null ? empty : money(e.totalTaxAndDuties),
        money(entry.taxDeducted)];
    case 'commercial-source':
    case 'commercial-vehicle':
    case 'car-ait':
      return [e?.registrationNo || empty, entry.referenceNo, e?.chassisNo || empty,
        money(entry.taxDeducted), empty];
    case 'sec-154':
    case 'sec-173':
      return [entry.referenceNo, dated(entry.date), money(entry.taxDeducted),
        e?.paymentMode || empty, e?.bankName || empty, e?.branchName || empty,
        e?.taxZone || empty, e?.taxCircle || empty, empty];
  }
}

export function isOfficialReadOnlyRoute(id: LedgerRouteId): id is ReadOnlyRoute {
  return Object.prototype.hasOwnProperty.call(OFFICIAL_READONLY_COLUMNS, id);
}

export const OfficialReadOnlyTable: React.FC<{ routeId: ReadOnlyRoute; entries: LedgerEntry[]; onDeleteEntry?: (id: string) => Promise<boolean> }> = ({ routeId, entries, onDeleteEntry }) => {
  const t = useLedgerCopy();
  const [selected, setSelected] = useState<LedgerEntry | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');
  useEffect(() => { setSelected(null); }, [routeId]);
  const labelStatus = (status: LedgerEntry['status']) => {
    switch (status) {
      case 'VERIFIED': return t('Verified', 'যাচাইকৃত');
      case 'SYNCED': return t('Income Synced', 'আয়তথ্য সমন্বিত');
      case 'PENDING_VERIFICATION': return t('Pending', 'অপেক্ষমাণ');
      case 'DRAFT': return t('Draft', 'খসড়া');
      default: return t('Draft', 'খসড়া');
    }
  };
  const removeLocalClaim = async (entry: LedgerEntry) => {
    if (!onDeleteEntry || deletingId) return;
    if (!window.confirm(t('Remove this record from your local ledger? The original issuer record is not changed.',
      'স্থানীয় লেজার থেকে এই রেকর্ডটি সরাবেন? মূল ইস্যুকারীর রেকর্ড পরিবর্তন হবে না।'))) return;
    setDeletingId(entry.id); setDeleteError('');
    try {
      const deleted = await onDeleteEntry(entry.id);
      if (deleted) setSelected(null);
      else setDeleteError(t('Local record could not be removed; no data was changed.', 'স্থানীয় রেকর্ড সরানো যায়নি; তথ্য অপরিবর্তিত আছে।'));
    } catch {
      setDeleteError(t('Local record could not be removed; no data was changed.', 'স্থানীয় রেকর্ড সরানো যায়নি; তথ্য অপরিবর্তিত আছে।'));
    } finally { setDeletingId(null); }
  };
  const columns = OFFICIAL_READONLY_COLUMNS[routeId];
  const columnLabel = (label: string) => t(label, OFFICIAL_BENGALI_COLUMN_LABELS[label] ?? label);
  return <section className="eledger-panel eledger-official-manual-table eledger-neir-table-workspace" aria-label={t('Tax details','করের বিবরণ')}>
    {deleteError && <p role="alert" className="eledger-entry-error">{deleteError}</p>}
    <div className="overflow-x-auto">
      <table className="eledger-official-records eledger-data-table">
        <thead><tr>{columns.map((column, index) => <th scope="col" key={index}>{columnLabel(column)}</th>)}</tr></thead>
        <tbody>
          {entries.length === 0 ? <tr className="eledger-empty-records-row"><td colSpan={columns.length}>{t('No Data Found','কোনো তথ্য পাওয়া যায়নি')}</td></tr> :
            entries.map((entry, index) => <tr key={entry.id} tabIndex={0}
              className="eledger-neir-record-row"
              aria-label={t('View record details','রেকর্ডের বিস্তারিত দেখুন') + ': ' + entry.referenceNo}
              onClick={() => setSelected(entry)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setSelected(entry);
                }
              }}>
              <td data-label={columnLabel('SL.')}>{index + 1}</td>
              {recordValues(entry, routeId, labelStatus).map((value, i) => columns[i + 1] === 'Action' ?
                <td data-label={columnLabel('Action')} key={i}
                  onClick={(event)=>event.stopPropagation()} onKeyDown={(event)=>event.stopPropagation()}>
                  <LedgerRecordActions reference={entry.referenceNo}
                    onView={() => setSelected(entry)}
                    onDelete={onDeleteEntry ? () => void removeLocalClaim(entry) : undefined}
                    disabled={deletingId !== null}/>
                </td> : <td data-label={columnLabel(columns[i + 1])} key={i}>{value}</td>)}
            </tr>)}
        </tbody>
      </table>
    </div>
    {selected && <NeirRecordDetailsDrawer
      title={t('Record Details','রেকর্ডের বিস্তারিত')}
      subtitle={selected.referenceNo}
      onClose={() => setSelected(null)}
      fields={[
        { label: t('Reference','রেফারেন্স'), value: selected.referenceNo },
        ...recordValues(selected, routeId, labelStatus).map((value, index) => ({
          label: columns[index + 1] ? columnLabel(columns[index + 1]) : t('Record field','রেকর্ডের তথ্য'),
          value: String(value),
        })).filter((field, index) => columns[index + 1] !== 'Action' && columns[index + 1] !== ''),
      ]}/>
    }
  </section>;
};
