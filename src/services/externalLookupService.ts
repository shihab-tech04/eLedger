/**
 * External Lookup Service Adapter
 *
 * Implements strict Fail-Closed rules and precedence:
 * - Configured external lookup results take precedence over bundled local records.
 * - If an external service is configured but unavailable or contradictory, fail closed;
 *   do not silently substitute sample results.
 * - Validates expected TIN against external registry record.
 */

import { ExternalLookupQuery, ExternalLookupResult, LedgerRouteId } from '../domain/models.ts';

// Local reference fixtures. These are never authoritative verification results.
const LOCAL_REFERENCE_RECORDS: Record<string, ExternalLookupResult> = {
  // BRTA Commercial Vehicle records
  'DHAKA-METRO-JA-11-2044': {
    found: true,
    routeId: 'commercial-vehicle',
    assessmentYear: '2026-2027',
    referenceNo: 'DHAKA-METRO-JA-11-2044',
    matchedTin: '123456789012',
    entityName: 'BRTA Dhaka Metro (Commercial Bus)',
    taxAmount: 16000,
    grossAmount: 16000,
    paymentDate: '2026-04-12',
    challanOrTokenNo: 'BRTA-TOK-2026-90812',
    verificationSource: 'BRTA',
    status: 'VALID',
    statusMessage: 'Matching BRTA reference found in local records. External verification is pending.',
  },
  // BRTA Private Car record
  'DHAKA-METRO-GA-34-9182': {
    found: true,
    routeId: 'car-ait',
    assessmentYear: '2026-2027',
    referenceNo: 'DHAKA-METRO-GA-34-9182',
    matchedTin: '123456789012',
    entityName: 'BRTA Mirpur (Toyota Corolla 1498cc)',
    taxAmount: 25000,
    grossAmount: 25000,
    paymentDate: '2026-02-14',
    challanOrTokenNo: 'BRTA-FIT-2026-44910',
    verificationSource: 'BRTA',
    status: 'VALID',
    statusMessage: 'Matching motor car reference found in local records. External verification is pending.',
  },
  // Mismatched TIN record (belongs to different taxpayer TIN 999999999999)
  'DHAKA-METRO-KHA-55-1212': {
    found: true,
    routeId: 'commercial-vehicle',
    assessmentYear: '2026-2027',
    referenceNo: 'DHAKA-METRO-KHA-55-1212',
    matchedTin: '999999999999',
    entityName: 'BRTA Gazipur (Commercial Carrier)',
    taxAmount: 22000,
    grossAmount: 22000,
    paymentDate: '2026-03-01',
    challanOrTokenNo: 'BRTA-TOK-MIS-009',
    verificationSource: 'BRTA',
    status: 'MISMATCH',
    statusMessage: 'Taxpayer TIN mismatch: Vehicle registered under TIN 999999999999.',
  },
  // Treasury A-Challan under Section 173
  'ACHALLAN-2026-788102': {
    found: true,
    routeId: 'sec-173',
    assessmentYear: '2026-2027',
    referenceNo: 'ACHALLAN-2026-788102',
    matchedTin: '123456789012',
    entityName: 'Sonali Bank (A-Challan Code: 1-1141-0010-0101)',
    taxAmount: 40000,
    grossAmount: 40000,
    paymentDate: '2026-09-12',
    challanOrTokenNo: 'TR-ACH-9882194',
    verificationSource: 'A-CHALLAN',
    status: 'VALID',
    statusMessage: 'Matching challan reference found in local records. External verification is pending.',
  },
  // Section 171 Quarterly Advance Challan
  'ACHALLAN-Q1-2026-5541': {
    found: true,
    routeId: 'sec-171',
    assessmentYear: '2026-2027',
    referenceNo: 'ACHALLAN-Q1-2026-5541',
    matchedTin: '123456789012',
    entityName: 'Treasury Challan (Quarter 1 Advance Tax)',
    taxAmount: 35000,
    grossAmount: 35000,
    paymentDate: '2025-09-15',
    challanOrTokenNo: 'TR-ACH-5541-Q1',
    verificationSource: 'A-CHALLAN',
    status: 'VALID',
    statusMessage: 'Matching advance tax reference found in local records. External verification is pending.',
  },
  // Section 154 Specialized AIT
  'SEC154-AUCTION-2026-001': {
    found: true,
    routeId: 'sec-154',
    assessmentYear: '2026-2027',
    referenceNo: 'SEC154-AUCTION-2026-001',
    matchedTin: '123456789012',
    entityName: 'Chittagong Port Authority Auction House',
    taxAmount: 18500,
    grossAmount: 185000,
    paymentDate: '2026-05-02',
    challanOrTokenNo: 'CPA-TDS-AUC-771',
    verificationSource: 'A-CHALLAN',
    status: 'VALID',
    statusMessage: 'Matching auction reference found in local records. External verification is pending.',
  },
};

/** Samples presented by a lookup panel must belong to the selected route. */
export function getLocalReferenceExamples(routeId: LedgerRouteId): Array<{ referenceNo: string; label: string }> {
  const labels: Partial<Record<LedgerRouteId, string>> = {
    'commercial-vehicle': 'Commercial',
    'car-ait': 'Private Car',
    'sec-154': 'Section 154',
    'sec-173': 'Section 173',
    'sec-171': 'Section 171',
  };
  return Object.values(LOCAL_REFERENCE_RECORDS)
    .filter((record) => record.routeId === routeId)
    .map((record) => ({
      referenceNo: record.referenceNo,
      label: record.status === 'MISMATCH' ? 'TIN Mismatch Test' : labels[routeId] || 'Reference',
    }));
}

export interface IExternalLookupService {
  lookup(query: ExternalLookupQuery): Promise<ExternalLookupResult>;
}

export class ExternalLookupService implements IExternalLookupService {
  private simulateOffline: boolean = false;

  setSimulateOffline(offline: boolean) {
    this.simulateOffline = offline;
  }

  async lookup(query: ExternalLookupQuery): Promise<ExternalLookupResult> {
    const cleanRef = query.referenceNo.trim().toUpperCase();

    // 1. Fail closed if service is configured offline or unavailable
    if (this.simulateOffline) {
      return {
        found: false,
        referenceNo: cleanRef,
        matchedTin: '',
        entityName: '',
        taxAmount: 0,
        grossAmount: 0,
        paymentDate: '',
        challanOrTokenNo: '',
        verificationSource: 'A-CHALLAN',
        status: 'SERVICE_UNAVAILABLE',
        statusMessage: 'External verification service is unreachable. Verification failed closed.',
      };
    }

    // 2. Match local references without representing them as live registry results.
    const record = LOCAL_REFERENCE_RECORDS[cleanRef];

    if (!record) {
      return {
        found: false,
        referenceNo: cleanRef,
        matchedTin: '',
        entityName: '',
        taxAmount: 0,
        grossAmount: 0,
        paymentDate: '',
        challanOrTokenNo: '',
        verificationSource: 'A-CHALLAN',
        status: 'NOT_FOUND',
        statusMessage: `No external verification record found for reference '${cleanRef}'.`,
      };
    }

    // 3. Validate TIN match
    if (record.matchedTin !== query.expectedTin) {
      return {
        ...record,
        status: 'MISMATCH',
        statusMessage: `Taxpayer TIN mismatch: External record is registered to TIN ${record.matchedTin}, which differs from current taxpayer ${query.expectedTin}.`,
      };
    }

    if (record.routeId !== query.routeId || record.assessmentYear !== query.assessmentYear) {
      return {
        ...record,
        authoritative: false,
        status: 'MISMATCH',
        statusMessage: 'Reference does not match the selected ledger category or assessment year.',
      };
    }

    // 4. Local matches may be recorded, but never become verified credits.
    return {
      ...record,
      authoritative: false,
      status: 'VALID',
    };
  }
}

export const externalLookupService = new ExternalLookupService();
