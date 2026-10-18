# NBR eReturn Ledger (eLedger) — Automated Test Execution Report

**Execution Date:** 2026-10-18  
**Runner:** Node.js Native Test Runner (`node --import tsx --test`)  
**Status:** **ALL 18 TESTS PASSED (100% SUCCESS)**

---

## Execution Summary

| Test Suite | Total Tests | Passed | Failed | Status |
|---|:---:|:---:|:---:|:---:|
| 1. Route Registry & Navigation Structure | 3 | 3 | 0 | **PASS** |
| 2. Manual Entry & CRUD Operations in Repository | 1 | 1 | 0 | **PASS** |
| 3. Assessment-Year Isolation | 1 | 1 | 0 | **PASS** |
| 4. Taxpayer-Context Isolation | 1 | 1 | 0 | **PASS** |
| 5. Dynamic Totals Calculation | 1 | 1 | 0 | **PASS** |
| 6. Duplicate Prevention | 2 | 2 | 0 | **PASS** |
| 7. Invalid Amount Rejection | 2 | 2 | 0 | **PASS** |
| 8. External Lookup TIN Mismatch Rejection | 1 | 1 | 0 | **PASS** |
| 9. Connected-mode Precedence & Fail-Closed Policy | 2 | 2 | 0 | **PASS** |
| 10. Income Sync Flow | 1 | 1 | 0 | **PASS** |
| 11. Tax Payment Status Reconciliation | 2 | 2 | 0 | **PASS** |
| 12. Verification Status Rules | 1 | 1 | 0 | **PASS** |
| **Total** | **18** | **18** | **0** | **100% PASS** |

---

## Detailed Test Case Results

### 1. Route Registry & Navigation Structure
- `ok 1 - should contain exactly 18 functional routes`
- `ok 2 - should have 10 Source Tax, 3 AIT, 2 Payment, 2 Adjustment, and 1 Status route`
- `ok 3 - should distinguish confirmed and provisional routes in registry`

### 2. Manual Entry & CRUD Operations in Repository
- `ok 4 - should add, update, and delete entries correctly`
  - Validates inline addition, row update with patch, and item deletion from ledger persistence.

### 3. Assessment-Year Isolation
- `ok 5 - should isolate entries by assessment year without bleed`
  - Verifies queries for AY `2026-2027` return zero AY `2025-2026` records, and vice versa.

### 4. Taxpayer-Context Isolation
- `ok 6 - should isolate ledger data between different taxpayers`
  - Confirms TIN `123456789012` and TIN `987654321098` maintain separate ledger databases.

### 5. Dynamic Totals Calculation
- `ok 7 - should compute exact category totals and grand total dynamically`
  - Verifies calculations derive strictly from underlying ledger records rather than static constants.

### 6. Duplicate Prevention
- `ok 8 - should reject duplicate reference numbers for same taxpayer and assessment year`
- `ok 9 - should allow same reference number in different assessment years`

### 7. Invalid Amount Rejection
- `ok 10 - should reject zero or negative tax amount`
- `ok 11 - should reject tax amount exceeding gross payment`

### 8. External Lookup TIN Mismatch Rejection
- `ok 12 - should reject saving external record when matched TIN differs from taxpayer TIN`
  - Fails closed with descriptive TIN mismatch warning.

### 9. Connected-mode Precedence & Fail-Closed Policy
- `ok 13 - should succeed and take precedence when valid record matches`
- `ok 14 - should fail closed when external service is offline or unavailable`
  - Asserts that unreachable external services prevent saving unverified records.

### 10. Income Sync Flow
- `ok 15 - should properly link declared income heads to ledger records`
  - Tests state transition from eReturn income schedule to `SYNCED` ledger record.

### 11. Tax Payment Status Reconciliation
- `ok 16 - should group entries by route and compute totals matching category sums`
- `ok 17 - should format currency consistently in Bangladeshi Taka (BDT)`
  - Confirms South Asian locale comma formatting (e.g., `৳ 1,25,000.50`).

### 12. Verification Status Rules
- `ok 18 - should never automatically classify a locally entered amount as an authorized tax credit`
  - Confirms manual entries initialize as `PENDING_VERIFICATION`.
