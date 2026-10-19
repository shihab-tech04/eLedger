import React, { useState } from 'react';
import { localDateInputValue } from '../../domain/localDate.ts';
import { useLedgerCopy } from '../../context/LanguageContext.tsx';

/** Local handoff of a user-entered Tax & Payment surcharge; no tax rate is inferred. */
export const SurchargeTransferPanel: React.FC<{
  onRecord: (referenceNo: string, amount: number, date: string) => Promise<{ success: boolean; error?: string }>;
}> = ({ onRecord }) => {
  const t = useLedgerCopy();
  const [reference, setReference] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(localDateInputValue);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setError(null);
    setSuccess(null);
    if (!reference.trim()) { setError(t('Enter the Tax & Payment source reference.','Tax & Payment উৎস রেফারেন্স লিখুন।')); return; }
    if (!/^\d+(?:\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) {
      setError(t('Enter a positive assessed surcharge amount (up to 2 decimal places).','নির্ধারিত সারচার্জের ধনাত্মক অঙ্ক লিখুন (সর্বোচ্চ ২ দশমিক স্থান)।'));
      return;
    }
    setBusy(true);
    try {
      const response = await onRecord(reference.trim(), Number(amount), date);
      if (!response.success) { setError(response.error || t('The local transfer was not saved.','স্থানীয় স্থানান্তর সংরক্ষণ হয়নি।')); return; }
      setReference('');
      setAmount('');
      setSuccess(t('Surcharge recorded as a pending local claim. This is not a verified tax payment.','সারচার্জ স্থানীয় যাচাই অপেক্ষমাণ দাবি হিসেবে রেকর্ড হয়েছে। এটি যাচাইকৃত কর পরিশোধ নয়।'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
      <h4 className="text-sm font-semibold text-slate-800">{t('Tax & Payment → Environmental Surcharge (local handoff)','Tax & Payment → পরিবেশ সারচার্জ (স্থানীয় হস্তান্তর)')}</h4>
      <p className="text-xs text-slate-600 mt-2">
        {t('Enter a surcharge amount already assessed in the separate Tax & Payment stage and its local source reference. This prototype does not calculate statutory surcharge rates, retrieve Tax & Payment data, transmit money, or obtain NBR verification.','অন্য Tax & Payment ধাপে ইতোমধ্যে নির্ধারিত সারচার্জের অঙ্ক ও স্থানীয় উৎস রেফারেন্স লিখুন। এই প্রোটোটাইপ সারচার্জ হার গণনা, সরকারি তথ্য সংগ্রহ, অর্থ স্থানান্তর বা এনবিআর যাচাই করে না।')}
      </p>
      <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
        <label className="text-xs font-semibold text-slate-700">
          <span className="block mb-1">{t('Tax & Payment Reference','Tax & Payment রেফারেন্স')}</span>
          <input aria-label={t('Tax & Payment Reference','Tax & Payment রেফারেন্স')} value={reference} onChange={(event) => setReference(event.target.value)} className="w-full p-2 border border-slate-300 rounded text-sm" placeholder="LOCAL-SUR-2026-001" />
        </label>
        <label className="text-xs font-semibold text-slate-700">
          <span className="block mb-1">{t('Assessed Surcharge (৳)','নির্ধারিত সারচার্জ (৳)')}</span>
          <input aria-label={t('Assessed Surcharge','নির্ধারিত সারচার্জ')} inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} className="w-full p-2 border border-slate-300 rounded text-sm" placeholder="0.00" />
        </label>
        <label className="text-xs font-semibold text-slate-700">
          <span className="block mb-1">{t('Assessment / Payment Date','নির্ধারণ / পরিশোধের তারিখ')}</span>
          <input aria-label={t('Surcharge Date','সারচার্জের তারিখ')} type="date" value={date} onChange={(event) => setDate(event.target.value)} className="w-full p-2 border border-slate-300 rounded text-sm" />
        </label>
        {error && <p role="alert" className="sm:col-span-3 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded p-2">{error}</p>}
        {success && <p role="status" className="sm:col-span-3 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded p-2">{success}</p>}
        <button type="submit" disabled={busy} className="sm:col-span-3 justify-self-start px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded text-xs font-semibold">
          {busy ? t('Recording…','রেকর্ড হচ্ছে…') : t('Record Local Surcharge Transfer','স্থানীয় সারচার্জ রেকর্ড করুন')}
        </button>
      </form>
    </section>
  );
};
