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
- [x] Verification state distinction (manual entries not auto-credited)

### Implemented but Provisional
- **Contractor & Supply of Goods (`contractor-supplier`):** Implemented with hybrid sync and manual entry; provisional pending final NBR Form 26AS equivalent XML tag mapping.
- **House Property TDS (`house-property`):** Implemented with manual entry under Sec 109; provisional pending official tenancy agreement identifier schema.

### Partial / Blocked by External Environment
- **Live iBAS++ API Endpoint:** Government CGA intranet network boundary prevents live TLS connection from GitHub Pages. Local adapter simulates verified seed claims.
- **Live BRTA Vehicle Database API:** Requires bilateral NBR-BRTA government gateway token; client adapter uses verified registry seed lookup with fail-closed behavior on mismatch.
- **Live Bangladesh Bank A-Challan Webhook:** Mocked in adapter; production deployment requires backend gateway integration.

### Unverified Historical Commit Assets
- PR #17 historical commit contents: Unavailable due to upstream GitHub access interruption. Base rebuilt from PR #16 baseline requirements.

### Non-Goals for Phase 0
- Live banking payment gateway (NBR TaxPay responsibilities)
- Full Income Tax Return PDF printing engine (eReturn responsibilities)
- Circle officer audit workflow / tax hearing issuance
