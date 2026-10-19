import { useLayoutEffect, useRef } from 'react';
import type { RouteRegistryEntry } from '../../domain/models.ts';
import { useLedgerLanguage } from '../../context/LanguageContext.tsx';

/** A single mobile category navigator keeps the current route in view. */
export function RouteMobileTabs({ routes, activeId, label, onSelect }: {
  routes: RouteRegistryEntry[];
  activeId: string;
  label: string;
  onSelect: (id: RouteRegistryEntry['id']) => void;
}) {
  const { language } = useLedgerLanguage();
  const navRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const nav = navRef.current;
    const current = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !current) return;
    nav.scrollLeft = current.offsetLeft - nav.offsetLeft - (nav.clientWidth - current.offsetWidth) / 2;
  }, [activeId]);

  return (
    <nav ref={navRef} className="eledger-source-mobile-routes" aria-label={label}>
      {routes.map((route) => (
        <button key={route.id} type="button" className={route.id === activeId ? 'is-active' : ''}
          aria-current={route.id === activeId ? 'page' : undefined}
          onClick={() => onSelect(route.id)}>{language === 'bn' ? route.bengaliTitle : route.title}</button>
      ))}
    </nav>
  );
}
