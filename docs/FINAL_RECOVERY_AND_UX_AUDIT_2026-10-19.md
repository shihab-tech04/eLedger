# eLedger — Historical Recovery, Source and UX/UI Audit

**Audit date:** 19 October 2026  
**Repository:** `shihab-tech04/eLedger`  
**Deployment:** `https://shihab-tech04.github.io/eLedger/`

## 1. Historical recovery boundary

- The original project lived at `shihabshajib01-cell/eRETURN-LEDGER`. Its last recorded accepted and deployed work was PR **#16**, commit **`7022860`**, on 9 October 2026; PRs #9–#16 were recorded as merged/deployed.
- The next intended PR #17 work was assessment-year/taxpayer-context validation and stronger verification protections. Access to the original repository subsequently returned GitHub **403 / account suspended**. A full source comparison is therefore unavailable.
- The current repository contains merged recovery phases #17–#23, including the Phase 7 cross-flow audit. Those merged phases do **not** independently prove exact equality with the inaccessible original.
- Three archived visual references were found: the September `eReturn Ledger Tax Dashboard.png`, September `eReturn Ledger Payment Dashboard.png`, and `image(20261019-020800).png` (a later dark-navigation prototype). The September designs and October prototype are different visual states. We retained the recovered custom-sidebar design instead of replacing it with the prototype.
- Prior October 8 records reference 28 category-specific screenshots, but full original image-by-image parity cannot be certified without every source image and the original code.

## 2. Source audit scope and method

| Area | Review |
| --- | --- |
| Source inventory | 36 non-test source files, approximately 6,480 lines, including 473 lines of CSS at the audited baseline |
| Interactive components | Header/sidebar, dashboard, guide, source tax, AIT, payments, adjustments, status dialog, tables and workflow controls |
| Domain | Route registry, category totals, AY/TIN isolation, duplicates, amount/date validation, CSV parsing, claim evidence |
| Persistence and external boundaries | LocalStorage repository, raw backup export, income-sync fixture adapter, local reference lookup |
| Static/code-wide scans | TypeScript strict check; search for unsafe injection/network/browser-storage patterns; Git diff checks; production build |
| Regression coverage | 117 passing tests after the fixes in this audit |
| Dependency advisories | `npm audit --omit=dev --audit-level=high`: 0 reported vulnerabilities at audit time |

The code-wide checks covered the source tree; the highest-risk financial flows and React components were examined directly. This is a **documented, targeted manual audit plus automated project-wide checks**, not a claim that every execution path or every source line has been formally verified.

## 3. Visual route review

The deployed release before the current fixes was opened in Chrome, with screenshots and accessible UI state inspected for the following pages:

| Group | Views checked | Result before fixes |
| --- | --- | --- |
| Dashboard | Main summary, composition, route inventory, quick actions | Rendered; small supporting text; read-only iBAS++ was recommended as an update starting point |
| Guide | English and Bengali instructions | Rendered; text incorrectly implied manual saving on the read-only iBAS++ screen |
| Source Tax | Salary (iBAS++), Salary (Others), Bank/FI, Dividend, Service, Sanchayapatra, Import, LTU, Commercial Vehicle, Others | All 10 rendered and navigated; wide table actions need a mobile scroll cue |
| AIT | Car, Section 154, Import (120) | All 3 rendered; generic TDS labels obscured the AIT meaning |
| Payment | Section 173, Environmental Surcharge | Both rendered; table called a payment “Tax Deducted” and receiving bank “Deductor” |
| Adjustment | Refund, Section 163 carry-forward | Both rendered; generic tax-deduction headers did not describe an adjustment |
| Reconciliation | Tax Payment Status dialog, six primary buckets | Rendered; keyboard-close and focus loop present; recorded total distinguished from verified credit |
| Responsive | 1365px desktop, 390px and 320px mobile, Bengali mobile, slide-out navigation, long forms and table | Core content usable; mobile AY selector lost its accessible name when the visual label was hidden |

All 17 current financial routes, the dashboard, the guide, and status dialog were observed. Wide financial tables remain horizontally scrollable by design. Browser-based smoke inspection is not a substitute for a full assistive-technology audit.

## 4. Fixes in this release

1. **Financial terminology:** Context-aware table and form field labels for Source Tax, AIT, Payment and Adjustment, in English and Bengali. The underlying numeric model and saved records were not changed.
2. **Mobile data discovery:** Visible sideways-swipe guidance on the generic ledger table and Salary (Others) table.
3. **Keyboard access:** Consistent visible focus outline and a reduced-motion CSS preference.
4. **Responsive accessible name:** Explicit language-aware label for the AY selector, including below the 400px breakpoint.
5. **Accurate help text:** The Ledger Guide and dashboard no longer imply that read-only iBAS++ records support manual submission.
6. **Context isolation:** `LedgerContext.addEntry` now rejects, instead of silently reassigning, a payload whose TIN or assessment year differs from the currently selected context.
7. **Surcharge resilience:** A failed local save displays an error rather than leaving an unhandled action failure.
8. **Regression tests:** Added assertions for category-specific headers, narrow-screen AY accessibility and read-only guide wording.

## 5. Existing protections confirmed

- Saved entries are isolated by taxpayer TIN and assessment year; switching context does not display the previous taxpayer’s totals.
- Local/manual/fixture claims are **not** counted as government-authorized verified tax credits.
- The client rejects mismatched lookup TIN/AY/route, invalid amounts/dates, duplicate references, double use of Section 120 imports, and double use of commercial-vehicle references.
- CSV batches are bounded to 1–100 rows and written atomically. Invalid stored data is not silently overwritten.
- The payment-status total is the recorded ledger sum, separate from the authorized-credit amount.
- iBAS++ records are read-only until official connectivity is available; backups export original browser-storage values without rewriting them.

## 6. Open limits and improvement backlog

| Priority | Limitation | Required next authority/evidence |
| --- | --- | --- |
| **Blocker to full historical parity** | The original suspended repository cannot be read; not all 28 original screenshots are accessible | Restore source/account access or provide a verifiable original archive/image set |
| **Blocker to live tax use** | No authenticated NBR/eReturn, iBAS++, BRTA, treasury/A-Challan, CDBL or ASYCUDA integration | Approved API contracts, credentials/permissions, live integration environment and acceptance evidence |
| **High** | Default taxpayer and financial records are illustrative local fixtures; no server-owned identity or durable multi-device record | Real authentication, authoritative taxpayer association and backend/storage design |
| **High** | Some July 2026 fixture `syncDate` values are outside the July 2025–June 2026 income period associated with AY 2026–2027, though `syncDate` may mean import time rather than deduction time | Obtain the actual deduction/credit dates and clarify model semantics before treating imports as eligible AY credits |
| **Medium** | Browser backup can be downloaded, but there is no safe user-facing, validated restore/import wizard | Recovery-file specification, duplicate-resolution policy and explicit user approval before any overwrite |
| **Medium** | Financial tables remain intrinsically wide; scrolling is now explained but row-level card views could improve 320px usability | Approve a responsive presentation change against final reference screenshots |
| **Low** | An unused legacy dark-navigation component and development-era dependencies remain in the repo | Separate cleanup review after acceptance, with no UX/financial behavior changes |

Do **not** represent this local-only prototype as a filing/payment processor or promote recorded values to verified tax credits without independently authenticated government evidence.

## 7. Verification gate

Required before a production merge:

```text
npm run lint                  PASS
npm test                      PASS — 117/117
npm run build                 PASS
npm audit --omit=dev          PASS — 0 advisories reported
git diff --check              PASS
```

GitHub Actions `verify` and subsequent GitHub Pages `deploy` must also succeed on the merged `main` commit. After publication, reopen the live route, check English/Bengali, mobile status and a payment/adjustment table, and compare the published artifact with the tested commit.

**Certification boundary:** This report supports a verified, improved **local demonstration release** of the recovered project. It cannot certify 100% historical restoration, official tax-credit verification, statutory eligibility, production-grade authentication, or real government connectivity.
