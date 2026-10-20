import React from 'react';
import { useLedger } from '../../context/LedgerContext.tsx';
import { useLedgerCopy, useLedgerLanguage } from '../../context/LanguageContext.tsx';
import { getVisibleRoutesByGroup } from '../../domain/routeRegistry.ts';
import type { LedgerRouteId, RouteRegistryEntry } from '../../domain/models.ts';
import { ArrowRight, BookOpen, CarFront, ChevronRight, FileCheck2, ReceiptText, ShieldCheck, WalletCards } from 'lucide-react';
import { LedgerPageHeader } from '../../components/ui/LedgerPage.tsx';

/** The reference dashboard uses Bangladeshi digit grouping without a currency prefix. */
const amount = (value: number) => value.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const percent = (part: number, total: number) => total > 0 ? (part / total) * 100 : 0;

const dashboardTitles: Partial<Record<LedgerRouteId, string>> = {
  'salary-ibas': 'Salary (iBAS++)',
  'salary-others': 'Salary (Others)',
  'bank-fi': 'Bank/FI Interest/Profit',
  dividend: 'Dividend',
  'service-payment': 'Service Payment',
  sanchayapatra: 'Sanchayapatra',
  'system-import': 'Import',
  'commercial-source': 'Commercial Vehicle',
  'other-tds': 'Others',
  'car-ait': 'AIT on Car',
  'sec-154': 'AIT (154)',
  'sec-173': 'Tax Paid with Return (173)',
  refund: 'Adjustment of Tax Refund',
  'carry-forward': 'Adjustment of carry forward tax u/s 163',
};

const routeName = (route: RouteRegistryEntry) => dashboardTitles[route.id] ?? route.title;

export const DashboardView: React.FC = () => {
  const { entries, totals, setActiveNavTab, setActiveRouteId, setIsStatusModalOpen } = useLedger();
  const t = useLedgerCopy();
  const { language } = useLedgerLanguage();
  const name = (route: RouteRegistryEntry) => language === 'bn' ? route.bengaliTitle : routeName(route);
  const recordedRouteIds = entries.map((entry) => entry.routeId);
  const sourceRoutes = getVisibleRoutesByGroup('Source Tax', recordedRouteIds);
  const aitRoutes = getVisibleRoutesByGroup('AIT', recordedRouteIds);
  const otherRoutes = [
    ...getVisibleRoutesByGroup('Payment', recordedRouteIds),
    ...getVisibleRoutesByGroup('Adjustment', recordedRouteIds),
  ];
  const allRoutes = [...sourceRoutes, ...aitRoutes, ...otherRoutes];
  const routeAmounts = new Map<LedgerRouteId, number>();
  for (const entry of entries) {
    const value = Number(entry.taxDeducted);
    if (Number.isFinite(value)) {
      routeAmounts.set(entry.routeId, (routeAmounts.get(entry.routeId) ?? 0) + value);
    }
  }
  const sourceTotal = totals.sourceTaxTotal;
  const aitTotal = totals.aitTotal;
  const otherTotal = totals.paymentsTotal + totals.adjustmentsTotal;
  // A recorded amount is not an authority-verified credit.
  const ledgerTotal = sourceTotal + aitTotal + otherTotal;
  const recordedCategories = allRoutes.filter((route) => (routeAmounts.get(route.id) ?? 0) !== 0).length;
  const emptyRoutes = allRoutes.filter((route) => (routeAmounts.get(route.id) ?? 0) === 0);
  const sourcePct = percent(sourceTotal, ledgerTotal);
  const aitPct = percent(aitTotal, ledgerTotal);
  const otherPct = percent(otherTotal, ledgerTotal);

  const goToRoute = (route: RouteRegistryEntry) => {
    setActiveRouteId(route.id);
    if (route.group === 'Source Tax') setActiveNavTab('source-tax');
    else if (route.group === 'AIT') setActiveNavTab('ait');
    else if (route.group === 'Payment') setActiveNavTab('payments');
    else setActiveNavTab('adjustments');
  };

  const cards = [
    { id: 'source', label: t('Source Tax','উৎস কর'), value: sourceTotal, count: `${sourceRoutes.length} ${t('categories','খাত')}`,
      caption: `${sourcePct.toFixed(1)}% ${t('of Ledger total','লেজার মোটের')}`, icon: ReceiptText, action: () => setActiveNavTab('source-tax') },
    { id: 'ait', label: t('Advance Income Tax (AIT)','অগ্রিম আয়কর (AIT)'), value: aitTotal, count: `${aitRoutes.length} ${t('categories','খাত')}`,
      caption: `${aitPct.toFixed(1)}% ${t('of Ledger total','লেজার মোটের')}`, icon: CarFront, action: () => setActiveNavTab('ait') },
    { id: 'other', label: t('Other Tax & Adjustments','অন্যান্য কর ও সমন্বয়'), value: otherTotal, count: `${otherRoutes.length} ${t('categories','খাত')}`,
      caption: `${otherPct.toFixed(1)}% ${t('of Ledger total','লেজার মোটের')}`, icon: ShieldCheck, action: () => setActiveNavTab('payments') },
    { id: 'total', label: t('Ledger Total','লেজারে মোট'), value: ledgerTotal, count: t('Current Ledger data','বর্তমান লেজারের তথ্য'),
      caption: '', icon: FileCheck2, action: () => setIsStatusModalOpen(true) },
  ];

  const categoryPanel = (title: string, subtitle: string, routes: RouteRegistryEntry[], total: number, key: string) => (
    <section className={`eledger-category-panel eledger-category-${key}`} aria-label={title}>
      <header className="eledger-category-heading">
        <div><h2>{title}</h2><p>{subtitle}</p></div>
        <div className="eledger-category-heading-total"><strong>{amount(total)}</strong><small>{routes.length} {t('categories','খাত')}</small></div>
      </header>
      <div className="eledger-category-list">
        {routes.map((route) => {
          const value = routeAmounts.get(route.id) ?? 0;
          return (
            <button type="button" key={route.id} onClick={() => goToRoute(route)}
              aria-label={`${t('Open','খুলুন')} ${name(route)}: ${amount(value)}`}>
              <span className="eledger-category-name">{name(route)}{value === 0 && key === 'ait' &&
                <small>{t('No amount currently recorded','এখনো কোনো অঙ্ক রেকর্ড হয়নি')}</small>}</span>
              <strong className={value === 0 ? 'is-empty' : ''}>{amount(value)}</strong>
              <ArrowRight size={15} aria-hidden="true"/>
            </button>
          );
        })}
      </div>
    </section>
  );

  return (
    <div className="eledger-dashboard">
      <LedgerPageHeader title={t('Dashboard','ড্যাশবোর্ড')}
        caption={t('Tax records and totals at a glance.','কর রেকর্ড ও মোট অঙ্ক একনজরে।')}
        action={<button type="button" className="eledger-button eledger-button-secondary" onClick={() => setIsStatusModalOpen(true)}>
          <FileCheck2 size={16} aria-hidden="true"/>{t('Tax Payment Status','কর পরিশোধের অবস্থা')}
        </button>}/>

      <section className="eledger-summary-cards" aria-label={t('Tax records summary','কর রেকর্ডের সারাংশ')}>
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button type="button" className={`eledger-summary-card ${card.id}`} key={card.id} onClick={card.action}>
              <div className="eledger-summary-upper">
                <span className="eledger-summary-symbol"><Icon size={18} aria-hidden="true"/></span>
                <span className="eledger-summary-count">{card.count}</span>
              </div>
              <span className="eledger-card-label">{card.label}</span>
              <strong className="eledger-summary-amount">{amount(card.value)}</strong>
              {card.caption && <span className="eledger-summary-caption">{card.caption}</span>}
            </button>
          );
        })}
      </section>

      <section className="eledger-ledger-composition" aria-label={t('Ledger composition','লেজারের বিন্যাস')}>
        <div className="eledger-composition-heading">
          <div><h2>{t('Ledger composition','লেজারের বিন্যাস')}</h2>
            <p>{language === 'bn' ? `${allRoutes.length}টি খাতের মধ্যে ${recordedCategories}টিতে অঙ্ক রেকর্ড আছে।` : `${recordedCategories} of ${allRoutes.length} categories currently have an amount recorded.`}</p>
          </div>
          {emptyRoutes.length > 0 && <button type="button" onClick={() => goToRoute(emptyRoutes[0])}>
            {language === 'bn' ? `${emptyRoutes.length}টি খাতে কোনো অঙ্ক নেই` : `${emptyRoutes.length} ${emptyRoutes.length === 1 ? 'category has' : 'categories have'} no amount`}
            <ArrowRight size={15} aria-hidden="true"/>
          </button>}
        </div>
        <svg className="eledger-composition-bar" viewBox="0 0 100 10" preserveAspectRatio="none" role="img"
          aria-label={`${t('Source Tax','উৎস কর')} ${sourcePct.toFixed(1)}%, AIT ${aitPct.toFixed(1)}%, ${t('other tax and adjustments','অন্যান্য কর ও সমন্বয়')} ${otherPct.toFixed(1)}%`}>
          <rect className="eledger-bar-empty" x="0" y="0" width="100" height="10"/>
          <rect className="eledger-bar-source" x="0" y="0" width={sourcePct} height="10"/>
          <rect className="eledger-bar-ait" x={sourcePct} y="0" width={aitPct} height="10"/>
          <rect className="eledger-bar-other" x={sourcePct + aitPct} y="0" width={otherPct} height="10"/>
        </svg>
        <div className="eledger-composition-legend">
          <div><span className="eledger-composition-dot source"/>{t('Source Tax','উৎস কর')} <strong>{sourcePct.toFixed(1)}%</strong></div>
          <div><span className="eledger-composition-dot ait"/>AIT <strong>{aitPct.toFixed(1)}%</strong></div>
          <div><span className="eledger-composition-dot other"/>{t('Other tax & adjustments','অন্যান্য কর ও সমন্বয়')} <strong>{otherPct.toFixed(1)}%</strong></div>
        </div>
      </section>

      <div className="eledger-dashboard-columns">
        {categoryPanel(t('Source Tax categories','উৎস করের খাতসমূহ'), t('Current claimed amount for each source-tax category.','প্রতিটি উৎস কর খাতে বর্তমান দাবিকৃত অঙ্ক।'), sourceRoutes, sourceTotal, 'source')}
        <div className="eledger-dashboard-middle">
          {categoryPanel(t('AIT categories','অগ্রিম করের খাতসমূহ'), t('Current AIT amounts by available category.','প্রতিটি অগ্রিম কর খাতে বর্তমান অঙ্ক।'), aitRoutes, aitTotal, 'ait')}
          {categoryPanel(t('Other tax & adjustments','অন্যান্য কর ও সমন্বয়'), t('Tax paid with return, surcharge and adjustments.','রিটার্নের সঙ্গে প্রদত্ত কর, সারচার্জ ও সমন্বয়।'), otherRoutes, otherTotal, 'other')}
        </div>
        <aside className="eledger-dashboard-aside">
          <section className="eledger-dashboard-quick-actions">
            <header><h2>{t('Quick actions','দ্রুত কাজ')}</h2><span>LEDGER</span></header>
            <div className="eledger-dashboard-action-list">
              <button type="button" className="is-featured" onClick={() => setIsStatusModalOpen(true)}>
                <span><strong>{t('Review Tax Payment Status','কর পরিশোধের অবস্থা দেখুন')}</strong><small>{t('Review all tax and adjustments together','সব কর ও সমন্বয় একসঙ্গে দেখুন')}</small></span><FileCheck2 size={16}/>
              </button>
              <button type="button" onClick={() => setActiveNavTab('source-tax')}>
                <span><strong>{t('Update Source Tax','উৎস কর হালনাগাদ করুন')}</strong><small>{t('Choose a category with an available entry workflow','রেকর্ড যোগের সুযোগ আছে এমন খাত বেছে নিন')}</small></span><ArrowRight size={16}/>
              </button>
              <button type="button" onClick={() => setActiveNavTab('ait')}>
                <span><strong>{t('Update AIT','অগ্রিম কর হালনাগাদ করুন')}</strong><small>{t('Start with AIT on Car','গাড়ির অগ্রিম কর দিয়ে শুরু করুন')}</small></span><ArrowRight size={16}/>
              </button>
              <button type="button" onClick={() => setActiveNavTab('ledger-guide')}>
                <span className="eledger-action-with-icon"><BookOpen size={16}/><strong>{t('How eReturn Ledger Works','ই-রিটার্ন লেজার যেভাবে কাজ করে')}</strong></span><ArrowRight size={16}/>
              </button>
            </div>
          </section>
          <div className="eledger-dashboard-next-step">
            <span>{t('NEXT STEP','পরবর্তী ধাপ')}</span>
            <p>{t('Review your recorded categories and reconcile their payment status before returning.','রিটার্নে ফেরার আগে সব রেকর্ডকৃত খাত ও কর পরিশোধের অবস্থা মিলিয়ে নিন।')}</p>
            <button type="button" onClick={() => setIsStatusModalOpen(true)}>{t('Open payment status','কর পরিশোধের অবস্থা খুলুন')} <ChevronRight size={15}/></button>
          </div>
        </aside>
      </div>
      <div className="eledger-dashboard-verification-note">
        <WalletCards size={16} aria-hidden="true"/>
        {t('Recorded ledger amounts are not necessarily verified credits. Independently authorized verified credit:','রেকর্ডকৃত লেজারের অঙ্ক যাচাইকৃত করের ক্রেডিট নয়। কর্তৃপক্ষের স্বতন্ত্র যাচাইকৃত ক্রেডিট:')}
        <strong>৳ {amount(totals.grandTotalCredits)}</strong>.
      </div>
    </div>
  );
};
