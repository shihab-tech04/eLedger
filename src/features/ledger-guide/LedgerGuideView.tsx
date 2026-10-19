/** September 21 custom eLedger Guide. Describes implemented local behavior honestly. */
import React from 'react';
import { useLedger } from '../../context/LedgerContext.tsx';
import { useLedgerLanguage } from '../../context/LanguageContext.tsx';
import { LedgerTip } from '../../components/ui/LedgerForm.tsx';

export const LedgerGuideView: React.FC = () => {
  const { assessmentYear } = useLedger();
  const { language } = useLedgerLanguage();
  const bn = language === 'bn';
  const fiscalEnd = Number(assessmentYear.slice(0, 4));
  const fiscalStart = fiscalEnd - 1;
  const stepList = bn ? [
    'মেনু থেকে উৎস কর বা অগ্রিম করের খাত বেছে নিন। iBAS++ বেতনের রেকর্ড শুধু দেখা যায়।',
    'রেকর্ড যোগ করুন থেকে চালান, সনদ ও সঠিক তারিখ দিয়ে দাবি সংরক্ষণ করুন।',
    'ভুল তথ্য সংশ্লিষ্ট সারিতে সম্পাদনা করুন বা মুছুন।',
    'কর পরিশোধের অবস্থা খুলে লেজারের অঙ্ক মিলিয়ে নিন।',
    'সরকারি দাখিল ও পরিশোধের জন্য ই-রিটার্নে যান।',
  ] : [
    'Choose a source-tax or AIT category. Salary (iBAS++) shows read-only local payroll records.',
    'Use Add Entry to record challan or certificate details and the correct date.',
    'Use Edit or Delete to correct a saved entry.',
    'Open Tax Payment Status to reconcile the recorded totals.',
    'Use Go to eReturn for official filing and payment.',
  ];

  return (
    <article className="eledger-guide" lang={bn ? 'bn' : 'en'}>
      <header className="eledger-guide-heading"><h1>eReturn LEDGER</h1></header>
      <div className="eledger-guide-content">
        <section aria-labelledby="eledger-guide-update-heading">
          <h2 id="eledger-guide-update-heading">{bn
            ? `উৎস কর ও অগ্রিম কর · ১ জুলাই ${fiscalStart} – ৩০ জুন ${fiscalEnd}`
            : `Source Tax & AIT · 1 July ${fiscalStart} – 30 June ${fiscalEnd}`}</h2>
          <ul>{stepList.map((step) => <li key={step}>{step}</li>)}</ul>
        </section>

        <section className="eledger-guide-search" aria-labelledby="eledger-guide-search-heading">
          <h2 id="eledger-guide-search-heading">{bn ? 'অনুসন্ধান বিকল্প' : 'Search Option'}</h2>
          <p>{bn ? 'প্রযোজ্য খাতে স্থানীয় রেফারেন্স খুঁজুন।' : 'Find local examples in supported categories.'}</p>
          <LedgerTip label={bn ? 'অনুসন্ধান সম্পর্কে' : 'About lookup'}>
            {bn ? 'সরকারি কর্তনকারী সংস্থা বা ট্রেজারির সরাসরি অনুসন্ধান এখানে নেই।' : 'Live withholding-agent and treasury lookup is not connected.'}
          </LedgerTip>
        </section>

        <aside className="eledger-guide-info" aria-label={bn ? 'জরুরি তথ্য' : 'Things to know'}>
          <h3>{bn ? 'মনে রাখুন' : 'Important'}</h3>
          <p>{bn ? 'এই লেজারের দাবি সরকারি যাচাইকৃত কর নয়। চালান ও সনদের প্রমাণ রাখুন; দাখিল ও পরিশোধ সরকারি ই-রিটার্নে করুন।' : 'Recorded claims are not government-verified tax credits. Keep supporting documents and use official eReturn to file or pay.'}</p>
        </aside>
      </div>
    </article>
  );
};
