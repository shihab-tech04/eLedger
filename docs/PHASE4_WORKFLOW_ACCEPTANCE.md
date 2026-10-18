# eLedger — Phase 4 Workflow Transaction Acceptance

**Baseline:** Phase 3 `789e002` (deployed and confirmed live on 2026-10-18)

## Executable Acceptance Matrix

The native test runner executes a complete repository transaction sequence for
each of the **16 manual-writable routes**: create → read in the selected taxpayer
and assessment year → reject duplicate → edit → check taxpayer/year isolation →
delete → confirm absence. The suite also verifies that these entries do not
become authoritative credits, including after reconciliation.

| Route group | Routes covered | CRUD result |
|---|---|---|
| Source Tax | `salary-others`, `bank-fi`, `dividend`, `service-payment`, `sanchayapatra`, `other-tds`, `contractor-supplier`, `house-property`, `system-import` | PASS (9) |
| AIT | `commercial-vehicle`, `car-ait`, `sec-154` | PASS (3) |
| Payment | `sec-173`, `sec-171` | PASS (2) |
| Adjustment | `refund`, `carry-forward` | PASS (2) |

The remaining two of the 18 registered routes have different contracts:

- `salary-ibas`: system-only, manual writes rejected by repository validation;
  existing reference rows render. No official iBAS++ connection exists.
- `tax-payment-status`: read-only reconciliation modal; write attempts rejected;
  category totals and verified-credit exclusions covered by tests.

## Phase 4 Repairs

- The income-sync status display and duplicate guard use the same case- and
  whitespace-insensitive comparison as repository validation. A differently
  capitalized existing reference cannot be offered for re-sync.
- The carry-forward form resets from the correct persisted claim when a claim
  is first added or deleted without navigating away.
- A failed inline-row deletion now displays an error rather than appearing
  successful.
- The repository rejects manual records on routes that disallow manual entry
  and prevents income-sync records on unsupported routes.

## Exact Evidence Boundaries

The 16-route matrix is an **automated repository-level transaction suite**,
not 16 automated browser form submissions. The Phase 3 browser smoke matrix
already confirmed all 18 route surfaces render and remain available; the
Phase 4 changes preserve their markup/layout. The live browser should be
checked again after this checkpoint deploys. Browser form-level automation,
multi-device accessibility, real data sources, and government verification
cannot be inferred from these repository tests.
