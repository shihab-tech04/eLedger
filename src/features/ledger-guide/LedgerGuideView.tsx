/** September 21 custom eLedger Guide. Describes implemented local behavior honestly. */
import React from 'react';
import { useLedger } from '../../context/LedgerContext.tsx';
import { useLedgerLanguage } from '../../context/LanguageContext.tsx';

export const LedgerGuideView: React.FC = () => {
  const { assessmentYear } = useLedger();
  const { language } = useLedgerLanguage();
  const bn = language === 'bn';
  const fiscalEnd = Number(assessmentYear.slice(0, 4));
  const fiscalStart = fiscalEnd - 1;
  const stepList = bn ? [
    'বাম পাশের মেনু থেকে ‘উৎস কর দাবি’ নির্বাচন করুন।',
    'উৎস করের ধরন নির্বাচন করুন। ‘বেতন (iBAS++)’ তথ্য কেবল দেখার জন্য; নিজে তথ্য যোগ করতে ‘অন্যান্য বেতন’ বা প্রযোজ্য খাত বেছে নিন।',
    'যেসব খাতে ‘রেকর্ড যোগ করুন’ চালু আছে, সেসব খাতে সঠিক চালান বা সনদের তথ্য দিয়ে সংরক্ষণ করুন। স্থানীয় দাবি নিজে থেকেই যাচাইকৃত হয় না।',
    'পরিবর্তন করতে সংশ্লিষ্ট সারির ‘সম্পাদনা’ বোতাম ব্যবহার করুন; সংরক্ষণের আগে অঙ্ক ও তথ্য পরীক্ষা করুন।',
    'ভুল সারি মুছতে ‘মুছুন’ ব্যবহার করুন। মুছে ফেলা রেকর্ড স্থানীয় লেজার থেকে সরানো হয়।',
    'উৎস কর, অগ্রিম কর ও সমন্বয় যোগ করার পরে ‘কর পরিশোধের অবস্থা’ খুলে মোট রেকর্ডকৃত অঙ্ক মিলিয়ে নিন।',
    'ফেরত দাখিলের বাকি কাজের জন্য ‘ই-রিটার্নে যান’ লিংক ব্যবহার করুন। এই প্রোটোটাইপ নিজে কোনো কর জমা দেয় না।',
  ] : [
    "Click 'Claim Source Tax' in the menu at the left to update your source tax payments.",
    "Select your source tax category. Salary (iBAS++) shows read-only local payroll records; choose Salary (Others) or another eligible route to enter a manual claim.",
    "Where Add Entry is available, enter the supported challan or certificate details and save. Locally recorded claims do not become verified automatically.",
    "To change a saved source-tax figure, use the Edit icon in its row, check the values and save your changes.",
    "To remove an incorrect ledger row, use its Delete control; this removes the local record.",
    "When you finish recording source taxes and AIT, open Tax Payment Status to reconcile the recorded amounts and adjustments.",
    "Use Go to eReturn to complete the remaining filing tasks in the official system. This prototype does not itself submit or pay tax.",
  ];
  const guidance = bn ? [
    'উৎস কর অনলাইনে যাচাই করতে কর্তনকারী সংস্থার সিস্টেমের সঙ্গে সংযোগ প্রয়োজন হতে পারে। বর্তমানে এই লেজারে এমন সরকারি সংযোগ সক্রিয় নেই।',
    'এখানে স্থানীয়ভাবে দেখানো উৎস কর, অগ্রিম কর ও পরিশোধের রেকর্ড সরকারি যাচাইয়ের সমতুল্য নয়। অফিসিয়াল সিস্টেমে তথ্য না মিললে রিটার্নের জন্য প্রাসঙ্গিক কাগজপত্র সংরক্ষণ করুন।',
    'ই-রিটার্নের ‘Tax & Payment’ অংশে গিয়ে পরবর্তী পদক্ষেপ নিন। প্রয়োজন হলে অফিসিয়াল নির্দেশনা অনুসরণ করুন; এই লেজার থেকে সরাসরি জমা বা হস্তান্তর হয় না।',
  ] : [
    'Online verification of source tax can require connectivity with withholding agents. This local Ledger currently has no live government verification connection.',
    'Source tax, AIT and payment amounts shown as recorded are not automatically verified tax payments. Keep supporting documents and consult the official eReturn service for authoritative confirmation.',
    "Use the official eReturn Tax & Payment page for remaining return steps. This Ledger does not transfer or submit a payment or return to that system.",
  ];

  return (
    <article className="eledger-guide" lang={bn ? 'bn' : 'en'}>
      <header className="eledger-guide-heading"><h1>eReturn LEDGER</h1></header>
      <div className="eledger-guide-content">
        <section aria-labelledby="eledger-guide-update-heading">
          <h2 id="eledger-guide-update-heading">{bn
            ? `১ জুলাই ${fiscalStart} থেকে ৩০ জুন ${fiscalEnd} পর্যন্ত উৎস কর ও অগ্রিম করের তথ্য যেভাবে হালনাগাদ করবেন`
            : `How you will update your source tax and AIT payments made between 1 July ${fiscalStart} to 30 June ${fiscalEnd}`}</h2>
          <ul>{stepList.map((step) => <li key={step}>{step}</li>)}</ul>
          <p className="eledger-guide-emphasis">{bn
            ? 'AIT যাচাইয়ের নির্দেশনা সরকারি সংযোগ চালু হলে হালনাগাদ করা হবে।'
            : 'Guidelines for live AIT verification will be updated when official connectivity is available.'}</p>
        </section>

        <section className="eledger-guide-search" aria-labelledby="eledger-guide-search-heading">
          <h2 id="eledger-guide-search-heading">{bn ? 'অনুসন্ধান বিকল্প' : 'Search Option'}</h2>
          <p>{bn
            ? 'উৎস করের সংশ্লিষ্ট পাতায় ‘Search’ বা রেফারেন্স অনুসন্ধান ব্যবহার করে স্থানীয় নমুনা রেকর্ড দেখতে পারেন। কর্তনকারী সংস্থার সরকারি সিস্টেমে অনুসন্ধান এখানে সংযুক্ত নেই।'
            : "Select Search or a reference lookup on its supported source-tax page to inspect available local example records. It does not query the withholding agent's live system."}</p>
        </section>

        <aside className="eledger-guide-info" aria-label={bn ? 'জরুরি তথ্য' : 'Things to know'}>
          <h3>{bn ? 'আপনি জেনে রাখতে পারেন' : 'You may want to know'}</h3>
          <ul>{guidance.map((line) => <li key={line}>{line}</li>)}</ul>
        </aside>
      </div>
    </article>
  );
};
