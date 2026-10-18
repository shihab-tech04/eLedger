# eLedger — Phase 5 Data Integrity and Reconciliation

**Baseline:** Phase 4 `3a84a59` (deployed, verified 2026-10-18)

## Closed Local Integrity Cases

1. Persisted ledger rows now require valid numeric types, known assessment
   years, declared status/workflow values, valid calendar dates, valid route
   category mappings and unique entry IDs. Unreadable or inconsistent data
   remains byte-for-byte unchanged in browser storage; financial summaries
   are not computed from partially parsed records.
2. Concurrent add/edit/delete/reset operations are serialized within a
   repository instance; failed requests do not prevent a later valid write.
3. A taxpayer cannot record the same treasury challan under both Payment
   sections 171 and 173 in the same assessment year. Independent reference
   namespaces (e.g. AIT vs. Payment) are not conflated.
4. External lookup responses must identify the exact TIN, route, reference,
   assessment year and consistent amounts. A successful response that omits
   its route or assessment year fails closed.
5. The existing verification boundary remains: no browser-stored flag or
   locally matched record becomes a government-verified tax credit.

The Phase 5 native suite adds ten cases/subcases to the Phase 4 suite,
including concurrent saves and corrupt-record preservation. All prior route
transaction tests are retained.

## External Connectivity — Not Misrepresented as Complete

This standalone GitHub Pages frontend does **not** have service credentials,
official API contracts or authenticated backend access for iBAS++, BRTA,
A-Challan, ASYCUDA or official eReturn income statements. The local reference
service and income declarations remain non-authoritative. There is no path to
fully certify those external integrations from the checked-in repository.

End-to-end government posting, official payment settlement and legally
certified carry-forward eligibility remain separate acceptance dependencies.
They cannot be counted as Phase 5 passes until an authorized service and
test environment are supplied.

## Boundary of Concurrent Storage Guarantees

The queue protects overlapping writes within a single repository instance.
Browser `localStorage` has no cross-tab atomic compare-and-swap transaction,
so truly simultaneous operations in independent tabs are not guaranteed
serializable. A transactional backend is required for that guarantee.
