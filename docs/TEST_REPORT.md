# Current Recovery Checkpoint — Phase 11 (2026-10-19)

- **102/102** native tests passed; TypeScript type check and Vite build passed.
- Raw saved-data export, unreadable-storage warning and keyboard dashboard controls added.
- All **18** currently visible routes rendered in the live browser Phase 10 acceptance tour (10 Source Tax, 3 AIT, 2 Payment, 2 Adjustment, 1 Status), with TIN/year switches restored and no console errors.
- Source/AIT CSV parser and atomic repository checks reject duplicates, invalid dates, incorrect amounts and failed storage writes without partial import.
- Verified credit remains **Tk. 0.00** when only locally entered or pending records exist; no government attestation is minted.
- The Phase 11 source release requires its own PR CI, Pages deploy and exact-bundle live check before acceptance is final.

---

# Historical Phase 6 Candidate Verification

**Starting point:** Phase 5 deployed `main` at `a96f31e`.

- `npm test`: **73/73 passed**, including readonly iBAS++ UI markup, repository mutation guards and route-specific lookup examples.
- `npm run lint`: PASS.
- `npm run build`: PASS, output `index-0GMF8Mmq.js`.
- `git diff --check`: PASS.
- No changes to CSS, top navigation or page-shell layout. The first Phase 6 deployed build `a4438fc` passed all 18 route-rendering checks and 375px/1440px responsive checks; see final acceptance document for boundaries.
- See [`PHASE6_FINAL_ACCEPTANCE.md`](PHASE6_FINAL_ACCEPTANCE.md).

Final PR CI, Pages deployment and live browser checks are release gates.

---

# NBR eReturn Ledger — Phase 5 Checkpoint Verification

- `npm test`: **69/69 passed**; TypeScript, build and diff checks passed.
- GitHub PR #6 merged at `a96f31e`; Pages deployment run 39148963234 succeeded.
- Live Pages loaded `index-C5tRcvNK.js`, matching the local build.
- See [`PHASE5_DATA_RECONCILIATION.md`](PHASE5_DATA_RECONCILIATION.md).

---

# NBR eReturn Ledger — Phase 5 Candidate Verification (Pre-Release)

**Starting point:** Phase 4 deployed `main` at `3a84a59`.

- `npm test`: **69/69 passing** (including Phase 4 route transactions and Phase 5 corruption/concurrency/reconciliation cases).
- `npm run lint`: PASS (TypeScript type checking).
- `npm run build`: PASS; output `index-C5tRcvNK.js`.
- `git diff --check`: PASS.
- See [`PHASE5_DATA_RECONCILIATION.md`](PHASE5_DATA_RECONCILIATION.md) for the exact acceptance boundary and external service blockers.

Phase 5 GitHub Actions and live Pages checks remain release gates.

---

# NBR eReturn Ledger — Phase 4 Checkpoint Verification

- `npm test`: **59/59 passing**.
- `npm run lint`, `npm run build`, `git diff --check`: PASS.
- GitHub PR #5 merged as `3a84a59`, Pages deployment run 39148482678 succeeded.
- Live Pages loaded `index-DxLODjdJ.js`, matching the local build.
- See [`PHASE4_WORKFLOW_ACCEPTANCE.md`](PHASE4_WORKFLOW_ACCEPTANCE.md).

---

# NBR eReturn Ledger — Phase 3 Candidate Verification

**Execution date:** 2026-10-18

**Starting point:** Phase 2 deployed `main` at `77669b4`

**Local checks:** 40/40 automated tests passed, TypeScript passed, and Vite
production build passed. Eight new tests cover carry-forward year context,
editing metadata, single-claim uniqueness, refusal to trust browser-stored
verification flags, multi-tab preservation, corrupt income-declaration data,
atomic income-sync success, and case-insensitive local reference lookup.

**Browser matrix:** All 18 route views opened in the deployed Phase 2 build;
the expected heading and route-specific workflow region or reconciliation
modal rendered. Details in `docs/PHASE3_ROUTE_ACCEPTANCE.md`.

**Release gate:** Phase 3 PR CI and live Pages deployment must pass before
marking this candidate a verified deployed checkpoint. Full financial-journey
acceptance is still outstanding.

---

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
