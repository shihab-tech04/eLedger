import React, { useEffect, useState } from 'react';
import {
  BookOpen, BriefcaseBusiness, ChevronDown, ChevronRight, CircleHelp,
  FileCheck2, Home, Landmark, Menu, RotateCcw, ShieldCheck,
  UserRound, WalletCards, X,
} from 'lucide-react';
import { useLedger } from '../../context/LedgerContext.tsx';
import { getActiveVisibleRouteForGroup, getVisibleRoutesByGroup } from '../../domain/routeRegistry.ts';
import type { LedgerRouteId } from '../../domain/models.ts';

type RouteGroup = 'Source Tax' | 'AIT' | 'Payment' | 'Adjustment';
type NavTab = 'dashboard' | 'ledger-guide' | 'source-tax' | 'ait' | 'payments' | 'adjustments';

const SOURCE_SECTIONS = [
  { id: 'salary', label: 'Salary', icon: UserRound, routes: ['salary-ibas', 'salary-others'] },
  { id: 'financial', label: 'Financial Assets', icon: WalletCards, routes: ['bank-fi', 'dividend', 'sanchayapatra'] },
  { id: 'service', label: 'Service & Professional', icon: BriefcaseBusiness, routes: ['service-payment', 'source-ltu'] },
  { id: 'trade', label: 'Trade & Other', icon: Landmark, routes: ['system-import', 'commercial-source', 'other-tds'] },
] as const;

const GROUP_TABS: Record<RouteGroup, NavTab> = {
  'Source Tax': 'source-tax', AIT: 'ait', Payment: 'payments', Adjustment: 'adjustments',
};

const CREDIT_ROUTES: Array<{ group: 'Payment' | 'Adjustment'; id: LedgerRouteId }> = [
  { group: 'Payment', id: 'sec-173' },
  { group: 'Payment', id: 'environmental-surcharge' },
  { group: 'Adjustment', id: 'refund' },
  { group: 'Adjustment', id: 'carry-forward' },
];

const ROUTE_NAMES: Partial<Record<LedgerRouteId, string>> = {
  'salary-ibas': 'Salary (iBAS++)',
  'salary-others': 'Salary (Others)',
  'bank-fi': 'Bank/FI Interest/Profit',
  dividend: 'Dividend',
  'service-payment': 'Service Payment',
  sanchayapatra: 'Sanchayapatra',
  'system-import': 'Import (120)',
  'source-ltu': 'Source Tax (LTU)',
  'commercial-source': 'Commercial Vehicle',
  'other-tds': 'Others',
  'car-ait': 'AIT on Car',
  'sec-154': 'AIT under Section 154',
  'ait-import': 'AIT Import (120)',
  'sec-173': 'Tax Paid with Return (173)',
  'environmental-surcharge': 'Environmental Surcharge',
  refund: 'Adjustment of Tax Refund',
  'carry-forward': 'Carry forward tax u/s 163',
  'contractor-supplier': 'Contractor & Supply of Goods',
  'house-property': 'House Property Rental TDS',
  'commercial-vehicle': 'Commercial Vehicle AIT',
  'sec-171': 'Advance Tax under Section 171',
};

export const Sidebar: React.FC = () => {
  const { activeNavTab, setActiveNavTab, activeRouteId, setActiveRouteId,
    entries, setIsStatusModalOpen } = useLedger();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expanded, setExpanded] = useState({ source: true, ait: true, credits: true });
  const [sourceExpanded, setSourceExpanded] = useState<Record<string, boolean>>({
    salary: false, financial: false, service: false, trade: false,
  });

  useEffect(() => {
    if (!mobileOpen) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [mobileOpen]);

  useEffect(() => {
    if (activeNavTab === 'source-tax') {
      setExpanded((current) => ({ ...current, source: true }));
      const knownSection = SOURCE_SECTIONS.find((section) => section.routes.some((id) => id === activeRouteId));
      const sectionId = knownSection?.id ?? 'trade';
      setSourceExpanded((current) => ({ ...current, [sectionId]: true }));
    } else if (activeNavTab === 'ait') {
      setExpanded((current) => ({ ...current, ait: true }));
    } else if (activeNavTab === 'payments' || activeNavTab === 'adjustments') {
      setExpanded((current) => ({ ...current, credits: true }));
    }
  }, [activeNavTab, activeRouteId]);

  const navigate = (tab: NavTab, routeId?: LedgerRouteId) => {
    if (routeId) setActiveRouteId(routeId);
    setActiveNavTab(tab);
    setMobileOpen(false);
  };

  const openStatus = () => {
    setIsStatusModalOpen(true);
    setMobileOpen(false);
  };

  const routeIdsWithEntries = entries.map((entry) => entry.routeId);
  const routesByGroup = (group: RouteGroup) => getVisibleRoutesByGroup(group, routeIdsWithEntries);
  const activeIdForGroup = (group: RouteGroup) => getActiveVisibleRouteForGroup(activeRouteId, group, routeIdsWithEntries).id;
  const sourceRoutes = routesByGroup('Source Tax');
  const sourceSections = SOURCE_SECTIONS.map((section) => ({
    ...section,
    visibleRoutes: sourceRoutes.filter((route) => section.routes.some((id) => id === route.id) || (
      section.id === 'trade' && !SOURCE_SECTIONS.some((known) => known.routes.some((id) => id === route.id))
    )),
  }));
  const renderRoute = (group: RouteGroup, route: ReturnType<typeof routesByGroup>[number], child = false) => {
    const tab = GROUP_TABS[group];
    const isSelected = activeNavTab === tab && activeIdForGroup(group) === route.id;
    return (
      <button key={route.id} type="button"
        className={`eledger-side-link subitem ${child ? 'nested' : ''} ${isSelected ? 'is-active' : ''}`}
        aria-current={isSelected ? 'page' : undefined}
        onClick={() => navigate(tab, route.id)}>
        <span>{ROUTE_NAMES[route.id] ?? route.title}</span>
      </button>
    );
  };

  const otherCreditRoutes = CREDIT_ROUTES.flatMap(({ group, id }) => {
    const route = routesByGroup(group).find((candidate) => candidate.id === id);
    return route ? [{ group, route }] : [];
  });
  const legacyCreditRoutes = (['Payment', 'Adjustment'] as const).flatMap((group) =>
    routesByGroup(group).filter((route) => !CREDIT_ROUTES.some((item) => item.id === route.id)).map((route) => ({ group, route }))
  );

  return (
    <>
      <div className="eledger-mobile-nav">
        <button type="button" onClick={() => setMobileOpen(true)} aria-label="Open ledger menu">
          <Menu size={19} /> <span>Menu</span>
        </button>
        <span>eReturn Ledger</span>
      </div>
      {mobileOpen && <button type="button" aria-label="Close ledger menu" className="eledger-sidebar-scrim" onClick={() => setMobileOpen(false)} />}
      <aside className={`eledger-sidebar ${mobileOpen ? 'is-open' : ''}`} aria-label="eLedger navigation">
        <div className="eledger-sidebar-mobile-heading">
          <span>eReturn Ledger</span>
          <button type="button" aria-label="Close ledger menu" onClick={() => setMobileOpen(false)}><X size={20}/></button>
        </div>
        <nav className="eledger-sidebar-links">
          <button type="button" className={`eledger-side-link prominent ${activeNavTab === 'dashboard' ? 'is-active' : ''}`} onClick={() => navigate('dashboard')}>
            <Home size={18} /> <span>Dashboard</span>
          </button>
          <button type="button" className={`eledger-side-link ${activeNavTab === 'ledger-guide' ? 'is-active' : ''}`} onClick={() => navigate('ledger-guide')}>
            <BookOpen size={18} /> <span>Ledger Guide</span>
          </button>

          <section className="eledger-nav-group">
            <button type="button" className="eledger-nav-heading" aria-expanded={expanded.source}
              onClick={() => setExpanded((current) => ({ ...current, source: !current.source }))}>
              <span>CLAIM SOURCE TAX</span>{expanded.source ? <ChevronDown size={15}/> : <ChevronRight size={15}/>}
            </button>
            {expanded.source && <div className="eledger-nav-subitems">
              {sourceSections.map((section) => {
                const Icon = section.icon;
                const selected = activeNavTab === 'source-tax' && section.visibleRoutes.some((route) => route.id === activeIdForGroup('Source Tax'));
                return <div key={section.id}>
                  <button type="button" className={`eledger-side-link source-category ${selected ? 'has-active-child' : ''}`}
                    aria-expanded={sourceExpanded[section.id]}
                    onClick={() => setSourceExpanded((current) => ({ ...current, [section.id]: !current[section.id] }))}>
                    <Icon size={17}/><span>{section.label}</span>
                    {sourceExpanded[section.id] ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                  </button>
                  {sourceExpanded[section.id] && <div className="eledger-nav-nested">
                    {section.visibleRoutes.map((route) => renderRoute('Source Tax', route, true))}
                  </div>}
                </div>;
              })}
            </div>}
          </section>

          <section className="eledger-nav-group">
            <button type="button" className="eledger-nav-heading" aria-expanded={expanded.ait}
              onClick={() => setExpanded((current) => ({ ...current, ait: !current.ait }))}>
              <span>ADVANCE INCOME TAX</span>{expanded.ait ? <ChevronDown size={15}/> : <ChevronRight size={15}/>}
            </button>
            {expanded.ait && <div className="eledger-nav-subitems">
              {routesByGroup('AIT').map((route) => renderRoute('AIT', route))}
            </div>}
          </section>

          <section className="eledger-nav-group">
            <button type="button" className="eledger-nav-heading" aria-expanded={expanded.credits}
              onClick={() => setExpanded((current) => ({ ...current, credits: !current.credits }))}>
              <span>OTHER TAX CREDITS</span>{expanded.credits ? <ChevronDown size={15}/> : <ChevronRight size={15}/>}
            </button>
            {expanded.credits && <div className="eledger-nav-subitems">
              {[...otherCreditRoutes, ...legacyCreditRoutes].map(({ group, route }) => renderRoute(group, route))}
            </div>}
          </section>

          <button type="button" className="eledger-side-link status-link" onClick={openStatus}>
            <FileCheck2 size={18}/> <span>Tax Payment Status</span>
          </button>
        </nav>
        <div className="eledger-sidebar-bottom">
          <a href="https://etaxnbr.gov.bd/" target="_blank" rel="noopener noreferrer" className="eledger-return-link">
            <RotateCcw size={17}/> <span>Go to eReturn</span> <ChevronRight size={16}/>
          </a>
          <button type="button" className="eledger-help-box" onClick={() => navigate('ledger-guide')}><CircleHelp size={17}/><span>Ledger Guide and payment help</span></button>
          <div className="eledger-sidebar-agency"><Landmark size={18}/><span>National Board of Revenue</span><ShieldCheck size={15}/></div>
        </div>
      </aside>
    </>
  );
};
