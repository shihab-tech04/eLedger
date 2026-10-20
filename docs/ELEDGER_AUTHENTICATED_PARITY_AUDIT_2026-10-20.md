# eLedger — authenticated page-by-page parity audit (20 October 2026)

## Evidence and limits

Read-only inspection of an existing authenticated NBR eReturn session (AY 2026–2027): `Tax & Payment → Update Tax Payment Status` opened **the actual staging eLedger** at `https://sledger.etaxnbr.gov.bd/#/pages/home`. Every link/route below was opened in that authenticated eLedger session. The observations are **the rendered current taxpayer state**, not a certification of every conditional state across other taxpayer profiles. We did not submit, edit, delete, claim, or save anything in the government system.

The historical ELR-02 v2 checkpoint is **18/18 fail-closed**, because its earlier staging visits returned 502/refused connections. This direct session observation is newer UI evidence; it does not cure the older **transaction or persistence** gate.

The reconstructed application at `shihab-tech04/eLedger` is a different, independently designed React/Vite project. Preserve its approved September shell instead of copying the government's outdated styling. **It has no authenticated NBR write-through, taxpayer identity token, authoritative source verifier, or hosted SQL data layer.** Neither source-code tests nor screenshot parity can certify financial-credit application.

## Authenticated 18-route inventory and source-to-app crosswalk

| # | NBR route | Visible NBR inputs, actions and columns | Reconstructed app and unresolved integration |
|---|---|---|---|
| 1 | Salary (iBAS++) | Current taxpayer returned **No TDS data found**. The official home instructions document Search / TDS Claim / Save / Edit / Delete when available. | Read-only local salary records. Real iBAS++ payroll search, claimant-specific ceiling, and Save remain **unavailable**; never synthesize a verified payroll amount. |
| 2 | Salary (Others) | Add, total claimed/count; authority, document type, reference, reference date, certificate/challan amount, claimed amount, row action | Dedicated Add/Edit modal, distinct document total and claim. Live Add form's full dynamic controls were not exposed by the inspected session. |
| 3 | Bank/FI Interest/Profit | Bank Name, Account Type, Branch Name, Account Number, Interest Amount, TDS; no free-entry Add on observed page | Add new manual bank entries removed; preserve editing old saved records. Added bank-specific evidence fields, but real income/source sync still missing. |
| 4 | Dividend | Sync From Income; authority/company, certificate reference and date, document amount, claimed amount, action | Shared sync action with manual fallback; source-linked income declarations not connected. Preserve document amount separate from personal claim. |
| 5 | Service Payment | Section 90 service types, Sync From Income, Add; authority, document type, reference/date, document amount, claim | Shared Add modal and compact Sync disclosure; documentary metadata and local duplicate checks. |
| 6 | Sanchayapatra | Scheme, registration number, issue date, instrument value, TDS claim, status | Existing joint-holder own-share cap; NSD/Income source missing. Keep instrument-level TDS separate from claimed share. |
| 7 | Source Tax Import (120) | BIN, customs office code, bill of entry/date, receipt number/date, invoice value, assessable value, total tax & duties, TDS claimed | Added typed customs evidence, mapped main reference/date/assessable value/claim; local CSV only, no ASYCUDA sync. |
| 8 | Source Tax LTU | Add Source Tax; Section, Claim Amount, Challan No, action | Manual pending-claim modal and optional record metadata. LTU authoritative confirmation missing. |
| 9 | Commercial Vehicle Source Tax | Unique Key (Transaction No.) + Reset/Search; Registration, Unique Key, Chassis, TDS Claim | Reference lookup, added vehicle evidence. Local matching cannot verify BRTA. |
| 10 | Other Source Tax | Add; purpose, authority, document type, reference/date, document amount, claim | Shared Add/Edit modal with optional evidence, status pending. |
| 11 | AIT on Car | Unique Key (Transaction No.) + Reset/Search; Registration, Unique Key, Chassis, TDS Claim | Local matching and vehicle evidence; no BRTA authoritative lookup. |
| 12 | AIT (154) | Challan No + Reset/Save; Challan, Date, Amount, Payment Mode, Bank, Branch, Zone, Circle, Action | Locally recorded challan and supporting treasury fields; no Treasury verification. |
| 13 | AIT Import (120) | Same 10 customs columns as Source Tax Import (120) | Added customs evidence while retaining old Treasury evidence fields for legacy data. Cross-route Section 120 duplicate credit rejected. |
| 14 | Tax Paid with Return (173) | Challan No + Reset/Save; Challan, Date, Amount, Payment Mode, Bank, Branch, Zone, Circle, Action | Shared Add/Edit and local reference lookup; no A-Challan settlement sync. |
| 15 | Environmental Surcharge | Current taxpayer: **No Environmental Surcharge Payable. Please set Environmental Surcharge in Tax Payment.** | Local surcharge entry remains pending only. Official payable amount must come from eReturn computation before a connected write-through is possible. |
| 16 | Adjustment of Tax Refund | Add; prior Assessment Year, Return Register/Reference No, Submission Date, Filing Zone/Circle, Refund Amount, Adjustment Claim, Action | Mapped main reference/date/refund amount/claim; added prior AY and zone/circle evidence, validated prior AY. Prior-return approval sync missing. |
| 17 | Carry Forward u/s 163 | Status **Pending**, Claim action, fetch/save previous period credit; no current claim | Our manual single-claim remains a non-authoritative local record. Prior-year API/return matching required before treating it as a connected system claim. |
| 18 | Tax Payment Status | Read-only six buckets — Source Tax, AIT, Tax Paid with Return, Surcharge, Refund Adjustment, Section 163 Carry Forward — Total and **Go to eReturn** | Local six-bucket reconciliation exists. The official current session shows a source-tax amount, but it must **not** be copied into demo/local accounts. No write-back test exists. |

The NBR home page additionally distinguishes verified source amounts from merely claimed figures and warns that withholding-agent connectivity is incomplete. The project's UI similarly keeps *recorded/pending* and *independently verified* amounts separate.

## Functional release changes from this audit

1. **Route-specific evidence**: extend one reusable ClaimEvidence editor for customs, bank, vehicle and refund columns. Existing metadata persists; old AIT Import treasury entries remain valid.
2. **Field-specific copy**: customs records use Bill of Entry / Assessable Value / Tax Claimed; refunds use return reference / submission date / refund amount / adjustment claim. BN labels are supplied in the same two-font system.
3. **Compact flow**: keep the record table as primary content, expose Income sync behind one keyboard-operable action. Existing Add/Edit is still a modal.
4. **No fabricated first-visit balances**: fresh browser storage begins with empty claims/declarations, not seeded taxpayer credits. Previously saved browser data is not migrated, cleared, or overwritten. Local fixtures continue to power isolated tests.
5. **Boundary validation**: reject invalid receipt dates and claims that label the *current* AY as a prior-year refund. Preserve Section 120 duplicate prevention, tenancy/year isolation, status fail-closed, and old records.

## Critical, still-unverified gates

- No official signed-in iBAS++, customs, BRTA, NSD, CDBL, Treasury, LTU or eReturn Income database contract is configured in this frontend. The original live session does **not** authorize repurposing its browser cookies or extracting tokens into our application.
- An eLedger-specific authorized backend and migration history must be identified before production SQL writes. Do not reuse HRIS or TaxPay credentials/projects by assumption.
- Real six-bucket write-back, authoritative source identity/AY checks, source-specific amount caps, idempotent claims, concurrency/retries and reconciliation **need transactional hosted acceptance**. None are certified by local storage.
- NBR Agent's 366-rule registry and tax-year eligibility gates are not connected to this app. W5's 137+32 calculation regressions and six persisted E2E workflows are not certified in this release; never compute statutory liabilities from guesses.
- Some conditional NBR entry dialogs were not inspectable: selecting an authenticated Add action did not expose their controls in this session. The observed tables and official NBR 2025–26 PDF/FAQ establish the listed fields, **not** every validation branch.

## Source trail

- Authenticated session: eReturn `Tax & Payment` (six buckets) → `Update Tax Payment Status` → staging eLedger, all 18 routes and Tax Payment Status, AY 2026–2027, on 20 October 2026.
- Official NBR [Income Tax FAQ](https://nbr.gov.bd/faq/income-tax-faq/eng) and [eReturn guide 2025–26](https://nbr.gov.bd/uploads/publications/Nirdeshika_2025-26.pdf); guide's earlier AY and screen layout are not assumed current.
- Existing project file `docs/ELEDGER_ROUTE_AND_UX_AUDIT_2026-10-20.md`, NBR controlled 2026 legal sources, and recovered eReturn Workstream B v0.5 (Oct 8).
- Historic ELR-02 v2 observation: `NBR_eLedger_ELR02_Staging_Audit_v2.md` and `NBR_eLedger_ELR02_18_Route_Staging_Checkpoint_v2.json` (hard gate fail-closed).

No user tax data or personal identifiers were copied out of the authenticated government pages during this audit.
