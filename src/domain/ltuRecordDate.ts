import type { LedgerEntry } from './models.ts';
import { localDateInputValue } from './localDate.ts';

/**
 * LTU Add has no official document-date field. New local-only entries receive
 * a local record date; editing an existing entry must never silently rewrite
 * that hidden date. No NBR date or government verification is implied.
 */
export function resolveLtuRecordedDate(
  existing: Pick<LedgerEntry, 'date'> | undefined,
  localEntryDate: string = localDateInputValue(),
): string {
  return existing?.date ?? localEntryDate;
}
