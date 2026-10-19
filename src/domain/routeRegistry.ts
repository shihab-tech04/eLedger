/**
 * Internal Route Registry for NBR eReturn Ledger (18 Functional Routes)
 * Phase 0 Reconstructed Baseline
 *
 * Categorizes routes across:
 * - Source Tax: 10 routes
 * - AIT: 3 routes
 * - Payment: 2 routes
 * - Adjustment: 2 routes
 * - Tax Payment Status: 1 route
 * Total: 18 routes
 */

import { LedgerRouteId, RouteRegistryEntry } from './models.ts';

export const ROUTE_REGISTRY: RouteRegistryEntry[] = [
  // --- SOURCE TAX (10 Routes) ---
  {
    id: 'salary-ibas',
    group: 'Source Tax',
    title: 'Salary & iBAS++ Claims',
    bengaliTitle: 'বেতন ও আইবাস++ উৎস কর',
    statutorySection: 'Sec 86 / 87 (ITA 2023)',
    workflow: 'SYSTEM_CLAIM',
    status: 'CONFIRMED',
    description: 'Government and semi-government salary TDS records modeled after iBAS++; live integration is not connected.',
    supportsManualEntry: false,
    supportsIncomeSync: false,
    supportsLookup: true,
    supportsImport: false,
  },
  {
    id: 'salary-others',
    group: 'Source Tax',
    title: 'Salary Others (Private/Autonomous)',
    bengaliTitle: 'অন্যান্য বেতন উৎস কর',
    statutorySection: 'Sec 86 (ITA 2023)',
    workflow: 'MANUAL_ENTRY',
    status: 'CONFIRMED',
    description: 'Private sector salary tax deductions claimed with employer certificate and TDS challan number.',
    supportsManualEntry: true,
    supportsIncomeSync: false,
    supportsLookup: true,
    supportsImport: false,
  },
  {
    id: 'bank-fi',
    group: 'Source Tax',
    title: 'Bank & Financial Institutions',
    bengaliTitle: 'ব্যাংক ও আর্থিক প্রতিষ্ঠান',
    statutorySection: 'Sec 102 (ITA 2023)',
    workflow: 'SYNC_FROM_INCOME',
    status: 'CONFIRMED',
    description: 'Tax deducted at source on interest/profit of bank deposits and financial institution accounts.',
    supportsManualEntry: true,
    supportsIncomeSync: true,
    supportsLookup: false,
    supportsImport: true,
  },
  {
    id: 'dividend',
    group: 'Source Tax',
    title: 'Dividend Income TDS',
    bengaliTitle: 'লভ্যাংশ আয়ের উৎস কর',
    statutorySection: 'Sec 117 (ITA 2023)',
    workflow: 'SYNC_FROM_INCOME',
    status: 'CONFIRMED',
    description: 'Tax deducted on distributed dividends; BO Account / CDBL verification requires external confirmation.',
    supportsManualEntry: true,
    supportsIncomeSync: true,
    supportsLookup: true,
    supportsImport: false,
  },
  {
    id: 'service-payment',
    group: 'Source Tax',
    title: 'Service & Professional Fees',
    bengaliTitle: 'সেবা ও পেশাগত ফি উৎস কর',
    statutorySection: 'Sec 89 / 90 (ITA 2023)',
    workflow: 'HYBRID_SYNC_MANUAL',
    status: 'CONFIRMED',
    description: 'TDS on professional fees, technical services, consultation, and agency commissions.',
    supportsManualEntry: true,
    supportsIncomeSync: true,
    supportsLookup: true,
    supportsImport: true,
  },
  {
    id: 'sanchayapatra',
    group: 'Source Tax',
    title: 'Sanchayapatra (Savings Instruments)',
    bengaliTitle: 'সঞ্চয়পত্র মুনাফার উৎস কর',
    statutorySection: 'Sec 105 (ITA 2023)',
    workflow: 'SYNC_FROM_INCOME',
    status: 'CONFIRMED',
    description: 'Tax deducted on profit from national savings schemes managed by Bangladesh Bank & National Savings Directorate.',
    supportsManualEntry: true,
    supportsIncomeSync: true,
    supportsLookup: true,
    supportsImport: false,
  },
  {
    id: 'other-tds',
    group: 'Source Tax',
    title: 'Other Source Tax (TDS)',
    bengaliTitle: 'অন্যান্য উৎস কর',
    statutorySection: 'Sec 120-136 (ITA 2023)',
    workflow: 'MANUAL_ENTRY',
    status: 'CONFIRMED',
    description: 'Miscellaneous source deductions including prize money, auction, lottery, and environmental surcharge.',
    supportsManualEntry: true,
    supportsIncomeSync: false,
    supportsLookup: false,
    supportsImport: true,
  },
  {
    id: 'contractor-supplier',
    group: 'Source Tax',
    title: 'Contractor & Supply of Goods',
    bengaliTitle: 'সরবরাহকারী ও ঠিকাদারি উৎস কর',
    statutorySection: 'Sec 89 (ITA 2023)',
    workflow: 'HYBRID_SYNC_MANUAL',
    status: 'PROVISIONAL',
    description: 'Deductions on execution of contracts and supply of goods under Section 89 of Income Tax Act 2023.',
    supportsManualEntry: true,
    supportsIncomeSync: true,
    supportsLookup: true,
    supportsImport: false,
  },
  {
    id: 'house-property',
    group: 'Source Tax',
    title: 'House Property Rental TDS',
    bengaliTitle: 'বাড়ি ভাড়া আয়ের উৎস কর',
    statutorySection: 'Sec 109 (ITA 2023)',
    workflow: 'MANUAL_ENTRY',
    status: 'PROVISIONAL',
    description: 'TDS deducted by institutional or corporate tenants on commercial and residential leases.',
    supportsManualEntry: true,
    supportsIncomeSync: false,
    supportsLookup: false,
    supportsImport: false,
  },
  {
    id: 'system-import',
    group: 'Source Tax',
    title: 'System Records & Import TDS',
    bengaliTitle: 'আমদানি ও কাস্টমস উৎস কর',
    statutorySection: 'Sec 120 (ITA 2023)',
    workflow: 'SYSTEM_RECORDS_IMPORT',
    status: 'CONFIRMED',
    description: 'Customs ASYCUDA bill-of-entry advance income tax and system-loaded port clearance deductions.',
    supportsManualEntry: true,
    supportsIncomeSync: false,
    supportsLookup: true,
    supportsImport: true,
  },

  // --- AIT (3 Routes) ---
  {
    id: 'commercial-vehicle',
    group: 'AIT',
    title: 'Commercial Vehicle AIT',
    bengaliTitle: 'বাণিজ্যিক গাড়ির অগ্রিম কর',
    statutorySection: 'Sec 153 (ITA 2023)',
    workflow: 'SYSTEM_LOOKUP',
    status: 'CONFIRMED',
    description: 'Advance tax collected by BRTA on fitness renewal/registration of buses, trucks, primes, and commercial vehicles.',
    supportsManualEntry: true,
    supportsIncomeSync: false,
    supportsLookup: true,
    supportsImport: false,
  },
  {
    id: 'car-ait',
    group: 'AIT',
    title: 'AIT on Private Motor Car',
    bengaliTitle: 'ব্যক্তিগত গাড়ির অগ্রিম কর',
    statutorySection: 'Sec 153(2) (ITA 2023)',
    workflow: 'SYSTEM_LOOKUP',
    status: 'CONFIRMED',
    description: 'Advance tax paid on private passenger car/jeep engine CC capacity at BRTA fitness/tax-token renewal.',
    supportsManualEntry: true,
    supportsIncomeSync: false,
    supportsLookup: true,
    supportsImport: false,
  },
  {
    id: 'sec-154',
    group: 'AIT',
    title: 'AIT under Section 154',
    bengaliTitle: 'ধারা ১৫৪ অধীনে অগ্রিম কর',
    statutorySection: 'Sec 154 (ITA 2023)',
    workflow: 'SYSTEM_LOOKUP',
    status: 'CONFIRMED',
    description: 'General advance income tax deposited against the current return, evidenced by an income-tax challan.',
    supportsManualEntry: true,
    supportsIncomeSync: false,
    supportsLookup: true,
    supportsImport: false,
  },

  // --- PAYMENT (2 Routes) ---
  {
    id: 'sec-173',
    group: 'Payment',
    title: 'Regular Tax under Section 173',
    bengaliTitle: 'ধারা ১৭৩ এর অধীনে নিয়মিত কর',
    statutorySection: 'Sec 173 (ITA 2023)',
    workflow: 'SYSTEM_LOOKUP',
    status: 'CONFIRMED',
    description: 'Tax paid along with return of income (self-assessment / payment before filing return via A-Challan).',
    supportsManualEntry: true,
    supportsIncomeSync: false,
    supportsLookup: true,
    supportsImport: false,
  },
  {
    id: 'sec-171',
    group: 'Payment',
    title: 'Advance Tax under Section 171',
    bengaliTitle: 'ধারা ১৭১ এর অধীনে ত্রৈমাসিক অগ্রিম কর',
    statutorySection: 'Sec 171 (ITA 2023)',
    workflow: 'SYSTEM_LOOKUP',
    status: 'CONFIRMED',
    description: 'Historical recovery category retained for existing saved entries; Section 171 is not independently established as a quarterly AIT claim route by the October 8 screenshots.',
    supportsManualEntry: true,
    supportsIncomeSync: false,
    supportsLookup: true,
    supportsImport: false,
  },

  // --- ADJUSTMENT (2 Routes) ---
  {
    id: 'refund',
    group: 'Adjustment',
    title: 'Refund Adjustment',
    bengaliTitle: 'ফেরত সমন্বয়',
    statutorySection: 'Sec 214 (ITA 2023)',
    workflow: 'MANUAL_ENTRY',
    status: 'CONFIRMED',
    description: 'Adjustment of approved income tax refund from previous assessment years against current year tax liability.',
    supportsManualEntry: true,
    supportsIncomeSync: false,
    supportsLookup: false,
    supportsImport: false,
  },
  {
    id: 'carry-forward',
    group: 'Adjustment',
    title: 'Carry-Forward / Prior-Return Adjustment',
    bengaliTitle: 'পূর্ববর্তী রিটার্ন / ঘাটতি সমন্বয়',
    statutorySection: 'Sec 70 / 215 (ITA 2023)',
    workflow: 'SINGLE_CLAIM',
    status: 'CONFIRMED',
    description: 'Carry-forward of unabsorbed tax credits, minimum tax credits, or losses from preceding assessed returns.',
    supportsManualEntry: true,
    supportsIncomeSync: false,
    supportsLookup: true,
    supportsImport: false,
  },

  // --- TAX PAYMENT STATUS (1 Route) ---
  {
    id: 'tax-payment-status',
    group: 'Tax Payment Status',
    title: 'Tax Payment Status & Reconciliation',
    bengaliTitle: 'কর পরিশোধ স্থিতি ও নিরীক্ষা',
    statutorySection: 'ITA 2023 Schedule 3',
    workflow: 'RECONCILIATION',
    status: 'CONFIRMED',
    description: 'Complete cross-category reconciliation summarizing Source Tax, AIT, Payments, and Adjustments for eReturn transfer.',
    supportsManualEntry: false,
    supportsIncomeSync: false,
    supportsLookup: false,
    supportsImport: false,
  },
];

/**
 * Current eLedger route crosswalk from the authenticated October 8 screenshots.
 * The original registry is retained for existing browser records and prior
 * recovery tests. A legacy route is only offered in the UI when it already
 * contains saved records; financial entries are never silently reclassified.
 *
 * 10 Source Tax + 3 AIT + 2 Payment/Surcharge + 2 Adjustment + 1 Status.
 */
const screenshotRoutes: RouteRegistryEntry[] = [
  {
    id: 'source-ltu', group: 'Source Tax', title: 'Source Tax (LTU)',
    bengaliTitle: 'বৃহৎ করদাতা ইউনিট উৎস কর', statutorySection: 'Sec 129 / 130 (as applicable)',
    workflow: 'MANUAL_ENTRY', status: 'CONFIRMED',
    description: 'LTU section, challan and claim details as shown in the current-year ledger reference.',
    supportsManualEntry: true, supportsIncomeSync: false, supportsLookup: false, supportsImport: false,
  },
  {
    id: 'commercial-source', group: 'Source Tax', title: 'Commercial Vehicle',
    bengaliTitle: 'বাণিজ্যিক যানবাহনের উৎসে কর', statutorySection: 'Sec 138 (ITA 2023)',
    workflow: 'SYSTEM_LOOKUP', status: 'CONFIRMED',
    description: 'Commercial vehicle transaction-key claim; legally distinct from private-car Section 153.',
    supportsManualEntry: true, supportsIncomeSync: false, supportsLookup: true, supportsImport: false,
  },
  {
    id: 'ait-import', group: 'AIT', title: 'AIT Import (120)',
    bengaliTitle: 'আমদানি অগ্রিম কর', statutorySection: 'Sec 120 (ITA 2023)',
    workflow: 'SYSTEM_RECORDS_IMPORT', status: 'CONFIRMED',
    description: 'Import advance-tax claim is separate from the Source Tax Import (120) route.',
    supportsManualEntry: true, supportsIncomeSync: false, supportsLookup: false, supportsImport: false,
  },
  {
    id: 'environmental-surcharge', group: 'Payment', title: 'Environmental Surcharge',
    bengaliTitle: 'পরিবেশ সারচার্জ', statutorySection: 'Applicable surcharge provision',
    workflow: 'MANUAL_ENTRY', status: 'CONFIRMED',
    description: 'A separate surcharge bucket; assessment of liability originates in Tax & Payment.',
    supportsManualEntry: false, supportsIncomeSync: false, supportsLookup: false, supportsImport: false,
  },
];

const currentRouteOrder = [
  'salary-ibas', 'salary-others', 'bank-fi', 'dividend', 'service-payment',
  'sanchayapatra', 'system-import', 'source-ltu', 'commercial-source', 'other-tds',
  'car-ait', 'sec-154', 'ait-import', 'sec-173', 'environmental-surcharge',
  'refund', 'carry-forward', 'tax-payment-status',
] as const satisfies readonly LedgerRouteId[];

export const CURRENT_ROUTE_REGISTRY: RouteRegistryEntry[] = currentRouteOrder.map((id) => {
  const route = screenshotRoutes.find((item) => item.id === id) ?? ROUTE_REGISTRY.find((item) => item.id === id);
  if (!route) throw new Error(`Missing eLedger route: ${id}`);
  if (id === 'carry-forward') {
    return {
      ...route,
      title: 'Adjustment of Carry-Forward Tax (163)',
      bengaliTitle: 'ধারা ১৬৩ অনুসারে কর সমন্বয়',
      statutorySection: 'Sec 163 (ITA 2023)',
      description: 'Prior-period Section 163 tax adjustment, subject to matching prior-return evidence.',
    };
  }
  return route;
});

export function getCurrentRoutesByGroup(group: RouteRegistryEntry['group']): RouteRegistryEntry[] {
  return CURRENT_ROUTE_REGISTRY.filter((route) => route.group === group);
}

/** Keep historical routes editable only when they hold the current taxpayer's saved entries. */
export function getVisibleRoutesByGroup(
  group: RouteRegistryEntry['group'],
  savedRouteIds: readonly LedgerRouteId[],
): RouteRegistryEntry[] {
  const activeRoutes = getCurrentRoutesByGroup(group);
  const activeIds = new Set(activeRoutes.map((route) => route.id));
  return [
    ...activeRoutes,
    ...ROUTE_REGISTRY.filter((route) =>
      route.group === group && !activeIds.has(route.id) && savedRouteIds.includes(route.id)
    ),
  ];
}

export function getActiveVisibleRouteForGroup(
  id: LedgerRouteId,
  group: RouteRegistryEntry['group'],
  savedRouteIds: readonly LedgerRouteId[],
): RouteRegistryEntry {
  return getVisibleRoutesByGroup(group, savedRouteIds).find((route) => route.id === id)
    ?? getCurrentRoutesByGroup(group)[0];
}

export function getRouteById(id: string): RouteRegistryEntry | undefined {
  return CURRENT_ROUTE_REGISTRY.find((r) => r.id === id)
    ?? ROUTE_REGISTRY.find((r) => r.id === id);
}

export function getRoutesByGroup(group: RouteRegistryEntry['group']): RouteRegistryEntry[] {
  return ROUTE_REGISTRY.filter((r) => r.group === group);
}

/** A route saved in another navigation group must never leak into this group's workflow. */
export function getActiveRouteForGroup(
  id: string,
  group: RouteRegistryEntry['group']
): RouteRegistryEntry {
  const routes = getRoutesByGroup(group);
  const route = routes.find((candidate) => candidate.id === id) ?? routes[0];
  if (!route) {
    throw new Error(`No ledger routes registered for ${group}.`);
  }
  return route;
}
