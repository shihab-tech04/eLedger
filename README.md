# NBR eReturn Ledger (eLedger) — Phase 1 Recovery Checkpoint

Reconstructed foundation for the **Bangladesh National Board of Revenue (NBR) eReturn Ledger (eLedger)** web application.

- **Project:** NBR eReturn Ledger
- **Repository:** `shihab-tech04/eLedger`
- **Framework:** React 19 + TypeScript + Vite + Tailwind CSS
- **Deployment Target:** GitHub Pages (`https://shihab-tech04.github.io/eLedger/`)
- **Statutory Framework:** Bangladesh Income Tax Act, 2023 (ITA 2023)

---

## 1. System Purpose & Integration Boundaries

eLedger manages tax-payment and tax-credit information within the NBR digital tax filing ecosystem.

### The Mandatory Journey
```text
eReturn Portal → Tax & Payment → Update Tax Payment Status → eLedger → Tax Payment Status → eReturn
```

### Boundary Rules
- **No System Merging:** eLedger does not generate new Treasury challans (handled by NBR TaxPay) or issue assessment orders (Office Management).
- **Fail-Closed Verification:** Bundled local reference matches can be recorded but never treated as authoritative verification. Unavailable or contradictory lookups cannot grant tax credit.
- **Verification Status Discipline:** Manual claims, Income sync, and local reference matches are not automatically verified. The verified total requires explicit authoritative evidence, which this standalone adapter does not issue.

---

## 2. Navigation & 18 Functional Routes Inventory

### Core Navigation
1. **Dashboard** (Landing page — no separate Home item)
2. **Ledger Guide**
3. **Claim Source Tax** (10 functional categories)
4. **Claim AIT** (3 functional categories)
5. **Tax Payment Status** (Reconciliation modal)
6. Functional tabs for **Payments** (2 categories) and **Adjustments** (2 categories)

### Route Breakdown

| Group | Route Count | Confirmed | Provisional |
|---|:---:|:---:|:---:|
| **Source Tax** | 10 | 8 | 2 |
| **Advance Income Tax (AIT)** | 3 | 3 | 0 |
| **Payments** | 2 | 2 | 0 |
| **Adjustments** | 2 | 2 | 0 |
| **Tax Payment Status** | 1 | 1 | 0 |
| **Total** | **18** | **16** | **2** |

See [`docs/ROUTE_MATRIX.md`](docs/ROUTE_MATRIX.md) for the recovered mapping inventory; statutory labels remain subject to source verification.

---

## 3. Implemented Reusable Workflow Architecture

1. **System Claim:** iBAS++-style payroll claim workflow (Sec 86/87); live integration is not connected.
2. **Manual Ledger Entry:** Clicking **Add Entry** inserts an editable row directly inside the table with inputs, Save, Cancel, and in-row Edit/Delete (no unnecessary modals).
3. **Sync from Income:** Local adapter for declared income records (Bank profit, Dividend, Sanchayapatra) with taxpayer/year isolation and duplicate checks.
4. **Hybrid Sync + Manual:** Combined declaration sync and manual certificate entry (Service Payment Sec 89/90).
5. **System Lookup:** BRTA/Section 154/A-Challan reference workflow with context validation; local matches remain pending until authoritative verification.
6. **System Records / Import:** Customs/import records workflow (Sec 120); not connected to a live customs system.
7. **Single Claim:** Dedicated single-entry prior return carry-forward (Sec 70/215).
8. **Reconciliation:** Compact Tax Payment Status modal with expandable sections, dynamic totals, and fixed footer (no "Go to eReturn" button, no hardcoded totals).

---

## 4. Getting Started & Development

### Prerequisites
- Node.js 22+
- npm 10+

### Installation
```bash
git clone https://github.com/shihab-tech04/eLedger.git
cd eLedger
npm ci
```

### Run Local Development Server
```bash
npm run dev
```
The app will be available at `http://localhost:3000`.

### Run Automated Unit Test Suite
```bash
npm run test
```
Executes 23 unit tests covering calculations, context isolation, duplicate prevention, verification boundaries, Income sync, and CRUD operations.

### Type Check & Build
```bash
npm run lint
npm run build
```

---

## 5. GitHub Pages Deployment

The committed `.github/workflows/deploy.yml` verifies pull requests and deploys
the `main` branch after clean installation, type checking, tests, and build pass.
In repository Settings → Pages, select **GitHub Actions** as the build/deployment source.
Verify the `github-pages` environment reports a successful deployment before
considering the site live.

---

## 6. Project Documentation

- [`docs/RECOVERY_BASELINE.md`](docs/RECOVERY_BASELINE.md) — Historical context, recovery decisions, and boundaries.
- [`docs/ROUTE_MATRIX.md`](docs/ROUTE_MATRIX.md) — Full 18-route registry, statutory sections, and workflow patterns.
- [`docs/KNOWN_GAPS.md`](docs/KNOWN_GAPS.md) — Missing evidence and unimplemented requirements.
- [`docs/TEST_REPORT.md`](docs/TEST_REPORT.md) — Phase 1 executed verification results (23/23 passing).
