# eLedger — Phase 6 Final Recovery Acceptance

**Starting live baseline:** Phase 5 `a96f31e`.

## Source + Test Acceptance

| Acceptance area | Evidence | State |
|---|---|---|
| Accepted shell and design tokens | No CSS, shell, navigation or layout rebuild across Phases 4–6 | Preserved |
| Complete route registry | 18 unique registered routes (10 Source Tax, 3 AIT, 2 Payment, 2 Adjustment, 1 Status) | PASS |
| Writable route persistence | 16-route add/read/edit/delete/duplicate/context matrix | PASS at repository boundary |
| iBAS++ system-only route | No Add, Edit or Delete UI; mutation layer rejects edits/deletes | PASS |
| Status reconciliation | Read-only route; category totals and authoritative-only eligibility conditions | PASS in domain tests |
| Income sync | TIN/AY isolation, duplicate state, resync after delete, saved-source corruption rejection | PASS locally |
| Local reference lookup | TIN, route, AY, reference and amount mismatch failures | PASS with fixtures |
| Carry-forward | Prior AY context, classification restore, single-claim cardinality | PASS locally |
| Browser storage | Corruption preserved, local verification flags ignored, same-instance write serialization | PASS locally |
| Route-specific lookup examples | AIT and Payment panels show only references matching their respective routes | PASS |
| Quality gates | 73 tests/subtests, TypeScript, build, diff check | PASS |

## Browser Release Gate

The deployed Phase 6 checkpoint `a4438fc` passed all 18 route
navigation/rendering checks, including source-tax tables, AIT/Payment lookup
panels, adjustment claims and the reconciliation modal. The selected taxpayer
and AY remained intact. The salary system route did not expose Edit/Delete.
Mobile 375px and desktop 1440px viewport checks found no page-level horizontal
overflow, and no console errors were observed. The deployed JS asset matched
the tested `index-jqG4gfHd.js` bundle.

The follow-up example-reference correction requires its own final Pages check:

- Payments Sec 171 and 173 show their respective A-Challan samples, not vehicle samples.
- AIT commercial/private/154 panels show route-specific references.
- The deployed JS asset hash matches the local production build.

## Important Acceptance Limits

**Recovery-checkpoint completion does not mean the original government eLedger
is certified end-to-end.** The original historical source and regulatory
evidence are incomplete. Browser form-level create/edit/delete/submit tests for
all 16 routes and multi-device accessibility certification are not supplied by
the repository test runner. The two provisional route mappings
(`contractor-supplier`, `house-property`) are still provisional.

There is no authenticated live iBAS++, BRTA, Treasury A-Challan, ASYCUDA,
official eReturn income or transactional financial backend in this deployment.
Authoritative credit posting, reconciliation with government ledgers, legal
carry-forward eligibility, and multi-user transactional safety require
external contracts and an authorized test environment. These are explicit
follow-on dependencies, not quietly accepted as complete.
