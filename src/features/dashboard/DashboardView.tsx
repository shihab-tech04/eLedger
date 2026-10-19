import React from 'react';
import { useLedger } from '../../context/LedgerContext.tsx';
import { getVisibleRoutesByGroup } from '../../domain/routeRegistry.ts';
import type { LedgerRouteId, RouteRegistryEntry } from '../../domain/models.ts';
import { ArrowRight, BookOpen, CarFront, ChevronRight, FileCheck2, ReceiptText, ShieldCheck, WalletCards } from 'lucide-react';

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
    { id: 'source', label: 'Source Tax', value: sourceTotal, count: `${sourceRoutes.length} categories`,
      caption: `${sourcePct.toFixed(1)}% of Ledger total`, icon: ReceiptText, action: () => setActiveNavTab('source-tax') },
    { id: 'ait', label: 'Advance Income Tax (AIT)', value: aitTotal, count: `${aitRoutes.length} categories`,
      caption: `${aitPct.toFixed(1)}% of Ledger total`, icon: CarFront, action: () => setActiveNavTab('ait') },
    { id: 'other', label: 'Other Tax & Adjustments', value: otherTotal, count: `${otherRoutes.length} categories`,
      caption: `${otherPct.toFixed(1)}% of Ledger total`, icon: ShieldCheck, action: () => setActiveNavTab('payments') },
    { id: 'total', label: 'Ledger Total', value: ledgerTotal, count: 'Current Ledger data',
      caption: '', icon: FileCheck2, action: () => setIsStatusModalOpen(true) },
  ];

  const categoryPanel = (title: string, subtitle: string, routes: RouteRegistryEntry[], total: number, key: string) => (
    <section className={`eledger-category-panel eledger-category-${key}`} aria-label={title}>
      <header className="eledger-category-heading">
        <div><h2>{title}</h2><p>{subtitle}</p></div>
        <div className="eledger-category-heading-total"><strong>{amount(total)}</strong><small>{routes.length} categories</small></div>
      </header>
      <div className="eledger-category-list">
        {routes.map((route) => {
          const value = routeAmounts.get(route.id) ?? 0;
          return (
            <button type="button" key={route.id} onClick={() => goToRoute(route)}
              aria-label={`Open ${routeName(route)}: ${amount(value)}`}>
              <span className="eledger-category-name">{routeName(route)}{value === 0 && key === 'ait' &&
                <small>No amount currently recorded</small>}</span>
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
      <header className="eledger-dashboard-heading">
        <div>
          <span className="eledger-dashboard-eyebrow">ERETURN LEDGER</span>
          <h1>Dashboard</h1>
          <p>See the current Ledger tax, AIT, adjustments and total amount at a glance.</p>
        </div>
        <button type="button" className="eledger-dashboard-status-button" onClick={() => setIsStatusModalOpen(true)}>
          <FileCheck2 size={16} aria-hidden="true"/>View Tax Payment Status
        </button>
      </header>

      <section className="eledger-summary-cards" aria-label="Tax records summary">
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

      <section className="eledger-ledger-composition" aria-label="Ledger composition">
        <div className="eledger-composition-heading">
          <div><h2>Ledger composition</h2>
            <p>{recordedCategories} of {allRoutes.length} categories currently have an amount recorded.</p>
          </div>
          {emptyRoutes.length > 0 && <button type="button" onClick={() => goToRoute(emptyRoutes[0])}>
            {emptyRoutes.length} {emptyRoutes.length === 1 ? 'category has' : 'categories have'} no amount
            <ArrowRight size={15} aria-hidden="true"/>
          </button>}
        </div>
        <svg className="eledger-composition-bar" viewBox="0 0 100 10" preserveAspectRatio="none" role="img"
          aria-label={`Source Tax ${sourcePct.toFixed(1)}%, AIT ${aitPct.toFixed(1)}%, other tax and adjustments ${otherPct.toFixed(1)}%`}>
          <rect className="eledger-bar-empty" x="0" y="0" width="100" height="10"/>
          <rect className="eledger-bar-source" x="0" y="0" width={sourcePct} height="10"/>
          <rect className="eledger-bar-ait" x={sourcePct} y="0" width={aitPct} height="10"/>
          <rect className="eledger-bar-other" x={sourcePct + aitPct} y="0" width={otherPct} height="10"/>
        </svg>
        <div className="eledger-composition-legend">
          <div><span className="eledger-composition-dot source"/>Source Tax <strong>{sourcePct.toFixed(1)}%</strong></div>
          <div><span className="eledger-composition-dot ait"/>AIT <strong>{aitPct.toFixed(1)}%</strong></div>
          <div><span className="eledger-composition-dot other"/>Other tax &amp; adjustments <strong>{otherPct.toFixed(1)}%</strong></div>
        </div>
      </section>

      <div className="eledger-dashboard-columns">
        {categoryPanel('Source Tax categories', 'Current claimed amount for each source-tax category.', sourceRoutes, sourceTotal, 'source')}
        <div className="eledger-dashboard-middle">
          {categoryPanel('AIT categories', 'Current AIT amounts by available category.', aitRoutes, aitTotal, 'ait')}
          {categoryPanel('Other tax & adjustments', 'Tax paid with return, surcharge and adjustments.', otherRoutes, otherTotal, 'other')}
        </div>
        <aside className="eledger-dashboard-aside">
          <section className="eledger-dashboard-quick-actions">
            <header><h2>Quick actions</h2><span>LEDGER</span></header>
            <div className="eledger-dashboard-action-list">
              <button type="button" className="is-featured" onClick={() => setIsStatusModalOpen(true)}>
                <span><strong>Review Tax Payment Status</strong><small>Review all tax and adjustments together</small></span><FileCheck2 size={16}/>
              </button>
              <button type="button" onClick={() => setActiveNavTab('source-tax')}>
                <span><strong>Update Source Tax</strong><small>Start with Salary (iBAS++)</small></span><ArrowRight size={16}/>
              </button>
              <button type="button" onClick={() => setActiveNavTab('ait')}>
                <span><strong>Update AIT</strong><small>Start with AIT on Car</small></span><ArrowRight size={16}/>
              </button>
              <button type="button" onClick={() => setActiveNavTab('ledger-guide')}>
                <span className="eledger-action-with-icon"><BookOpen size={16}/><strong>Ledger Guide</strong></span><ArrowRight size={16}/>
              </button>
            </div>
          </section>
          <div className="eledger-dashboard-next-step">
            <span>NEXT STEP</span>
            <p>Review your recorded categories and reconcile their payment status before returning.</p>
            <button type="button" onClick={() => setIsStatusModalOpen(true)}>Open payment status <ChevronRight size={15}/></button>
          </div>
        </aside>
      </div>
      <div className="eledger-dashboard-verification-note">
        <WalletCards size={16} aria-hidden="true"/>
        Recorded ledger amounts are not necessarily verified credits. Independently authorized verified credit:
        <strong>৳ {amount(totals.grandTotalCredits)}</strong>.
      </div>
    </div>
  );
};
