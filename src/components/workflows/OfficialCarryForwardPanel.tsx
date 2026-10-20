import React, { useState } from 'react';
import type { LedgerEntry } from '../../domain/models.ts';
import { useLedgerCopy } from '../../context/LanguageContext.tsx';

/**
 * The authenticated Section 163 route exposes a single Claim action and no
 * taxpayer-entered form. Claim submission must remain fail-closed until the
 * authenticated NBR prior-year credit service is connected.
 */
export function OfficialCarryForwardPanel({ existingClaim }: { existingClaim?: LedgerEntry }) {
  const t = useLedgerCopy();
  const [message, setMessage] = useState('');
  return <section className="eledger-panel eledger-claim-summary">
    <div className="eledger-ledger-toolbar">
      <h2>{t('Adjustment of carry forward tax u/s 163','ধারা ১৬৩-এর অধীনে অগ্রিম কর সমন্বয়')}</h2>
      <span>{existingClaim ? t('Pending verification','যাচাই অপেক্ষমাণ') : t('Pending','অপেক্ষমাণ')}</span>
      <button type="button" className="eledger-button eledger-button-primary"
        onClick={() => setMessage(t('The official prior-year claim service is not connected. No claim was submitted or recorded.',
          'পূর্ববর্তী বছরের সরকারি দাবি সেবা সংযুক্ত নেই। কোনো দাবি দাখিল বা রেকর্ড করা হয়নি।'))}>
        {t('Claim','দাবি করুন')}
      </button>
    </div>
    <div className="eledger-claim-summary-content">
      {existingClaim ? <span>{t('A previously saved local claim is preserved pending verification.',
        'পূর্বে সংরক্ষিত স্থানীয় দাবি যাচাইয়ের অপেক্ষায় অপরিবর্তিত আছে।')}</span> :
        <p>{t('No claim has been made yet. Click Claim to fetch and save your carry forward tax refund.',
          'এখনো কোনো দাবি করা হয়নি। পূর্ববর্তী কর ফেরত সমন্বয় করতে দাবি করুন।')}</p>}
    </div>
    {message && <p className="eledger-entry-error" role="alert">{message}</p>}
  </section>;
}
