import React, { useMemo, useState } from 'react';
import { BookOpenCheck, CalendarDays, FileText, HelpCircle, Info, LockKeyhole, Search, ShieldCheck } from 'lucide-react';
import type { LedgerEntry } from '../../domain/models.ts';
import { useLedgerCopy } from '../../context/LanguageContext.tsx';
import { LedgerRecordActions } from '../../components/tables/LedgerRecordActions.tsx';
import { NeirRecordDetailsDrawer } from '../../components/neir/NeirRecordDetailsDrawer.tsx';

/** Read-only presentation for stored, account-bound iBAS++ payroll evidence.
 * No form, mutation handler, official verification or simulated source lookup.
 * All figures, statuses, record details and filters come from the actual entries.
 */
const amount = (n: number, cents = false) =>
  n.toLocaleString('en-IN', { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: 2 });
const labelForStatus = (status: LedgerEntry['status'], t: (en: string, bn: string) => string) => {
  switch (status) {
    case 'PENDING_VERIFICATION': return t('Pending', 'অপেক্ষমাণ');
    case 'VERIFIED': return t('Verified', 'যাচাইকৃত');
    case 'SYNCED': return t('Income Synced', 'আয়তথ্য সমন্বিত');
    case 'DISPUTED': return t('Disputed', 'বিতর্কিত');
    default: return t('Draft', 'খসড়া');
  }
};

export const SalaryIbasReview: React.FC<{
  entries: LedgerEntry[];
  assessmentYear: string;
}> = ({ entries, assessmentYear }) => {
  const t = useLedgerCopy();
  const [search, setSearch] = useState('');
  const [year, setYear] = useState('all');
  const [display, setDisplay] = useState<'table' | 'cards'>('table');
  const [explainClaim, setExplainClaim] = useState(false);
  const [selected, setSelected] = useState<LedgerEntry | null>(null);
  const [statusHelp, setStatusHelp] = useState<LedgerEntry | null>(null);
  const [copyMessage, setCopyMessage] = useState('');

  const total = entries.reduce((sum, entry) => sum + (Number(entry.taxDeducted) || 0), 0);
  const years = useMemo(() => [...new Set(entries.map(entry => entry.date.slice(0, 4)))].sort().reverse(), [entries]);
  const filtered = useMemo(() => entries.filter(entry =>
    (year === 'all' || entry.date.startsWith(year)) &&
    [entry.referenceNo, entry.sourceEntity, entry.sectionCode, entry.date, labelForStatus(entry.status, t)]
      .join(' ').toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())
  ), [entries, year, search, t]);
  const filteredGross = filtered.reduce((sum, entry) => sum + (Number(entry.grossAmount) || 0), 0);
  const filteredTax = filtered.reduce((sum, entry) => sum + (Number(entry.taxDeducted) || 0), 0);
  const first = entries[0];

  const copyReference = async (entry: LedgerEntry) => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard not supported');
      await navigator.clipboard.writeText(entry.referenceNo);
      setCopyMessage(t('Reference copied', 'রেফারেন্স কপি হয়েছে') + ': ' + entry.referenceNo);
    } catch {
      setCopyMessage(t('Copy is unavailable. Open View to select the reference.', 'কপি করা যাচ্ছে না। রেফারেন্স দেখতে বিস্তারিত খুলুন।'));
    }
  };
  const actions = (entry: LedgerEntry) => <LedgerRecordActions
    reference={entry.referenceNo} onView={() => setSelected(entry)}
    onCopy={() => { void copyReference(entry); }} onExplain={() => setStatusHelp(entry)}
  />;
  const status = (entry: LedgerEntry) => <span className={
    'eledger-ibas-review-status ' +
    (entry.status === 'PENDING_VERIFICATION' ? 'is-pending' :
      entry.status === 'VERIFIED' ? 'is-verified' : 'is-neutral')
  }>{labelForStatus(entry.status, t)}</span>;

  return <div className="eledger-ibas-review" data-testid="salary-ibas-review">
    <div className="eledger-ibas-review-metrics" role="group"
      aria-label={t('Payroll record summary', 'পেরোল রেকর্ডের সারাংশ')}>
      <section className="eledger-ibas-review-metric">
        <div><span>{t('Locally recorded TDS', 'স্থানীয়ভাবে রেকর্ডকৃত উৎস কর')}</span>
          <strong>৳{amount(total)}</strong></div><ShieldCheck size={20} aria-hidden="true"/>
      </section>
      <section className="eledger-ibas-review-metric">
        <div><span>{t('Payroll records', 'পেরোল রেকর্ড')}</span>
          <strong>{entries.length}</strong></div><FileText size={20} aria-hidden="true"/>
      </section>
      <section className="eledger-ibas-review-metric">
        <div><span>{t('Assessment year', 'করবর্ষ')}</span>
          <strong className="is-year">{assessmentYear}</strong></div><CalendarDays size={20} aria-hidden="true"/>
      </section>
    </div>

    <section className="eledger-ibas-review-panel" aria-labelledby="eledger-ibas-payroll-heading">
      <header className="eledger-ibas-review-panel-header">
        <h2 id="eledger-ibas-payroll-heading">{t('Payroll information', 'পেরোল তথ্য')}</h2>
        <span className="eledger-ibas-review-chip">{t('Local payroll record', 'স্থানীয় পেরোল রেকর্ড')}</span>
      </header>
      <dl className="eledger-ibas-review-facts">
        <div><dt>{t('Office name', 'অফিসের নাম')}</dt>
          <dd>{first?.sourceEntity || t('Not provided', 'দেওয়া হয়নি')}</dd></div>
        <div><dt>{t('Designation', 'পদবি')}</dt>
          <dd className="is-missing">{t('Not provided in local evidence', 'স্থানীয় তথ্যের মধ্যে পাওয়া যায়নি')}</dd></div>
        <div><dt>{t('Record source', 'রেকর্ডের উৎস')}</dt>
          <dd>{t('Local iBAS++ payroll evidence', 'স্থানীয় iBAS++ পেরোল তথ্য')}</dd></div>
        <div><dt>{t('Record date', 'রেকর্ডের তারিখ')}</dt>
          <dd>{first?.date || '—'}</dd></div>
      </dl>
    </section>

    <section className="eledger-ibas-review-panel" aria-labelledby="eledger-ibas-claim-heading">
      <header className="eledger-ibas-review-panel-header">
        <h2 id="eledger-ibas-claim-heading">{t('TDS claim information', 'উৎস কর দাবির তথ্য')}</h2>
        <span className="eledger-ibas-review-chip"><LockKeyhole size={14} aria-hidden="true"/>
          {t('Read-only', 'শুধু দেখার জন্য')}</span>
      </header>
      <div className="eledger-ibas-review-claim">
        <div><span>{t('Recorded TDS claim', 'রেকর্ডকৃত উৎস কর দাবি')}</span>
          <strong>৳{amount(total)}</strong>
          <p>{t('Amount comes from locally stored payroll records.', 'পরিমাণটি স্থানীয়ভাবে সংরক্ষিত পেরোল রেকর্ড থেকে এসেছে।')}</p></div>
        <button type="button" className="eledger-button eledger-button-secondary"
          aria-expanded={explainClaim} aria-controls="eledger-ibas-claim-explanation"
          onClick={() => setExplainClaim(value => !value)}>
          <HelpCircle size={16} aria-hidden="true"/>
          {t('Why is this read-only?', 'কেন এটি পরিবর্তন করা যায় না?')}
        </button>
      </div>
      {explainClaim && <p id="eledger-ibas-claim-explanation" className="eledger-ibas-review-explanation">
        {t('Salary (iBAS++) is system-sourced payroll evidence. This local ledger does not allow manual changes to those records or official submission. Verify the deduction through an authorized payroll/eReturn service.',
          'Salary (iBAS++) সিস্টেম উৎসের বেতনসংক্রান্ত তথ্য। এই স্থানীয় লেজার থেকে রেকর্ড পরিবর্তন বা সরকারি দাখিল করা যায় না। অনুমোদিত পেরোল/ই-রিটার্ন সেবায় উৎস কর যাচাই করুন।')}
      </p>}
    </section>
    <p className="eledger-ibas-review-notice"><Info size={17} aria-hidden="true"/>
      {t('Locally recorded salary deductions are not automatically independently authority-verified tax credits.',
        'স্থানীয়ভাবে রেকর্ডকৃত বেতন কর্তন স্বয়ংক্রিয়ভাবে কর্তৃপক্ষের স্বাধীন যাচাইকৃত কর ক্রেডিট নয়।')}
    </p>

    <section className="eledger-ibas-review-panel eledger-ibas-review-records"
      aria-labelledby="eledger-ibas-records-heading">
      <header className="eledger-ibas-review-panel-header">
        <h2 id="eledger-ibas-records-heading">{t('Recorded ledger entries', 'রেকর্ডকৃত লেজার এন্ট্রি')} ({entries.length})</h2>
        <span className="eledger-ibas-review-chip">{t('Local records', 'স্থানীয় রেকর্ড')}</span>
      </header>
      <div className="eledger-ibas-review-controls">
        <label className="eledger-ibas-review-search"><Search size={17} aria-hidden="true"/>
          <input type="search" value={search} onChange={event=>setSearch(event.target.value)}
            aria-label={t('Search records', 'রেকর্ড খুঁজুন')}
            placeholder={t('Search reference or office', 'রেফারেন্স বা অফিস খুঁজুন')}/></label>
        <select value={year} onChange={event=>setYear(event.target.value)}
          aria-label={t('Filter by record year', 'রেকর্ডের বছর অনুযায়ী ছাঁকুন')}>
          <option value="all">{t('All years', 'সব বছর')}</option>
          {years.map(item=><option key={item} value={item}>{item}</option>)}
        </select>
        <div className="eledger-ibas-review-views" role="group" aria-label={t('Record display', 'রেকর্ডের প্রদর্শন')}>
          <button type="button" className={display==='table'?'is-active':''}
            aria-pressed={display==='table'} onClick={()=>setDisplay('table')}>{t('Table', 'টেবিল')}</button>
          <button type="button" className={display==='cards'?'is-active':''}
            aria-pressed={display==='cards'} onClick={()=>setDisplay('cards')}>{t('Cards', 'কার্ড')}</button>
        </div>
        <button type="button" className="eledger-button eledger-button-secondary"
          disabled={!search&&year==='all'} onClick={()=>{setSearch('');setYear('all');}}>
          {t('Reset', 'রিসেট')}</button>
      </div>
      <div className={'eledger-ibas-review-tablewrap'+(display==='cards'?' is-hidden-by-view':'')}
        role="region" tabIndex={0} aria-label={t('Scrollable payroll ledger table','স্ক্রলযোগ্য বেতন লেজার টেবিল')}>
        <table className="eledger-ibas-review-table">
          <thead><tr>
            <th scope="col">{t('Reference / Challan No', 'রেফারেন্স / চালান নম্বর')}</th>
            <th scope="col">{t('Deductor / Source Entity', 'কর্তনকারী / উৎস প্রতিষ্ঠান')}</th>
            <th scope="col">{t('Section', 'ধারা')}</th>
            <th scope="col" className="is-numeric">{t('Gross Amount', 'মোট অর্থ')}</th>
            <th scope="col" className="is-numeric">{t('Tax Deducted (৳)', 'কর্তিত কর (৳)')}</th>
            <th scope="col">{t('Date', 'তারিখ')}</th>
            <th scope="col">{t('Status', 'অবস্থা')}</th>
            <th scope="col">{t('Actions', 'কার্যক্রম')}</th>
          </tr></thead>
          <tbody>{filtered.length ? filtered.map(entry=><tr key={entry.id}>
            <td><strong>{entry.referenceNo}</strong></td>
            <td>{entry.sourceEntity}</td><td>{entry.sectionCode || '—'}</td>
            <td className="is-numeric">৳{amount(entry.grossAmount,true)}</td>
            <td className="is-numeric"><strong>৳{amount(entry.taxDeducted,true)}</strong></td>
            <td>{entry.date}</td><td>{status(entry)}</td>
            <td>{actions(entry)}</td>
          </tr>) : <tr><td colSpan={8} className="eledger-ibas-review-no-records">
            {t('No matching records. Clear the search or reset the year filter.', 'মিলেছে এমন রেকর্ড নেই। অনুসন্ধান মুছুন বা বছরের ফিল্টার রিসেট করুন।')}
          </td></tr>}</tbody>
          {filtered.length>0 && <tfoot><tr>
            <th scope="row">{t('TOTAL', 'মোট')}</th><td></td><td></td>
            <td className="is-numeric">৳{amount(filteredGross,true)}</td>
            <td className="is-numeric">৳{amount(filteredTax,true)}</td>
            <td></td><td></td><td></td>
          </tr></tfoot>}
        </table>
      </div>
      <div className={'eledger-ibas-review-cardlist'+(display==='table'?' is-hidden-by-view':'')}>
        {filtered.length ? filtered.map(entry=><article key={entry.id} className="eledger-ibas-review-record-card">
          <div className="eledger-ibas-review-record-top">
            <div><strong>{entry.referenceNo}</strong><p>{entry.sourceEntity}</p></div>{status(entry)}
          </div>
          <dl>
            <div><dt>{t('Section','ধারা')}</dt><dd>{entry.sectionCode||'—'}</dd></div>
            <div><dt>{t('Date','তারিখ')}</dt><dd>{entry.date}</dd></div>
            <div><dt>{t('Gross Amount','মোট অর্থ')}</dt><dd>৳{amount(entry.grossAmount,true)}</dd></div>
            <div><dt>{t('Tax Deducted','কর্তিত কর')}</dt><dd>৳{amount(entry.taxDeducted,true)}</dd></div>
          </dl>
          <div className="eledger-ibas-review-card-actions">{actions(entry)}</div>
        </article>) : <p className="eledger-ibas-review-no-records">
          {t('No matching records.', 'মিলেছে এমন রেকর্ড নেই।')}</p>}
      </div>
      <p className="eledger-ibas-review-footnote">
        {t('The first and last table columns remain visible during horizontal scrolling. On mobile, each record appears as a complete card.',
          'আড়াআড়ি স্ক্রল করার সময় টেবিলের প্রথম ও শেষ কলাম দৃশ্যমান থাকে। মোবাইলে প্রতিটি রেকর্ড সম্পূর্ণ কার্ডে দেখানো হয়।')}
      </p>
    </section>
    {copyMessage && <div role="status" className="eledger-ibas-review-copy-status">
      <span>{copyMessage}</span><button type="button" onClick={()=>setCopyMessage('')}
        aria-label={t('Dismiss notification','বিজ্ঞপ্তি বন্ধ করুন')}>×</button></div>}
    {selected && <NeirRecordDetailsDrawer
      title={t('Payroll record details', 'পেরোল রেকর্ডের বিস্তারিত')}
      subtitle={selected.referenceNo} onClose={()=>setSelected(null)}
      fields={[
        {label:t('Reference / Challan No','রেফারেন্স / চালান নম্বর'),value:selected.referenceNo},
        {label:t('Office / source','অফিস / উৎস'),value:selected.sourceEntity},
        {label:t('Assessment year','করবর্ষ'),value:selected.assessmentYear},
        {label:t('Section','ধারা'),value:selected.sectionCode},
        {label:t('Gross Amount','মোট অর্থ'),value:'৳'+amount(selected.grossAmount,true)},
        {label:t('Tax Deducted','কর্তিত কর'),value:'৳'+amount(selected.taxDeducted,true)},
        {label:t('Record date','রেকর্ডের তারিখ'),value:selected.date},
        {label:t('Status','অবস্থা'),value:labelForStatus(selected.status,t)},
      ]}/>}
    {statusHelp && <NeirRecordDetailsDrawer
      title={t('Recorded status explained','রেকর্ডের অবস্থার ব্যাখ্যা')}
      subtitle={statusHelp.referenceNo} onClose={()=>setStatusHelp(null)}
      fields={[
        {label:t('Recorded status','রেকর্ডকৃত অবস্থা'),value:labelForStatus(statusHelp.status,t)},
        {label:t('Source','উৎস'),value:statusHelp.sourceEntity},
        {label:t('Verification','যাচাই'),value:statusHelp.externalVerified && statusHelp.verificationAuthority==='AUTHORITATIVE'
          ? t('Independently authorized','স্বতন্ত্রভাবে অনুমোদিত')
          : t('No independently authorized verification is recorded','স্বতন্ত্র কর্তৃপক্ষীয় যাচাই রেকর্ড নেই')},
      ]}/>}
  </div>;
};
