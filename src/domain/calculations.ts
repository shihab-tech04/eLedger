/**
 * Pure calculation logic for NBR eReturn Ledger
 * Decoupled from React for high-speed node:test unit testing
 */

import { LedgerEntry, TaxCategoryTotals, TaxCategory } from './models.ts';

export function calculateCategoryTotals(entries: LedgerEntry[]): TaxCategoryTotals {
  let sourceTaxTotal = 0;
  let sourceTaxCount = 0;
  let aitTotal = 0;
  let aitCount = 0;
  let paymentsTotal = 0;
  let paymentsCount = 0;
  let adjustmentsTotal = 0;
  let adjustmentsCount = 0;
  let verifiedTotal = 0;
  let taxPaidWithReturnTotal = 0;
  let environmentalSurchargeTotal = 0;
  let refundAdjustmentTotal = 0;
  let carryForward163Total = 0;

  for (const entry of entries) {
    const amount = Number(entry.taxDeducted);
    const tax = Number.isFinite(amount) ? amount : 0;
    if (entry.routeId === 'sec-173') taxPaidWithReturnTotal += tax;
    if (entry.routeId === 'environmental-surcharge') environmentalSurchargeTotal += tax;
    if (entry.routeId === 'refund') refundAdjustmentTotal += tax;
    if (entry.routeId === 'carry-forward') carryForward163Total += tax;
    // Recorded claims are not necessarily eligible credits. A local/manual
    // record or an Income sync must never increase the verified total.
    if (
      entry.status === 'VERIFIED' &&
      entry.externalVerified &&
      entry.verificationAuthority === 'AUTHORITATIVE' &&
      !entry.isManual
    ) {
      verifiedTotal += tax;
    }
    switch (entry.category) {
      case 'SOURCE_TAX':
        sourceTaxTotal += tax;
        sourceTaxCount += 1;
        break;
      case 'AIT':
        aitTotal += tax;
        aitCount += 1;
        break;
      case 'PAYMENT':
        paymentsTotal += tax;
        paymentsCount += 1;
        break;
      case 'ADJUSTMENT':
        adjustmentsTotal += tax;
        adjustmentsCount += 1;
        break;
      default:
        break;
    }
  }

  const grandTotalCredits = verifiedTotal;
  const totalRecordsCount = entries.length;

  return {
    sourceTaxTotal: Math.round(sourceTaxTotal * 100) / 100,
    sourceTaxCount,
    aitTotal: Math.round(aitTotal * 100) / 100,
    aitCount,
    paymentsTotal: Math.round(paymentsTotal * 100) / 100,
    paymentsCount,
    adjustmentsTotal: Math.round(adjustmentsTotal * 100) / 100,
    adjustmentsCount,
    grandTotalCredits: Math.round(grandTotalCredits * 100) / 100,
    totalRecordsCount,
    taxPaidWithReturnTotal: Math.round(taxPaidWithReturnTotal * 100) / 100,
    environmentalSurchargeTotal: Math.round(environmentalSurchargeTotal * 100) / 100,
    refundAdjustmentTotal: Math.round(refundAdjustmentTotal * 100) / 100,
    carryForward163Total: Math.round(carryForward163Total * 100) / 100,
  };
}

export function filterEntriesByRoute(
  entries: LedgerEntry[],
  routeId: string
): LedgerEntry[] {
  return entries.filter((e) => e.routeId === routeId);
}

export function filterEntriesByCategory(
  entries: LedgerEntry[],
  category: TaxCategory
): LedgerEntry[] {
  return entries.filter((e) => e.category === category);
}

export function groupEntriesByRoute(
  entries: LedgerEntry[]
): Record<string, { entries: LedgerEntry[]; totalTax: number; totalGross: number }> {
  const grouped: Record<string, { entries: LedgerEntry[]; totalTax: number; totalGross: number }> = {};

  for (const entry of entries) {
    if (!grouped[entry.routeId]) {
      grouped[entry.routeId] = {
        entries: [],
        totalTax: 0,
        totalGross: 0,
      };
    }
    grouped[entry.routeId].entries.push(entry);
    grouped[entry.routeId].totalTax += Number(entry.taxDeducted) || 0;
    grouped[entry.routeId].totalGross += Number(entry.grossAmount) || 0;
  }

  // Round values
  for (const key of Object.keys(grouped)) {
    grouped[key].totalTax = Math.round(grouped[key].totalTax * 100) / 100;
    grouped[key].totalGross = Math.round(grouped[key].totalGross * 100) / 100;
  }

  return grouped;
}

export function formatCurrencyBDT(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return 'Tk. 0.00';
  }
  return `Tk. ${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Historical payment-status cells use Indian digit grouping without a currency suffix. */
export function formatLedgerAmount(amount: number): string {
  if (!Number.isFinite(amount)) return '0';
  return amount.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}
