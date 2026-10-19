# eLedger — original custom UI recovery roadmap

**Approved visual baseline:** the custom eReturn Ledger screenshots from 20–21 September 2026, found in the user's archive. These are **not** the official NBR eReturn/eLedger staging screenshots from 8 October, and are **not** the two previously used concept dashboards.

**Repository:** shihab-tech04/eLedger  
**Public release:** https://shihab-tech04.github.io/eLedger/  
**Baseline production tree:** 76fed95a64a7ed5c9a2d08d86ee405d8ba931107  
**Recovery branch:** recovery/original-eledger-shell-20261019

## Historical screenshot inventory

Original project references are held outside the Git repository:

| Capture | Primary UI evidence |
| --- | --- |
| custom_eledger_dashboard_2026-09-20.png | 68px masthead, 260px sidebar, four summary cards, ledger composition bar, category cards and quick actions |
| custom_eledger_payment_status_2026-09-20.png | White Tax Payment Status modal; Source Tax/AIT expando rows, six financial buckets and blue total |
| custom_eledger_guide_2026-09-21.png | Ledger Guide typography, article container, help panel and navigation hierarchy |
| custom_eledger_source_tax_2026-09-21.png | iBAS++ salary claim and lookup layout |
| custom_eledger_salary_2026-09-21.png | Salary (Others), section caption, specific certificate/challan table columns, actions |
| custom_eledger_inline_editor_2026-09-21.png | Inline Add/Edit row, select/input/date controls and Save/Cancel handling |

The suspended original repository's final 9 October source commit is not accessible; no screenshot proves every later design change. Restoration decisions must therefore identify the September evidence rather than claim a verified October 9 pixel match.

## Phase gates

Each phase is **complete** only after its changes are isolated, checked against relevant reference images, regression tested, backed up independently, deployed via the existing protected GitHub Pages workflow, and checked at the live URL. Keep the previous production version serving until the release gate passes.

### 1 — Shared shell and design tokens

- Recreate the original 68px white header with flat green eR mark, eReturn / LEDGER lockup, two-line NBR agency, AY, language, bell and taxpayer profile.
- Recreate the 260px sidebar with Home, Dashboard, Ledger Guide, flat Claim Source Tax list, collapsible Claim AIT, direct payment/adjustment rows, Tax Payment Status, eReturn link and helpline.
- Match compact historical font sizes, pale-grey canvas, blue selected navigation, thin borders and restrained shadows.
- Keep assessment-year/taxpayer changes, mobile menu, backups and access to all current/legacy saved routes.
- Run desktop/mobile visual smoke tests, profile/language/nav checks, 104 ledger tests, lint and build.

**Phase 1 accepted and live:** the recovered shell was merged in [PR #17](https://github.com/shihab-tech04/eLedger/pull/17), production commit `1d57069b815ee09d132beefb6d791372bd5c1903`; GitHub Actions deployment run `39209008674` passed and the actual public GitHub Pages view was inspected. Desktop review at 1345px confirmed shell geometry and links; Source Tax navigation, profile dropdown, language switching and AIT expansion were exercised. Actual app frames were also inspected at **390×844** and **320×740** CSS-pixel viewports. Test suite: **104/104**, TypeScript and production build passed. Independently backed-up tested ZIP: `eledger-phase1-ef82472-20261019.zip`, SHA-256 `ae899a8f844b8c6ce44df09657b60eb8e33e42a77538b2a0884428938fe61c65`. The language control currently updates shell labels; full content translation remains in Phase 6.

### 2 — Dashboard

- Replace current welcome artwork, progress ring, attention and activity grid with the accepted original: blue eyebrow / Dashboard title / subtitle, four compact ledger cards, composition bar, Source Tax and AIT breakdowns, other tax/adjustment categories and quick actions.
- Use live current-context ledger totals, never copy September screenshot amounts into production.
- Distinguish recorded ledger total from independently authorized verified credit. Do not label locally saved claims authoritative.
- Verify empty, seeded, alternative taxpayer and assessment-year views at desktop/mobile widths.

**Phase 2 candidate verification:** replaced the entire modern dashboard hierarchy with the September original: eyebrow, compact summary cards, category breakdowns, composition bar and compact action list. Totals and category counts derive from the active taxpayer, assessment year and saved route IDs, including historical routes that still hold records. The displayed Ledger Total is the recorded sum of Source Tax, AIT, payments and adjustments; independently authorized verified credit remains a distinct value and is explicitly labelled. Desktop (1345px), **390×844** and **320×740** mobile browser views checked. Category drill-down, status modal, active-year changes (**2026–2027**, **2025–2026**, empty **2024–2025**), 0% composition arithmetic, TypeScript, production build and **104/104** tests passed. Production release and independent ZIP evidence are tracked through the corresponding Phase 2 GitHub PR/deploy.

### 3 — Source Tax pages

- Match route title and statutory caption, total/record count, Add new alignment and original table column layout.
- Restore Salary (Others) Depositing Authority, Payment Document Type, Challan/Certificate Reference, Date, Certificate Amount and Claimed Amount fields using route-specific evidence, without losing validated underlying data.
- Restore original inline add/edit/delete controls, row alignment, numeric/date semantics and responsive presentation.
- Validate salary iBAS++ lookup/read-only records and other Source Tax routes without treating mock lookup results as official confirmation.

**Phase 3 candidate verification:** Salary (Others) now uses the September evidence's exact visible domain columns: depositing authority, challan/certificate type, reference, date, document amount, claimed amount, optional Bank/Branch and inline pencil/trash/save/cancel. Supporting metadata is stored in the existing typed `claimEvidence` structure; domain validation rejects claims exceeding document amounts and does not promote any manual claim to verified credit. Existing rows without document metadata show preserved amounts without fabricating a document type. The iBAS++ screen now restores the white four-field reference layout and read-only TDS claim composition, while **explicitly marking it as local demo data** and disabling fictitious official save/lookup. All other Source Tax routes retain working import, sync, lookup and generic table components, with their original-like route heading. The actual Salary and iBAS screenshots were visually compared in browser at 1345px, and the Salary screen was inspected at **390×844** and **320×740**. Inline Add new, validation error and Cancel were exercised without writing test claims to production. **107/107 tests**, TypeScript and production build passed. The GitHub PR and live deployment record the release gates.

### 4 — AIT and remaining claim routes

- Reconstruct AIT route layouts and document/lookup panels from available evidence.
- Retain all 18 current route identities and historical saved routes. Distinguish Source Tax Import from AIT Import/Section 120.
- Verify claim scope, duplicates, joint taxpayer shares, year isolation, cross-route reference controls and save/edit/delete.

### 5 — Payments, adjustments and status

- Restore direct Tax Paid with Return, Environmental Surcharge, Tax Refund and Carry-Forward screens.
- Replace the dark reconciliation modal with the original light Tax Payment Status panel: restrained header, category expando rows, six distinct financial buckets and compact blue footer total.
- Confirm category totals agree with ledger entries. Keep recorded and authority-verified credit totals separate; no fabricated settlement or handoff.

### 6 — Guide, language, responsive UI and accessibility

- Recreate the original Ledger Guide article structure, section rhythm and pale-blue information panel.
- Complete bilingual presentation across routes, not merely header/sidebar labels.
- Match compact desktop appearance and mobile reflow; verify table overflow, inline row editors, dialogs, keyboard access, selected menu states and focus control.
- Standardize shared buttons, typography, card borders and field spacing against the references without adding unrequested controls.

### 7 — Final integration and recovery certification

- Run all-route user-journey smoke tests plus the existing regression suite, repeat taxpayer/year/persistence/backup/reconciliation/verification checks, inspect built assets and compare historical screenshots at matching viewports.
- Re-check every original screenshot against its restored route; record unsupported October 9 differences as unknown, not passed.
- Preserve independent source backups before final rollout, deploy only the verified candidate, confirm the actual live GitHub Pages SHA and view, and finalize the acceptance ledger.

## Protected invariants

- Local claims and example/simulated lookups must never become authoritative VERIFIED tax credit.
- Preserve validated amount constraints, certificate/claimed separation, reference duplicate prevention, record ownership and fiscal-year isolation.
- Avoid destructive localStorage changes or silent import/reconciliation reclassification.
- Preserve existing working components and use the historical eLedger UI as design authority; do not substitute NBR government screens or concept mockups.
