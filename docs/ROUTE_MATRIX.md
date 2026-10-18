# NBR eReturn Ledger (eLedger) — Route Matrix & Functional Inventory

**Project:** NBR eReturn Ledger (`eRETURN-LEDGER`)  
**Phase:** Phase 0 Reconstructed Baseline  
**Total Routes Cataloged:** 18

---

## Complete 18-Route Matrix

| # | Route ID | Functional Area | Group | Statutory Section | Workflow Pattern | Implementation Status | Manual Entry | Income Sync | External Lookup |
|---|---|---|---|---|---|---|:---:|:---:|:---:|
| 1 | `salary-ibas` | Salary & iBAS++ Claims | Source Tax | Sec 86/87 (ITA 2023) | System Claim | **CONFIRMED** | No | No | Yes |
| 2 | `salary-others` | Salary Others (Private/Autonomous) | Source Tax | Sec 86 (ITA 2023) | Manual Entry | **CONFIRMED** | Yes | No | Yes |
| 3 | `bank-fi` | Bank & Financial Institutions | Source Tax | Sec 102 (ITA 2023) | Sync from Income | **CONFIRMED** | Yes | Yes | No |
| 4 | `dividend` | Dividend Income TDS | Source Tax | Sec 117 (ITA 2023) | Sync from Income | **CONFIRMED** | Yes | Yes | Yes |
| 5 | `service-payment` | Service & Professional Fees | Source Tax | Sec 89/90 (ITA 2023) | Hybrid Sync + Manual | **CONFIRMED** | Yes | Yes | Yes |
| 6 | `sanchayapatra` | Sanchayapatra (Savings Instruments) | Source Tax | Sec 105 (ITA 2023) | Sync from Income | **CONFIRMED** | Yes | Yes | Yes |
| 7 | `other-tds` | Other Source Tax / Surcharge | Source Tax | Sec 120-136 (ITA 2023) | Manual Entry | **CONFIRMED** | Yes | No | No |
| 8 | `contractor-supplier`| Contractor & Supply of Goods | Source Tax | Sec 89 (ITA 2023) | Hybrid Sync + Manual | **PROVISIONAL** | Yes | Yes | Yes |
| 9 | `house-property` | House Property Rental TDS | Source Tax | Sec 109 (ITA 2023) | Manual Entry | **PROVISIONAL** | Yes | No | No |
| 10 | `system-import` | System Records & Import TDS | Source Tax | Sec 120 (ITA 2023) | System Records / Import | **CONFIRMED** | Yes | No | Yes |
| 11 | `commercial-vehicle` | Commercial Vehicle AIT | AIT | Sec 153 (ITA 2023) | System Lookup | **CONFIRMED** | Yes | No | Yes |
| 12 | `car-ait` | AIT on Private Motor Car | AIT | Sec 153(2) (ITA 2023) | System Lookup | **CONFIRMED** | Yes | No | Yes |
| 13 | `sec-154` | AIT under Section 154 | AIT | Sec 154 (ITA 2023) | System Lookup | **CONFIRMED** | Yes | No | Yes |
| 14 | `sec-173` | Regular Tax under Section 173 | Payment | Sec 173 (ITA 2023) | System Lookup | **CONFIRMED** | Yes | No | Yes |
| 15 | `sec-171` | Advance Tax under Section 171 | Payment | Sec 171 (ITA 2023) | System Lookup | **CONFIRMED** | Yes | No | Yes |
| 16 | `refund` | Refund Adjustment | Adjustment | Sec 214 (ITA 2023) | Manual Entry | **CONFIRMED** | Yes | No | No |
| 17 | `carry-forward` | Carry-Forward / Prior-Return | Adjustment | Sec 70/215 (ITA 2023) | Single Claim | **CONFIRMED** | Yes | No | Yes |
| 18 | `tax-payment-status` | Tax Payment Status Reconciliation | Status | Schedule 3 (ITA 2023) | Reconciliation | **CONFIRMED** | No | No | No |

---

## Group Distribution Summary

- **Source Tax:** 10 routes (8 Confirmed, 2 Provisional)
- **Advance Income Tax (AIT):** 3 routes (All Confirmed)
- **Payment:** 2 routes (All Confirmed)
- **Adjustment:** 2 routes (All Confirmed)
- **Tax Payment Status:** 1 route (Confirmed modal & reconciliation engine)
- **Total:** 18 routes

## Status Definitions

- **CONFIRMED:** Statutory backing identified under Bangladesh Income Tax Act 2023 with verified workflow mapping and implemented UI.
- **PROVISIONAL:** Recognized statutory deduction category under ITA 2023 (e.g., Contractor supply under Sec 89 and House Property under Sec 109) with confirmed UI implementation, pending official NBR XML schema synchronization.
- **UNRESOLVED:** Out-of-scope or external systems (NBR TaxPay e-challan creation, general assessment order issuance) explicitly excluded from eLedger boundaries.
