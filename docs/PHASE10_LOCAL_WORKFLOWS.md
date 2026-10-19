# Phase 10 — Local Section 120 Import and Surcharge Handoff

This checkpoint completes two previously empty or partial **prototype-local** workflows without impersonating an external revenue service.

## Section 120 Source Tax / AIT import

- Both `system-import` (Source Tax) and `ait-import` (AIT) expose a local CSV file/paste editor in their existing routes.
- Exact header: `referenceNo,sourceEntity,sectionCode,grossAmount,taxDeducted,date`. One to 100 data rows per batch, maximum 1 MB.
- Commas and escaped quotes in quoted strings, UTF-8 BOM and Windows CRLF are accepted. Unknown columns, malformed decimals, invalid dates, missing references and wrong categories are rejected.
- Taxpayer TIN, assessment year and route are **derived from the currently selected UI context**, never trusted from CSV columns.
- The repository validates every staged row against the existing ledger **and other rows in the proposed batch**. It rejects duplicate references within a route or across the two Section 120 categories. A complete batch is committed in **one browser-storage write**, or nothing is committed.
- Every imported entry is marked `PENDING_VERIFICATION`, `isManual=true` and `externalVerified=false`. The CSV is local user-supplied data, **not** an ASYCUDA fetch or an NBR tax credit.

## Environmental Surcharge handoff

- The separate Environmental Surcharge payment route now accepts a taxpayer-entered source reference, surcharge amount and date from the *separate* Tax & Payment stage.
- It records those values as a local pending claim under the selected TIN/AY. The source is clearly identified as taxpayer-entered, and the receipt remains visible/editable in the existing ledger table.
- It does **not** calculate a statutory surcharge rate, assert liability, collect funds, or sync with a government payment system.
- The surcharge amount remains its own Tax Payment Status bucket and is excluded from verified credits until external authority verification exists.

## Acceptance

The automated suite exercises CSV quoted values, exact headers, invalid rows, cross-route duplicate rejection, all-or-nothing import, failed browser-storage writes, TIN/year isolation and surcharge reconciliation. The desktop shell, mobile in-row editing, six status buckets and fail-closed tax-credit semantics from earlier phases remain unchanged.

**External dependencies still outstanding:** Official ASYCUDA or NBR API access, authoritative challan matching, real Tax & Payment transfer feed, taxpayer authentication and a secured backend. These require service-owner coordination and cannot truthfully be simulated as authoritative integrations.
