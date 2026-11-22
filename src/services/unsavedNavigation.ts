/**
 * Frontend-only navigation guard for edited, unsaved ledger forms.
 * It observes input changes only while a real editable form is mounted.
 * Saved records remain governed by the existing repository; no financial writes.
 */
const EDITORS = [
  '.eledger-form-modal form',
  'form.eledger-entry-editor',
  'form.eledger-salary-editor',
  'tr.eledger-source-inline-editor',
  'tr.eledger-surcharge-grid-row',
].join(',');
const modified = new WeakSet<Element>();
let sameInteractionDecision: boolean | null = null;

function hasUnsavedEditor(): boolean {
  if (typeof document === 'undefined') return false;
  return Array.from(document.querySelectorAll(EDITORS)).some((node) => modified.has(node));
}

/** Register once inside the app; no unsaved form means no prompt. */
export function observeUnsavedLedgerForms(): () => void {
  if (typeof document === 'undefined') return () => {};
  const onChange = (event: Event) => {
    if (event.target instanceof Element) {
      const editor = event.target.closest(EDITORS);
      if (editor) modified.add(editor);
    }
  };
  const beforeUnload = (event: BeforeUnloadEvent) => {
    if (!hasUnsavedEditor()) return;
    event.preventDefault();
    event.returnValue = '';
  };
  document.addEventListener('input', onChange, true);
  document.addEventListener('change', onChange, true);
  window.addEventListener('beforeunload', beforeUnload);
  return () => {
    document.removeEventListener('input', onChange, true);
    document.removeEventListener('change', onChange, true);
    window.removeEventListener('beforeunload', beforeUnload);
  };
}

/**
 * Sidebar route changes may call two setters in one click. Reuse the same
 * accept/dismiss decision within that single event so Cancel never asks twice
 * and never navigates to the destination anyway.
 */
export function allowLedgerContextSwitch(): boolean {
  if (!hasUnsavedEditor()) return true;
  if (sameInteractionDecision !== null) return sameInteractionDecision;
  const bengali = document.querySelector('.eledger-app')?.getAttribute('lang') === 'bn';
  sameInteractionDecision = window.confirm(bengali
    ? 'সংরক্ষণ না করা পরিবর্তনগুলো বাতিল করে অন্য পৃষ্ঠায় যাবেন?'
    : 'Discard unsaved changes and leave this page?');
  queueMicrotask(() => { sameInteractionDecision = null; });
  return sameInteractionDecision;
}
