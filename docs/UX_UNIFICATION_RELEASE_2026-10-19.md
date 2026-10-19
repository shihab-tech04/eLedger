# eLedger UI/UX unification — release review (19 October 2026)

This release builds on the recovered September custom-sidebar design. It does not introduce a replacement theme or alter ledger arithmetic, verification status, or stored financial records.

## Coverage

- Dashboard, English/Bengali Guide, status dialog, header, sidebar, taxpayer/year/language controls.
- All 10 Source Tax, 3 AIT, 2 Payment, and 2 Adjustment routes (17 financial views).
- Shared editable table, specialized Salary Others certificate form, source-document evidence fields, local reference lookup, income sync, CSV import, surcharge handoff, carry-forward adjustment.
- Responsive layouts at existing mobile/tablet/desktop breakpoints; input/action reachability, horizontal navigation, table alignment, labels, focus, help disclosures.

## Fixes

1. Replaced the 1330px-wide Salary Others entry/edit row with an inline, responsive 4/2/1-column form within the table section. All eight fields and Save/Cancel remain in the visible column, independently of the read-only table's horizontal scroll.
2. Introduced shared labeled `LedgerInput`, `LedgerSelect` and accessible native `LedgerTip` controls across Salary Others, evidence, local lookup, and surcharge. Unified control height, border, blue primary action, focus, and numeric alignment.
3. Replaced four duplicate mobile tab navigators with `RouteMobileTabs` and scrolled the active category into view when routes change.
4. Changed 320–400px dashboard summaries to readable one-column cards, simplified typographic scale and removed an unused font family.
5. Left document dates blank by default for new manually entered tax records rather than treating today's date as the deduction date. Kept existing dates unchanged; invalid/blank dates remain rejected by validation.
6. Shortened Guide, CSV and surcharge instructions. Moved secondary requirements into keyboard/touch-friendly disclosures. Retained the clear boundary between local records and authority-verified credit.
7. Marked iBAS++ figures visually and semantically read-only; replaced disabled Save affordance with an explanation of the unavailable government connection.
8. Avoided pre-filling an unsupported assessing-circle claim on Section 163; added category-specific surcharge column labels and corrected singular “1 record”.
9. Persisted only the English/Bengali display-language preference in browser storage, without migrating or modifying taxpayer data. Clarified income-sync fixture timestamp as import time rather than deduction date.

## Verification gate

Before merge, require TypeScript (`npm run lint`), regression tests (`npm run test`), production build (`npm run build`), production dependency audit (`npm audit --omit=dev --audit-level=high`) and `git diff --check` to pass. GitHub PR validation and Pages deployment must then succeed, followed by live visual spot checks at desktop/390px/320px and Bengali.

## Boundaries

- Dense read-only tax tables remain horizontally scrollable. Forms and their actions must not require sideways scrolling.
- Local fixtures/lookups are not NBR, CGA/iBAS++, BRTA, treasury, CDBL, or ASYCUDA verification; there is no production payment or tax-filing capability.
- The original suspended repository and some historical screenshots cannot be accessed, so exact historical parity is unverified.
- Browser/assistive-technology coverage is a release smoke audit, not a certification of WCAG 2.2 AA compliance for all modes.
