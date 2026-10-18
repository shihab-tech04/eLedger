# NBR eReturn Ledger — Known Gaps & Unresolved Requirements (Phases 0–6)

This document tracks items where source evidence was interrupted or where live government infrastructure cannot be reached in a standalone client environment.

---

## 1. Status Breakdown

### Implemented & Tested
- [x] Application shell, Header, Single-Level Navigation Bar
- [x] Internal Route Registry tracking 18 functional routes
- [x] Reusable Inline Editable Table with row-level **Add Entry**, Save, Cancel, Edit, and Delete
- [x] Dynamic calculation engine (totals derived strictly from records)
- [x] Assessment-Year isolation (`2026-2027`, `2025-2026`, `2024-2025`)
- [x] Taxpayer Context isolation (`123456789012` vs `987654321098`)
- [x] Duplicate reference prevention per TIN and AY
- [x] Invalid amount and boundary rejection (negative, zero, tax > gross)
- [x] External lookup fail-closed verification and TIN mismatch rejection
- [x] Income Sync workflow (Bank, Dividend, Sanchayapatra, Service)
- [x] Compact Tax Payment Status Modal with expandable sections and fixed footer
- [x] Verification state distinction (manual, Income-sync, and local-lookup entries not auto-credited)
- [x] Local repository does not issue authoritative verification
- [x] Cross-context lookup result cannot be saved after taxpayer/year/category changes
- [x] Phase 2: Route group isolation across all 18 registered routes; Source Tax cannot inherit another category's route
- [x] Phase 2: Unsaved workflow state is cleared on taxpayer, assessment-year, or route switch
- [x] Phase 2: Invalid calendar dates and non-finite/zero gross amounts rejected by the domain and repository
- [x] Phase 2: Direct storage writes cannot silently appear successful after browser quota failures
- [x] Phase 2: Corrupt saved browser data is left unchanged instead of overwritten with defaults
- [x] Phase 2: Stale reference lookup results cannot be submitted after editing their lookup key
- [x] Phase 3: All 18 registered route views selected and rendered in the live browser
- [x] Phase 3: Carry-forward prior-year choice tracks the active assessment year and saved claim type is restored
- [x] Phase 3: Only one carry-forward claim per taxpayer and year is accepted at the repository boundary
- [x] Phase 3: Locally persisted verification flags cannot be used to fabricate authoritative credits
- [x] Phase 3: Other-tab ledger writes are reloaded before local writes, with storage-event UI refresh
- [x] Phase 3: Corrupted income declarations are preserved, and sync completion does not depend on a second metadata write
- [x] Phase 4: Repository create/edit/delete/duplicate/context/reconciliation matrix for all 16 writable routes
- [x] Phase 4: System-only salary route and reconciliation modal reject local manual writes
- [x] Phase 4: Income sync reference matching and claim lifecycle state are consistent with saved records
- [x] Phase 5: Malformed saved financial rows fail closed without modifying original browser data
- [x] Phase 5: A same-taxpayer, same-year treasury reference cannot be duplicated across payment sections
- [x] Phase 5: Mutations are serialized within one repository instance; missing lookup context fails closed
- [x] Phase 6: iBAS++ system entries have no inline edit/delete and reject local mutation attempts
- [x] Phase 6: Repeated clean source-level and local route acceptance regression (73 tests/subtests)
- [x] Phase 6: Route-specific local lookup samples for AIT and Payment panels replace unrelated vehicle examples

### Implemented but Provisional
- **Contractor & Supply of Goods (`contractor-supplier`):** Implemented with hybrid sync and manual entry; provisional pending final NBR Form 26AS equivalent XML tag mapping.
- **House Property TDS (`house-property`):** Implemented with manual entry under Sec 109; provisional pending official tenancy agreement identifier schema.

### Partial / Blocked by External Environment
- **Live iBAS++ API Endpoint:** Not connected. Existing records are local reference data and remain pending verification.
- **Live BRTA Vehicle Database API:** Not connected. Local matches remain pending; route, taxpayer, and year mismatches are rejected.
- **Live A-Challan Verification:** Not connected. Local matches cannot establish payment settlement or credit entitlement.
- **Source Tax reference lookups:** Registry capability flags describe planned lookup integrations, but Source Tax UI has no live lookup panel; only locally entered or income-synced rows are available.
- **Customs/system imports:** The import route offers local reference entry, not ASYCUDA ingestion or import-file reconciliation.
- **Browser journey tests:** All 18 routes have live navigation/rendering smoke checks and 16 writable routes have repository-level transaction tests. Browser form-level create/edit/delete, cross-browser accessibility, actual backend financial journeys, and storage failure UI exercise remain unverified. Rendering and unit tests do not constitute complete financial-workflow acceptance.
- **Concurrent independent tabs:** A single-tab mutation queue does not make browser localStorage a transactional multi-user database. Simultaneous cross-tab writes remain a known limitation pending a backend.

### Unverified Historical Commit Assets
- Planned PR #17 was not published in the historical repository because of the upstream access interruption. Its assessment-year and taxpayer-context intent is now covered in the new baseline tests.

### Non-Goals for Phase 0
- Live banking payment gateway (NBR TaxPay responsibilities)
- Full Income Tax Return PDF printing engine (eReturn responsibilities)
- Circle officer audit workflow / tax hearing issuance
