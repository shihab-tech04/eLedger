import React, { useState } from 'react';
import { useLedger } from '../../context/LedgerContext.tsx';
import { useLedgerCopy } from '../../context/LanguageContext.tsx';
import { parseSection120Csv, SECTION120_CSV_HEADERS } from '../../domain/csvImport.ts';

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
    <section className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs space-y-3">
      <div>
        <h4 className="text-sm font-semibold text-slate-800">{t('Section 120 — Local CSV Batch Import','ধারা ১২০ — স্থানীয় CSV আমদানি')}</h4>
        <p className="text-xs text-slate-600 mt-1">
          {t('Upload a CSV from your computer or paste its contents. This is a local entry aid, not a live ASYCUDA/NBR integration. All rows are saved together or none are saved; imported claims remain pending verification.','কম্পিউটার থেকে CSV বাছুন বা তথ্য পেস্ট করুন। এটি স্থানীয় রেকর্ড তৈরির সহায়তা, সরাসরি ASYCUDA/NBR সংযোগ নয়। সব সারি একসঙ্গে সংরক্ষণ হবে, নইলে কোনোটি নয়; দাবিগুলো যাচাই অপেক্ষমাণ থাকবে।')}
        </p>
        <p className="text-[11px] text-slate-500 mt-2">{t('Required header (exact spelling and order):','আবশ্যিক হেডার (হুবহু বানান ও ক্রম):')}</p>
        <code className="block mt-1 text-[11px] text-emerald-900 whitespace-normal break-all">{SECTION120_CSV_HEADERS.join(',')}</code>
        <p className="text-[11px] text-slate-500 mt-1">{t('1–100 data rows. Import is restricted to the selected TIN','১–১০০টি তথ্য সারি। আমদানি কেবল নির্বাচিত TIN')} {taxpayer.tin} {t('and AY','ও করবর্ষ')} {assessmentYear}{t('.','-এর জন্য।')}</p>
      </div>
      <label className="block text-xs text-slate-700 font-medium">
        <span className="block mb-1">{t('Choose a local CSV file (optional)','স্থানীয় CSV ফাইল বাছুন (ঐচ্ছিক)')}</span>
        <input type="file" accept=".csv,text/csv" onChange={readLocalFile} className="block w-full text-xs file:mr-3 file:px-3 file:py-2 file:rounded file:border file:border-slate-300 file:bg-slate-50 file:text-slate-800" />
      </label>
      <label className="block text-xs text-slate-700 font-medium">
        <span className="block mb-1">{t('CSV data preview / paste','CSV তথ্য দেখুন / পেস্ট করুন')}</span>
        <textarea
          aria-label={t('Section 120 CSV data','ধারা ১২০ CSV তথ্য')}
          value={csv}
          onChange={(event) => { setCsv(event.target.value); setFeedback({}); }}
          rows={4}
          spellCheck={false}
          placeholder={`${SECTION120_CSV_HEADERS.join(',')}\nBOE-2026-001,Customs House Chattogram,Sec 120,120000,12000,2026-04-15`}
          className="block w-full p-2.5 text-xs font-mono bg-slate-50 border border-slate-300 rounded focus:border-emerald-600 outline-none"
        />
      </label>
      {feedback.error && <p role="alert" className="p-2 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded">{feedback.error}</p>}
      {feedback.success && <p role="status" className="p-2 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded">{feedback.success}</p>}
      <button type="button" onClick={importRows} disabled={!csv.trim() || busy} className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded hover:bg-emerald-800 disabled:opacity-50">
        {busy ? t('Importing…','আমদানি হচ্ছে…') : t('Import Pending CSV Claims','যাচাই অপেক্ষমাণ CSV দাবি আমদানি করুন')}
      </button>
    </section>
  );
};
