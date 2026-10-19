# Phase 8 — Historic Claim Evidence Fields

This checkpoint extends the existing inline Add Entry / Edit Row table without changing the primary navigation or discarding legacy entries.

| Route | Supporting fields |
|---|---|
| Service Payment | Depositing Authority, Document Type (Challan/Certificate/Other), Document Amount, Purpose |
| Other TDS | Purpose, Depositing Authority, Document Type, Document Amount |
| Source Tax LTU | Description, Evidence File Name (metadata only; no upload) |
| AIT (154) | Document Type/Amount, Payment Mode, Bank, Branch, Tax Zone, Tax Circle |
| Tax Paid with Return (173) | Document Type/Amount, Payment Mode, Bank, Branch, Tax Zone, Tax Circle |
| AIT Import (120) | Document Type/Amount, Payment Mode, Bank, Branch, Tax Zone, Tax Circle |
| Sanchayapatra | Savings Scheme, Registration/Certificate No, Certificate Issue Date |

The ledger's `referenceNo`, `date`, `sectionCode`, `grossAmount`, and `taxDeducted` remain the main challan/reference, document date, statutory section, payment basis, and amount claimed respectively. Extra data is optional `LedgerEntry.claimEvidence` metadata; historical records without it remain supported. The table shows an expandable summary of saved details.

Validation prevents document amount being lower than the claimed amount, invalid or future-of-deduction savings issue dates, and fields saved under unrelated routes. The metadata cannot change verification status or turn a locally recorded claim into a certified credit.

**Boundaries:** This is a static, browser-local recovery checkpoint. It does **not** upload supporting file bytes, verify with NBR/eReturn, issue a treasury settlement, or replace government return filing. A real document upload requires an authenticated storage backend, per-taxpayer authorization, safe retention policy and malware scanning.
