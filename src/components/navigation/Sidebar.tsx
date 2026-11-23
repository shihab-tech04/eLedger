import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BookOpen, Car, ChevronDown, ChevronRight,
  LayoutDashboard, Menu, PhoneCall, ReceiptText,
  ShieldCheck, X, PanelLeftClose, PanelLeftOpen, Leaf, RotateCcw, History,
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

// New visible-by-default compact navigation. Old v1 preference is left untouched
// for recovery; a new v2 preference gives users one fresh, discoverable layout.
const SIDEBAR_COLLAPSE_KEY = 'eledger_sidebar_collapsed_v2';

const CREDIT_ROUTES: Array<{ group: 'Payment' | 'Adjustment'; id: LedgerRouteId }> = [
  { group: 'Payment', id: 'sec-173' },
  { group: 'Payment', id: 'environmental-surcharge' },
  { group: 'Adjustment', id: 'refund' },
  { group: 'Adjustment', id: 'carry-forward' },
];

/** Flat left navigation from the accepted September 2026 custom eLedger UI. */
export const Sidebar: React.FC = () => {
  const { activeNavTab, setActiveNavTab, activeRouteId, setActiveRouteId,
    entries } = useLedger();
  const { language } = useLedgerLanguage();
  const bn = language === 'bn';
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileMenuOpener = useRef<HTMLButtonElement>(null);
  const mobileDrawer = useRef<HTMLElement>(null);
  const flyoutRef = useRef<HTMLDivElement>(null);
  const sourceGroupButton = useRef<HTMLButtonElement>(null);
  const aitGroupButton = useRef<HTMLButtonElement>(null);
  const [flyoutGroup, setFlyoutGroup] = useState<'source'|'ait'|null>(null);
  const [flyoutPosition, setFlyoutPosition] = useState({top:12,left:112});
  const [collapsed, setCollapsed] = useState(() => {
    try {
      if (typeof window === 'undefined') return true;
      const preference = window.localStorage.getItem(SIDEBAR_COLLAPSE_KEY);
      return preference === null ? true : preference === 'true';
    } catch { return true; }
  });
  const [desktopViewport, setDesktopViewport] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 961px)').matches);
  const [expanded, setExpanded] = useState({ source: true, ait: false });
  const railCollapsed = desktopViewport && collapsed;

  // Flyouts belong to the compact desktop rail only. No mobile/expanded
  // navigation change: preserve original accordions and mobile bottom tabs.
  useEffect(() => {
    if (!railCollapsed) setFlyoutGroup(null);
  }, [railCollapsed]);
  useEffect(() => {
    if (flyoutGroup === null) return;
    const groupButton = flyoutGroup === 'source' ? sourceGroupButton.current : aitGroupButton.current;
    const onPointerDown = (event: PointerEvent) => {
      const node = event.target as Node;
      if (!flyoutRef.current?.contains(node) && !groupButton?.contains(node)) setFlyoutGroup(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setFlyoutGroup(null);
        groupButton?.focus({preventScroll:true});
      }
      if (!['ArrowDown','ArrowUp','Home','End'].includes(event.key) ||
        !flyoutRef.current?.contains(document.activeElement)) return;
      const items = Array.from(flyoutRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not([disabled])') ?? []);
      if (items.length === 0) return;
      event.preventDefault();
      const index = items.indexOf(document.activeElement as HTMLButtonElement);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 :
        event.key === 'ArrowDown' ? (index + 1) % items.length : (index - 1 + items.length) % items.length;
      items[next]?.focus({preventScroll:true});
    };
    const onViewportChange = () => setFlyoutGroup(null);
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onViewportChange);
    // The ten-route flyout is scrollable; scrolling inside must not close it.
    const first = flyoutRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]');
    first?.focus({preventScroll:true});
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onViewportChange);

    };
  }, [flyoutGroup]);

  useEffect(() => {
    try { window.localStorage.setItem(SIDEBAR_COLLAPSE_KEY, String(collapsed)); }
    catch { /* Optional UI preference must never block navigation in private mode. */ }
  }, [collapsed]);
  useEffect(() => {
    const media = window.matchMedia('(min-width: 961px)');
    const onChange = () => setDesktopViewport(media.matches);
    onChange();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

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
    setFlyoutGroup(null);
    if (window.matchMedia('(max-width: 960px)').matches) window.scrollTo(0, 0);
  };

  const toggleGroup = (group: 'source' | 'ait') => {
    if (railCollapsed) {
      const button = group === 'source' ? sourceGroupButton.current : aitGroupButton.current;
      const rect = button?.getBoundingClientRect();
      if (rect) setFlyoutPosition({
        left: Math.min(window.innerWidth - 300, rect.right + 8),
        top: Math.max(12, Math.min(rect.top, window.innerHeight - (group === 'source' ? 530 : 240))),
      });
      setFlyoutGroup((current) => current === group ? null : group);
      return;
    }
    setExpanded((current) => ({ ...current, [group]: !current[group] }));
  };
  const creditIcon = (id: LedgerRouteId) => {
    switch (id) {
      case 'sec-173': return <ReceiptText size={16} aria-hidden="true"/>;
      case 'environmental-surcharge': return <Leaf size={16} aria-hidden="true"/>;
      case 'refund': return <RotateCcw size={16} aria-hidden="true"/>;
      case 'carry-forward': return <History size={16} aria-hidden="true"/>;
      default: return <ShieldCheck size={16} aria-hidden="true"/>;
    }
  };

  const savedRouteIds = entries.map((entry) => entry.routeId);
  const routesByGroup = (group: RouteGroup) => getVisibleRoutesByGroup(group, savedRouteIds);
  const activeIdForGroup = (group: RouteGroup) =>
    getActiveVisibleRouteForGroup(activeRouteId, group, savedRouteIds).id;
  const routeText = (route: ReturnType<typeof routesByGroup>[number]) =>
    bn ? route.bengaliTitle : ORIGINAL_LABELS[route.id] ?? route.title;

  const renderRoute = (group: RouteGroup, route: ReturnType<typeof routesByGroup>[number], withDot = false, flyout = false) => {
    const tab = GROUP_TABS[group];
    const selected = activeNavTab === tab && activeIdForGroup(group) === route.id;
    return <button key={route.id} type="button"
      title={routeText(route)} aria-label={routeText(route)}
      className={'eledger-side-link eledger-route-link ' + (withDot ? 'source-route ' : '') + (flyout ? 'eledger-flyout-route ' : '') + (selected ? 'is-active' : '')}
      role={flyout ? 'menuitem' : undefined}
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

  // Keep collapse state and keyboard behavior in one owner while placing its
  // control in the global masthead, not beside Dashboard in the navigation.
  const [headerToggleHost, setHeaderToggleHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setHeaderToggleHost(document.getElementById('eledger-header-nav-toggle'));
  }, []);

  return (
    <>
      {mobileOpen && <button type="button" aria-label={bn ? 'লেজার মেনু বন্ধ করুন' : 'Close ledger menu'}
        className="eledger-sidebar-scrim" onClick={() => setMobileOpen(false)}/>}
      <aside ref={mobileDrawer} id="eledger-mobile-sidebar"
        className={'eledger-sidebar ' + (mobileOpen ? 'is-open ' : '') + (railCollapsed ? 'is-collapsed' : '')}
        role={mobileOpen ? 'dialog' : undefined} aria-modal={mobileOpen ? true : undefined}
        aria-label="eLedger navigation" lang={bn ? 'bn' : 'en'}>
        <div className="eledger-sidebar-mobile-heading">
          <span>eReturn Ledger</span>
          <button type="button" aria-label={bn ? 'লেজার মেনু বন্ধ করুন' : 'Close ledger menu'} onClick={() => setMobileOpen(false)}><X size={20}/></button>
        </div>
        <nav className="eledger-sidebar-links">
          <div className="eledger-sidebar-section-label" aria-hidden="true">{bn ? 'মেনু' : 'MENU'}</div>
          <button type="button" title={bn ? 'ড্যাশবোর্ড' : 'Dashboard'} aria-label={bn ? 'ড্যাশবোর্ড' : 'Dashboard'} className={'eledger-side-link ' + (activeNavTab === 'dashboard' ? 'is-active' : '')}
            aria-current={activeNavTab === 'dashboard' ? 'page' : undefined} onClick={() => navigate('dashboard')}>
            <LayoutDashboard size={16}/><span>{bn ? 'ড্যাশবোর্ড' : 'Dashboard'}</span>
          </button>
          <div className="eledger-nav-group">
            <button ref={sourceGroupButton} type="button"
              className={'eledger-side-link eledger-group-toggle' + (railCollapsed && activeNavTab === 'source-tax' ? ' is-active is-active-parent' : '')}
              title={bn ? 'উৎস কর দাবি' : 'Claim Source Tax'}
              aria-label={bn ? 'উৎস কর দাবি' : 'Claim Source Tax'}
              aria-controls={railCollapsed ? 'eledger-compact-group-flyout' : 'eledger-source-tax-subnav'}
              aria-haspopup={railCollapsed ? 'menu' : undefined}
              aria-current={railCollapsed && activeNavTab === 'source-tax' ? 'true' : undefined}
              aria-expanded={railCollapsed ? flyoutGroup === 'source' : expanded.source}
              onClick={() => toggleGroup('source')}>
              <ReceiptText size={16}/><span>{bn ? 'উৎস কর দাবি' : 'Claim Source Tax'}</span>
              {!railCollapsed && (expanded.source ? <ChevronDown size={15}/> : <ChevronRight size={15}/>)}
            </button>
            {expanded.source && <div id="eledger-source-tax-subnav" className="eledger-source-route-list">
              {routesByGroup('Source Tax').map((route) => renderRoute('Source Tax', route, true))}
            </div>}
          </div>

          <div className="eledger-nav-group">
            <button ref={aitGroupButton} type="button"
              className={'eledger-side-link eledger-group-toggle' + (railCollapsed && activeNavTab === 'ait' ? ' is-active is-active-parent' : '')}
              title={bn ? 'অগ্রিম কর দাবি' : 'Claim AIT'}
              aria-label={bn ? 'অগ্রিম কর দাবি' : 'Claim AIT'}
              aria-controls={railCollapsed ? 'eledger-compact-group-flyout' : 'eledger-ait-subnav'}
              aria-haspopup={railCollapsed ? 'menu' : undefined}
              aria-current={railCollapsed && activeNavTab === 'ait' ? 'true' : undefined}
              aria-expanded={railCollapsed ? flyoutGroup === 'ait' : expanded.ait}
              onClick={() => toggleGroup('ait')}>
              <Car size={16}/><span>{bn ? 'অগ্রিম কর দাবি' : 'Claim AIT'}</span>
              {!railCollapsed && (expanded.ait ? <ChevronDown size={15}/> : <ChevronRight size={15}/>)}
            </button>
            {expanded.ait && <div id="eledger-ait-subnav" className="eledger-source-route-list">
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
                {creditIcon(route.id)}<span>{routeText(route)}</span>
              </button>;
            })}
          </div>

        </nav>
        <div className="eledger-sidebar-bottom">
          <button type="button" title={bn ? 'হোম ও নির্দেশিকা' : 'Home / Guide'}
            aria-label={bn ? 'হোম ও নির্দেশিকা' : 'Home / Guide'}
            className={'eledger-side-link eledger-footer-guide ' + (activeNavTab === 'ledger-guide' ? 'is-active' : '')}
            aria-current={activeNavTab === 'ledger-guide' ? 'page' : undefined}
            onClick={() => navigate('ledger-guide')}>
            <BookOpen size={16}/><span>{bn ? 'হোম ও নির্দেশিকা' : 'Home / Guide'}</span>
          </button>
          <a className="eledger-helpline" href="tel:09643717171"
            title={bn ? 'কর সহায়তা · 09643717171' : 'Taxes Helpline · 09643717171'}
            aria-label={bn ? 'কর সহায়তা · 09643717171' : 'Taxes Helpline · 09643717171'}>
            <PhoneCall size={18} aria-hidden="true"/><span><strong>09643717171</strong><small>{bn ? 'কর সহায়তা' : 'Taxes Helpline'}</small></span>
          </a>
        </div>
      </aside>
      {headerToggleHost && createPortal(
        <button type="button" className="eledger-sidebar-collapse-button" onClick={() => setCollapsed((value) => !value)}
          title={collapsed ? (bn ? 'নেভিগেশন প্রসারিত করুন' : 'Expand navigation') : (bn ? 'নেভিগেশন সংকুচিত করুন' : 'Collapse navigation')}
          aria-label={collapsed ? (bn ? 'নেভিগেশন প্রসারিত করুন' : 'Expand navigation') : (bn ? 'নেভিগেশন সংকুচিত করুন' : 'Collapse navigation')}
          aria-controls="eledger-mobile-sidebar" aria-expanded={!railCollapsed}>
          {railCollapsed ? <PanelLeftOpen size={18} aria-hidden="true"/> : <PanelLeftClose size={18} aria-hidden="true"/>}
        </button>, headerToggleHost)}
      {headerToggleHost && createPortal(
        <button type="button" className="eledger-mobile-menu-button" ref={mobileMenuOpener}
          onClick={() => setMobileOpen(true)} aria-expanded={mobileOpen}
          aria-controls="eledger-mobile-sidebar" title={bn ? 'লেজার মেনু খুলুন' : 'Open ledger menu'}
          aria-label={bn ? 'লেজার মেনু খুলুন' : 'Open ledger menu'}>
          <Menu size={20} aria-hidden="true"/>
        </button>, headerToggleHost)}
      {railCollapsed && flyoutGroup && createPortal(
        <div ref={flyoutRef} id="eledger-compact-group-flyout"
          className="eledger-compact-group-flyout" role="menu"
          aria-label={flyoutGroup === 'source'
            ? (bn ? 'উৎস করের খাতসমূহ' : 'Source Tax categories')
            : (bn ? 'অগ্রিম করের খাতসমূহ' : 'AIT categories')}
          style={{ top:flyoutPosition.top, left:flyoutPosition.left }}>
          <div className="eledger-compact-flyout-heading" aria-hidden="true">
            {flyoutGroup === 'source' ? (bn ? 'উৎস কর দাবি' : 'Claim Source Tax')
              : (bn ? 'অগ্রিম কর দাবি' : 'Claim AIT')}
          </div>
          <div className="eledger-compact-flyout-list">
            {routesByGroup(flyoutGroup === 'source' ? 'Source Tax' : 'AIT')
              .map(route => renderRoute(flyoutGroup === 'source' ? 'Source Tax' : 'AIT', route, false, true))}
          </div>
        </div>, document.body
      )}
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
      </nav>
    </>
  );
};
