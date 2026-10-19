# Phase 9 — Mobile Forms and Saved Data Safety

This is an additive recovery checkpoint on the Phase 8 application. It does not alter taxpayer identities, storage keys, persisted ledger format, navigation, or official-credit rules.

## Changes

- The expandable Tax Payment Status route breakdown stacks the record count and amount beneath a readable route name on small screens, without changing the desktop reconciliation footer or six financial buckets.
- Inline Add Entry and Edit retain their table placement on desktop. On narrow screens the active table row includes a labeled, single-column mobile editor with Save, Cancel and its route-specific claim evidence together in the visible area. Saved rows continue to scroll horizontally when necessary.
- Optional `claimEvidence` accepts only schema-recognized field names and primitive values of the correct kind. Nulls, arrays, nested objects, wrong numeric/text types, and malformed persisted fields are rejected before they can reach the disclosure renderer.
- A failed storage read leaves the original browser value intact; no automatic fallback write erases saved records.
- The header no longer offers a global reset shortcut that could silently erase multiple taxpayer/year contexts.
- The dashboard's confirmed/provisional badges use the current route registry instead of stale literal counts. This is **route-evidence status**, not government tax verification.
- New-row date defaults use the local browser calendar day, not the UTC date.

## Verification and boundaries

Run `npm ci`, `npm run lint`, `npm test`, and `npm run build`. Existing older records without claim evidence still load. The mobile editor uses the original save/delete repository paths and cannot self-certify a claim. Phase 9 tests include corrupt evidence stored in browser storage, normal metadata read-back, and mobile editor markup. Real screen-size checks on the deployed website remain part of live acceptance.

The date validator checks a real calendar date but does not impose an invented one-size-fits-all assessment-year window; permitted historical credit dates depend on the statutory route and official guidance.
