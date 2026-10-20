import React, { useEffect, useState } from 'react';
import {
  BookOpen, Car, ChevronDown, ChevronRight, FileCheck2,
  LayoutDashboard, Menu, PhoneCall, ReceiptText, RotateCcw,
  ShieldCheck, X,
} from 'lucide-react';
import { useLedger } from '../../context/LedgerContext.tsx';
import { useLedgerLanguage } from '../../context/LanguageContext.tsx';
import { getActiveVisibleRouteForGroup, getVisibleRoutesByGroup } from '../../domain/routeRegistry.ts';
import type { LedgerRouteId } from '../../domain/models.ts';

type RouteGroup = 'Source Tax' | 'AIT' | 'Payment' | 'Adjustment';
type NavTab = 'dashboard' | 'ledger-guide' | 'source-tax' | 'ait' | 'payments' | 'adjustments';

const GROUP_TABS: Record<RouteGroup, NavTab> = {
  'Source Tax': 'source-tax', AIT: 'ait', Payment: 'payments', Adjustment: 'adjustments',
};

const ORIGINAL_LABELS: Partial<Record<LedgerRouteId, string>> = {
  'salary-ibas': 'Salary (iBAS++)',
  'salary-others': 'Salary (Others)',
  'bank-fi': 'Bank/FI Interest/Profit',
  dividend: 'Dividend',
  'service-payment': 'Service Payment',
  sanchayapatra: 'Sanchayapatra',
  'system-import': 'Import',
  'source-ltu': 'Source Tax (LTU)',
  'commercial-source': 'Commercial Vehicle',
  'other-tds': 'Others',
  'car-ait': 'AIT on Car',
  'sec-154': 'AIT (154)',
  'ait-import': 'AIT Import (120)',
  'sec-173': 'Tax Paid with Return (173)',
  'environmental-surcharge': 'Environmental Surcharge',
  refund: 'Adjustment of Tax Refund',
  'carry-forward': 'Adjustment of carry forward tax u/s 163',
};

const CREDIT_ROUTES: Array<{ group: 'Payment' | 'Adjustment'; id: LedgerRouteId }> = [
  { group: 'Payment', id: 'sec-173' },
  { group: 'Payment', id: 'environmental-surcharge' },
  { group: 'Adjustment', id: 'refund' },
  { group: 'Adjustment', id: 'carry-forward' },
];

/** Flat left navigation from the accepted September 2026 custom eLedger UI. */
export const Sidebar: React.FC = () => {
  const { activeNavTab, setActiveNavTab, activeRouteId, setActiveRouteId,
    entries, setIsStatusModalOpen } = useLedger();
  const { language } = useLedgerLanguage();
  const bn = language === 'bn';
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expanded, setExpanded] = useState({ source: true, ait: false });

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
      setExpanded((current) => current.source ? current : { ...current, source: true });
    } else if (activeNavTab === 'ait') {
      setExpanded((current) => current.ait ? current : { ...current, ait: true });
    }
  }, [activeNavTab]);

  const navigate = (tab: NavTab, routeId?: LedgerRouteId) => {
    if (routeId) setActiveRouteId(routeId);
    setActiveNavTab(tab);
    setMobileOpen(false);
  };

  const openStatus = () => {
    setIsStatusModalOpen(true);
    setMobileOpen(false);
  };

  const savedRouteIds = entries.map((entry) => entry.routeId);
  const routesByGroup = (group: RouteGroup) => getVisibleRoutesByGroup(group, savedRouteIds);
  const activeIdForGroup = (group: RouteGroup) =>
    getActiveVisibleRouteForGroup(activeRouteId, group, savedRouteIds).id;
  const routeText = (route: ReturnType<typeof routesByGroup>[number]) =>
    bn ? route.bengaliTitle : ORIGINAL_LABELS[route.id] ?? route.title;

  const renderRoute = (group: RouteGroup, route: ReturnType<typeof routesByGroup>[number], withDot = false) => {
    const tab = GROUP_TABS[group];
    const selected = activeNavTab === tab && activeIdForGroup(group) === route.id;
    return <button key={route.id} type="button"
      className={'eledger-side-link eledger-route-link ' + (withDot ? 'source-route ' : '') + (selected ? 'is-active' : '')}
      aria-current={selected ? 'page' : undefined} onClick={() => navigate(tab, route.id)}>
      {withDot && <span className="eledger-source-dot" aria-hidden="true"/>}
      <span>{routeText(route)}</span>
    </button>;
  };

  const primaryCredits = CREDIT_ROUTES.flatMap(({ group, id }) => {
    const route = routesByGroup(group).find((candidate) => candidate.id === id);
    return route ? [{ group, route }] : [];
  });
  const remainingCredits = (['Payment', 'Adjustment'] as const).flatMap((group) =>
    routesByGroup(group).filter((route) => !CREDIT_ROUTES.some((item) => item.id === route.id))
      .map((route) => ({ group, route }))
  );

  return (
    <>
      <div className="eledger-mobile-nav">
        <button type="button" onClick={() => setMobileOpen(true)} aria-label={bn ? 'লেজার মেনু খুলুন' : 'Open ledger menu'}>
          <Menu size={19}/><span>{bn ? 'মেনু' : 'Menu'}</span>
        </button>
        <span>eReturn Ledger</span>
      </div>
      {mobileOpen && <button type="button" aria-label={bn ? 'লেজার মেনু বন্ধ করুন' : 'Close ledger menu'}
        className="eledger-sidebar-scrim" onClick={() => setMobileOpen(false)}/>}
      <aside className={'eledger-sidebar ' + (mobileOpen ? 'is-open' : '')} aria-label="eLedger navigation" lang={bn ? 'bn' : 'en'}>
        <div className="eledger-sidebar-mobile-heading">
          <span>eReturn Ledger</span>
          <button type="button" aria-label={bn ? 'লেজার মেনু বন্ধ করুন' : 'Close ledger menu'} onClick={() => setMobileOpen(false)}><X size={20}/></button>
        </div>
        <nav className="eledger-sidebar-links">
          <button type="button" className={'eledger-side-link ' + (activeNavTab === 'dashboard' ? 'is-active' : '')}
            aria-current={activeNavTab === 'dashboard' ? 'page' : undefined} onClick={() => navigate('dashboard')}>
            <LayoutDashboard size={16}/><span>{bn ? 'ড্যাশবোর্ড' : 'Dashboard'}</span>
          </button>
          <button type="button" className={'eledger-side-link ' + (activeNavTab === 'ledger-guide' ? 'is-active' : '')}
            aria-current={activeNavTab === 'ledger-guide' ? 'page' : undefined} onClick={() => navigate('ledger-guide')}>
            <BookOpen size={16}/><span>{bn ? 'লেজার নির্দেশিকা' : 'Ledger Guide'}</span>
          </button>

          <div className="eledger-nav-group">
            <button type="button" className="eledger-side-link eledger-group-toggle"
              aria-expanded={expanded.source} onClick={() => setExpanded((current) => ({ ...current, source: !current.source }))}>
              <ReceiptText size={16}/><span>{bn ? 'উৎস কর দাবি' : 'Claim Source Tax'}</span>
              {expanded.source ? <ChevronDown size={15}/> : <ChevronRight size={15}/>}
            </button>
            {expanded.source && <div className="eledger-source-route-list">
              {routesByGroup('Source Tax').map((route) => renderRoute('Source Tax', route, true))}
            </div>}
          </div>

          <div className="eledger-nav-group">
            <button type="button" className="eledger-side-link eledger-group-toggle"
              aria-expanded={expanded.ait} onClick={() => setExpanded((current) => ({ ...current, ait: !current.ait }))}>
              <Car size={16}/><span>{bn ? 'অগ্রিম কর দাবি' : 'Claim AIT'}</span>
              {expanded.ait ? <ChevronDown size={15}/> : <ChevronRight size={15}/>}
            </button>
            {expanded.ait && <div className="eledger-source-route-list">
              {routesByGroup('AIT').map((route) => renderRoute('AIT', route, true))}
            </div>}
          </div>

          <div className="eledger-direct-credits">
            {[...primaryCredits, ...remainingCredits].map(({ group, route }) => {
              const tab = GROUP_TABS[group];
              const selected = activeNavTab === tab && activeIdForGroup(group) === route.id;
              return <button key={route.id} type="button"
                className={'eledger-side-link ' + (selected ? 'is-active' : '')}
                aria-current={selected ? 'page' : undefined} onClick={() => navigate(tab, route.id)}>
                <ShieldCheck size={16}/><span>{routeText(route)}</span>
              </button>;
            })}
          </div>

          <button type="button" className="eledger-side-link eledger-status-link" onClick={openStatus}>
            <FileCheck2 size={16}/><span>{bn ? 'কর পরিশোধের অবস্থা' : 'Tax Payment Status'}</span>
          </button>
          <a className="eledger-return-link" href="https://etaxnbr.gov.bd/" target="_blank" rel="noopener noreferrer">
            <RotateCcw size={16}/><span>{bn ? 'ই-রিটার্নে যান' : 'Go to eReturn'}</span><ChevronRight size={15}/>
          </a>
        </nav>
        <div className="eledger-sidebar-bottom">
          <a className="eledger-helpline" href="tel:09643717171">
            <PhoneCall size={16}/><span><strong>09643717171</strong><small>{bn ? 'কর সহায়তা' : 'Taxes Helpline'}</small></span>
          </a>
        </div>
      </aside>
    </>
  );
};
