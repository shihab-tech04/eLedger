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
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { ROUTE_REGISTRY, CURRENT_ROUTE_REGISTRY, getActiveRouteForGroup, getRouteById, getRoutesByGroup, getCurrentRoutesByGroup, getVisibleRoutesByGroup } from '../domain/routeRegistry.ts';
import {
  calculateCategoryTotals,
  filterEntriesByRoute,
  groupEntriesByRoute,
  formatCurrencyBDT,
  formatLedgerAmount,
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
import { ExternalLookupService, getLocalReferenceExamples } from '../services/externalLookupService.ts';
import { incomeSyncService } from '../services/incomeSyncService.ts';
import { IncomeSyncService } from '../services/incomeSyncService.ts';
import { getPriorAssessmentYears, readCarryForwardDetails } from '../domain/carryForward.ts';
import { InlineEditableTable, MobileRowEditor, getTableFieldLabels } from '../components/tables/InlineEditableTable.tsx';
import { ClaimEvidenceFields, ClaimEvidenceSummary } from '../components/tables/ClaimEvidenceFields.tsx';
import { getClaimEvidenceFields, normalizeClaimEvidence } from '../domain/claimEvidence.ts';
import { localDateInputValue } from '../domain/localDate.ts';
import { parseSection120Csv, SECTION120_CSV_HEADERS } from '../domain/csvImport.ts';
import { SurchargeTransferPanel } from '../components/workflows/SurchargeTransferPanel.tsx';
import { createLocalLedgerBackup } from '../services/ledgerBackup.ts';
import { SYNC_STORAGE_KEY } from '../services/incomeSyncService.ts';
import { LedgerProvider } from '../context/LedgerContext.tsx';
import { LanguageProvider } from '../context/LanguageContext.tsx';
import { Header } from '../components/layout/Header.tsx';
import { DashboardView } from '../features/dashboard/DashboardView.tsx';
import { LedgerGuideView } from '../features/ledger-guide/LedgerGuideView.tsx';
import { Sidebar } from '../components/navigation/Sidebar.tsx';
import { SalaryOthersTable } from '../features/source-tax/SalaryOthersTable.tsx';
import { SourceTaxView } from '../features/source-tax/SourceTaxView.tsx';
import { AitView } from '../features/ait/AitView.tsx';
import { PaymentsView } from '../features/payments/PaymentsView.tsx';
import { AdjustmentsView } from '../features/adjustments/AdjustmentsView.tsx';
import { TaxPaymentStatusModal } from '../components/modals/TaxPaymentStatusModal.tsx';
import { LedgerInput, LedgerSelect, LedgerTip } from '../components/ui/LedgerForm.tsx';
import { RouteMobileTabs } from '../components/navigation/RouteMobileTabs.tsx';

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

describe('eLedger — Shared UI and responsive workflow guardrails', () => {
  it('renders accessible shared inputs, selects and optional help disclosures', () => {
    const field = renderToStaticMarkup(React.createElement(LedgerInput, {
      label: 'Challan Date', type: 'date', value: '', onValueChange: () => {}, required: true,
    }));
    const select = renderToStaticMarkup(React.createElement(LedgerSelect, {
      label: 'Document type', value: 'CHALLAN', onValueChange: () => {}, children: React.createElement('option', { value: 'CHALLAN' }, 'Challan'),
    }));
    const help = renderToStaticMarkup(React.createElement(LedgerTip, { label: 'Details', children: 'Local only' }));
    assert.match(field, /eledger-control/);
    assert.match(field, /aria-label="Challan Date"/);
    assert.match(field, /required/);
    assert.match(select, /eledger-control/);
    assert.match(select, /Document type/);
    assert.match(help, /<details/);
    assert.match(help, /<summary/);
  });

  it('uses the same route tab component with correct active page semantics', () => {
    const routes = getVisibleRoutesByGroup('AIT', []);
    const markup = renderToStaticMarkup(React.createElement(RouteMobileTabs, {
      routes, activeId: 'sec-154', label: 'AIT categories', onSelect: () => {},
    }));
    assert.match(markup, /eledger-source-mobile-routes/);
    assert.match(markup, /aria-label="AIT categories"/);
    assert.match(markup, /aria-current="page"[^>]*>AIT under Section 154/);
  });

  it('gives surcharge payments route-specific labels instead of a tax-deduction label', () => {
    const labels = getTableFieldLabels('PAYMENT', (english) => english, 'environmental-surcharge');
    assert.equal(labels.grossAmount, 'Assessed Surcharge (৳)');
    assert.equal(labels.taxDeducted, 'Recorded Surcharge (৳)');
  });
});

describe('eLedger — Final Workflow UX Audit', () => {
  const translate = (english: string) => english;

  it('keeps assessment-year selection accessible when its visible label is hidden on narrow screens', () => {
    const html = renderToStaticMarkup(React.createElement(LedgerProvider, null,
      React.createElement(Header)));
    assert.match(html, /aria-label="Assessment Year"/);
    assert.match(html, /id="ay-select"/);
  });

  it('does not instruct users to save a claim on the read-only iBAS++ screen', () => {
    const html = renderToStaticMarkup(React.createElement(LedgerProvider, null,
      React.createElement(LedgerGuideView)));
    assert.match(html, /Salary \(iBAS\+\+\) shows read-only local payroll records/);
    assert.match(html, /Use Add Entry to record challan or certificate details/);
  });

  it('uses truthful workflow-specific headers and edit labels in every credit group', () => {
    const source = getTableFieldLabels('SOURCE_TAX', translate);
    const ait = getTableFieldLabels('AIT', translate);
    const payment = getTableFieldLabels('PAYMENT', translate);
    const adjustment = getTableFieldLabels('ADJUSTMENT', translate);
    assert.equal(source.taxDeducted, 'Tax Deducted (৳)');
    assert.equal(ait.taxDeducted, 'AIT Claimed (৳)');
    assert.equal(payment.taxDeducted, 'Tax Paid (৳)');
    assert.equal(payment.sourceEntity, 'Receiving Authority / Bank');
    assert.equal(adjustment.taxDeducted, 'Adjusted Amount (৳)');
    assert.equal(adjustment.sourceEntity, 'Issuing Authority / Circle');

    for (const [category, expected] of [
      ['SOURCE_TAX', 'Tax Deducted (৳)'], ['AIT', 'AIT Claimed (৳)'],
      ['PAYMENT', 'Tax Paid (৳)'], ['ADJUSTMENT', 'Adjusted Amount (৳)'],
    ] as const) {
      const html = renderToStaticMarkup(React.createElement(InlineEditableTable, {
        entries: [], category, routeId: category === 'PAYMENT' ? 'sec-173'
          : category === 'ADJUSTMENT' ? 'refund' : category === 'AIT' ? 'car-ait' : 'other-tds',
        defaultSection: 'Sec 173', onSaveNewEntry: async () => ({ success: true }),
        onUpdateEntry: async () => ({ success: true }), onDeleteEntry: async () => true,
      }));
      assert.ok(html.includes(expected));
      assert.match(html, /Swipe the table sideways/);
    }
  });
});

describe('eLedger — Phase 9 Mobile and Data-Safety Regression', () => {
  const serviceClaim: Omit<LedgerEntry, 'id' | 'createdAt' | 'updatedAt'> = {
    taxpayerTin: '123456789012', assessmentYear: '2026-2027',
    category: 'SOURCE_TAX', routeId: 'service-payment',
    referenceNo: 'P9-SAFE-REF', sourceEntity: 'Source Ltd',
    sectionCode: 'Sec 89', grossAmount: 1000, taxDeducted: 100,
    date: '2026-07-20', status: 'PENDING_VERIFICATION',
    workflow: 'MANUAL_ENTRY', isManual: true, externalVerified: false,
  };

  it('rejects nested objects, arrays, nulls, and incorrect evidence value types', () => {
    const invalid = [
      { depositingAuthority: { unexpected: 'object' } },
      { paymentPurpose: ['array'] },
      { documentAmount: '500' },
      { documentAmount: null },
      { paymentDocumentType: 42 },
      { depositingAuthority: null },
      [],
      null,
    ];
    for (const evidence of invalid) {
      const result = validateLedgerEntry({ ...serviceClaim, claimEvidence: evidence as LedgerEntry['claimEvidence'] }, []);
      assert.equal(result.isValid, false, `Malformed evidence accepted: ${JSON.stringify(evidence)}`);
    }
  });

  it('refuses to load malformed persisted evidence without overwriting the user’s original record', async () => {
    const record = {
      ...serviceClaim, id: 'p9-user-record', createdAt: '2026-07-20T00:00:00Z', updatedAt: '2026-07-20T00:00:00Z',
      claimEvidence: { depositingAuthority: { nested: 'corrupt' } },
    };
    const original = JSON.stringify([...INITIAL_LEDGER_ENTRIES, record]);
    const store = new Map([[LEDGER_STORAGE_KEY, original]]);
    const repo = new LocalStorageLedgerRepository({
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => { store.set(key, value); },
    });
    await assert.rejects(repo.getAllEntries(), /left unchanged/);
    assert.equal(store.get(LEDGER_STORAGE_KEY), original);
  });

  it('allows valid optional evidence, preserving historic records without claim metadata', async () => {
    const store = new Map<string, string>();
    const repo = new LocalStorageLedgerRepository({
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => { store.set(key, value); },
    });
    const legacy = await repo.addEntry({ ...serviceClaim });
    const newer = await repo.addEntry({
      ...serviceClaim, referenceNo: 'P9-SAFE-REF-2',
      claimEvidence: { paymentDocumentType: 'CHALLAN', documentAmount: 250, depositingAuthority: 'Bank' },
    });
    assert.equal((await repo.getEntryById(legacy.id))?.claimEvidence, undefined);
    assert.equal((await repo.getEntryById(newer.id))?.claimEvidence?.documentAmount, 250);
  });

  it('keeps mobile add/edit controls and optional evidence within labeled inline table rows', () => {
    const table = renderToStaticMarkup(React.createElement(InlineEditableTable, {
      entries: [], category: 'SOURCE_TAX', routeId: 'service-payment', defaultSection: 'Sec 89',
      onSaveNewEntry: async () => ({ success: true }), onUpdateEntry: async () => ({ success: true }),
      onDeleteEntry: async () => true,
    }));
    const mobile = renderToStaticMarkup(React.createElement('table', null,
      React.createElement('tbody', null,
        React.createElement(MobileRowEditor, {
          values: { referenceNo: '', sourceEntity: '', sectionCode: 'Sec 89', grossAmount: '', taxDeducted: '', date: '2026-10-19' },
          onFieldChange: () => {}, onSave: () => {}, onCancel: () => {},
          evidence: {}, onEvidenceChange: () => {}, routeId: 'service-payment', isEdit: false,
        })
      )
    ));
    assert.match(table, /Recorded Ledger Entries/);
    assert.match(table, /Add Entry/);
    assert.match(table, /overflow-x-auto/);
    assert.match(mobile, /sticky left-0/);
    assert.match(mobile, /New Reference \/ Challan No/);
    assert.match(mobile, /Depositing Authority/);
    assert.match(mobile, /Save Entry/);
    assert.match(mobile, /Cancel/);
    assert.match(mobile, /w-\[calc\(100vw-3\.5rem\)\]/);
  });

  it('formats a local browser calendar day without a UTC conversion', () => {
    const date = new Date(2026, 9, 19, 0, 5);
    assert.equal(localDateInputValue(date), '2026-10-19');
  });
});

describe('eLedger — Phase 10 Local Import and Surcharge Handoff', () => {
  const context = { taxpayerTin: '123456789012', assessmentYear: '2026-2027' as const, routeId: 'system-import' as const };
  const headings = SECTION120_CSV_HEADERS.join(',');
  const csv = `${headings}\nBOE-001,"Customs, Chattogram",Sec 120,120000,12000,2026-04-15\nBOE-002,Customs House,Sec 120,50000,5000,2026-05-01`;
  const repository = () => {
    const store = new Map<string, string>();
    const repo = new LocalStorageLedgerRepository({
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => { store.set(key, value); },
    });
    return { repo, store };
  };

  it('parses UTF-8 CSV including quoted commas, escaped quotes and CRLF without trusting imported context fields', () => {
    const result = parseSection120Csv(`\uFEFF${headings}\r\nBOE-001,"Port ""East"", Customs",Sec 120,120000.25,12000.50,2026-04-15\r\n`, context);
    assert.equal(result.length, 1);
    assert.equal(result[0].sourceEntity, 'Port "East", Customs');
    assert.equal(result[0].taxDeducted, 12000.5);
    assert.equal(result[0].taxpayerTin, context.taxpayerTin);
    assert.equal(result[0].assessmentYear, context.assessmentYear);
    assert.equal(result[0].status, 'PENDING_VERIFICATION');
    assert.equal(result[0].externalVerified, false);
  });

  it('rejects unexpected columns, incomplete quotes, malformed amounts and oversized batches', () => {
    const invalid = [
      'wrong,head\nA,B',
      headings,
      `${headings}\n"unclosed,x,y,100,10,2026-04-15`,
      `${headings}\nBOE-1,X,Sec 120,10e8,100,2026-04-15`,
      `${headings}\nBOE-1,X,Sec 120,100,10.123,2026-04-15`,
      `${headings}\nBOE-1,X,Sec 120,100,10,2026-04-15,unapproved`,
      `${headings}\n${Array(101).fill('A,B,C,100,10,2026-04-15').join('\n')}`,
    ];
    for (const value of invalid) assert.throws(() => parseSection120Csv(value, context), /CSV|rows|amount/i);
  });

  it('imports an entire valid local batch while leaving all imported claims unverified', async () => {
    const { repo } = repository();
    const before = (await repo.getAllEntries()).length;
    const imported = await repo.addEntriesBatch(parseSection120Csv(csv, context));
    assert.equal(imported.length, 2);
    assert.equal((await repo.getAllEntries()).length, before + 2);
    assert.deepEqual(imported.map((item) => item.status), ['PENDING_VERIFICATION', 'PENDING_VERIFICATION']);
    assert.ok(imported.every((item) => !item.externalVerified));
    assert.equal((await repo.getEntries('987654321098', '2026-2027')).some((row) => row.id === imported[0].id), false);
  });

  it('rejects duplicate references inside a batch, leaving original storage completely unchanged', async () => {
    const { repo, store } = repository();
    await repo.getAllEntries();
    const original = store.get(LEDGER_STORAGE_KEY);
    const repeated = parseSection120Csv(`${headings}\nBOE-DUP,X,Sec 120,100,10,2026-04-15\nBOE-DUP,Y,Sec 120,200,20,2026-04-16`, context);
    await assert.rejects(repo.addEntriesBatch(repeated), /CSV row 3.*Duplicate/);
    assert.equal(store.get(LEDGER_STORAGE_KEY), original);
  });

  it('prevents Section 120 dual claims across Source Tax and AIT, even through a batch', async () => {
    const { repo, store } = repository();
    await repo.addEntriesBatch(parseSection120Csv(csv, context));
    const snapshot = store.get(LEDGER_STORAGE_KEY);
    await assert.rejects(repo.addEntriesBatch(parseSection120Csv(csv, { ...context, routeId: 'ait-import' })), /Duplicate/);
    assert.equal(store.get(LEDGER_STORAGE_KEY), snapshot);
  });

  it('rejects an invalid calendar date or amount in row two without partially saving row one', async () => {
    const { repo, store } = repository();
    await repo.getAllEntries();
    const original = store.get(LEDGER_STORAGE_KEY);
    const invalidDate = parseSection120Csv(`${headings}\nBOE-ONE,X,Sec 120,100,10,2026-04-15\nBOE-TWO,Y,Sec 120,100,10,2026-02-30`, context);
    await assert.rejects(repo.addEntriesBatch(invalidDate), /CSV row 3.*calendar date/);
    const invalidAmount = parseSection120Csv(`${headings}\nBOE-ONE,X,Sec 120,100,10,2026-04-15\nBOE-TWO,Y,Sec 120,100,150,2026-04-15`, context);
    await assert.rejects(repo.addEntriesBatch(invalidAmount), /CSV row 3.*exceed/);
    assert.equal(store.get(LEDGER_STORAGE_KEY), original);
  });

  it('does not mutate storage or issue fake credit on a batch storage-quota failure', async () => {
    const state = { saved: '' };
    const repo = new LocalStorageLedgerRepository({
      getItem: () => state.saved || null,
      setItem: (_key, value) => {
        if (state.saved) throw new Error('quota exceeded');
        state.saved = value;
      },
    });
    await repo.getAllEntries();
    const original = state.saved;
    await assert.rejects(repo.addEntriesBatch(parseSection120Csv(csv, context)), /could not be saved/);
    assert.equal(state.saved, original);
    assert.equal((await repo.getAllEntries()).length, INITIAL_LEDGER_ENTRIES.length);
  });

  it('keeps an explicit local surcharge separate from regular tax and out of verified credits', async () => {
    const { repo } = repository();
    const item = await repo.addEntry({
      taxpayerTin: context.taxpayerTin, assessmentYear: context.assessmentYear,
      category: 'PAYMENT', routeId: 'environmental-surcharge',
      referenceNo: 'SURCHARGE-LOCAL-1', sourceEntity: 'Tax & Payment — taxpayer-entered local stage',
      sectionCode: 'Applicable surcharge provision', grossAmount: 850, taxDeducted: 850,
      date: '2026-07-20', status: 'PENDING_VERIFICATION', workflow: 'MANUAL_ENTRY',
      isManual: true, externalVerified: false,
    });
    assert.equal(item.status, 'PENDING_VERIFICATION');
    const totals = calculateCategoryTotals(await repo.getEntries(context.taxpayerTin, context.assessmentYear));
    assert.equal(totals.environmentalSurchargeTotal, 850);
    assert.equal(totals.grandTotalCredits, 0);
    await assert.rejects(repo.addEntry({
      ...item, referenceNo: item.referenceNo,
    }), /Duplicate/);
  });

  it('labels the surcharge handoff as a local pending simulation', () => {
    const markup = renderToStaticMarkup(React.createElement(SurchargeTransferPanel, {
      onRecord: async () => ({ success: true }),
    }));
    assert.match(markup, /Tax &amp; Payment/);
    assert.match(markup, /No tax rate is calculated/);
    assert.match(markup, /Record Local Surcharge Transfer/);
  });
});

describe('eLedger — Phase 11 Recovery Acceptance and Raw Backup', () => {
  it('offers data backup instead of a destructive reset and gives dashboard native button semantics', () => {
    const html = renderToStaticMarkup(React.createElement(LanguageProvider, null,
      React.createElement(LedgerProvider, null,
        React.createElement(Header), React.createElement(DashboardView))));
    assert.match(html, /eledger-taxpayer-button/);
    assert.match(html, /Open profile menu/);
    assert.doesNotMatch(html, /Reset defaults/);
    assert.match(html, /<button[^>]+class="eledger-summary-card source"/);
  });
  it('exports both original storage values, even if one is malformed, without rewriting data', () => {
    const recorded = new Map<string, string>([
      [LEDGER_STORAGE_KEY, '{not-valid-json'],
      [SYNC_STORAGE_KEY, '[{"preserve":"unaltered"}]'],
    ]);
    let writes = 0;
    const storage = {
      getItem: (key: string) => recorded.get(key) ?? null,
      setItem: () => { writes++; },
    };
    const payload = createLocalLedgerBackup(storage, '2026-10-19T00:00:00.000Z');
    assert.equal(payload.format, 'eledger-local-backup-v1');
    assert.equal(payload.storage[LEDGER_STORAGE_KEY], '{not-valid-json');
    assert.equal(payload.storage[SYNC_STORAGE_KEY], '[{"preserve":"unaltered"}]');
    assert.equal(payload.createdAt, '2026-10-19T00:00:00.000Z');
    assert.equal(writes, 0);
    assert.deepEqual(JSON.parse(JSON.stringify(payload)), payload);
  });

  it('does not silently substitute demo records into a raw backup when storage values are missing', () => {
    const payload = createLocalLedgerBackup({ getItem: () => null }, '2026-10-19T00:00:00Z');
    assert.equal(payload.storage[LEDGER_STORAGE_KEY], null);
    assert.equal(payload.storage[SYNC_STORAGE_KEY], null);
  });

  it('preserves the complete transaction story: batch import, correction, adjustment, two-context isolation, reconciliation, delete', async () => {
    const recorded = new Map<string, string>();
    const repo = new LocalStorageLedgerRepository({
      getItem: (key) => recorded.get(key) ?? null,
      setItem: (key, value) => { recorded.set(key, value); },
    });
    const current = { taxpayerTin: '987654321098', assessmentYear: '2025-2026' as const };
    const context = { ...current, routeId: 'ait-import' as const };
    const imported = await repo.addEntriesBatch(parseSection120Csv(
      `${SECTION120_CSV_HEADERS.join(',')}\nBOE-P11-01,Customs,Sec 120,40000,4000,2025-05-10`, context
    ));
    assert.equal(imported.length, 1);
    const corrected = await repo.updateEntry(imported[0].id, { taxDeducted: 3750 });
    assert.equal(corrected.taxDeducted, 3750);
    const surcharge = await repo.addEntry({
      ...current, category: 'PAYMENT', routeId: 'environmental-surcharge',
      referenceNo: 'SUR-P11-01', sourceEntity: 'Local Tax & Payment', sectionCode: 'Surcharge',
      grossAmount: 500, taxDeducted: 500, date: '2025-05-10',
      status: 'PENDING_VERIFICATION', workflow: 'MANUAL_ENTRY', isManual: true, externalVerified: false,
    });
    const scoped = await repo.getEntries(current.taxpayerTin, current.assessmentYear);
    const totals = calculateCategoryTotals(scoped);
    assert.equal(totals.aitTotal, 3750);
    assert.equal(totals.environmentalSurchargeTotal, 500);
    assert.equal(totals.grandTotalCredits, 0);
    assert.equal(scoped.some((row) => row.id === surcharge.id), true);
    assert.equal((await repo.getEntries(current.taxpayerTin, '2026-2027')).some((row) => row.id === surcharge.id), false);
    assert.equal((await repo.getEntries('123456789012', current.assessmentYear)).some((row) => row.id === imported[0].id), false);
    const backup = createLocalLedgerBackup({ getItem: (key) => recorded.get(key) ?? null });
    assert.match(backup.storage[LEDGER_STORAGE_KEY] || '', /BOE-P11-01/);
    assert.equal(await repo.deleteEntry(surcharge.id), true);
    assert.equal((await repo.getEntries(current.taxpayerTin, current.assessmentYear)).length, 1);
    assert.equal((await repo.getEntryById(corrected.id))?.taxDeducted, 3750);
  });

  it('maintains the same 18 visible route IDs with no hidden existing route data loss', () => {
    assert.equal(CURRENT_ROUTE_REGISTRY.length, 18);
    assert.equal(new Set(CURRENT_ROUTE_REGISTRY.map((route) => route.id)).size, 18);
    for (const route of CURRENT_ROUTE_REGISTRY) {
      const visible = getVisibleRoutesByGroup(route.group, []);
      assert.ok(visible.some((item) => item.id === route.id), `Missing ${route.id}`);
    }
    assert.ok(getVisibleRoutesByGroup('Source Tax', ['contractor-supplier']).some((route) => route.id === 'contractor-supplier'));
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

describe('eLedger — Phase 6 Final UI and System-Only Acceptance', () => {
  it('offers only the selected route’s fixture references in AIT and Payment lookup panels', async () => {
    const routes = ['commercial-vehicle', 'car-ait', 'sec-154', 'sec-173', 'sec-171'] as const;
    const service = new ExternalLookupService();
    for (const routeId of routes) {
      const examples = getLocalReferenceExamples(routeId);
      assert.ok(examples.length > 0, `${routeId} is missing a local sample reference`);
      for (const sample of examples) {
        const found = await service.lookup({
          routeId,
          referenceNo: sample.referenceNo,
          expectedTin: '123456789012',
          assessmentYear: '2026-2027',
        });
        assert.equal(found.routeId, routeId);
        assert.ok(['VALID', 'MISMATCH'].includes(found.status));
      }
    }
    assert.deepEqual(getLocalReferenceExamples('sec-173').map((item) => item.referenceNo), ['ACHALLAN-2026-788102']);
    assert.deepEqual(getLocalReferenceExamples('sec-171').map((item) => item.referenceNo), ['ACHALLAN-Q1-2026-5541']);
    assert.deepEqual(getLocalReferenceExamples('salary-ibas'), []);
  });
  it('keeps iBAS++ system entries read-only in the reusable ledger table', () => {
    const props = {
      entries: INITIAL_LEDGER_ENTRIES.filter((entry) => entry.routeId === 'salary-ibas'),
      category: 'SOURCE_TAX' as const,
      routeId: 'salary-ibas' as const,
      defaultSection: 'Sec 86',
      onSaveNewEntry: async () => ({ success: true }),
      onUpdateEntry: async () => ({ success: true }),
      onDeleteEntry: async () => true,
    };
    const locked = renderToStaticMarkup(React.createElement(InlineEditableTable, {
      ...props, allowAdd: false, allowEditDelete: false,
    }));
    assert.doesNotMatch(locked, /title="Edit row inline"/);
    assert.doesNotMatch(locked, /title="Delete row"/);
    assert.doesNotMatch(locked, />Add Entry</);
    assert.match(locked, /IBAS\/GOV\/2026\/08821/);

    const manual = renderToStaticMarkup(React.createElement(InlineEditableTable, {
      ...props, entries: INITIAL_LEDGER_ENTRIES.filter((entry) => entry.routeId === 'service-payment'),
      routeId: 'service-payment', allowAdd: true, allowEditDelete: true,
    }));
    assert.match(manual, /title="Edit row inline"/);
    assert.match(manual, /title="Delete row"/);
    assert.match(manual, />Add Entry</);
  });

  it('blocks local modification and deletion of imported salary system records', async () => {
    const repo = new LocalStorageLedgerRepository();
    const original = await repo.getEntryById('entry-ibas-01');
    assert.ok(original);
    await assert.rejects(repo.updateEntry(original.id, { taxDeducted: 1 }), /System-only iBAS/i);
    await assert.rejects(repo.deleteEntry(original.id), /System-only iBAS/i);
    assert.deepEqual(await repo.getEntryById(original.id), original);
  });

  it('preserves all 18 route identities and prevents a fabricated local verified total', () => {
    assert.equal(new Set(ROUTE_REGISTRY.map((route) => route.id)).size, 18);
    for (const group of ['Source Tax', 'AIT', 'Payment', 'Adjustment', 'Tax Payment Status'] as const) {
      assert.ok(getRoutesByGroup(group).length > 0);
    }
    assert.equal(calculateCategoryTotals(INITIAL_LEDGER_ENTRIES).grandTotalCredits, 0);
  });
});

describe('eLedger — October 8 Screenshot Crosswalk and Credit Guard', () => {
  it('maps exactly the 18 screenshot-evidenced functional routes without removing historical entries', () => {
    assert.equal(CURRENT_ROUTE_REGISTRY.length, 18);
    assert.equal(new Set(CURRENT_ROUTE_REGISTRY.map((route) => route.id)).size, 18);
    assert.equal(getCurrentRoutesByGroup('Source Tax').length, 10);
    assert.equal(getCurrentRoutesByGroup('AIT').length, 3);
    assert.equal(getCurrentRoutesByGroup('Payment').length, 2);
    assert.equal(getCurrentRoutesByGroup('Adjustment').length, 2);
    assert.equal(getCurrentRoutesByGroup('Tax Payment Status').length, 1);
    for (const route of ['source-ltu', 'commercial-source', 'ait-import', 'environmental-surcharge']) {
      assert.ok(CURRENT_ROUTE_REGISTRY.some((item) => item.id === route), `${route} missing`);
    }
    assert.equal(getRouteById('commercial-source')?.statutorySection, 'Sec 138 (ITA 2023)');
    assert.equal(getRouteById('carry-forward')?.statutorySection, 'Sec 163 (ITA 2023)');
    assert.ok(getVisibleRoutesByGroup('AIT', []).every((route) => route.id !== 'commercial-vehicle'));
    assert.ok(getVisibleRoutesByGroup('AIT', ['commercial-vehicle']).some((route) => route.id === 'commercial-vehicle'));
    assert.ok(getVisibleRoutesByGroup('Source Tax', []).every((route) => !['contractor-supplier','house-property'].includes(route.id)));
    assert.ok(getVisibleRoutesByGroup('Payment', ['sec-171']).some((route) => route.id === 'sec-171'));
  });

  it('prevents the same Section 120 customs reference being claimed under both Source Tax and AIT', async () => {
    const store = new Map<string, string>();
    const repository = new LocalStorageLedgerRepository({
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => { store.set(key, value); },
    });
    await repository.resetToDefaults();
    const base = {
      taxpayerTin: '123456789012', assessmentYear: '2026-2027' as const,
      referenceNo: 'CUS-2026-BOE-1', sourceEntity: 'Customs',
      sectionCode: 'Sec 120', grossAmount: 100000, taxDeducted: 10000,
      date: '2026-10-08', status: 'PENDING_VERIFICATION' as const,
      workflow: 'MANUAL_ENTRY' as const, isManual: true, externalVerified: false,
    };
    await repository.addEntry({ ...base, category: 'SOURCE_TAX', routeId: 'system-import' });
    await assert.rejects(repository.addEntry({ ...base, category: 'AIT', routeId: 'ait-import' }), /Duplicate entry/);
    assert.equal((await repository.getEntries(base.taxpayerTin, base.assessmentYear)).filter((entry) => entry.referenceNo === base.referenceNo).length, 1);
  });

  it('provides current commercial source-tax lookup context without granting authoritative credit', async () => {
    const query: ExternalLookupQuery = {
      routeId: 'commercial-source', referenceNo: 'DHAKA-METRO-JA-11-2044',
      expectedTin: '123456789012', assessmentYear: '2026-2027',
    };
    const result = await new ExternalLookupService().lookup(query);
    assert.equal(result.routeId, 'commercial-source');
    assert.equal(result.authoritative, false);
    assert.equal(validateExternalLookupMatch(query, result).canSave, true);
    assert.ok(getLocalReferenceExamples('commercial-source').some((item) => item.referenceNo === query.referenceNo));
  });

  it('keeps the six screenshot tax-payment-status amounts as distinct buckets', () => {
    const base = INITIAL_LEDGER_ENTRIES.find((entry) => entry.routeId === 'salary-others')!;
    const entries = [
      { ...base, id: 'receipt', routeId: 'sec-173' as const, category: 'PAYMENT' as const, taxDeducted: 100 },
      { ...base, id: 'surcharge', routeId: 'environmental-surcharge' as const, category: 'PAYMENT' as const, taxDeducted: 25 },
      { ...base, id: 'refund', routeId: 'refund' as const, category: 'ADJUSTMENT' as const, taxDeducted: 30 },
      { ...base, id: 'carry', routeId: 'carry-forward' as const, category: 'ADJUSTMENT' as const, taxDeducted: 40 },
    ];
    const amounts = calculateCategoryTotals(entries);
    assert.equal(amounts.taxPaidWithReturnTotal, 100);
    assert.equal(amounts.environmentalSurchargeTotal, 25);
    assert.equal(amounts.refundAdjustmentTotal, 30);
    assert.equal(amounts.carryForward163Total, 40);
    assert.equal(amounts.grandTotalCredits, 0);
  });

  it('limits joint Sanchayapatra sync to the taxpayer share and preserves instrument TDS', async () => {
    await ledgerRepository.resetToDefaults();
    const item = INITIAL_INCOME_SYNC_ITEMS.find((entry) => entry.id === 'sync-item-sanchaya-02')!;
    const args = [item.id, 'Sec 105', item.taxpayerTin, item.assessmentYear] as const;
    assert.equal((await incomeSyncService.syncItemToLedger(...args, -1)).success, false);
    assert.equal((await incomeSyncService.syncItemToLedger(...args, item.calculatedTaxCredit + 1)).success, false);
    const claimed = item.calculatedTaxCredit / 2;
    const synced = await incomeSyncService.syncItemToLedger(...args, claimed);
    assert.equal(synced.success, true);
    assert.equal(synced.entry?.taxDeducted, claimed);
    assert.equal(synced.entry?.status, 'SYNCED');
    assert.equal(synced.entry?.externalVerified, false);
    assert.match(synced.entry?.remarks ?? '', /Instrument TDS/);
    const bank = INITIAL_INCOME_SYNC_ITEMS.find((entry) => entry.id === 'sync-item-bank-02')!;
    assert.equal((await incomeSyncService.syncItemToLedger(bank.id, 'Sec 102', bank.taxpayerTin, bank.assessmentYear, 1)).success, false);
  });
});

describe('eLedger — Phase 8 Historic Claim Evidence Parity', () => {
  const base = {
    taxpayerTin: '123456789012', assessmentYear: '2026-2027' as const,
    category: 'SOURCE_TAX' as const, routeId: 'service-payment' as const,
    referenceNo: 'TDS-SVC-P8', sourceEntity: 'Depositor Ltd',
    sectionCode: 'Sec 89', grossAmount: 10000, taxDeducted: 500,
    date: '2026-07-08', status: 'PENDING_VERIFICATION' as const,
    workflow: 'MANUAL_ENTRY' as const, isManual: true, externalVerified: false,
  };

  it('offers the old screen’s document, payment and savings fields on their correct routes', () => {
    const fields = (route: LedgerEntry['routeId']) => getClaimEvidenceFields(route).map((field) => field.key);
    assert.deepEqual(fields('service-payment').slice(0, 3), ['depositingAuthority', 'paymentDocumentType', 'documentAmount']);
    assert.ok(fields('source-ltu').includes('attachmentFileName'));
    assert.ok(fields('other-tds').includes('paymentPurpose'));
    assert.deepEqual(fields('sec-154').slice(-5), ['paymentMode', 'bankName', 'branchName', 'taxZone', 'taxCircle']);
    assert.deepEqual(fields('sec-173').slice(-5), fields('sec-154').slice(-5));
    assert.ok(fields('ait-import').includes('bankName'));
    assert.deepEqual(fields('sanchayapatra'), ['savingsScheme', 'savingsRegistration', 'savingsIssueDate']);
    assert.deepEqual(fields('salary-ibas'), []);
    assert.deepEqual(fields('salary-others'), [
      'depositingAuthority', 'paymentDocumentType', 'documentAmount', 'bankName', 'branchName',
    ]);
  });

  it('validates original Salary (Others) document amounts independently of verified credit', () => {
    const salary = { ...base, routeId: 'salary-others' as const, claimEvidence: normalizeClaimEvidence({
      depositingAuthority: 'Finance Department',
      paymentDocumentType: 'CERTIFICATE',
      documentAmount: 1000,
      bankName: 'Test Bank',
      branchName: 'Main Branch',
    }) };
    assert.equal(validateLedgerEntry(salary, []).isValid, true);
    assert.match(validateLedgerEntry({
      ...salary, claimEvidence: { ...salary.claimEvidence, documentAmount: 100 },
    }, []).errors.documentAmount, /cover/);
    assert.equal(calculateCategoryTotals([salary as LedgerEntry]).grandTotalCredits, 0);
  });

  it('normalizes optional evidence while preserving historic claims that have no metadata', () => {
    assert.equal(normalizeClaimEvidence({}), undefined);
    assert.equal(normalizeClaimEvidence({ paymentPurpose: '   ' }), undefined);
    assert.deepEqual(normalizeClaimEvidence({ paymentPurpose: ' Consulting ', documentAmount: 1000 }), {
      paymentPurpose: 'Consulting', documentAmount: 1000,
    });
    assert.equal(validateLedgerEntry(base, []).isValid, true);
  });

  it('rejects claims above the document amount, invalid savings dates and misplaced evidence', () => {
    assert.equal(validateLedgerEntry({ ...base, claimEvidence: { paymentDocumentType: 'CHALLAN', documentAmount: 600 } }, []).isValid, true);
    assert.match(validateLedgerEntry({ ...base, claimEvidence: { documentAmount: 400 } }, []).errors.documentAmount, /cover/);
    assert.match(validateLedgerEntry({ ...base, claimEvidence: { documentAmount: Number.NaN } }, []).errors.documentAmount, /positive/);
    assert.match(validateLedgerEntry({ ...base, claimEvidence: { bankName: 'Unrelated Bank' } }, []).errors.claimEvidence, /not applicable/);
    assert.match(validateLedgerEntry({ ...base, claimEvidence: { paymentPurpose: 'x'.repeat(251) } }, []).errors.claimEvidence, /250/);
    const savings = { ...base, routeId: 'sanchayapatra' as const };
    assert.match(validateLedgerEntry({ ...savings, claimEvidence: { savingsIssueDate: '2026-02-30' } }, []).errors.savingsIssueDate, /valid/);
    assert.match(validateLedgerEntry({ ...savings, claimEvidence: { savingsIssueDate: '2026-08-01' } }, []).errors.savingsIssueDate, /later/);
    assert.equal(validateLedgerEntry({ ...savings, claimEvidence: { savingsIssueDate: '2026-05-10' } }, []).isValid, true);
  });

  it('persists and edits structured metadata without altering the credited amount or other taxpayer contexts', async () => {
    const localStore = new Map<string, string>();
    const repo = new LocalStorageLedgerRepository({
      getItem: (key) => localStore.get(key) ?? null,
      setItem: (key, value) => { localStore.set(key, value); },
    });
    await repo.resetToDefaults();
    const saved = await repo.addEntry({ ...base, referenceNo: 'NEW-P8-CLAIM', claimEvidence: {
      depositingAuthority: 'Bank XYZ', paymentDocumentType: 'CERTIFICATE', documentAmount: 650,
    } });
    assert.equal(saved.status, 'PENDING_VERIFICATION');
    assert.equal(saved.externalVerified, false);
    assert.equal(saved.taxDeducted, 500);
    assert.equal((await repo.getEntryById(saved.id))?.claimEvidence?.depositingAuthority, 'Bank XYZ');
    const updated = await repo.updateEntry(saved.id, { claimEvidence: {
      depositingAuthority: 'Treasury', paymentDocumentType: 'CHALLAN', documentAmount: 700,
    } });
    assert.equal(updated.claimEvidence?.paymentDocumentType, 'CHALLAN');
    assert.equal(updated.taxDeducted, 500);
    assert.ok(!(await repo.getEntries('987654321098', '2026-2027')).some((entry) => entry.id === saved.id));
  });

  it('renders route-specific fields and a persisted evidence disclosure in the existing inline-table design', () => {
    const fields = renderToStaticMarkup(React.createElement(ClaimEvidenceFields, {
      routeId: 'service-payment', evidence: { documentAmount: 1000 }, onChange: () => {},
    }));
    assert.match(fields, /Depositing Authority/);
    assert.match(fields, /Payment Document Type/);
    assert.match(fields, /Total Challan/);
    const summary = renderToStaticMarkup(React.createElement(ClaimEvidenceSummary, {
      routeId: 'service-payment', evidence: { documentAmount: 1000, paymentDocumentType: 'CHALLAN' },
    }));
    assert.match(summary, /Claim evidence \(2 fields\)/);
    assert.match(summary, /CHALLAN/);
    assert.equal(renderToStaticMarkup(React.createElement(ClaimEvidenceSummary, { routeId: 'service-payment' })), '');
  });
});

describe('eLedger — Historical UI restoration guardrails', () => {
  it('restores the actual September custom eLedger header and flat source-tax navigation', () => {
    const markup = renderToStaticMarkup(React.createElement(LanguageProvider, null,
      React.createElement(LedgerProvider, null,
        React.createElement(Header), React.createElement(Sidebar))));
    assert.match(markup, /eledger-header/);
    assert.match(markup, /NATIONAL BOARD OF REVENUE/);
    assert.match(markup, /Assessment Year/);
    assert.match(markup, /বাংলা/);
    assert.match(markup, /English/);
    assert.match(markup, /eledger-sidebar/);
    assert.match(markup, /Home/);
    assert.match(markup, /Dashboard/);
    assert.match(markup, /Ledger Guide/);
    assert.match(markup, /Claim Source Tax/);
    assert.match(markup, /eledger-source-route-list/);
    assert.match(markup, /Salary \(iBAS\+\+\)/);
    assert.match(markup, /Salary \(Others\)/);
    assert.match(markup, /Bank\/FI Interest\/Profit/);
    assert.match(markup, /Sanchayapatra/);
    assert.match(markup, /Commercial Vehicle/);
    assert.match(markup, /Claim AIT/);
    assert.match(markup, /Environmental Surcharge/);
    assert.match(markup, /carry forward tax u\/s 163/);
    assert.match(markup, /Tax Payment Status/);
    assert.match(markup, /Need Help/);
    assert.match(markup, /09643717171/);
    assert.doesNotMatch(markup, /bg-emerald-950/);
    assert.equal(getCurrentRoutesByGroup('Source Tax').length, 10);
    assert.equal(getCurrentRoutesByGroup('AIT').length, 3);
    assert.ok(getCurrentRoutesByGroup('AIT').some((route) => route.id === 'ait-import'));
  });

  it('restores the original September dashboard composition without misrepresenting verified credit', () => {
    const markup = renderToStaticMarkup(React.createElement(LedgerProvider, null,
      React.createElement(DashboardView)));
    assert.match(markup, /ERETURN LEDGER/);
    assert.match(markup, /See the current Ledger tax, AIT, adjustments and total amount at a glance/);
    assert.match(markup, /eledger-summary-cards/);
    assert.match(markup, /Other Tax &amp; Adjustments/);
    assert.match(markup, /Ledger Total/);
    assert.match(markup, /Ledger composition/);
    assert.match(markup, /Source Tax categories/);
    assert.match(markup, /AIT categories/);
    assert.match(markup, /Other tax &amp; adjustments/);
    assert.match(markup, /eledger-composition-bar/);
    assert.match(markup, /Salary \(iBAS\+\+\)/);
    assert.match(markup, /Quick actions/);
    assert.match(markup, /View Tax Payment Status/);
    assert.match(markup, /Independently authorized verified credit/);
    assert.doesNotMatch(markup, /eledger-welcome|eledger-progress-ring|Recent ledger activity/);
    assert.doesNotMatch(markup, /18 Functional Routes Directory/);
  });

  it('renders September Salary (Others) columns and original controls without discarding evidence', () => {
    const sample = { ...INITIAL_LEDGER_ENTRIES[0], routeId: 'salary-others' as const,
      claimEvidence: { paymentDocumentType: 'CERTIFICATE' as const, documentAmount: 200000,
        depositingAuthority: 'Employer Accounts', bankName: 'Test Bank', branchName: 'Main' } };
    const markup = renderToStaticMarkup(React.createElement(SalaryOthersTable, {
      entries: [sample], defaultSection: 'Sec 86',
      onSaveNewEntry: async () => ({ success: true }),
      onUpdateEntry: async () => ({ success: true }),
      onDeleteEntry: async () => true,
    }));
    assert.match(markup, /Total Claimed Amount/);
    assert.match(markup, /Depositing Authority/);
    assert.match(markup, /Payment Document Type/);
    assert.match(markup, /Challan\/ Certificate Reference No/);
    assert.match(markup, /Claimed Amount/);
    assert.match(markup, /Bank \/ Branch/);
    assert.match(markup, /Employer Accounts/);
    assert.match(markup, /Certificate/);
    assert.match(markup, /Test Bank \/ Main/);
    assert.match(markup, /Edit /);
    assert.match(markup, /Delete /);
    assert.match(markup, /Add new/);
  });

  it('keeps iBAS++ local payroll records read-only without fabricating a live official lookup', () => {
    const markup = renderToStaticMarkup(React.createElement(LedgerProvider, null,
      React.createElement(SourceTaxView)));
    assert.match(markup, /iBAS\+\+ \(Salary\) TDS/);
    assert.match(markup, /TDS Available \(local records only\)/);
    assert.match(markup, /Official submission requires a verified CGA\/iBAS\+\+ connection/);
    assert.match(markup, /readOnly/);
    assert.match(markup, /Why can’t I save/);
  });

  it('renders original-style AIT categories with local-only lookup and safe claim totals', () => {
    const markup = renderToStaticMarkup(React.createElement(LedgerProvider, null,
      React.createElement(AitView)));
    assert.match(markup, /AIT on Car/);
    assert.match(markup, /Total Claimed Amount/);
    assert.match(markup, /Reference lookup/);
    assert.match(markup, /Local demonstration records only/);
    assert.match(markup, /Advance Income Tax claims/);
    assert.match(markup, /Locally recorded AIT claims remain pending/);
    assert.doesNotMatch(markup, /eledger-route-overview/);
    assert.equal(getCurrentRoutesByGroup('AIT').length, 3);
    assert.deepEqual(getClaimEvidenceFields('sec-154').slice(0, 2).map((field) => field.key), [
      'paymentDocumentType', 'documentAmount',
    ]);
  });

  it('restores the six September payment-status rows and recorded-total footer', () => {
    const markup = renderToStaticMarkup(React.createElement(LedgerProvider, null,
      React.createElement(TaxPaymentStatusModal, { isOpen: true, onClose: () => {} })));
    assert.match(markup, /Tax Payment Status/);
    assert.match(markup, /Review all current Ledger tax, AIT and adjustments together/);
    assert.match(markup, /Payment breakdown/);
    assert.match(markup, /Expand Source Tax or AIT/);
    assert.match(markup, /aria-expanded="false"/);
    assert.match(markup, /Advance Income Tax \(AIT\)/);
    assert.match(markup, /Tax Paid With Return/);
    assert.match(markup, /Environmental Surcharge/);
    assert.match(markup, /Adjustment of Tax Refund/);
    assert.match(markup, /Adjustment of carry forward tax u\/s 163/);
    assert.match(markup, /All amounts currently recorded in this Ledger/);
    assert.match(markup, /Separately authority-verified credit/);
    assert.match(markup, /eledger-payment-total/);
    assert.doesNotMatch(markup, /Verified Tax Payments &amp; Deductions|Tax Payment Status &amp; Reconciliation/);
    assert.doesNotMatch(markup, /eledger-route-overview/);
    assert.equal(renderToStaticMarkup(React.createElement(LedgerProvider, null,
      React.createElement(TaxPaymentStatusModal, { isOpen: false, onClose: () => {} }))), '');
  });

  it('reconciles six payment buckets to the recorded Ledger total without including fake verified credit', () => {
    const sample = INITIAL_LEDGER_ENTRIES.filter((entry) => entry.assessmentYear === '2026-2027' &&
      entry.taxpayerTin === DEFAULT_TAXPAYERS[0].tin);
    const amount = calculateCategoryTotals(sample);
    const sixBuckets = amount.sourceTaxTotal + amount.aitTotal + amount.taxPaidWithReturnTotal +
      amount.environmentalSurchargeTotal + amount.refundAdjustmentTotal + amount.carryForward163Total;
    const recorded = amount.sourceTaxTotal + amount.aitTotal + amount.paymentsTotal + amount.adjustmentsTotal;
    assert.equal(sixBuckets, recorded);
    assert.ok(recorded > amount.grandTotalCredits);
    assert.equal(formatLedgerAmount(150000), '1,50,000');
    assert.equal(formatLedgerAmount(12.75), '12.75');
    assert.equal(formatLedgerAmount(Number.NaN), '0');
  });

  it('restores direct Payment and Adjustment pages without dark concept banners', () => {
    const payment = renderToStaticMarkup(React.createElement(LedgerProvider, null,
      React.createElement(PaymentsView)));
    assert.match(payment, /Tax Paid with Return \(173\)/);
    assert.match(payment, /Total Recorded Payment/);
    assert.match(payment, /A-Challan reference lookup/);
    assert.match(payment, /national treasury verification is not connected/);
    assert.match(payment, /Recorded tax payments/);
    assert.doesNotMatch(payment, /eledger-route-overview/);
    const adjustments = renderToStaticMarkup(React.createElement(LedgerProvider, null,
      React.createElement(AdjustmentsView)));
    assert.match(adjustments, /Adjustment of Tax Refund/);
    assert.match(adjustments, /Total Recorded Adjustment/);
    assert.match(adjustments, /Recorded tax adjustments/);
    assert.match(adjustments, /not government-authorized credits/);
    assert.doesNotMatch(adjustments, /eledger-route-overview/);
  });

  it('restores the September Ledger Guide article and protects against fictitious online confirmation', () => {
    const html = renderToStaticMarkup(React.createElement(LedgerProvider, null,
      React.createElement(LedgerGuideView)));
    assert.match(html, /eledger-guide-heading/);
    assert.match(html, /eReturn LEDGER/);
    assert.match(html, /1 July 2025 – 30 June 2026/);
    assert.match(html, /Search Option/);
    assert.match(html, /Important/);
    assert.match(html, /eledger-guide-info/);
    assert.match(html, /not government-verified tax credits/);
    assert.doesNotMatch(html, /Reusable Workflow Architecture|bg-slate-900/);
  });

  it('switches core document screens to Bengali without changing recorded amounts', () => {
    const renderBn = (...children: React.ReactNode[]) => renderToStaticMarkup(React.createElement(
      LanguageProvider, { initialLanguage: 'bn' }, React.createElement(LedgerProvider, null, ...children)));
    const guide = renderBn(React.createElement(LedgerGuideView));
    assert.match(guide, /১ জুলাই 2025 – ৩০ জুন 2026/);
    assert.match(guide, /মনে রাখুন/);
    const dashboard = renderBn(React.createElement(DashboardView));
    assert.match(dashboard, /লেজারের বিন্যাস/);
    assert.match(dashboard, /রেকর্ডকৃত লেজারের অঙ্ক যাচাইকৃত করের ক্রেডিট নয়/);
    const status = renderBn(React.createElement(TaxPaymentStatusModal, { isOpen: true, onClose: () => {} }));
    assert.match(status, /কর পরিশোধের বিস্তারিত/);
    assert.match(status, /ধারা ১৬৩ অনুসারে পূর্ববর্তী কর সমন্বয়/);
    assert.match(status, /কর্তৃপক্ষের স্বতন্ত্র যাচাইকৃত ক্রেডিট/);
    const salary = renderBn(React.createElement(SalaryOthersTable, { entries: [], defaultSection: 'Sec 86',
      onSaveNewEntry: async () => ({ success: true }), onUpdateEntry: async () => ({ success: true }),
      onDeleteEntry: async () => true }));
    assert.match(salary, /জমাদানকারী কর্তৃপক্ষ/);
    assert.match(salary, /নতুন যোগ করুন/);
  });

  it('localizes all route headings and supplies keyboard-friendly labels to reconciliation and carry-forward forms', () => {
    const renderBn = (component: React.ReactElement) => renderToStaticMarkup(React.createElement(
      LanguageProvider, { initialLanguage: 'bn' }, React.createElement(LedgerProvider, null, component)));
    assert.match(renderBn(React.createElement(SourceTaxView)), /বেতন ও আইবাস\+\+ উৎস কর/);
    assert.match(renderBn(React.createElement(AitView)), /ব্যক্তিগত গাড়ির অগ্রিম কর/);
    assert.match(renderBn(React.createElement(PaymentsView)), /ধারা ১৭৩ এর অধীনে নিয়মিত কর/);
    assert.match(renderBn(React.createElement(AdjustmentsView)), /ফেরত সমন্বয়/);
    const dialog = renderBn(React.createElement(TaxPaymentStatusModal, { isOpen: true, onClose: () => {} }));
    assert.match(dialog, /aria-modal="true"/);
    assert.match(dialog, /lang="bn"/);
    assert.match(dialog, /aria-expanded="false"/);
  });
});
