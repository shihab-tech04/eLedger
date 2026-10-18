# eLedger — Phase 3 Route and Workflow Acceptance

**Date:** 2026-10-18  
**Baseline browser build:** Phase 2 Pages checkpoint `77669b4`  
**Phase 3 code:** Pending PR and deployment at time of writing

## Live Route-Rendering Checks

Each route below was selected in the live Pages application. Its correct route
heading and expected workflow container (table, lookup, claim form, or modal)
were observed. These are UI *rendering/navigation* checks, not a claim that each
route's financial transaction, evidence submission, or backend integration has
been accepted end to end.

| Route | Area | Workflow surface in source | Live rendering |
|---|---|---|---|
| `salary-ibas` | Source Tax | Read-only source records | PASS |
| `salary-others` | Source Tax | Manual inline table | PASS |
| `bank-fi` | Source Tax | Income sync + inline table | PASS |
| `dividend` | Source Tax | Income sync + inline table | PASS |
| `service-payment` | Source Tax | Income sync + inline table | PASS |
| `sanchayapatra` | Source Tax | Income sync + inline table | PASS |
| `other-tds` | Source Tax | Manual inline table | PASS |
| `contractor-supplier` | Source Tax | Hybrid sync/manual; provisional | PASS |
| `house-property` | Source Tax | Manual inline table; provisional | PASS |
| `system-import` | Source Tax | Local reference table, no live importer | PASS |
| `commercial-vehicle` | AIT | Local lookup + manual table | PASS |
| `car-ait` | AIT | Local lookup + manual table | PASS |
| `sec-154` | AIT | Local lookup + manual table | PASS |
| `sec-173` | Payment | Local A-Challan lookup + manual table | PASS |
| `sec-171` | Payment | Local A-Challan lookup + manual table | PASS |
| `refund` | Adjustment | Manual inline table | PASS |
| `carry-forward` | Adjustment | Single claim + read/edit table | PASS |
| `tax-payment-status` | Reconciliation | Modal; expandable groups and totals | PASS |

## Phase 3 Correctness Work

- Prior assessment years track the current AY; editing a carry-forward claim
  restores its recorded classification and origin where available.
- Single-claim routes reject a second claim in the same taxpayer/AY, even with
  a different reference.
- Browser-stored verification flags never become authoritative credits.
- Local ledger reads refresh storage before a new write; other-tab changes
  trigger a context refresh.
- Income sync reads reject malformed saved data without overwriting it; sync
  success depends on the ledger commit, not a redundant metadata write.
- Local reference lookups accept case-insensitive input while retaining route,
  taxpayer, and AY checks.

## Acceptance Boundaries

Still unverified: full save/edit/delete journey for each route, multi-browser
accessibility and layout acceptance, actual iBAS++/BRTA/A-Challan/ASYCUDA
integrations, legal carry-forward eligibility, and authoritative tax-credit
posting. The local tests use synthetic fixtures only.
