import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Eye, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useLedgerCopy } from '../../context/LanguageContext.tsx';

/** Shared action-cell contract: only View + More. All other actions live
 * inside an accessible, keyboard-operable overflow menu outside table clipping.
 * Callbacks preserve each route's existing validation, RLS-equivalent local
 * ownership checks, confirmation and persistence rules.
 */
export function LedgerRecordActions({ reference, onView, onEdit, onDelete, disabled = false }: {
  reference: string;
  onView: () => void;
  onEdit?: () => void;
  onDelete?: () => void | Promise<void>;
  disabled?: boolean;
}) {
  const t = useLedgerCopy();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const more = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const close = (restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) more.current?.focus();
  };
  const toggle = () => {
    if (open) { close(true); return; }
    const r = more.current?.getBoundingClientRect();
    if (r) setPosition({
      left: Math.max(8, Math.min(window.innerWidth - 190, r.right - 184)),
      top: r.bottom + 116 < window.innerHeight ? r.bottom + 5 : Math.max(6, r.top - 104),
    });
    setOpen(true);
  };
  useEffect(() => {
    if (!open) return;
    const onOutside = (event: PointerEvent) => {
      if (!menu.current?.contains(event.target as Node) &&
          !more.current?.contains(event.target as Node)) close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close(true); }
      // Arrow keys belong to the open menu only. If focus has moved to a
      // table filter or another control, preserve that control's native keys.
      if (!['ArrowDown','ArrowUp','Home','End'].includes(event.key) ||
          !menu.current?.contains(document.activeElement)) return;
      const items = Array.from(menu.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);
      if (!items.length) return;
      event.preventDefault();
      const current = items.indexOf(document.activeElement as HTMLButtonElement);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 :
        event.key === 'ArrowDown' ? (current + 1) % items.length : (current - 1 + items.length) % items.length;
      items[next]?.focus();
    };
    const dismiss = () => close();
    document.addEventListener('pointerdown', onOutside);
    document.addEventListener('keydown', onKey);
    // Do not dismiss on captured scroll: focusing the portalled menu or Playwright's
    // scroll-to-click legitimately scrolls an ancestor and made the menu vanish.
    window.addEventListener('resize', dismiss);
    menu.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus({ preventScroll:true });
    return () => {
      document.removeEventListener('pointerdown', onOutside);
      document.removeEventListener('keydown', onKey);

      window.removeEventListener('resize', dismiss);
    };
  }, [open]);
  return <div className="eledger-row-view-more">
    <button type="button" className="eledger-button eledger-button-secondary"
      aria-label={`${t('View','দেখুন')} ${reference}`} onClick={onView} disabled={disabled}>
      <Eye size={16} aria-hidden="true"/>{t('View','দেখুন')}
    </button>
    <button ref={more} type="button" className="eledger-button eledger-button-secondary"
      aria-haspopup="menu" aria-controls={open ? id : undefined} aria-expanded={open}
      aria-label={`${t('More actions','আরও কাজ')} ${reference}`}
      onClick={toggle} disabled={disabled}>
      <MoreHorizontal size={18} aria-hidden="true"/>{t('More','আরও')}
    </button>
    {open && createPortal(<div id={id} ref={menu} className="eledger-record-more-menu"
      role="menu" aria-label={`${t('More actions for','আরও কাজ')}: ${reference}`}
      style={{ position:'fixed', top:position.top, left:position.left, zIndex:100 }}>
      {onEdit && <button type="button" role="menuitem" onClick={() => { close(); onEdit(); }}>
        <Pencil size={16} aria-hidden="true"/>{t('Edit','সম্পাদনা')}
      </button>}
      {onDelete && <button type="button" role="menuitem" className="is-danger"
        onClick={() => { close(); void onDelete(); }}>
        <Trash2 size={16} aria-hidden="true"/>{t('Delete','মুছুন')}
      </button>}
      {!onEdit && !onDelete && <span className="eledger-menu-no-actions" role="status">
        {t('No additional actions available','অতিরিক্ত কোনো কাজ নেই')}
      </span>}
    </div>, document.body)}
  </div>;
}
