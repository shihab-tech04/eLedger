/**
 * Validation logic for NBR eReturn Ledger entries and external references
 * Decoupled from UI components for pure unit testing
 */

import {
  LedgerEntry,
  ExternalLookupQuery,
  ExternalLookupResult,
  VerificationStatus,
} from './models.ts';
import { getRouteById } from './routeRegistry.ts';

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/** Reference matching must agree across the form, ledger and income sync. */
export function sameLedgerReference(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

export function validateLedgerEntry(
  entry: Partial<LedgerEntry>,
  existingEntries: LedgerEntry[],
  currentEntryIdToIgnore?: string
): ValidationResult {
  const errors: Record<string, string> = {};

  // Never let a write classify a Source Tax route as Payment, AIT, etc.
  const route = entry.routeId ? getRouteById(entry.routeId) : undefined;
  const categoryForGroup = {
    'Source Tax': 'SOURCE_TAX',
    AIT: 'AIT',
    Payment: 'PAYMENT',
    Adjustment: 'ADJUSTMENT',
    'Tax Payment Status': 'RECONCILIATION',
  } as const;
  if (!route || route.group === 'Tax Payment Status') {
    errors.routeId = 'A valid ledger entry route is required.';
  } else if (entry.category && entry.category !== categoryForGroup[route.group]) {
    errors.category = 'Ledger category does not match the selected route.';
  }
  if (route && entry.isManual && !route.supportsManualEntry) {
    errors.workflow = 'Manual entries are not permitted for this system-only route.';
  }
  if (route && entry.workflow === 'SYNC_FROM_INCOME' && !route.supportsIncomeSync) {
    errors.workflow = 'Income synchronization is not available for this route.';
  }
  if (route?.workflow === 'SINGLE_CLAIM' && existingEntries.some((existing) =>
    existing.id !== currentEntryIdToIgnore &&
    existing.taxpayerTin === entry.taxpayerTin &&
    existing.assessmentYear === entry.assessmentYear &&
    existing.routeId === entry.routeId
  )) {
    errors.routeId = 'Only one carry-forward claim is permitted per taxpayer and assessment year.';
  }

  // 1. Reference number requirement
  if (!entry.referenceNo || entry.referenceNo.trim().length === 0) {
    errors.referenceNo = 'Challan / Certificate / Reference Number is required.';
  } else {
    // 2. Duplicate prevention
    const isDuplicate = existingEntries.some(
      (e) =>
        e.id !== currentEntryIdToIgnore &&
        e.taxpayerTin === entry.taxpayerTin &&
        e.assessmentYear === entry.assessmentYear &&
        // A treasury challan cannot support separate claims under both
        // Section 171 and Section 173 in the same taxpayer/year context.
        (
          e.routeId === entry.routeId ||
          (entry.category === 'PAYMENT' && e.category === 'PAYMENT') ||
          // The old ledger exposes Section 120 under both Source Tax and AIT.
          // A single customs payment cannot be silently claimed twice.
          (['system-import', 'ait-import'].includes(e.routeId) &&
            ['system-import', 'ait-import'].includes(entry.routeId ?? '')) ||
          (['commercial-vehicle', 'commercial-source'].includes(e.routeId) &&
            ['commercial-vehicle', 'commercial-source'].includes(entry.routeId ?? ''))
        ) &&
        sameLedgerReference(e.referenceNo, entry.referenceNo!)
    );

    if (isDuplicate) {
      errors.referenceNo = `Duplicate entry: Reference '${entry.referenceNo}' already recorded for this assessment year.`;
    }
  }

  // 3. Source entity / payor requirement
  if (!entry.sourceEntity || entry.sourceEntity.trim().length === 0) {
    errors.sourceEntity = 'Deductor / Bank / Organization name is required.';
  }

  // 4. Amount validation
  const taxDeducted = Number(entry.taxDeducted);
  if (!Number.isFinite(taxDeducted) || taxDeducted <= 0) {
    errors.taxDeducted = 'Tax amount must be a positive number greater than 0.';
  }

  const grossAmount = Number(entry.grossAmount);
  if (!Number.isFinite(grossAmount) || grossAmount <= 0) {
    errors.grossAmount = 'Gross amount must be a positive finite number.';
  } else if (taxDeducted > 0 && taxDeducted > grossAmount) {
    errors.taxDeducted = 'Tax deducted cannot exceed gross payment/deposit amount.';
  }

  // 5. Date validation
  if (!entry.date || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) {
    errors.date = 'Valid date in YYYY-MM-DD format is required.';
  } else {
    const [year, month, day] = entry.date.split('-').map(Number);
    const parsedDate = new Date(Date.UTC(year, month - 1, day));
    if (parsedDate.getUTCFullYear() !== year ||
      parsedDate.getUTCMonth() !== month - 1 || parsedDate.getUTCDate() !== day) {
      errors.date = 'Invalid calendar date provided.';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validates external lookup results against current taxpayer query.
 * Fail-Closed Rule:
 * If TIN does not match or status is invalid, reject saving.
 */
export function validateExternalLookupMatch(
  query: ExternalLookupQuery,
  result: ExternalLookupResult
): { canSave: boolean; reason?: string } {
  if (result.status === 'SERVICE_UNAVAILABLE') {
    return {
      canSave: false,
      reason: 'External verification service is currently offline or unreachable. Cannot verify.',
    };
  }

  if (!result.found || result.status === 'NOT_FOUND') {
    return {
      canSave: false,
      reason: 'No matching reference record found.',
    };
  }

  if (result.matchedTin !== query.expectedTin) {
    return {
      canSave: false,
      reason: `Taxpayer TIN mismatch: Reference belongs to TIN ${result.matchedTin}, but current taxpayer is ${query.expectedTin}. Verification rejected.`,
    };
  }

  if (result.status === 'MISMATCH') {
    return { canSave: false, reason: result.statusMessage || 'Reference context mismatch.' };
  }

  if (result.status !== 'VALID') {
    return { canSave: false, reason: 'Reference was not validated.' };
  }

  if (result.referenceNo.trim().toLowerCase() !== query.referenceNo.trim().toLowerCase()) {
    return { canSave: false, reason: 'The response reference does not match the requested reference.' };
  }

  if (
    result.routeId !== query.routeId ||
    result.assessmentYear !== query.assessmentYear
  ) {
    return { canSave: false, reason: 'Reference category or assessment year mismatch.' };
  }

  if (!Number.isFinite(result.taxAmount) || result.taxAmount <= 0 ||
      !Number.isFinite(result.grossAmount) || result.grossAmount < result.taxAmount) {
    return {
      canSave: false,
      reason: 'Reference amounts are invalid or inconsistent.',
    };
  }

  return {
    canSave: true,
  };
}

/**
 * Determine initial verification status based on entry provenance.
 * Rule: Never automatically classify a locally entered amount as an authorized tax credit.
 */
export function getInitialVerificationStatus(
  isManual: boolean,
  isExternalVerified: boolean
): VerificationStatus {
  if (isManual) {
    return 'PENDING_VERIFICATION';
  }
  if (isExternalVerified) {
    return 'VERIFIED';
  }
  return 'DRAFT';
}
