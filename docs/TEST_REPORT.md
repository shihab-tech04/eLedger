# NBR eReturn Ledger — Phase 2 Candidate Verification

**Execution date:** 2026-10-18

**Starting point:** Phase 1 verified `main` at `c393eb9`

**Local checks:**
- `npm test`: **32/32 passed** (23 baseline + 9 Phase 2 regression cases)
- `npm run lint`: **PASS**
- `npm run build`: **PASS**

**New regression coverage:** All 18 route IDs stay inside the selected workflow
group; strict date/finite amount checks; local reference number matching;
repository-level duplicate and category rejection; immutable entry identity,
ownership and provenance; defensive read snapshots; storage persistence and
taxpayer/year isolation; explicit failed-write behavior; preservation of
unreadable local data.

**UI-level correction:** Workflow component remount on taxpayer, year, or route
switch; Source Tax no longer interprets a foreign-group route as its active
route; stale lookup results are invalidated on input/context changes.

**Release gate:** GitHub PR CI, Pages deployment, and live browser smoke must
pass before this section may be marked deployed.

**Coverage boundary:** The tests validate route-group resolution, not a full
human-driven form journey on every one of the 18 screens. Real government API
verification, statutory-field mapping, and production credit entitlement are
not tested or claimed.

---

# NBR eReturn Ledger — Phase 1 Verified Checkpoint Report

**Execution date:** 2026-10-18

**Baseline:** `shihab-tech04/eLedger` at `f5ce28d` before local repair

**Clean dependency installation:** PASS (`npm ci`, no legacy peer-dependency bypass)

**TypeScript:** PASS (`npm run lint`)

**Unit tests:** **23/23 PASS** (`npm run test`)
**Production build:** PASS (`npm run build`)

The five added Phase 1 tests cover taxpayer/assessment-year Income-sync
isolation, duplicate/re-sync recovery, route/year mismatch rejection, exclusion
of unsupported credits, and prevention of local verification promotion. Local
reference matches are recorded pending verification; no government service or
authoritative credit posting was exercised.

**GitHub PR CI:** PASS ([workflow run 39143078002](https://github.com/shihab-tech04/eLedger/actions/runs/39143078002))

**First deployment:** PASS ([workflow run 39143142347](https://github.com/shihab-tech04/eLedger/actions/runs/39143142347)). The public Pages URL returned HTTP 200, served JavaScript with the Phase 1 local-reference wording, and opened in a browser. Dashboard recorded totals remained visible while verified credit remained Tk. 0.00; the Tax Payment Status modal and AIT route loaded. A short follow-up wording patch removes legacy claims of official verification and live iBAS++/registry integration.

Full route-by-route visual acceptance, cross-browser testing, and real
government-service integration remain outside this checkpoint.

---

# Historical Phase 0 Test Report (Superseded)

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
