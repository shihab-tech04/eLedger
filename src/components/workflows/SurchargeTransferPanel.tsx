import React, { useState } from 'react';
import { useLedgerCopy } from '../../context/LanguageContext.tsx';
import { LedgerInput, LedgerTip } from '../ui/LedgerForm.tsx';
import { LedgerFormModal } from '../ui/LedgerFormModal.tsx';
import { Plus } from 'lucide-react';

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
  const [formOpen, setFormOpen] = useState(false);

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
      setFormOpen(false);
    } catch {
      setError(t('The local surcharge record could not be saved. No payment was transmitted.','স্থানীয় সারচার্জ রেকর্ড সংরক্ষণ হয়নি। কোনো অর্থ পরিশোধ করা হয়নি।'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="eledger-panel eledger-claim-summary">
      <div className="eledger-ledger-toolbar">
        <h2>{t('Environmental surcharge','পরিবেশ সারচার্জ')}</h2>
        <button type="button" className="eledger-button eledger-button-primary" onClick={() => { setError(null); setFormOpen(true); }}>
          <Plus size={16}/>{t('Add Entry','রেকর্ড যোগ করুন')}
        </button>
      </div>
      <div className="eledger-claim-summary-content">
        <span>{t('Record an assessed surcharge from Tax & Payment.','কর ও পরিশোধের নির্ধারিত সারচার্জ রেকর্ড করুন।')}</span>
        <LedgerTip label={t('About this record','এই রেকর্ড সম্পর্কে')}>
          {t('No tax rate is calculated, no payment is transmitted, and no NBR verification is performed.','এখানে করহার গণনা, অর্থ পরিশোধ বা এনবিআর যাচাই করা হয় না।')}
        </LedgerTip>
      </div>
      {success && <p role="status" className="eledger-claim-feedback">{success}</p>}
      {formOpen && <LedgerFormModal title={t('Add Entry','রেকর্ড যোগ করুন')} onClose={() => setFormOpen(false)}>
      <form onSubmit={submit} className="eledger-form-grid mt-4">
        <LedgerInput label={t('Tax & Payment Reference','Tax & Payment রেফারেন্স')} value={reference} required onValueChange={setReference} placeholder="LOCAL-SUR-2026-001"/>
        <LedgerInput label={t('Assessed Surcharge (৳)','নির্ধারিত সারচার্জ (৳)')} aria-label={t('Assessed Surcharge','নির্ধারিত সারচার্জ')} inputMode="decimal" className="is-number" required value={amount} onValueChange={setAmount} placeholder="0.00"/>
        <LedgerInput label={t('Assessment / Payment Date','নির্ধারণ / পরিশোধের তারিখ')} aria-label={t('Surcharge Date','সারচার্জের তারিখ')} required type="date" value={date} onValueChange={setDate}/>
        {error && <p role="alert" className="eledger-full-row text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded p-2">{error}</p>}
        <div className="eledger-form-actions eledger-full-row">
        <button type="button" disabled={busy} onClick={() => setFormOpen(false)} className="eledger-button eledger-button-secondary">{t('Cancel','বাতিল')}</button>
        <button type="submit" disabled={busy} className="eledger-button eledger-button-primary">
          {busy ? t('Recording…','রেকর্ড হচ্ছে…') : t('Record Local Surcharge Transfer','স্থানীয় সারচার্জ রেকর্ড করুন')}
        </button>
        </div>
      </form>
      </LedgerFormModal>}
    </section>
  );
};
