# eLedger × NEIR design component crosswalk (22 October 2026)

**Basis:** Uploaded original `NEIR-main.zip` (SHA-256 `a12b5d2cff44c3b26d3ed9c0ef436ed0dfa57ea5afd3479c75ea1de31e5fa7fb`). The imported NEIR files are design references **only**. No backend, government login, payment/claim authorization, or law is transferred.

| NEIR original source | Exact source property | eLedger implemented component | Status |
|---|---|---|---|
| `src/index.css` | primary #01ADC1, dark teal #0A767E, surface #FFF, background #F7F8FC, text #202338, border #E2E5F0 | eLedger shared `--el-*` tokens + style scope | IMPLEMENTED — manual pixel review still needed |
| `src/system/typography.css` | Poppins EN, Noto Sans Bengali BN, 14px dense table/body, 22px page title | HTML font link and eLedger tokens | IMPLEMENTED — no offline font guarantee |
| `src/components/tables/DataTable.jsx` | neutral 14px header/body, rounded surface, mobile record-card layout, row detail affordance | `OfficialReadOnlyTable` + shared CSS | PARTIAL — read-only bank/dividend/sanchaya/system table; existing manual tables only visual tokens |
| `src/components/overlays/Modal.jsx` | focus trap, Escape, 20px mobile bottom sheet, 16x20 header and scrollable content | Existing `LedgerFormModal` behavior + NEIR-matched CSS | IMPLEMENTED; interactions require browser validation |
| `src/components/overlays/Drawer.jsx`, `RecordDetailsDrawer` | right desktop panel, mobile sheet, label/value detail rows, close / Escape / restored focus | `NeirRecordDetailsDrawer` on official source-fed read-only rows | IMPLEMENTED; no Edit/Delete because source does not authorize |
| `src/components/tables/TablePageWorkspace.jsx` | page actions, filters, pagination | eLedger original route-specific tables kept | OPEN — no unsupported filters/pagination invented |
| `src/components/overlays/FormDrawer.jsx` | editable detail form drawer | eLedger existing tax form modal kept | OPEN — do not change validated original NBR forms without parity tests |

## Legal and interaction boundaries
- Only source-backed eLedger tax routes, labels, fields and calculation states are executable. NEIR's administrative row actions/fields cannot create or verify tax credits.
- eLedger's original 18 routes, frozen tax-year data behavior, native localStorage, EN/BN, accessible form semantics and mobile/card behavior are preserved.
- The NEIR admin source contains client-side simulated authentication; it is **not production security** and is not imported into the eLedger authentication model.
- The original NEIR source repository has not yet been created because the currently connected GitHub Chat connector does not expose repository creation. The ready package exists separately, including an immutable source manifest.
- No claim of *complete pixel-perfect 1:1 cross-product design parity* is made without NEIR reference screenshot comparisons at matching widths. This branch implements shared patterns, and independent visual review remains OPEN.
