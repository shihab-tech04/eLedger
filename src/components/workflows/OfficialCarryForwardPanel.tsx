import React, { useState } from 'react';
import type { LedgerEntry } from '../../domain/models.ts';
import { useLedgerCopy } from '../../context/LanguageContext.tsx';

/** Original PDF p20 carries a single claimed amount/status/delete surface.
 * The existing local simulation does not create an official prior-year credit.
 */
export function OfficialCarryForwardPanel({ existingClaim, onDelete }: {
  existingClaim?: LedgerEntry;
  onDelete?: (id: string) => Promise<boolean>;
}) {
  const t = useLedgerCopy();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const remove = async () => {
    if (!existingClaim || !onDelete || busy) return;
    if (!window.confirm(t('Remove this local carry-forward claim? No official record is changed.',
      'স্থানীয় পূর্ববর্তী কর সমন্বয়ের দাবি সরাবেন? কোনো সরকারি রেকর্ড পরিবর্তন হবে না।'))) return;
    setBusy(true); setMessage('');
    try {
      const ok = await onDelete(existingClaim.id);
      setMessage(ok ? t('Local claim removed.', 'স্থানীয় দাবি সরানো হয়েছে।') :
        t('Deletion failed; the local claim was preserved.', 'মুছতে ব্যর্থ হয়েছে; স্থানীয় দাবি অপরিবর্তিত আছে।'));
    } catch { setMessage(t('Deletion failed; the local claim was preserved.', 'মুছতে ব্যর্থ হয়েছে; স্থানীয় দাবি অপরিবর্তিত আছে।')); }
    finally { setBusy(false); }
  };
  return <section className="eledger-panel eledger-claim-summary eledger-carryforward-source">
    <div className="eledger-ledger-toolbar">
      <h2>{t('Adjustment of carry forward tax u/s 163', 'ধারা ১৬৩ অনুসারে পূর্ববর্তী কর সমন্বয়')}</h2>
      <span className="eledger-claim-feedback">{existingClaim ?
        t('Claimed (local; pending verification)', 'দাবিকৃত (স্থানীয়; যাচাই অপেক্ষমাণ)') :
        t('Pending', 'অপেক্ষমাণ')}</span>
      {existingClaim ? <button type="button" className="eledger-button eledger-button-danger"
        disabled={busy || !onDelete} onClick={() => void remove()}>{t('Delete', 'মুছুন')}</button> :
        <button type="button" className="eledger-button eledger-button-primary" onClick={() =>
          setMessage(t('The official prior-year claim service is not connected. No claim was submitted or recorded.',
            'পূর্ববর্তী বছরের সরকারি দাবি সেবা সংযুক্ত নেই। কোনো দাবি দাখিল বা রেকর্ড করা হয়নি।'))}>
          {t('Claim', 'দাবি করুন')}
        </button>}
    </div>
    <div className="eledger-claim-summary-content">
      <div className="eledger-payment-columns">
        <strong>{t('Claimed Amount', 'দাবিকৃত অঙ্ক')}</strong>
        <strong>{existingClaim ? existingClaim.taxDeducted.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '—'}</strong>
      </div>
      {existingClaim && <p>{t('Local record only; this does not establish an NBR-approved credit.',
        'শুধু স্থানীয় রেকর্ড; এটি এনবিআর অনুমোদিত কর ক্রেডিটের প্রমাণ নয়।')}</p>}
    </div>
    {message && <p className="eledger-entry-error" role="status">{message}</p>}
  </section>;
}
