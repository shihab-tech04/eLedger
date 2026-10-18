# NBR eReturn Ledger (eLedger) — Phase 0 Reconstructed Baseline

Reconstructed foundation for the **Bangladesh National Board of Revenue (NBR) eReturn Ledger (eLedger)** web application.

- **Project:** NBR eReturn Ledger
- **Repository:** `eRETURN-LEDGER`
- **Framework:** React 19 + TypeScript + Vite + Tailwind CSS
- **Deployment Target:** GitHub Pages (`https://<username>.github.io/eRETURN-LEDGER/`)
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
- **Fail-Closed Verification:** External lookup results take precedence over bundled local records. If an external service is configured but unavailable or contradictory, it fails closed without substituting fake data.
- **Verification Status Discipline:** Locally entered amounts are marked as `PENDING_VERIFICATION` or `DRAFT` and are never automatically classified as authorized tax credits.

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

See [`docs/ROUTE_MATRIX.md`](docs/ROUTE_MATRIX.md) for the complete statutory section mapping.

---

## 3. Implemented Reusable Workflow Architecture

1. **System Claim:** iBAS++ automated government payroll ledger integration (Sec 86/87).
2. **Manual Ledger Entry:** Clicking **Add Entry** inserts an editable row directly inside the table with inputs, Save, Cancel, and in-row Edit/Delete (no unnecessary modals).
3. **Sync from Income:** Direct synchronization from eReturn declared income schedules (Bank profit Sec 102, Dividend Sec 117, Sanchayapatra Sec 105).
4. **Hybrid Sync + Manual:** Combined declaration sync and manual certificate entry (Service Payment Sec 89/90).
5. **System Lookup:** Direct BRTA vehicle registry, Section 154, and A-Challan lookup with fail-closed and TIN mismatch rejection.
6. **System Records / Import:** ASYCUDA Customs bill of entry import records (Sec 120).
7. **Single Claim:** Dedicated single-entry prior return carry-forward (Sec 70/215).
8. **Reconciliation:** Compact Tax Payment Status modal with expandable sections, dynamic totals, and fixed footer (no "Go to eReturn" button, no hardcoded totals).

---

## 4. Getting Started & Development

### Prerequisites
- Node.js 20+ or 22+
- npm 10+

### Installation
```bash
git clone https://github.com/shihabshajib01-cell/eRETURN-LEDGER.git
cd eRETURN-LEDGER
npm install
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
Executes all 18 automated unit tests covering calculations, data isolation, duplicate prevention, fail-closed validation, and CRUD operations.

### Type Check & Build
```bash
npm run lint
npm run build
```

---

## 5. GitHub Pages Deployment

The application is architected for zero-configuration deployment to GitHub Pages.

### Option A: GitHub Actions (Recommended)
Add `.github/workflows/deploy.yml`:
```yaml
name: Deploy eLedger to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: 'pages'
  cancel-in-progress: true

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'
      - run: npm ci
      - run: npm run test
      - run: npm run build -- --base=./
      - uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'
      - id: deployment
        uses: actions/deploy-pages@v4
```

### Option B: Manual Deploy via `gh-pages`
```bash
npm run build -- --base=./
npx gh-pages -d dist
```

---

## 6. Project Documentation

- [`docs/RECOVERY_BASELINE.md`](docs/RECOVERY_BASELINE.md) — Historical context, recovery decisions, and boundaries.
- [`docs/ROUTE_MATRIX.md`](docs/ROUTE_MATRIX.md) — Full 18-route registry, statutory sections, and workflow patterns.
- [`docs/KNOWN_GAPS.md`](docs/KNOWN_GAPS.md) — Missing evidence and unimplemented requirements.
- [`docs/TEST_REPORT.md`](docs/TEST_REPORT.md) — Actual executed test results (18/18 passing).
