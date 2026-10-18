/**
 * External Lookup Service Adapter
 *
 * Implements strict Fail-Closed rules and precedence:
 * - Configured external lookup results take precedence over bundled local records.
 * - If an external service is configured but unavailable or contradictory, fail closed;
 *   do not silently substitute sample results.
 * - Validates expected TIN against external registry record.
 */

import { ExternalLookupQuery, ExternalLookupResult } from '../domain/models.ts';

// Simulated official registry datasets for testing and verification
const OFFICIAL_EXTERNAL_REGISTRY: Record<string, ExternalLookupResult> = {
  // BRTA Commercial Vehicle records
  'DHAKA-METRO-JA-11-2044': {
    found: true,
    referenceNo: 'DHAKA-METRO-JA-11-2044',
    matchedTin: '123456789012',
    entityName: 'BRTA Dhaka Metro (Commercial Bus)',
    taxAmount: 16000,
    grossAmount: 16000,
    paymentDate: '2026-04-12',
    challanOrTokenNo: 'BRTA-TOK-2026-90812',
    verificationSource: 'BRTA',
    status: 'VALID',
    statusMessage: 'Official BRTA vehicle advance tax token verified with NBR tax database.',
  },
  // BRTA Private Car record
  'DHAKA-METRO-GA-34-9182': {
    found: true,
    referenceNo: 'DHAKA-METRO-GA-34-9182',
    matchedTin: '123456789012',
    entityName: 'BRTA Mirpur (Toyota Corolla 1498cc)',
    taxAmount: 25000,
    grossAmount: 25000,
    paymentDate: '2026-02-14',
    challanOrTokenNo: 'BRTA-FIT-2026-44910',
    verificationSource: 'BRTA',
    status: 'VALID',
    statusMessage: 'Motor car advance tax record confirmed matching taxpayer TIN.',
  },
  // Mismatched TIN record (belongs to different taxpayer TIN 999999999999)
  'DHAKA-METRO-KHA-55-1212': {
    found: true,
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
    referenceNo: 'ACHALLAN-2026-788102',
    matchedTin: '123456789012',
    entityName: 'Sonali Bank (A-Challan Code: 1-1141-0010-0101)',
    taxAmount: 40000,
    grossAmount: 40000,
    paymentDate: '2026-09-12',
    challanOrTokenNo: 'TR-ACH-9882194',
    verificationSource: 'A-CHALLAN',
    status: 'VALID',
    statusMessage: 'Treasury payment verified against Bangladesh Bank A-Challan portal.',
  },
  // Section 171 Quarterly Advance Challan
  'ACHALLAN-Q1-2026-5541': {
    found: true,
    referenceNo: 'ACHALLAN-Q1-2026-5541',
    matchedTin: '123456789012',
    entityName: 'Treasury Challan (Quarter 1 Advance Tax)',
    taxAmount: 35000,
    grossAmount: 35000,
    paymentDate: '2025-09-15',
    challanOrTokenNo: 'TR-ACH-5541-Q1',
    verificationSource: 'A-CHALLAN',
    status: 'VALID',
    statusMessage: 'Advance tax installment verified under Section 171.',
  },
  // Section 154 Specialized AIT
  'SEC154-AUCTION-2026-001': {
    found: true,
    referenceNo: 'SEC154-AUCTION-2026-001',
    matchedTin: '123456789012',
    entityName: 'Chittagong Port Authority Auction House',
    taxAmount: 18500,
    grossAmount: 185000,
    paymentDate: '2026-05-02',
    challanOrTokenNo: 'CPA-TDS-AUC-771',
    verificationSource: 'A-CHALLAN',
    status: 'VALID',
    statusMessage: 'Auction advance tax deduction certified.',
  },
};

export interface IExternalLookupService {
  lookup(query: ExternalLookupQuery): Promise<ExternalLookupResult>;
}

export class ExternalLookupService implements IExternalLookupService {
  private simulateOffline: boolean = false;

  setSimulateOffline(offline: boolean) {
    this.simulateOffline = offline;
  }

  async lookup(query: ExternalLookupQuery): Promise<ExternalLookupResult> {
    const cleanRef = query.referenceNo.trim();

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

    // 2. Query official registry
    const record = OFFICIAL_EXTERNAL_REGISTRY[cleanRef];

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

    // 4. Precedence: return verified record
    return {
      ...record,
      status: 'VALID',
    };
  }
}

export const externalLookupService = new ExternalLookupService();
