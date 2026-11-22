import React, { useEffect, useRef, useState } from 'react';
import {
  Car, ChevronDown, ChevronRight, FileCheck2,
  LayoutDashboard, Menu, PhoneCall, ReceiptText,
  ShieldCheck, X, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import { useLedger } from '../../context/LedgerContext.tsx';
import { useLedgerLanguage } from '../../context/LanguageContext.tsx';
import { getActiveVisibleRouteForGroup, getVisibleRoutesByGroup } from '../../domain/routeRegistry.ts';
import type { LedgerRouteId } from '../../domain/models.ts';

type RouteGroup = 'Source Tax' | 'AIT' | 'Payment' | 'Adjustment';
type NavTab = 'dashboard' | 'ledger-guide' | 'source-tax' | 'ait' | 'payments' | 'adjustments' | 'status';

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
  const mobileMenuOpener = useRef<HTMLButtonElement>(null);
  const mobileDrawer = useRef<HTMLElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState({ source: true, ait: false });

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    mobileDrawer.current?.querySelector<HTMLElement>('.eledger-sidebar-mobile-heading button')?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setMobileOpen(false); return; }
      if (event.key !== 'Tab') return;
      const controls = Array.from(mobileDrawer.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]),a[href]'
      ) ?? []).filter((element) => element.getClientRects().length > 0);
      if (!controls.length) return;
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
      mobileMenuOpener.current?.focus();
    };
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
    if (window.matchMedia('(max-width: 960px)').matches) window.scrollTo(0, 0);
  };

  const openStatus = () => {
    setIsStatusModalOpen(false);
    navigate('status');
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
      title={routeText(route)} aria-label={routeText(route)}
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
        <button type="button" ref={mobileMenuOpener} onClick={() => setMobileOpen(true)} aria-expanded={mobileOpen}
          aria-controls="eledger-mobile-sidebar" aria-label={bn ? 'লেজার মেনু খুলুন' : 'Open ledger menu'}>
          <Menu size={19}/><span>{bn ? 'মেনু' : 'Menu'}</span>
        </button>
        <span>eReturn Ledger</span>
      </div>
      {mobileOpen && <button type="button" aria-label={bn ? 'লেজার মেনু বন্ধ করুন' : 'Close ledger menu'}
        className="eledger-sidebar-scrim" onClick={() => setMobileOpen(false)}/>}
      <aside ref={mobileDrawer} id="eledger-mobile-sidebar"
        className={'eledger-sidebar ' + (mobileOpen ? 'is-open ' : '') + (collapsed ? 'is-collapsed' : '')}
        role={mobileOpen ? 'dialog' : undefined} aria-modal={mobileOpen ? true : undefined}
        aria-label="eLedger navigation" lang={bn ? 'bn' : 'en'}>
        <div className="eledger-sidebar-desktop-toggle">
          <button type="button" onClick={() => setCollapsed((value) => !value)}
            title={collapsed ? (bn ? 'নেভিগেশন প্রসারিত করুন' : 'Expand navigation') : (bn ? 'নেভিগেশন সংকুচিত করুন' : 'Collapse navigation')}
            aria-label={collapsed ? (bn ? 'নেভিগেশন প্রসারিত করুন' : 'Expand navigation') : (bn ? 'নেভিগেশন সংকুচিত করুন' : 'Collapse navigation')}
            aria-expanded={!collapsed}>
            {collapsed ? <PanelLeftOpen size={18} aria-hidden="true"/> : <PanelLeftClose size={18} aria-hidden="true"/>}
            {!collapsed && <span>{bn ? 'নেভিগেশন' : 'Navigation'}</span>}
          </button>
        </div>
        <div className="eledger-sidebar-mobile-heading">
          <span>eReturn Ledger</span>
          <button type="button" aria-label={bn ? 'লেজার মেনু বন্ধ করুন' : 'Close ledger menu'} onClick={() => setMobileOpen(false)}><X size={20}/></button>
        </div>
        <nav className="eledger-sidebar-links">
          <button type="button" title={bn ? 'ড্যাশবোর্ড' : 'Dashboard'} aria-label={bn ? 'ড্যাশবোর্ড' : 'Dashboard'} className={'eledger-side-link ' + (activeNavTab === 'dashboard' ? 'is-active' : '')}
            aria-current={activeNavTab === 'dashboard' ? 'page' : undefined} onClick={() => navigate('dashboard')}>
            <LayoutDashboard size={16}/><span>{bn ? 'ড্যাশবোর্ড' : 'Dashboard'}</span>
          </button>
          <button type="button" className={'eledger-side-link ' + (activeNavTab === 'ledger-guide' ? 'is-active' : '')}
            aria-current={activeNavTab === 'ledger-guide' ? 'page' : undefined}
            onClick={() => navigate('ledger-guide')}>
            <ReceiptText size={16}/><span>{bn ? 'হোম ও নির্দেশিকা' : 'Home / Guide'}</span>
          </button>
          <div className="eledger-nav-group">
            <button type="button" className="eledger-side-link eledger-group-toggle"
              aria-expanded={expanded.source} onClick={() => { if (collapsed) setCollapsed(false); else setExpanded((current) => ({ ...current, source: !current.source })); }}>
              <ReceiptText size={16}/><span>{bn ? 'উৎস কর দাবি' : 'Claim Source Tax'}</span>
              {expanded.source ? <ChevronDown size={15}/> : <ChevronRight size={15}/>}
            </button>
            {expanded.source && <div className="eledger-source-route-list">
              {routesByGroup('Source Tax').map((route) => renderRoute('Source Tax', route, true))}
            </div>}
          </div>

          <div className="eledger-nav-group">
            <button type="button" className="eledger-side-link eledger-group-toggle"
              aria-expanded={expanded.ait} onClick={() => { if (collapsed) setCollapsed(false); else setExpanded((current) => ({ ...current, ait: !current.ait })); }}>
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
                className={'eledger-side-link ' + (selected ? 'is-active' : '')} title={routeText(route)} aria-label={routeText(route)}
                aria-current={selected ? 'page' : undefined} onClick={() => navigate(tab, route.id)}>
                <ShieldCheck size={16}/><span>{routeText(route)}</span>
              </button>;
            })}
          </div>

          <button type="button" className={'eledger-side-link eledger-status-link ' + (activeNavTab === 'status' ? 'is-active' : '')}
            aria-current={activeNavTab === 'status' ? 'page' : undefined} onClick={openStatus}>
            <FileCheck2 size={16}/><span>{bn ? 'কর পরিশোধের অবস্থা' : 'Tax Payment Status'}</span>
          </button>
        </nav>
        <div className="eledger-sidebar-bottom">
          <a className="eledger-helpline" href="tel:09643717171">
            <PhoneCall size={16}/><span><strong>09643717171</strong><small>{bn ? 'কর সহায়তা' : 'Taxes Helpline'}</small></span>
          </a>
        </div>
      </aside>
      <nav className="eledger-mobile-bottom-nav" aria-label={bn ? 'দ্রুত নেভিগেশন' : 'Quick navigation'}>
        <button type="button" className={activeNavTab === 'dashboard' ? 'is-active' : ''}
          aria-current={activeNavTab === 'dashboard' ? 'page' : undefined}
          onClick={() => navigate('dashboard')}><LayoutDashboard size={20} aria-hidden="true"/><span>{bn ? 'ড্যাশবোর্ড' : 'Home'}</span></button>
        <button type="button" className={activeNavTab === 'source-tax' ? 'is-active' : ''}
          aria-current={activeNavTab === 'source-tax' ? 'page' : undefined}
          onClick={() => navigate('source-tax', activeIdForGroup('Source Tax'))}>
          <ReceiptText size={20} aria-hidden="true"/><span>{bn ? 'উৎস কর' : 'Source Tax'}</span></button>
        <button type="button" className={activeNavTab === 'ait' ? 'is-active' : ''}
          aria-current={activeNavTab === 'ait' ? 'page' : undefined}
          onClick={() => navigate('ait', activeIdForGroup('AIT'))}><Car size={20} aria-hidden="true"/><span>{bn ? 'অগ্রিম কর' : 'AIT'}</span></button>
        <button type="button" className={activeNavTab === 'payments' || activeNavTab === 'adjustments' ? 'is-active' : ''}
          aria-current={activeNavTab === 'payments' || activeNavTab === 'adjustments' ? 'page' : undefined}
          onClick={() => navigate('payments', activeIdForGroup('Payment'))}>
          <ShieldCheck size={20} aria-hidden="true"/><span>{bn ? 'পরিশোধ' : 'Payments'}</span></button>
        <button type="button" className={activeNavTab === 'status' ? 'is-active' : ''}
          aria-current={activeNavTab === 'status' ? 'page' : undefined}
          onClick={openStatus}><FileCheck2 size={20} aria-hidden="true"/><span>{bn ? 'অবস্থা' : 'Status'}</span></button>
      </nav>
    </>
  );
};
