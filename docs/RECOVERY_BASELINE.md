# NBR eReturn Ledger — Recovery Baseline (Phase 0)

## 1. Project Background & Context

- **Historical Repository:** `https://github.com/shihabshajib01-cell/eRETURN-LEDGER`
- **Deployment URL:** `https://shihabshajib01-cell.github.io/eRETURN-LEDGER/`
- **Interruption Context:** The original project reached PR #16 (commit `7022860`) on October 9, 2026. PR #17 was interrupted due to GitHub access failures.
- **Goal:** Clean-slate reconstruction of the baseline application without claiming 100% restoration of missing proprietary assets, while strictly fulfilling all engineering, statutory, workflow, and architectural constraints.

## 2. System Purpose & Integration Boundaries

eLedger functions within the Bangladesh National Board of Revenue (NBR) eReturn system to manage, track, verify, and reconcile tax payments and tax credits prior to final return submission.

### Intended Ecosystem Journey
```text
eReturn Portal
    └── Tax & Payment Section
         └── "Update Tax Payment Status" Action
              └── eLedger Sub-System (Active Application)
                   └── Tax Payment Status Modal
                        └── Return to eReturn Final Schedules
```

### Explicit Boundaries
- **No Boundary Merging:** eLedger does not generate raw Treasury challans (handled by NBR TaxPay) or issue assessment notices (Office Management).
- **Fail-Closed Verification:** No simulation of fictitious external government connectivity in production mode. External lookup records are strictly checked against taxpayer TIN; if unavailable or mismatched, the system fails closed.
- **Unverified Status Discipline:** Purely manual user entries are flagged as `PENDING_VERIFICATION` or `DRAFT` and never automatically converted to authorized tax credits.

## 3. Workflow Architecture Rebuilt

1. **System Claim:** iBAS++ integration for government salary TDS (Sec 86/87).
2. **Manual Ledger Entry:** Clicking **Add Entry** inserts an editable row directly inside the table with inputs, Save, Cancel, and in-row Edit/Delete.
3. **Sync from Income:** Synchronization from declared eReturn income heads (Bank profit Sec 102, Dividend Sec 117, Sanchayapatra Sec 105).
4. **Hybrid Sync + Manual:** Combined declaration sync and certificate entry (Service Payment Sec 89/90).
5. **System Lookup:** Validates BRTA vehicle tax tokens, Section 154 challans, and Section 173 payments with fail-closed and TIN mismatch rejection.
6. **System Records / Import:** ASYCUDA Customs bill of entry import records (Sec 120).
7. **Single Claim:** Dedicated single-entry prior return carry-forward (Sec 70/215).
8. **Reconciliation:** Compact Tax Payment Status modal with expandable Source Tax and AIT sections, dynamic totals, and fixed footer.

## 4. Statutory Legal Basis

Built under the legal framework of the **Bangladesh Income Tax Act, 2023 (ITA 2023)**. The frozen statutory tax-law registry is preserved as an external reference dependency without synthesizing statutory amendments from memory.
