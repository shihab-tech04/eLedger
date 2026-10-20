import React, { useState } from 'react';
import { useLedger } from '../../context/LedgerContext.tsx';
import { useLedgerCopy } from '../../context/LanguageContext.tsx';
import { parseSection120Csv, SECTION120_CSV_HEADERS } from '../../domain/csvImport.ts';
import { LedgerTip } from '../ui/LedgerForm.tsx';

/** Local CSV entry is not an official customs/ASYCUDA data feed. */
export const CsvImportPanel: React.FC<{ routeId: 'system-import' | 'ait-import' }> = ({ routeId }) => {
  const t = useLedgerCopy();
  const { taxpayer, assessmentYear, addEntriesBatch } = useLedger();
  const [csv, setCsv] = useState('');
  const [feedback, setFeedback] = useState<{ error?: string; success?: string }>({});
  const [busy, setBusy] = useState(false);

  const importRows = async () => {
    if (busy) return;
    setFeedback({});
    setBusy(true);
    try {
      const data = parseSection120Csv(csv, { routeId, taxpayerTin: taxpayer.tin, assessmentYear });
      const result = await addEntriesBatch(data);
      if (!result.success) throw new Error(result.error || 'Batch import rejected.');
      setCsv('');
      setFeedback({ success: t(`${result.count} local reference records imported as pending claims. No government verification was performed.`,`${result.count}টি স্থানীয় রেফারেন্স যাচাই অপেক্ষমাণ দাবি হিসেবে আমদানি হয়েছে। কোনো সরকারি যাচাই হয়নি।`) });
    } catch (error) {
      setFeedback({ error: error instanceof Error ? error.message : 'CSV could not be imported.' });
    } finally {
      setBusy(false);
    }
  };

  const readLocalFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFeedback({});
    if (file.size > 1_000_000) {
      setFeedback({ error: t('CSV exceeds the 1 MB local import limit.','CSV ফাইল স্থানীয় ১ এমবি সীমার বেশি।') });
      return;
    }
    try {
      setCsv(await file.text());
    } catch {
      setFeedback({ error: t('Unable to read the selected local CSV file.','নির্বাচিত স্থানীয় CSV ফাইল পড়া যাচ্ছে না।') });
    }
  };

  return (
    <section className="eledger-panel p-4 space-y-3">
      <div className="eledger-workflow-heading">
        <h2>{t('Section 120 · CSV import','ধারা ১২০ · CSV আমদানি')}</h2>
        <LedgerTip label={t('CSV format and limits','CSV ফরম্যাট ও সীমা')}>
          <p>{t('Use this exact column order:','এই ক্রমে কলাম ব্যবহার করুন:')}</p>
          <code className="block my-1 break-all">{SECTION120_CSV_HEADERS.join(',')}</code>
          <p>{t('1–100 rows; all-or-nothing local import for TIN','১–১০০টি সারি; নির্বাচিত TIN-এর জন্য একসঙ্গে স্থানীয় আমদানি')} {taxpayer.tin}, {t('AY','করবর্ষ')} {assessmentYear}. {t('No live customs verification.','সরাসরি কাস্টমস যাচাই নেই।')}</p>
        </LedgerTip>
      </div>
      <label className="eledger-form-field">
        <span className="block mb-1">{t('Choose a local CSV file (optional)','স্থানীয় CSV ফাইল বাছুন (ঐচ্ছিক)')}</span>
        <input type="file" accept=".csv,text/csv" onChange={readLocalFile} className="eledger-file-control" />
      </label>
      <label className="eledger-form-field">
        <span className="block mb-1">{t('CSV data preview / paste','CSV তথ্য দেখুন / পেস্ট করুন')}</span>
        <textarea
          aria-label={t('Section 120 CSV data','ধারা ১২০ CSV তথ্য')}
          value={csv}
          onChange={(event) => { setCsv(event.target.value); setFeedback({}); }}
          rows={4}
          spellCheck={false}
          placeholder={`${SECTION120_CSV_HEADERS.join(',')}\nBOE-2026-001,Customs House Chattogram,Sec 120,120000,12000,2026-04-15`}
          className="eledger-control min-h-28"
        />
      </label>
      {feedback.error && <p role="alert" className="p-2 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded">{feedback.error}</p>}
      {feedback.success && <p role="status" className="p-2 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded">{feedback.success}</p>}
      <button type="button" onClick={importRows} disabled={!csv.trim() || busy} className="eledger-button eledger-button-primary">
        {busy ? t('Importing…','আমদানি হচ্ছে…') : t('Import Pending CSV Claims','যাচাই অপেক্ষমাণ CSV দাবি আমদানি করুন')}
      </button>
    </section>
  );
};
