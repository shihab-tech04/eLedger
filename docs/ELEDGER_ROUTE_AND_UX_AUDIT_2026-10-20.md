# eLedger: route, evidence, and UI audit — 20 October 2026

## Scope and evidence levels

- **Current reconstructed site**: all 18 visible financial routes and their add-entry interactions inspected in the deployed GitHub Pages UI; source code reviewed for navigation, entry forms, storage, validation, and reconciliation.
- **Historical eLedger design**: recovery work and October screenshot-route crosswalk in `src/domain/routeRegistry.ts` plus previously recovered September checkpoints. This is not equivalent to pixel-level comparison with the lost original deployment.
- **Official NBR eReturn**: October 8, 2026 authenticated observation `17-NBR_eReturn_Workstream_B_Authenticated_Observation_v0_5.md` and related field evidence. Its `Update Tax Payment Status` action was visible but not opened in that observation; an independent authenticated reinspection was not completed in this audit. **Full form parity is unverified**.
- **Legal evidence**: NBR controlled source documents and SRO 210/2026 versus 273/2026 comparison. Their reconciled master-source register is explicitly **partial and non-certified**, so the frontend must not infer rates, assessment-year applicability, or verified payment status from these alone.

## What eLedger does

eLedger aggregates taxpayer-specific source-tax deductions, advance income tax, return-linked payments and adjustments. Its recorded claims are evidentiary inputs to eReturn Tax & Payment reconciliation; they are **not** automatically legally admissible credits. Confirmation needs an authoritative taxpayer/year match, original challan/certificate/source record, and the applicable rule/version. An independently verified-credit subtotal must remain separate from locally recorded totals.

The eReturn Tax & Payment observation records six buckets: Source Tax, AIT, Tax Paid with Return, Environmental Surcharge, Refund Adjustment, and Carry-Forward Adjustment. It also shows total payment/adjustments, net payable and refundable calculations. Exact eLedger write-back and tax-payment-status interfaces require further authenticated observation and backed API testing.

## Page-by-page functional inventory

| Current page | Entry/source workflow | Captured evidence and special elements | Audit finding |
|---|---|---|---|
| Dashboard | Read-only aggregation and route shortcuts | Six-bucket status entry point, local recorded versus verified amounts | Sample totals are seeded browser data, not NBR balances |
| Ledger Guide | Guidance, no financial save | Route explanations and evidence caveats | Preserve, but avoid repeating guidance on entry screens |
| Salary (iBAS++) | Read-only local payroll reference | Local lookup, TDS claim, taxpayer/AY | CGA/iBAS++ authoritative interface unavailable; no save |
| Salary (Others) | Dedicated add/edit dialog | Authority, certificate/challan kind, reference/date, document amount, claim, bank/branch | Distinct content, now shares standard fields, modal, mobile record presentation |
| Bank/FI Interest/Profit | Local income-sync or manual claim | Generic reference/entity/section/gross/tax/date | Source-income declarations are local fixtures; evidence provenance incomplete |
| Dividend | Local income-sync or manual claim | Generic reference/entity/section/gross/tax/date | Official BO/CDBL validation not connected |
| Service Payment | Manual claim + income-sync | Generic six fields; authority, document kind/amount, purpose | Supporting detail should be optional/disclosed, not a separate form page |
| Sanchayapatra | Income-sync/manual claim | Generic six; scheme, registration, issue date | Official NSD evidence not connected |
| Import (source tax) | Manual claim + CSV upload | Generic six; import file preview | CSV format distinct from AIT Import; protect category separation |
| Source Tax (LTU) | Manual claim | Generic six; description and evidence filename | Filename is not an uploaded attachment; no false verification |
| Commercial Vehicle (source tax) | Local reference lookup + manual claim | Generic six; transaction reference | Distinct legal category from private car AIT |
| Others (source tax) | Manual claim | Generic six; payment purpose, authority, document kind/amount | Move extra detail to disclosure |
| AIT on Car | Local BRTA lookup and manual claim | Generic six | No live BRTA confirmation; fixture lookup must be subordinate |
| AIT (154) | Local challan lookup and manual claim | Generic six; document kind/amount, payment mode, bank/branch, zone/circle | Reference match is not proof of Treasury settlement |
| AIT Import (120) | Manual claim + CSV import | Generic six; document kind/amount, payment mode, bank/branch, zone/circle | Separate from source-tax import; double-credit prevention essential |
| Tax Paid with Return (173) | Local A-Challan lookup and manual claim | Generic six; document kind/amount, payment mode, bank/branch, zone/circle | Real Treasury verification unconnected |
| Environmental Surcharge | Dedicated add dialog | Tax & Payment ref, surcharge amount and date | Removed redundant *empty* recorded-entries panel; records still appear after save |
| Refund Adjustment | Manual claim | Order/ref, issuing authority/circle, section, eligible/adjusted amount and date | Final approved refund source and settlement unverified |
| Carry-forward under 163 | Dedicated add/edit dialog | Prior AY, credit classification, assessment order, circle, amount | Removed redundant *empty* recorded-entries panel; unified inputs; prior-return evidence unverified |
| Tax Payment Status | Read-only breakdown modal | Six bucket totals, total recorded, separately verified credit | Screen is a local reconciliation, not an official accepted transfer |

The 18-route registry counts only the ten source-tax, three AIT, two payment, two adjustment, and one status routes. Dashboard and Guide are non-financial screens.

## Design and interaction findings

1. **P1 — mobile records:** shared ledger and Salary (Others) tables required 850–1330-pixel horizontal scrolling. They now present labeled two-column cards at compact widths, retaining actual tables on desktop and row actions on both.
2. **P1 — duplicate empty panels:** Surcharge and Carry-forward showed both a purpose-built action and an empty read-only table. The table now appears only when records exist, preserving edit/delete thereafter.
3. **P1 — uneven inputs:** Carry-forward used raw `<input>`/`<select>` fields unlike manual-entry and salary forms. It now uses `LedgerInput` and `LedgerSelect` with the shared modal footer.
4. **P2 — overwhelming extra fields:** supporting evidence for eight routes was always expanded. Optional document details now sit behind a native keyboard-accessible disclosure; edited entries with populated evidence open with their details visible.
5. **P2 — noisy test controls:** local lookup fixtures were displayed as a conspicuous button row. Examples are now behind a small disclosure, keeping test access without competing with the primary action.
6. **P2 — typography:** project already loads Inter Variable and Noto Sans Bengali Variable locally. Existing Bengali language rules select Noto Sans Bengali with reduced weight variation. Avoid introducing a third font, aggressive uppercase, or independent page palettes.
7. **P0 — data authenticity:** repository and income sync are browser-local; demo/seeded data exists for taxpayer selection, lookups, and balances. No real Supabase, CGA/iBAS++, ASYCUDA, BRTA, CDBL, or Treasury write-through was verified. Do **not** claim 100% live synchronization.

## Remaining functional acceptance (must not be marked done)

| Gate | Status | Required evidence |
|---|---|---|
| Current official eReturn eLedger every input and save behavior | **Unverified** | Authenticated per-route field capture, conditional fields, validation, screenshots |
| eReturn → eLedger → Tax Payment Status → eReturn write-back | **Unverified** | End-to-end authenticated persisted workflows, duplicate and rollback proofs |
| Taxpayer/AY authorization, session isolation, external reference precedence | **Local tests only** | Production signed-in API, RLS and database regression |
| Government challan/withholding verification | **Not connected** | Approved external APIs or a reviewed local-only contract |
| 366-rule agent/legal engine version and AY certification | **Not certified here** | Rule source hashes, applicability review, 137+32 engine regressions, six end-to-end workflows |
| Mobile 320/375/768/1024 and browser cross-check | **Needs hosted visual recheck** | Screenshots, keyboard/focus, overflow and modal validation at each width |

## Release checks

Source-level TypeScript lint, 124 Node tests, and Vite build must pass before release. Preserve existing local ledger entries, category/AY isolation, duplicate checks, refunds and carry-forward boundaries. Ship only a reproducible passing checkpoint and verify the served GitHub Pages build after publication.
