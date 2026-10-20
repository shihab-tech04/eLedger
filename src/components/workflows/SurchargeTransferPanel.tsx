import React, { useState } from 'react';
import { useLedgerCopy } from '../../context/LanguageContext.tsx';
import { LedgerInput, LedgerTip } from '../ui/LedgerForm.tsx';

/** Local handoff of a user-entered Tax & Payment surcharge; no tax rate is inferred. */
export const SurchargeTransferPanel: React.FC<{
  onRecord: (referenceNo: string, amount: number, date: string) => Promise<{ success: boolean; error?: string }>;
}> = ({ onRecord }) => {
  const t = useLedgerCopy();
  const [reference, setReference] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
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
    } catch {
      setError(t('The local surcharge record could not be saved. No payment was transmitted.','স্থানীয় সারচার্জ রেকর্ড সংরক্ষণ হয়নি। কোনো অর্থ পরিশোধ করা হয়নি।'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="eledger-panel p-4">
      <div className="eledger-workflow-heading">
        <h2>{t('Environmental surcharge','পরিবেশ সারচার্জ')}</h2>
        <LedgerTip label={t('About this record','এই রেকর্ড সম্পর্কে')}>
        {t('No tax rate is calculated, no payment is transmitted, and no NBR verification is performed.','এখানে করহার গণনা, অর্থ পরিশোধ বা এনবিআর যাচাই করা হয় না।')}
        </LedgerTip>
      </div>
      <form onSubmit={submit} className="eledger-form-grid mt-4">
        <LedgerInput label={t('Tax & Payment Reference','Tax & Payment রেফারেন্স')} value={reference} required onValueChange={setReference} placeholder="LOCAL-SUR-2026-001"/>
        <LedgerInput label={t('Assessed Surcharge (৳)','নির্ধারিত সারচার্জ (৳)')} aria-label={t('Assessed Surcharge','নির্ধারিত সারচার্জ')} inputMode="decimal" className="is-number" required value={amount} onValueChange={setAmount} placeholder="0.00"/>
        <LedgerInput label={t('Assessment / Payment Date','নির্ধারণ / পরিশোধের তারিখ')} aria-label={t('Surcharge Date','সারচার্জের তারিখ')} required type="date" value={date} onValueChange={setDate}/>
        {error && <p role="alert" className="eledger-full-row text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded p-2">{error}</p>}
        {success && <p role="status" className="eledger-full-row text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded p-2">{success}</p>}
        <button type="submit" disabled={busy} className="eledger-button eledger-button-primary eledger-full-row justify-self-start">
          {busy ? t('Recording…','রেকর্ড হচ্ছে…') : t('Record Local Surcharge Transfer','স্থানীয় সারচার্জ রেকর্ড করুন')}
        </button>
      </form>
    </section>
  );
};
