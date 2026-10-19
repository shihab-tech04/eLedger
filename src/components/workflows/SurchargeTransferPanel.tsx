import React, { useState } from 'react';
import { localDateInputValue } from '../../domain/localDate.ts';

/** Local handoff of a user-entered Tax & Payment surcharge; no tax rate is inferred. */
export const SurchargeTransferPanel: React.FC<{
  onRecord: (referenceNo: string, amount: number, date: string) => Promise<{ success: boolean; error?: string }>;
}> = ({ onRecord }) => {
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
    if (!reference.trim()) { setError('Enter the Tax & Payment source reference.'); return; }
    if (!/^\d+(?:\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) {
      setError('Enter a positive assessed surcharge amount (up to 2 decimal places).');
      return;
    }
    setBusy(true);
    try {
      const response = await onRecord(reference.trim(), Number(amount), date);
      if (!response.success) { setError(response.error || 'The local transfer was not saved.'); return; }
      setReference('');
      setAmount('');
      setSuccess('Surcharge recorded as a pending local claim. This is not a verified tax payment.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
      <h4 className="text-sm font-semibold text-slate-800">Tax & Payment → Environmental Surcharge (local handoff)</h4>
      <p className="text-xs text-slate-600 mt-2">
        Enter a surcharge amount already assessed in the separate Tax & Payment stage and its local source reference.
        This prototype does not calculate statutory surcharge rates, retrieve Tax & Payment data, transmit money, or obtain NBR verification.
      </p>
      <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
        <label className="text-xs font-semibold text-slate-700">
          <span className="block mb-1">Tax & Payment Reference</span>
          <input aria-label="Tax & Payment Reference" value={reference} onChange={(event) => setReference(event.target.value)} className="w-full p-2 border border-slate-300 rounded text-sm" placeholder="LOCAL-SUR-2026-001" />
        </label>
        <label className="text-xs font-semibold text-slate-700">
          <span className="block mb-1">Assessed Surcharge (৳)</span>
          <input aria-label="Assessed Surcharge" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} className="w-full p-2 border border-slate-300 rounded text-sm" placeholder="0.00" />
        </label>
        <label className="text-xs font-semibold text-slate-700">
          <span className="block mb-1">Assessment / Payment Date</span>
          <input aria-label="Surcharge Date" type="date" value={date} onChange={(event) => setDate(event.target.value)} className="w-full p-2 border border-slate-300 rounded text-sm" />
        </label>
        {error && <p role="alert" className="sm:col-span-3 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded p-2">{error}</p>}
        {success && <p role="status" className="sm:col-span-3 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded p-2">{success}</p>}
        <button type="submit" disabled={busy} className="sm:col-span-3 justify-self-start px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded text-xs font-semibold">
          {busy ? 'Recording…' : 'Record Local Surcharge Transfer'}
        </button>
      </form>
    </section>
  );
};
