# eLedger Phase 7 — Screenshot and eReturn Agent Alignment

## Evidence inspected

- **October 8, 2026:** 28 original authenticated eLedger screenshots, captured at 12:08–12:12 PM local timestamp in the project evidence set, AY 2026–2027. The images include Home/claim branches, Source Tax LTU, Section 120 Import, Commercial Vehicle, AIT on Car, AIT (154), AIT Import (120), Section 173, Environmental Surcharge, refund adjustment, Section 163 carry-forward, and Tax Payment Status.
- NBR eLedger EL-1 to EL-5 and EL-16 public-authoritative knowledge baselines.
- NBR Agent ELR-02 staging checkpoint and October 8 audit: 18 candidate routes, legal period/identity/amount guard, all government backend credit decisions fail closed.
- Current recovered `shihab-tech04/eLedger` Phase 6 checkpoint (`904b8c1`) as the approved implementation and UI baseline.

## Active route crosswalk

| Screenshot group | Active route ids | Count |
|---|---|---:|
| Claim Source Tax | `salary-ibas`, `salary-others`, `bank-fi`, `dividend`, `service-payment`, `sanchayapatra`, `system-import`, `source-ltu`, `commercial-source`, `other-tds` | 10 |
| Claim AIT | `car-ait`, `sec-154`, `ait-import` | 3 |
| Tax Paid with Return / Surcharge | `sec-173`, `environmental-surcharge` | 2 |
| Adjustments | `refund`, `carry-forward` (s.163) | 2 |
| Tax Payment Status | `tax-payment-status` | 1 |
| **Total** | | **18** |

The existing dashboard/nav shell, inline tables, context switching, and compact Tax Payment Status modal are retained. The Payment group presents Tax Paid with Return and Environmental Surcharge as distinct tabs rather than adding a disruptive new top-level navigation component.

## Preserved historic data

The Phase 0–6 route IDs remain readable and valid for existing records. `contractor-supplier`, `house-property`, `commercial-vehicle` (historically under AIT), and `sec-171` are no longer shown as current screenshot-evidenced routes on an empty ledger, but the corresponding tabs are displayed to a taxpayer **whenever that taxpayer has previously saved entries there**. No existing record is migrated, deleted, automatically credited, or reclassified.

## Confirmed screenshot differences addressed

1. Source Tax LTU and commercial-vehicle source-tax routes exposed separately.
2. Section 120 Source Tax Import and AIT Import remain separate records; duplicate customs reference across them is rejected in the same TIN/AY.
3. Commercial vehicle source-tax reference is treated separately from private-car Section 153; the historical commercial AIT record identity is retained.
4. Section 173 payment and Environmental Surcharge have distinct screens and status buckets.
5. Section 163 carry-forward title, new section code, and claim selection corrected without rewriting older records.
6. Sanchayapatra sync allows claiming **only the taxpayer portion** of instrument-level TDS, with a strict positive/upper-bound check. No income-sync claim is automatically verified.
7. Tax Payment Status displays six separate recorded buckets, as in the screenshot, while the verified-credit total remains fail-closed.

## Remaining work — do not mark complete without evidence

- **Field parity:** Salary Others, Other TDS and Service Payment certificates need payment document type, challan/certificate reference amount versus taxpayer claim amount, and reference date. LTU needs section, amount, challan, description, and supporting file. Section 154 needs payment mode, bank, branch, zone and circle fields. These are not yet represented as a complete per-route structured evidence schema in the generic table.
- **Source service dependencies:** actual iBAS++, Sanchayapatra, BRTA, treasury/A-Challan and Customs/ASYCUDA responses are not connected. Staging ELR-02 cannot certify them. No local lookup result proves an authorized tax credit.
- **eReturn roundtrip:** taxpayer-authenticated forward and return navigation, live income declarations, AY selection, and Section 163 computation are not bound to a real eReturn backend.
- **Historical legal versions:** source-event date, income year, assessment year, and controlled statutory amendments must be resolved by the NBR Agent rules engine before calculation/automatic credit.
- **Financial acceptance:** browser create/edit/delete, cross-tab concurrency, reconciliation handoff, and actual transaction settlement need independent end-to-end acceptance on a wired backend.

This is a **functional screenshot-alignment checkpoint**, not certification of the government production system.
