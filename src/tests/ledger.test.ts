/**
 * Unit Test Suite for NBR eReturn Ledger (Phase 1 recovery)
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

import { ROUTE_REGISTRY, getActiveRouteForGroup, getRouteById, getRoutesByGroup } from '../domain/routeRegistry.ts';
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
  sameLedgerReference,
} from '../domain/validation.ts';
import { LedgerEntry, ExternalLookupQuery, ExternalLookupResult } from '../domain/models.ts';
import { INITIAL_LEDGER_ENTRIES, INITIAL_INCOME_SYNC_ITEMS, DEFAULT_TAXPAYERS } from '../data/seedData.ts';
import { LEDGER_STORAGE_KEY, LocalStorageLedgerRepository } from '../services/ledgerRepository.ts';
import { ledgerRepository } from '../services/ledgerRepository.ts';
import { ExternalLookupService } from '../services/externalLookupService.ts';
import { incomeSyncService } from '../services/incomeSyncService.ts';
import { IncomeSyncService } from '../services/incomeSyncService.ts';
import { getPriorAssessmentYears, readCarryForwardDetails } from '../domain/carryForward.ts';

describe('NBR eReturn Ledger — Phase 1 Recovery Tests', () => {
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
          verificationAuthority: 'AUTHORITATIVE',
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
          verificationAuthority: 'AUTHORITATIVE',
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
          verificationAuthority: 'AUTHORITATIVE',
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
      // The 5,000 manual adjustment is recorded but cannot be auto-credited.
      assert.equal(totals.grandTotalCredits, 65000);
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
      assert.equal(result.authoritative, false);

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

    it('rejects a matching reference used for a different route or assessment year', async () => {
      const service = new ExternalLookupService();
      const base: ExternalLookupQuery = {
        routeId: 'commercial-vehicle',
        referenceNo: 'DHAKA-METRO-JA-11-2044',
        expectedTin: '123456789012',
        assessmentYear: '2026-2027',
      };
      for (const query of [
        { ...base, routeId: 'car-ait' as const },
        { ...base, assessmentYear: '2025-2026' as const },
      ]) {
        const result = await service.lookup(query);
        assert.equal(result.status, 'MISMATCH');
        assert.equal(validateExternalLookupMatch(query, result).canSave, false);
      }
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

    it('rejects sync into a different taxpayer or assessment year', async () => {
      const wrongTin = await incomeSyncService.syncItemToLedger(
        'sync-item-bank-02', 'Sec 102', '987654321098', '2026-2027'
      );
      const wrongYear = await incomeSyncService.syncItemToLedger(
        'sync-item-bank-02', 'Sec 102', '123456789012', '2025-2026'
      );
      assert.equal(wrongTin.success, false);
      assert.equal(wrongYear.success, false);
    });

    it('prevents duplicates and allows resync after a ledger row is deleted', async () => {
      await ledgerRepository.resetToDefaults();
      const first = await incomeSyncService.syncItemToLedger(
        'sync-item-bank-02', 'Sec 102', '123456789012', '2026-2027'
      );
      assert.equal(first.success, true);
      assert.equal(first.entry?.status, 'SYNCED');
      assert.equal(first.entry?.externalVerified, false);

      const duplicate = await incomeSyncService.syncItemToLedger(
        'sync-item-bank-02', 'Sec 102', '123456789012', '2026-2027'
      );
      assert.equal(duplicate.success, false);

      assert.ok(first.entry);
      await ledgerRepository.deleteEntry(first.entry.id);
      const visible = await incomeSyncService.getSyncItemsForRoute(
        '123456789012', '2026-2027', 'bank-fi'
      );
      assert.equal(visible.find((item) => item.id === 'sync-item-bank-02')?.isSyncedToLedger, false);

      const again = await incomeSyncService.syncItemToLedger(
        'sync-item-bank-02', 'Sec 102', '123456789012', '2026-2027'
      );
      assert.equal(again.success, true);
      await ledgerRepository.resetToDefaults();
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

      const recordedTotal = totals.sourceTaxTotal + totals.aitTotal +
        totals.paymentsTotal + totals.adjustmentsTotal;
      assert.equal(Math.round(sumFromGroups * 100) / 100, recordedTotal);
      assert.equal(totals.grandTotalCredits, 0);
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
      assert.equal(getInitialVerificationStatus(true, true), 'PENDING_VERIFICATION');

      const verifiedStatus = getInitialVerificationStatus(false, true);
      assert.equal(verifiedStatus, 'VERIFIED');
    });

    it('does not count an unsubstantiated VERIFIED flag as an eligible credit', () => {
      const manual = INITIAL_LEDGER_ENTRIES[0];
      const totals = calculateCategoryTotals([
        { ...manual, status: 'VERIFIED', externalVerified: true, isManual: true },
        { ...manual, id: 'unsourced', status: 'VERIFIED', externalVerified: true },
      ]);
      assert.equal(totals.sourceTaxTotal, manual.taxDeducted * 2);
      assert.equal(totals.grandTotalCredits, 0);
    });

    it('blocks local repository writes from granting VERIFIED status', async () => {
      const repo = new LocalStorageLedgerRepository();
      const created = await repo.addEntry({
        taxpayerTin: '123456789012',
        assessmentYear: '2026-2027',
        category: 'SOURCE_TAX',
        routeId: 'salary-others',
        referenceNo: 'LOCAL-UNVERIFIED-01',
        sourceEntity: 'Test Payer',
        sectionCode: 'Sec 86',
        grossAmount: 1000,
        taxDeducted: 100,
        date: '2026-10-18',
        status: 'VERIFIED',
        workflow: 'MANUAL_ENTRY',
        isManual: true,
        externalVerified: true,
        verificationAuthority: 'AUTHORITATIVE',
      });
      assert.equal(created.status, 'PENDING_VERIFICATION');
      assert.equal(created.externalVerified, false);
      assert.equal(created.verificationAuthority, undefined);
      const modified = await repo.updateEntry(created.id, {
        status: 'VERIFIED',
        externalVerified: true,
        verificationAuthority: 'AUTHORITATIVE',
        taxpayerTin: '987654321098',
      });
      assert.equal(modified.status, 'PENDING_VERIFICATION');
      assert.equal(modified.externalVerified, false);
      assert.equal(modified.taxpayerTin, '123456789012');
    });
  });
});

describe('eLedger — Phase 2 Context, Persistence and Validation Regressions', () => {
  const manualEntry = {
    taxpayerTin: '123456789012',
    assessmentYear: '2026-2027' as const,
    category: 'SOURCE_TAX' as const,
    routeId: 'salary-others' as const,
    referenceNo: 'PHASE2-MANUAL-001',
    sourceEntity: 'Example Employer',
    sectionCode: 'Sec 86',
    grossAmount: 10000,
    taxDeducted: 1000,
    date: '2026-10-18',
    status: 'PENDING_VERIFICATION' as const,
    workflow: 'MANUAL_ENTRY' as const,
    isManual: true,
    externalVerified: false,
  };

  it('never resolves a foreign category route in any workflow group', () => {
    for (const group of ['Source Tax', 'AIT', 'Payment', 'Adjustment', 'Tax Payment Status'] as const) {
      const firstRoute = getRoutesByGroup(group)[0];
      for (const route of ROUTE_REGISTRY) {
        const resolved = getActiveRouteForGroup(route.id, group);
        assert.equal(resolved.group, group);
        assert.equal(resolved.id, route.group === group ? route.id : firstRoute.id);
      }
    }
  });

  it('rejects impossible calendar dates and nonfinite or zero gross amounts', () => {
    for (const date of ['2026-02-30', '2026-04-31', '2025-02-29', '2026-13-01']) {
      const result = validateLedgerEntry({ ...manualEntry, date }, []);
      assert.equal(result.isValid, false, `Accepted invalid date ${date}`);
      assert.ok(result.errors.date);
    }
    assert.equal(validateLedgerEntry({ ...manualEntry, date: '2024-02-29' }, []).isValid, true);
    for (const grossAmount of [0, -1, Number.POSITIVE_INFINITY, Number.NaN]) {
      const result = validateLedgerEntry({ ...manualEntry, grossAmount }, []);
      assert.equal(result.isValid, false);
      assert.ok(result.errors.grossAmount);
    }
    assert.ok(validateLedgerEntry({ ...manualEntry, taxDeducted: Number.POSITIVE_INFINITY }, []).errors.taxDeducted);
  });

  it('rejects a lookup response with another reference or invalid amounts', async () => {
    const query: ExternalLookupQuery = {
      routeId: 'commercial-vehicle',
      referenceNo: 'DHAKA-METRO-JA-11-2044',
      expectedTin: '123456789012',
      assessmentYear: '2026-2027',
    };
    const result = await new ExternalLookupService().lookup(query);
    assert.equal(validateExternalLookupMatch(query, result).canSave, true);

    for (const changed of [
      { ...result, referenceNo: 'OTHER-REFERENCE' },
      { ...result, taxAmount: Number.POSITIVE_INFINITY },
      { ...result, grossAmount: Number.NaN },
      { ...result, grossAmount: result.taxAmount - 1 },
      { ...result, status: 'MISMATCH' as const },
    ]) {
      assert.equal(validateExternalLookupMatch(query, changed).canSave, false);
    }
    assert.equal(validateExternalLookupMatch({ ...query, referenceNo: query.referenceNo.toLowerCase() }, result).canSave, true);
  });

  it('enforces validation and duplicate checks at the repository boundary', async () => {
    const repo = new LocalStorageLedgerRepository();
    await repo.resetToDefaults();
    const created = await repo.addEntry(manualEntry);
    await assert.rejects(repo.addEntry({ ...manualEntry, referenceNo: manualEntry.referenceNo.toLowerCase() }), /Duplicate/i);
    await assert.rejects(repo.addEntry({ ...manualEntry, referenceNo: 'NEW', date: '2026-02-30' }), /date/i);
    await assert.rejects(repo.addEntry({ ...manualEntry, referenceNo: 'NEW', category: 'AIT' }), /category/i);
    await assert.rejects(repo.addEntry({ ...manualEntry, referenceNo: 'NEW', routeId: 'tax-payment-status' }), /route/i);
    await assert.rejects(repo.updateEntry(created.id, { grossAmount: 0 }), /Gross amount/i);
    assert.equal((await repo.getEntryById(created.id))?.grossAmount, 10000);
  });

  it('keeps classification, ownership and provenance immutable when a row is edited', async () => {
    const repo = new LocalStorageLedgerRepository();
    const created = await repo.addEntry(manualEntry);
    const updated = await repo.updateEntry(created.id, {
      referenceNo: 'PHASE2-MANUAL-EDIT',
      taxpayerTin: '987654321098',
      assessmentYear: '2025-2026',
      category: 'AIT',
      routeId: 'car-ait',
      workflow: 'SYSTEM_LOOKUP',
      isManual: false,
      id: 'CHANGED-ID',
      createdAt: '2000-01-01T00:00:00Z',
      status: 'VERIFIED',
      externalVerified: true,
      verificationAuthority: 'AUTHORITATIVE',
    });
    for (const key of ['id', 'createdAt', 'taxpayerTin', 'assessmentYear', 'category', 'routeId', 'workflow', 'isManual'] as const) {
      assert.equal(updated[key], created[key], `${key} should not be writable`);
    }
    assert.equal(updated.referenceNo, 'PHASE2-MANUAL-EDIT');
    assert.equal(updated.status, 'PENDING_VERIFICATION');
    assert.equal(updated.externalVerified, false);
    assert.equal(updated.verificationAuthority, undefined);
  });

  it('returns defensive snapshots so a caller cannot mutate the stored ledger', async () => {
    const repo = new LocalStorageLedgerRepository();
    const created = await repo.addEntry(manualEntry);
    const snapshots = await repo.getAllEntries();
    const original = snapshots.find((entry) => entry.id === created.id);
    assert.ok(original);
    original.taxDeducted = 900000;
    snapshots.length = 0;
    assert.equal((await repo.getEntryById(created.id))?.taxDeducted, 1000);
  });

  it('persists valid writes across repository instances and isolates TIN and year', async () => {
    const map = new Map<string, string>();
    const storage = {
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => { map.set(key, value); },
    };
    const repo = new LocalStorageLedgerRepository(storage);
    await repo.resetToDefaults();
    const created = await repo.addEntry(manualEntry);
    const reloaded = new LocalStorageLedgerRepository(storage);
    assert.equal((await reloaded.getEntryById(created.id))?.referenceNo, manualEntry.referenceNo);
    assert.equal((await reloaded.getEntries(manualEntry.taxpayerTin, '2026-2027')).some((e) => e.id === created.id), true);
    assert.equal((await reloaded.getEntries('987654321098', '2026-2027')).some((e) => e.id === created.id), false);
    assert.equal((await reloaded.getEntries(manualEntry.taxpayerTin, '2025-2026')).some((e) => e.id === created.id), false);
  });

  it('rejects failed storage writes and preserves saved bytes and in-memory records', async () => {
    const map = new Map<string, string>();
    let rejectWrites = false;
    const storage = {
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => {
        if (rejectWrites) throw new Error('Quota exceeded');
        map.set(key, value);
      },
    };
    const repo = new LocalStorageLedgerRepository(storage);
    await repo.resetToDefaults();
    const savedBefore = [...map.values()][0];
    rejectWrites = true;
    await assert.rejects(repo.addEntry(manualEntry), /could not be saved/i);
    assert.equal([...map.values()][0], savedBefore);
    assert.equal((await repo.getAllEntries()).some((e) => e.referenceNo === manualEntry.referenceNo), false);
  });

  it('fails closed on corrupt saved JSON without replacing its contents', async () => {
    const saved = '{unparseable';
    const map = new Map([['nbr_eledger_entries_v1', saved]]);
    const storage = {
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => { map.set(key, value); },
    };
    const repo = new LocalStorageLedgerRepository(storage);
    await assert.rejects(repo.getAllEntries(), /could not be read/i);
    assert.equal(map.get('nbr_eledger_entries_v1'), saved);
  });
});

describe('eLedger — Phase 3 Route Journey and Local Integrity Regressions', () => {
  const carryForward = {
    taxpayerTin: '123456789012',
    assessmentYear: '2026-2027' as const,
    category: 'ADJUSTMENT' as const,
    routeId: 'carry-forward' as const,
    referenceNo: 'CARRY-FORWARD-PHASE3',
    sourceEntity: 'Tax Circle-015',
    sectionCode: 'Sec 70/215',
    grossAmount: 10000,
    taxDeducted: 10000,
    date: '2026-10-18',
    status: 'PENDING_VERIFICATION' as const,
    workflow: 'SINGLE_CLAIM' as const,
    isManual: true,
    externalVerified: false,
    remarks: 'Prior Year: 2025-2026 | Type: Business Loss Carried Forward (Sec 70)',
  };

  const freshStorage = () => {
    const map = new Map<string, string>();
    const storage = {
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => { map.set(key, value); },
    };
    return { map, storage };
  };

  it('provides only earlier assessment years for every selectable current year', () => {
    assert.deepEqual(getPriorAssessmentYears('2026-2027'), ['2025-2026', '2024-2025', '2023-2024']);
    assert.deepEqual(getPriorAssessmentYears('2025-2026'), ['2024-2025', '2023-2024', '2022-2023']);
    assert.deepEqual(getPriorAssessmentYears('2024-2025'), ['2023-2024', '2022-2023', '2021-2022']);
  });

  it('retains an existing carry-forward origin and classification while editing', () => {
    const details = readCarryForwardDetails(carryForward.remarks, carryForward.assessmentYear);
    assert.equal(details.priorAssessmentYear, '2025-2026');
    assert.equal(details.classification, 'Business Loss Carried Forward (Sec 70)');
    const prior = readCarryForwardDetails(undefined, '2025-2026');
    assert.equal(prior.priorAssessmentYear, '2024-2025');
    assert.equal(readCarryForwardDetails('Prior Year: 2025-2026 | Type: Business Loss Carried Forward (Sec 70)', '2025-2026').priorAssessmentYear, '2024-2025');
  });

  it('enforces single-claim cardinality even for a different reference, but isolates taxpayer/year', async () => {
    const repo = new LocalStorageLedgerRepository();
    const created = await repo.addEntry(carryForward);
    await assert.rejects(repo.addEntry({ ...carryForward, referenceNo: 'ANOTHER-ORDER' }), /one carry-forward claim/i);
    const updated = await repo.updateEntry(created.id, { taxDeducted: 9500 });
    assert.equal(updated.taxDeducted, 9500);
    const otherYear = await repo.addEntry({ ...carryForward, assessmentYear: '2025-2026', referenceNo: 'PRIOR-AY' });
    const otherTin = await repo.addEntry({ ...carryForward, taxpayerTin: '987654321098', referenceNo: 'SECOND-TIN' });
    assert.ok(otherYear.id);
    assert.ok(otherTin.id);
    assert.equal(updated.externalVerified, false);
  });

  it('strips unsupported authoritative verification from browser-stored records without erasing source bytes', async () => {
    const { map, storage } = freshStorage();
    const repo = new LocalStorageLedgerRepository(storage);
    await repo.resetToDefaults();
    const raw = JSON.parse(map.get('nbr_eledger_entries_v1')!) as LedgerEntry[];
    raw[0] = { ...raw[0], status: 'VERIFIED', externalVerified: true, verificationAuthority: 'AUTHORITATIVE' };
    const forged = JSON.stringify(raw);
    map.set('nbr_eledger_entries_v1', forged);
    const loaded = await new LocalStorageLedgerRepository(storage).getAllEntries();
    assert.equal(loaded[0].status, 'PENDING_VERIFICATION');
    assert.equal(loaded[0].externalVerified, false);
    assert.equal(loaded[0].verificationAuthority, undefined);
    assert.equal(calculateCategoryTotals(loaded).grandTotalCredits, 0);
    assert.equal(map.get('nbr_eledger_entries_v1'), forged);
  });

  it('reloads saved state before writes so independent tabs do not drop each other’s entries', async () => {
    const { storage } = freshStorage();
    const tabA = new LocalStorageLedgerRepository(storage);
    const tabB = new LocalStorageLedgerRepository(storage);
    await tabA.resetToDefaults();
    await tabA.getAllEntries();
    const entryOne = await tabB.addEntry(carryForward);
    const entryTwo = await tabA.addEntry({
      ...carryForward,
      category: 'SOURCE_TAX',
      routeId: 'salary-others',
      workflow: 'MANUAL_ENTRY',
      referenceNo: 'PARALLEL-TAB-ENTRY',
    });
    const reloaded = await new LocalStorageLedgerRepository(storage).getAllEntries();
    assert.ok(reloaded.some((entry) => entry.id === entryOne.id));
    assert.ok(reloaded.some((entry) => entry.id === entryTwo.id));
  });

  it('treats corrupted income declaration storage as unreadable and leaves it intact', async () => {
    const { map, storage } = freshStorage();
    map.set('nbr_eledger_income_sync_v1', '{bad income json');
    const service = new IncomeSyncService(storage);
    await assert.rejects(service.getSyncItemsForRoute('123456789012', '2026-2027', 'bank-fi'), /could not be read/i);
    assert.equal(map.get('nbr_eledger_income_sync_v1'), '{bad income json');
  });

  it('does not require a second metadata write after a successful income-to-ledger sync', async () => {
    const { map, storage } = freshStorage();
    map.set('nbr_eledger_income_sync_v1', JSON.stringify(INITIAL_INCOME_SYNC_ITEMS));
    const service = new IncomeSyncService({
      getItem: storage.getItem,
      setItem: () => { throw new Error('Income metadata storage unavailable'); },
    });
    await ledgerRepository.resetToDefaults();
    try {
      const sync = await service.syncItemToLedger('sync-item-bank-02', 'Sec 102', '123456789012', '2026-2027');
      assert.equal(sync.success, true);
      assert.equal((await ledgerRepository.getEntries('123456789012', '2026-2027')).some((e) => e.id === sync.entry?.id), true);
      assert.equal(map.get('nbr_eledger_income_sync_v1'), JSON.stringify(INITIAL_INCOME_SYNC_ITEMS));
    } finally {
      await ledgerRepository.resetToDefaults();
    }
  });

  it('accepts case-insensitive local fixture references but still fails route/year mismatches', async () => {
    const query: ExternalLookupQuery = {
      routeId: 'commercial-vehicle',
      referenceNo: 'dhaka-metro-ja-11-2044',
      expectedTin: '123456789012',
      assessmentYear: '2026-2027',
    };
    const service = new ExternalLookupService();
    const result = await service.lookup(query);
    assert.equal(result.status, 'VALID');
    assert.equal(validateExternalLookupMatch(query, result).canSave, true);
    const wrongRoute = await service.lookup({ ...query, routeId: 'car-ait' });
    assert.equal(validateExternalLookupMatch({ ...query, routeId: 'car-ait' }, wrongRoute).canSave, false);
  });
});

describe('eLedger — Phase 4 Workflow Transaction Acceptance', () => {
  const sharedContext = {
    taxpayerTin: '123456789012',
    assessmentYear: '2026-2027' as const,
    grossAmount: 1200,
    taxDeducted: 120,
    date: '2026-10-18',
    status: 'PENDING_VERIFICATION' as const,
    isManual: true,
    externalVerified: false,
  };

  const groupToCategory = {
    'Source Tax': 'SOURCE_TAX',
    AIT: 'AIT',
    Payment: 'PAYMENT',
    Adjustment: 'ADJUSTMENT',
  } as const;

  it('executes create, edit, delete and isolated reconciliation for every writable route', async (t) => {
    const writable = ROUTE_REGISTRY.filter((route) => route.supportsManualEntry);
    assert.equal(writable.length, 16);
    const saved = new Map<string, string>();
    const storage = {
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => { saved.set(key, value); },
    };
    const repo = new LocalStorageLedgerRepository(storage);
    await repo.resetToDefaults();

    for (const route of writable) {
      await t.test(route.id, async () => {
        const category = groupToCategory[route.group as keyof typeof groupToCategory];
        assert.ok(category);
        const record = {
          ...sharedContext,
          category,
          routeId: route.id,
          workflow: route.id === 'carry-forward' ? 'SINGLE_CLAIM' as const : 'MANUAL_ENTRY' as const,
          referenceNo: `PHASE4-${route.id}`,
          sourceEntity: 'Acceptance Test Payor',
          sectionCode: route.statutorySection,
        };
        const created = await repo.addEntry(record);
        assert.equal(created.status, 'PENDING_VERIFICATION');
        assert.equal(created.externalVerified, false);
        assert.equal((await repo.getEntries(sharedContext.taxpayerTin, sharedContext.assessmentYear)).filter(
          (entry) => entry.id === created.id && entry.routeId === route.id
        ).length, 1);
        await assert.rejects(repo.addEntry({ ...record, referenceNo: ` ${record.referenceNo.toLowerCase()} ` }), /Duplicate|one carry-forward/i);
        const updated = await repo.updateEntry(created.id, { taxDeducted: 110, remarks: 'Reviewed' });
        assert.equal(updated.taxDeducted, 110);
        assert.equal(updated.remarks, 'Reviewed');
        assert.equal(updated.routeId, route.id);
        assert.equal((await repo.getEntries('987654321098', sharedContext.assessmentYear)).some((entry) => entry.id === created.id), false);
        assert.equal((await repo.getEntries(sharedContext.taxpayerTin, '2025-2026')).some((entry) => entry.id === created.id), false);
        assert.equal(await repo.deleteEntry(created.id), true);
        assert.equal(await repo.deleteEntry(created.id), false);
        assert.equal(await repo.getEntryById(created.id), undefined);
      });
    }
    assert.equal(calculateCategoryTotals(await repo.getEntries(sharedContext.taxpayerTin, sharedContext.assessmentYear)).grandTotalCredits, 0);
  });

  it('rejects a manual write for the iBAS++ system-only route and never writes into the reconciliation modal', async () => {
    const repo = new LocalStorageLedgerRepository();
    const record = {
      ...sharedContext,
      category: 'SOURCE_TAX' as const,
      routeId: 'salary-ibas' as const,
      workflow: 'MANUAL_ENTRY' as const,
      referenceNo: 'FORBIDDEN-MANUAL-SALARY',
      sourceEntity: 'Wrong workflow',
      sectionCode: 'Sec 86',
    };
    await assert.rejects(repo.addEntry(record), /Manual entries are not permitted/i);
    await assert.rejects(repo.addEntry({ ...record, routeId: 'tax-payment-status', category: 'RECONCILIATION' }), /valid ledger entry route/i);
  });

  it('recognizes an income item already stored with different reference case or whitespace', async () => {
    assert.equal(sameLedgerReference('  Bank-REF-01 ', 'bank-ref-01'), true);
    const item = INITIAL_INCOME_SYNC_ITEMS.find((entry) => entry.id === 'sync-item-bank-02');
    assert.ok(item);
    await ledgerRepository.resetToDefaults();
    try {
      await ledgerRepository.addEntry({
        ...sharedContext,
        category: item.category,
        routeId: item.routeId,
        workflow: 'MANUAL_ENTRY',
        referenceNo: ` ${item.accountOrCertificateNo.toUpperCase()} `,
        sourceEntity: item.payerName,
        sectionCode: 'Sec 102',
      });
      const visible = await incomeSyncService.getSyncItemsForRoute(item.taxpayerTin, item.assessmentYear, item.routeId);
      assert.equal(visible.find((entry) => entry.id === item.id)?.isSyncedToLedger, true);
      const result = await incomeSyncService.syncItemToLedger(item.id, 'Sec 102', item.taxpayerTin, item.assessmentYear);
      assert.equal(result.success, false);
      assert.match(result.error || '', /already synchronized/i);
    } finally {
      await ledgerRepository.resetToDefaults();
    }
  });
});

describe('eLedger — Phase 5 Persistence and Reconciliation Integrity', () => {
  const entry = {
    taxpayerTin: '123456789012',
    assessmentYear: '2026-2027' as const,
    category: 'PAYMENT' as const,
    routeId: 'sec-173' as const,
    referenceNo: 'PHASE5-TREASURY-01',
    sourceEntity: 'Treasury',
    sectionCode: 'Sec 173',
    grossAmount: 750,
    taxDeducted: 750,
    date: '2026-10-18',
    status: 'PENDING_VERIFICATION' as const,
    workflow: 'MANUAL_ENTRY' as const,
    isManual: true,
    externalVerified: false,
  };

  const storageFixture = () => {
    const saved = new Map<string, string>();
    const storage = {
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => { saved.set(key, value); },
    };
    return { saved, storage, repo: new LocalStorageLedgerRepository(storage) };
  };

  it('serializes simultaneous saves and does not drop records or accept duplicate requests', async () => {
    const { repo } = storageFixture();
    await repo.resetToDefaults();
    const [first, second] = await Promise.allSettled([repo.addEntry(entry), repo.addEntry(entry)]);
    assert.equal(first.status, 'fulfilled');
    assert.equal(second.status, 'rejected');
    const saved = await repo.getEntries(entry.taxpayerTin, entry.assessmentYear);
    assert.equal(saved.filter((row) => row.referenceNo === entry.referenceNo).length, 1);

    const [a, b] = await Promise.all([
      repo.addEntry({ ...entry, referenceNo: 'PHASE5-INDEPENDENT-A' }),
      repo.addEntry({ ...entry, referenceNo: 'PHASE5-INDEPENDENT-B' }),
    ]);
    assert.ok((await repo.getEntryById(a.id))?.id);
    assert.ok((await repo.getEntryById(b.id))?.id);
    assert.equal(await repo.deleteEntry(a.id), true);
  });

  it('does not allow one treasury challan to be entered against two payment sections', async () => {
    const { repo } = storageFixture();
    await repo.resetToDefaults();
    await repo.addEntry(entry);
    await assert.rejects(repo.addEntry({
      ...entry,
      routeId: 'sec-171',
      sectionCode: 'Sec 171',
      referenceNo: ` ${entry.referenceNo.toLowerCase()} `,
    }), /Duplicate/i);
    const separate = await repo.addEntry({ ...entry, routeId: 'car-ait', category: 'AIT', referenceNo: entry.referenceNo });
    assert.equal(separate.category, 'AIT', 'Distinct categories are not assumed to share a treasury reference namespace');
  });

  it('leaves invalid amounts, dates, duplicate IDs and categories untouched in browser storage', async (t) => {
    for (const corruption of [
      (rows: LedgerEntry[]) => { rows[0].taxDeducted = -100; },
      (rows: LedgerEntry[]) => { rows[0].grossAmount = Number.NaN; },
      (rows: LedgerEntry[]) => { rows[0].date = '2026-02-30'; },
      (rows: LedgerEntry[]) => { rows[0].category = 'PAYMENT'; },
      (rows: LedgerEntry[]) => { rows[1].id = rows[0].id; },
      (rows: LedgerEntry[]) => { rows[0].routeId = 'tax-payment-status'; },
    ]) {
      await t.test(corruption.toString().slice(0, 55), async () => {
        const { saved, storage, repo } = storageFixture();
        await repo.resetToDefaults();
        const rows = JSON.parse(saved.get(LEDGER_STORAGE_KEY)!) as LedgerEntry[];
        corruption(rows);
        const bytes = JSON.stringify(rows);
        saved.set(LEDGER_STORAGE_KEY, bytes);
        await assert.rejects(new LocalStorageLedgerRepository(storage).getAllEntries(), /could not be read/i);
        assert.equal(saved.get(LEDGER_STORAGE_KEY), bytes);
      });
    }
  });

  it('rejects lookup responses without their exact assessment-year and route context', async () => {
    const query: ExternalLookupQuery = {
      routeId: 'sec-173', referenceNo: 'ACHALLAN-2026-788102',
      expectedTin: '123456789012', assessmentYear: '2026-2027',
    };
    const record = await new ExternalLookupService().lookup(query);
    assert.equal(validateExternalLookupMatch(query, record).canSave, true);
    assert.equal(validateExternalLookupMatch(query, { ...record, routeId: undefined }).canSave, false);
    assert.equal(validateExternalLookupMatch(query, { ...record, assessmentYear: undefined }).canSave, false);
  });
});
