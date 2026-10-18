/**
 * Domain Models for NBR eReturn Ledger (eLedger)
 * Phase 0 Reconstructed Data Architecture
 */

export type AssessmentYear = '2026-2027' | '2025-2026' | '2024-2025';

export interface TaxpayerContext {
  tin: string;
  nid: string;
  name: string;
  taxpayerType: 'INDIVIDUAL' | 'COMPANY' | 'FIRM';
  circle: string;
  taxesZone: string;
  assessmentYear: AssessmentYear;
  status: 'ACTIVE' | 'REGISTERED';
}

export type TaxCategory = 'SOURCE_TAX' | 'AIT' | 'PAYMENT' | 'ADJUSTMENT' | 'RECONCILIATION';

export type LedgerRouteId =
  // Source Tax (10 routes)
  | 'salary-ibas'
  | 'salary-others'
  | 'bank-fi'
  | 'dividend'
  | 'service-payment'
  | 'sanchayapatra'
  | 'other-tds'
  | 'contractor-supplier'
  | 'house-property'
  | 'system-import'
  // AIT (3 routes)
  | 'commercial-vehicle'
  | 'car-ait'
  | 'sec-154'
  // Payment (2 routes)
  | 'sec-173'
  | 'sec-171'
  // Adjustment (2 routes)
  | 'refund'
  | 'carry-forward'
  // Tax Payment Status (1 route)
  | 'tax-payment-status';

export type WorkflowPattern =
  | 'SYSTEM_CLAIM'
  | 'MANUAL_ENTRY'
  | 'SYNC_FROM_INCOME'
  | 'HYBRID_SYNC_MANUAL'
  | 'SYSTEM_LOOKUP'
  | 'SYSTEM_RECORDS_IMPORT'
  | 'SINGLE_CLAIM'
  | 'RECONCILIATION';

export type VerificationStatus =
  | 'DRAFT'
  | 'PENDING_VERIFICATION'
  | 'VERIFIED'
  | 'DISPUTED'
  | 'SYNCED';

export interface LedgerEntry {
  id: string;
  taxpayerTin: string;
  assessmentYear: AssessmentYear;
  category: TaxCategory;
  routeId: LedgerRouteId;
  referenceNo: string;
  sourceEntity: string;
  sectionCode: string;
  grossAmount: number;
  taxDeducted: number;
  date: string; // YYYY-MM-DD
  status: VerificationStatus;
  workflow: WorkflowPattern;
  isManual: boolean;
  externalVerified: boolean;
  // Reserved for future server-attested verification. Never set by local adapters.
  verificationAuthority?: 'AUTHORITATIVE';
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IncomeSyncItem {
  id: string;
  taxpayerTin: string;
  assessmentYear: AssessmentYear;
  category: TaxCategory;
  routeId: LedgerRouteId;
  sourceHead: string;
  payerName: string;
  accountOrCertificateNo: string;
  reportedGrossIncome: number;
  calculatedTaxCredit: number;
  syncDate: string;
  isSyncedToLedger: boolean;
}

export interface ExternalLookupQuery {
  routeId: LedgerRouteId;
  referenceNo: string;
  expectedTin: string;
  assessmentYear: AssessmentYear;
}

export interface ExternalLookupResult {
  found: boolean;
  // A matching local reference is not evidence of government verification.
  authoritative?: boolean;
  routeId?: LedgerRouteId;
  assessmentYear?: AssessmentYear;
  referenceNo: string;
  matchedTin: string;
  entityName: string;
  taxAmount: number;
  grossAmount: number;
  paymentDate: string;
  challanOrTokenNo: string;
  verificationSource: 'iBAS++' | 'BRTA' | 'BB_SANCHAYA' | 'CDBL' | 'A-CHALLAN';
  status: 'VALID' | 'MISMATCH' | 'NOT_FOUND' | 'SERVICE_UNAVAILABLE';
  statusMessage?: string;
}

export interface TaxCategoryTotals {
  sourceTaxTotal: number;
  sourceTaxCount: number;
  aitTotal: number;
  aitCount: number;
  paymentsTotal: number;
  paymentsCount: number;
  adjustmentsTotal: number;
  adjustmentsCount: number;
  grandTotalCredits: number;
  totalRecordsCount: number;
}

export interface RouteRegistryEntry {
  id: LedgerRouteId;
  group: 'Source Tax' | 'AIT' | 'Payment' | 'Adjustment' | 'Tax Payment Status';
  title: string;
  bengaliTitle: string;
  statutorySection: string;
  workflow: WorkflowPattern;
  status: 'CONFIRMED' | 'PROVISIONAL' | 'UNRESOLVED';
  description: string;
  supportsManualEntry: boolean;
  supportsIncomeSync: boolean;
  supportsLookup: boolean;
  supportsImport: boolean;
}
