# NBR eReturn Ledger — Known Gaps & Unresolved Requirements (Phase 0)

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

### Implemented but Provisional
- **Contractor & Supply of Goods (`contractor-supplier`):** Implemented with hybrid sync and manual entry; provisional pending final NBR Form 26AS equivalent XML tag mapping.
- **House Property TDS (`house-property`):** Implemented with manual entry under Sec 109; provisional pending official tenancy agreement identifier schema.

### Partial / Blocked by External Environment
- **Live iBAS++ API Endpoint:** Not connected. Existing records are local reference data and remain pending verification.
- **Live BRTA Vehicle Database API:** Not connected. Local matches remain pending; route, taxpayer, and year mismatches are rejected.
- **Live A-Challan Verification:** Not connected. Local matches cannot establish payment settlement or credit entitlement.
- **Browser journey tests:** Not yet completed for the recovered UI; unit tests do not constitute full interface acceptance.

### Unverified Historical Commit Assets
- Planned PR #17 was not published in the historical repository because of the upstream access interruption. Its assessment-year and taxpayer-context intent is now covered in the new baseline tests.

### Non-Goals for Phase 0
- Live banking payment gateway (NBR TaxPay responsibilities)
- Full Income Tax Return PDF printing engine (eReturn responsibilities)
- Circle officer audit workflow / tax hearing issuance
