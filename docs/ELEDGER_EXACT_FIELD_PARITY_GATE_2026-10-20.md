# eLedger exact-field parity gate — 20 October 2026

## Source and scope

Compared the 18 visible, authenticated pages of the live NBR e-Return Ledger at
`https://sledger.etaxnbr.gov.bd/#/pages/home` for Assessment Year 2026–2027.
The authenticated route was reached from eReturn → Tax & Payment → Update Tax
Payment Status. Inspected all 18 routes, opened the original Add interface on
Salary (Others), Service Payment, Others, LTU and Refund, and inspected Select
options without saving taxpayer data.

This document is a **field-level release gate**, not a production verification
certificate. The source system's authority, backends and live taxpayer records
are not reproduced by a local storage simulation.

## Original forms and reconstructed surfaces

| NBR route | Original input controls seen | Local form decision | Field evidence |
|---|---|---|---|
| Salary (iBAS++) | No input in the observed no-record state | No invented entry form | No TDS data found |
| Salary (Others), §86 | Authority, document type (Challan/Certificate), reference, date, document amount, claimed amount | Six-field modal, exactly two document-type options; removed Bank/Branch and Other | Live Add row |
| Bank/FI | No Add; bank, account, branch, interest, TDS output columns | Read-only 7-column table | Live page |
| Dividend | Sync From Income; no manual Add; six data columns + SL | Read-only table and Sync action | Live page |
| Service Payment, §90 | Same six inputs as Salary (Others), document type starts Select One; Sync From Income | Six-field modal, Sync action | Live Add row |
| Sanchayapatra | No Add; scheme, registration, issue date, value, TDS claim, status | Read-only 7-column table | Live page |
| Source Import, §120 | No Add; BIN, customs, bill, receipt, invoice, assessable value, duties, claim | Read-only 11-column table | Live page |
| Source Tax (LTU) | Section dropdown, Amount, Challan No, Description, File | Five-field modal and matching four-column record list + actions | Live Add dialog |
| Commercial Vehicle | Unique Key (Transaction No.) with Search/Reset; returned registration/chassis/TDS table | One-input lookup and 6-column output | Live page |
| Others TDS | Purpose dropdown, authority, type, reference, date, document amount, claimed | Seven-field modal; 47 source-observed purpose choices | Live Add row |
| AIT on Car | Unique Key (Transaction No.) with Search/Reset | One-input lookup and 6-column output | Live page |
| AIT (154) | Challan No. only, Save/Reset; nine result fields + SL | One-input lookup; no manual treasury editor | Live page |
| AIT Import (120) | Read-only same 11 customs columns as source import | Read-only table | Live page |
| Tax Paid with Return (173) | Challan No. only, Save/Reset; nine result fields + SL | One-input lookup; no manual treasury editor | Live page |
| Environmental Surcharge | No fields in observed no-surcharge state | No manual surcharge form in empty state | Live page |
| Refund Adjustment | AY, reference, submission date, zone dropdown, *zone-dependent circle dropdown*, refund amount, adjustment claim | Seven-field modal; all 50 current zone-to-circle lists observed and reproduced, with selected-zone validation | Live Add row + 50 zone selections on 20 October |
| Carry-forward §163 | Claim action, no manual fields, pending status | One Claim action, no speculative five-field form; no false posting | Live page |
| Tax Payment Status | Six read-only buckets; total | Read-only six-bucket status screen | Live page |

### Mandatory unresolved gates for 100% certification

1. **Refund circle option *snapshot* is complete for the observed year, but
   server synchronization is not.** We selected each of the 50 official Tax
   Zones in the authenticated AY 2026–2027 refund Add row and captured its
   entire dependent Circle list, including exact special suffixes, case,
   ordering and exceptional labels. `src/domain/refundCircleOptions.ts`
   reproduces these 50 lists; selecting a different zone clears the old circle,
   and a mismatched circle is rejected. This closes the *observed dropdown
   parity* gap. It does not provide an authorized dynamic NBR endpoint to
   refresh options when NBR changes them, nor a backend to verify or submit a
   refund claim.
2. **LTU file upload is not connected.** The local form displays the exact File
   input but currently records the filename only. It does not send evidence to
   the official NBR document service.
3. **External source-fed behavior is absent.** CGA/iBAS++, withholding-agent
   feeds, bank, savings, NBR eReturn Income sync, customs ASYCUDA, BRTA,
   A-Challan/Treasury, prior-year credits and the tax payment backend cannot
   be certified in a browser-local ledger. An empty table is *not proof* that
   the route is generally read-only in every possible taxpayer state.
4. **Conditional form paths are not exhausted.** Vehicle searches, positive
   environmental surcharge, earned prior-year carry-forward and populated
   imported/synced records were not submitted or modified in the taxpayer's
   original account. Live taxpayer writes were deliberately avoided.
5. **Official challan Save is not equivalent to local reference search.**
   The visible input count and output columns match, but verification and
   persistence semantics require the actual authorized treasury API.
6. **No backend/application SQL parity certification.** The reconstructed
   eLedger still uses browser-local records, not the same authorized NBR
   databases. Manual local records do not prove a verified tax credit.

## Safeguards and current validation

- Original 18 route names and paths retained; solved visual shell preserved.
- Old user records stay in storage; unsupported historic fields are not
  silently converted into newly entered fields.
- Exact original table column sets are rendered on the source-fed routes.
- Extra manual Add controls have been suppressed where the source did not
  show them; unsupported external claims remain fail-closed.
- The code-level route/input manifest is
  `src/domain/officialLedgerFields.ts`.
- The AY 2026–2027 zone-dependent Circle registry is
  `src/domain/refundCircleOptions.ts`; 50/50 zone lists were observed.
- The new source-backed manuals are
  `src/components/tables/OfficialManualClaimsTable.tsx`;
  the read-only table is `OfficialReadOnlyTable.tsx`.

**Validation:** 135/135 local tests, TypeScript lint and Vite production build
PASS for this updated checkpoint. That test count is not an official source-data
transaction acceptance count.

**Release decision:** NOT CERTIFIED for the user's strict "100% no more, no
less" field **and function** rule. Preserve this tested checkpoint on a review
branch, but do not publish it to the main production eLedger URL until the
external-function, secure persistence and conditional-state gates pass.
