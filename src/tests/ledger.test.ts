/**
 * Comprehensive Unit Test Suite for NBR eReturn Ledger (Phase 0)
 * Uses Node.js native test runner (node:test & node:assert/strict)
 *
 * Verifies all 14 mandatory areas from Section 11:
 * 1. Application logic & route registry structure
 * 2. Navigation registry categorization (18 functional routes)
 * 3. Manual entry validation
 * 4. Edit and delete integrity
 * 5. Assessment-year isolation
 * 6. Taxpayer-context isolation
 * 7. Dynamic totals calculation
 * 8. Duplicate prevention
 * 9. Invalid amount rejection
 * 10. External lookup mismatch rejection
 * 11. Connected-mode lookup precedence & fail-closed behavior
 * 12. Income-sync isolation & state
 * 13. Tax Payment Status calculations & reconciliation
 * 14. Verification status rules (never auto-verify manual entries)
 */

import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ROUTE_REGISTRY, getRouteById, getRoutesByGroup } from '../domain/routeRegistry.ts';
import {
  calculateCategoryTotals,
  filterEntriesByRoute,
  groupEntriesByRoute,
  formatCurrencyBDT,
} from '../domain/calculations.ts';
import {
  validateLedgerEntry,
  validateExternalLookupMatch,
  getInitialVerificationStatus,
} from '../domain/validation.ts';
import { LedgerEntry, ExternalLookupQuery, ExternalLookupResult } from '../domain/models.ts';
import { INITIAL_LEDGER_ENTRIES, DEFAULT_TAXPAYERS } from '../data/seedData.ts';
import { LocalStorageLedgerRepository } from '../services/ledgerRepository.ts';
import { ExternalLookupService } from '../services/externalLookupService.ts';

describe('NBR eReturn Ledger — Phase 0 Test Suite', () => {
  // Test 1 & 2: Route Registry and Navigation Integrity (18 Functional Routes)
  describe('1. Route Registry & Navigation Structure', () => {
    it('should contain exactly 18 functional routes', () => {
      assert.equal(ROUTE_REGISTRY.length, 18);
    });

    it('should have 10 Source Tax, 3 AIT, 2 Payment, 2 Adjustment, and 1 Status route', () => {
      const sourceTax = getRoutesByGroup('Source Tax');
      const ait = getRoutesByGroup('AIT');
      const payment = getRoutesByGroup('Payment');
      const adjustment = getRoutesByGroup('Adjustment');
      const status = getRoutesByGroup('Tax Payment Status');

      assert.equal(sourceTax.length, 10, 'Expected 10 Source Tax routes');
      assert.equal(ait.length, 3, 'Expected 3 AIT routes');
      assert.equal(payment.length, 2, 'Expected 2 Payment routes');
      assert.equal(adjustment.length, 2, 'Expected 2 Adjustment routes');
      assert.equal(status.length, 1, 'Expected 1 Tax Payment Status route');
    });

    it('should distinguish confirmed and provisional routes in registry', () => {
      const confirmed = ROUTE_REGISTRY.filter((r) => r.status === 'CONFIRMED');
      const provisional = ROUTE_REGISTRY.filter((r) => r.status === 'PROVISIONAL');

      assert.equal(confirmed.length, 16);
      assert.equal(provisional.length, 2);
      assert.ok(getRouteById('contractor-supplier')?.status === 'PROVISIONAL');
      assert.ok(getRouteById('house-property')?.status === 'PROVISIONAL');
    });
  });

  // Test 3 & 4: Manual Entry, Edit and Delete Operations
  describe('2. Manual Entry & CRUD Operations in Repository', () => {
    it('should add, update, and delete entries correctly', async () => {
      const repo = new LocalStorageLedgerRepository();
      await repo.resetToDefaults();

      const created = await repo.addEntry({
        taxpayerTin: '123456789012',
        assessmentYear: '2026-2027',
        category: 'SOURCE_TAX',
        routeId: 'salary-others',
        referenceNo: 'TEST-SAL-001',
        sourceEntity: 'Private Tech Ltd',
        sectionCode: 'Sec 86',
        grossAmount: 500000,
        taxDeducted: 25000,
        date: '2026-05-10',
        status: 'PENDING_VERIFICATION',
        workflow: 'MANUAL_ENTRY',
        isManual: true,
        externalVerified: false,
      });

      assert.ok(created.id, 'Entry should have an ID');
      assert.equal(created.referenceNo, 'TEST-SAL-001');

      // Update
      const updated = await repo.updateEntry(created.id, {
        taxDeducted: 30000,
        remarks: 'Corrected deduction',
      });
      assert.equal(updated.taxDeducted, 30000);
      assert.equal(updated.remarks, 'Corrected deduction');

      // Delete
      const deleted = await repo.deleteEntry(created.id);
      assert.equal(deleted, true);

      const found = await repo.getEntryById(created.id);
      assert.equal(found, undefined);
    });
  });

  // Test 5: Assessment-Year Isolation
  describe('3. Assessment-Year Isolation', () => {
    it('should isolate entries by assessment year without bleed', async () => {
      const repo = new LocalStorageLedgerRepository();
      const tin = '123456789012';

      const entriesAY26 = await repo.getEntries(tin, '2026-2027');
      const entriesAY25 = await repo.getEntries(tin, '2025-2026');

      assert.ok(entriesAY26.length > 0, 'Current year entries should exist');
      assert.ok(entriesAY25.length > 0, 'Previous year entries should exist');

      // Verify no AY 2026 records appear in AY 2025 query
      for (const entry of entriesAY26) {
        assert.equal(entry.assessmentYear, '2026-2027');
      }
      for (const entry of entriesAY25) {
        assert.equal(entry.assessmentYear, '2025-2026');
      }
    });
  });

  // Test 6: Taxpayer-Context Isolation
  describe('4. Taxpayer-Context Isolation', () => {
    it('should isolate ledger data between different taxpayers', async () => {
      const repo = new LocalStorageLedgerRepository();
      const tp1Tin = DEFAULT_TAXPAYERS[0].tin; // 123456789012
      const tp2Tin = DEFAULT_TAXPAYERS[1].tin; // 987654321098

      const tp1Entries = await repo.getEntries(tp1Tin, '2026-2027');
      const tp2Entries = await repo.getEntries(tp2Tin, '2026-2027');

      assert.ok(tp1Entries.length > 0);
      assert.ok(tp2Entries.length > 0);

      // Verify strict TIN matching
      tp1Entries.forEach((e) => assert.equal(e.taxpayerTin, tp1Tin));
      tp2Entries.forEach((e) => assert.equal(e.taxpayerTin, tp2Tin));
    });
  });

  // Test 7: Dynamic Totals Calculation
  describe('5. Dynamic Totals Calculation', () => {
    it('should compute exact category totals and grand total dynamically', () => {
      const mockEntries: LedgerEntry[] = [
        {
          id: '1',
          taxpayerTin: '123456789012',
          assessmentYear: '2026-2027',
          category: 'SOURCE_TAX',
          routeId: 'salary-ibas',
          referenceNo: 'REF1',
          sourceEntity: 'Entity A',
          sectionCode: 'Sec 86',
          grossAmount: 100000,
          taxDeducted: 10000,
          date: '2026-01-01',
          status: 'VERIFIED',
          workflow: 'SYSTEM_CLAIM',
          isManual: false,
          externalVerified: true,
          createdAt: '',
          updatedAt: '',
        },
        {
          id: '2',
          taxpayerTin: '123456789012',
          assessmentYear: '2026-2027',
          category: 'AIT',
          routeId: 'car-ait',
          referenceNo: 'REF2',
          sourceEntity: 'BRTA',
          sectionCode: 'Sec 153',
          grossAmount: 25000,
          taxDeducted: 25000,
          date: '2026-01-01',
          status: 'VERIFIED',
          workflow: 'SYSTEM_LOOKUP',
          isManual: false,
          externalVerified: true,
          createdAt: '',
          updatedAt: '',
        },
        {
          id: '3',
          taxpayerTin: '123456789012',
          assessmentYear: '2026-2027',
          category: 'PAYMENT',
          routeId: 'sec-173',
          referenceNo: 'REF3',
          sourceEntity: 'Treasury',
          sectionCode: 'Sec 173',
          grossAmount: 30000,
          taxDeducted: 30000,
          date: '2026-01-01',
          status: 'VERIFIED',
          workflow: 'SYSTEM_LOOKUP',
          isManual: false,
          externalVerified: true,
          createdAt: '',
          updatedAt: '',
        },
        {
          id: '4',
          taxpayerTin: '123456789012',
          assessmentYear: '2026-2027',
          category: 'ADJUSTMENT',
          routeId: 'refund',
          referenceNo: 'REF4',
          sourceEntity: 'Circle 15',
          sectionCode: 'Sec 214',
          grossAmount: 5000,
          taxDeducted: 5000,
          date: '2026-01-01',
          status: 'VERIFIED',
          workflow: 'MANUAL_ENTRY',
          isManual: true,
          externalVerified: true,
          createdAt: '',
          updatedAt: '',
        },
      ];

      const totals = calculateCategoryTotals(mockEntries);

      assert.equal(totals.sourceTaxTotal, 10000);
      assert.equal(totals.sourceTaxCount, 1);
      assert.equal(totals.aitTotal, 25000);
      assert.equal(totals.aitCount, 1);
      assert.equal(totals.paymentsTotal, 30000);
      assert.equal(totals.paymentsCount, 1);
      assert.equal(totals.adjustmentsTotal, 5000);
      assert.equal(totals.adjustmentsCount, 1);
      assert.equal(totals.grandTotalCredits, 70000);
      assert.equal(totals.totalRecordsCount, 4);
    });
  });

  // Test 8: Duplicate Prevention
  describe('6. Duplicate Prevention', () => {
    it('should reject duplicate reference numbers for same taxpayer and assessment year', () => {
      const existingEntries = [...INITIAL_LEDGER_ENTRIES];

      const duplicateEntry: Partial<LedgerEntry> = {
        taxpayerTin: '123456789012',
        assessmentYear: '2026-2027',
        routeId: 'salary-ibas',
        referenceNo: 'IBAS/GOV/2026/08821', // Already in initial seed data
        sourceEntity: 'Ministry of Finance',
        grossAmount: 1440000,
        taxDeducted: 85000,
        date: '2026-06-30',
      };

      const res = validateLedgerEntry(duplicateEntry, existingEntries);
      assert.equal(res.isValid, false);
      assert.match(res.errors.referenceNo, /Duplicate entry/i);
    });

    it('should allow same reference number in different assessment years', () => {
      const existingEntries = [...INITIAL_LEDGER_ENTRIES];

      const diffYearEntry: Partial<LedgerEntry> = {
        taxpayerTin: '123456789012',
        assessmentYear: '2024-2025', // Different year
        routeId: 'salary-ibas',
        referenceNo: 'IBAS/GOV/2026/08821',
        sourceEntity: 'Ministry of Finance',
        grossAmount: 1440000,
        taxDeducted: 85000,
        date: '2026-06-30',
      };

      const res = validateLedgerEntry(diffYearEntry, existingEntries);
      assert.equal(res.isValid, true);
    });
  });

  // Test 9: Invalid Amount Rejection
  describe('7. Invalid Amount Rejection', () => {
    it('should reject zero or negative tax amount', () => {
      const entry: Partial<LedgerEntry> = {
        taxpayerTin: '123456789012',
        assessmentYear: '2026-2027',
        routeId: 'salary-others',
        referenceNo: 'REF-NEW-01',
        sourceEntity: 'Entity',
        grossAmount: 10000,
        taxDeducted: 0, // Invalid!
        date: '2026-05-01',
      };

      const res = validateLedgerEntry(entry, []);
      assert.equal(res.isValid, false);
      assert.match(res.errors.taxDeducted, /positive number/i);
    });

    it('should reject tax amount exceeding gross payment', () => {
      const entry: Partial<LedgerEntry> = {
        taxpayerTin: '123456789012',
        assessmentYear: '2026-2027',
        routeId: 'salary-others',
        referenceNo: 'REF-NEW-02',
        sourceEntity: 'Entity',
        grossAmount: 10000,
        taxDeducted: 15000, // Invalid!
        date: '2026-05-01',
      };

      const res = validateLedgerEntry(entry, []);
      assert.equal(res.isValid, false);
      assert.match(res.errors.taxDeducted, /cannot exceed/i);
    });
  });

  // Test 10: External Lookup Mismatch Rejection
  describe('8. External Lookup TIN Mismatch Rejection', () => {
    it('should reject saving external record when matched TIN differs from taxpayer TIN', async () => {
      const service = new ExternalLookupService();
      const query: ExternalLookupQuery = {
        routeId: 'commercial-vehicle',
        referenceNo: 'DHAKA-METRO-KHA-55-1212', // Registry record belongs to TIN 999999999999
        expectedTin: '123456789012',
        assessmentYear: '2026-2027',
      };

      const result = await service.lookup(query);
      assert.equal(result.status, 'MISMATCH');

      const validation = validateExternalLookupMatch(query, result);
      assert.equal(validation.canSave, false);
      assert.match(validation.reason || '', /TIN mismatch/i);
    });
  });

  // Test 11: Connected-mode Precedence & Fail-Closed Behavior
  describe('9. Connected-mode Precedence & Fail-Closed Policy', () => {
    it('should succeed and take precedence when valid record matches', async () => {
      const service = new ExternalLookupService();
      const query: ExternalLookupQuery = {
        routeId: 'commercial-vehicle',
        referenceNo: 'DHAKA-METRO-JA-11-2044',
        expectedTin: '123456789012',
        assessmentYear: '2026-2027',
      };

      const result = await service.lookup(query);
      assert.equal(result.status, 'VALID');
      assert.equal(result.taxAmount, 16000);

      const validation = validateExternalLookupMatch(query, result);
      assert.equal(validation.canSave, true);
    });

    it('should fail closed when external service is offline or unavailable', async () => {
      const service = new ExternalLookupService();
      service.setSimulateOffline(true); // Simulate offline registry

      const query: ExternalLookupQuery = {
        routeId: 'commercial-vehicle',
        referenceNo: 'DHAKA-METRO-JA-11-2044',
        expectedTin: '123456789012',
        assessmentYear: '2026-2027',
      };

      const result = await service.lookup(query);
      assert.equal(result.status, 'SERVICE_UNAVAILABLE');

      const validation = validateExternalLookupMatch(query, result);
      assert.equal(validation.canSave, false);
      assert.match(validation.reason || '', /offline|unavailable/i);
    });
  });

  // Test 12: Income Sync Isolation
  describe('10. Income Sync Flow', () => {
    it('should properly link declared income heads to ledger records', () => {
      const entries = filterEntriesByRoute(INITIAL_LEDGER_ENTRIES, 'bank-fi');
      assert.ok(entries.length > 0);
      assert.equal(entries[0].workflow, 'SYNC_FROM_INCOME');
      assert.equal(entries[0].status, 'SYNCED');
    });
  });

  // Test 13: Tax Payment Status Reconciliation
  describe('11. Tax Payment Status Reconciliation', () => {
    it('should group entries by route and compute totals matching category sums', () => {
      const grouped = groupEntriesByRoute(INITIAL_LEDGER_ENTRIES);
      const totals = calculateCategoryTotals(INITIAL_LEDGER_ENTRIES);

      let sumFromGroups = 0;
      for (const key of Object.keys(grouped)) {
        sumFromGroups += grouped[key].totalTax;
      }

      assert.equal(Math.round(sumFromGroups * 100) / 100, totals.grandTotalCredits);
    });

    it('should format currency consistently in Bangladeshi Taka (BDT)', () => {
      const formatted = formatCurrencyBDT(125000.5);
      assert.match(formatted, /Tk\.\s*1,25,000\.50/);
    });
  });

  // Test 14: Verification Status Rules
  describe('12. Verification Status Rules', () => {
    it('should never automatically classify a locally entered amount as an authorized tax credit', () => {
      const manualStatus = getInitialVerificationStatus(true, false);
      assert.equal(manualStatus, 'PENDING_VERIFICATION');

      const verifiedStatus = getInitialVerificationStatus(false, true);
      assert.equal(verifiedStatus, 'VERIFIED');
    });
  });
});
