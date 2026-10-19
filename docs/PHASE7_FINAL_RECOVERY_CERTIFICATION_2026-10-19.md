# Original custom eLedger recovery — Phase 7 final audit

**Date:** 19 October 2026  
**Repository:** `shihab-tech04/eLedger`  
**Audited baseline:** `main` at `8819fc2e215010dd9d8c79448c10390c969fcc38` (Phase 6, merged PR #22)  
**Scope:** Recovered standalone, browser-local eLedger interface and its existing data-safety rules. Not an NBR production integration certification.

## Release decision

**Functional code and live smoke gates: PASS on the audited Phase 6 baseline.**

**Full historical visual parity and complete browser financial-transaction certification: UNVERIFIED.** This is an evidence limit, not a reason to overwrite or redesign already accepted screens. The inaccessible original suspended repository's 9 October code and the six named September screenshot files were not independently available in this Phase 7 session. Earlier Phase 1–6 screenshot comparisons remain the historical design evidence; no new 1:1 pixel-parity claim is made here.

No financial data was created, modified, paid, submitted, or deleted during live browser checks.

## Executed gates and evidence

| Gate | Result | Evidence |
| --- | --- | --- |
| Repository baseline | PASS | Fresh read of public `main`; `HEAD` = `8819fc2` and clean working tree before this audit |
| Clean dependency install | PASS | `npm ci --no-audit --no-fund` with lockfile |
| TypeScript | PASS | `npm run lint` (`tsc --noEmit`) |
| Automated regression | PASS | `npm test`: **114 passed, 0 failed, 0 skipped**, including 16 writable-route transactions, duplicate guards, Section 120 atomic batch, raw backup, taxpayer/year separation, verified-credit fail-closed logic, and 6-bucket reconciliation |
| Production assets | PASS | `npm run build`: Vite 8.3.4, assets `index-CDjzOkDs.js` and `index-B8u_e26l.css` |
| Public live build | PASS for baseline asset match | Live `https://shihab-tech04.github.io/eLedger/` served those same JavaScript/CSS asset filenames during browser inspection |
| Route availability | PASS (non-destructive browser smoke) | 10 Source Tax, 3 AIT and 4 Payment/Adjustment navigation destinations rendered their expected headings; status dialog opened independently, **17 entries + 1 modal** |
| Reconciliation UI | PASS (observed seeded context) | Six rows: Source Tax 150,000; AIT 25,000; Tax Paid with Return 40,000; Environmental Surcharge 0; Tax Refund 15,000; Carry Forward 0. Displayed recorded total **230,000**, separately authorized credit **0** |
| Assessment-year isolation | PASS (read-only browser check) | Switching to the empty 2024–2025 year showed zero across the dashboard, then 2026–2027 restored the original 230,000 context |
| Taxpayer isolation | PASS (read-only browser check) | Alternate taxpayer ANWARA BEGUM showed recorded total 8,500; switching back to MOHAMMAD RAFIQUL ISLAM restored 230,000 |
| Bengali localization | PASS for sampled primary route | Salary (Others) translated table/actions/route labels without changing the 0 amount; earlier automated tests cover core dashboard/guide/status Bengali and English |
| Narrow mobile | PASS for sampled routes | 390×844 dashboard and status dialog, 320×740 sidebar and Salary (Others) in-row editor inspected; no document-level horizontal overflow; Add new → Cancel without saving |
| Browser errors | PASS for inspected paths | No errors returned from browser console log collection after route, taxpayer/year, and mobile flows |
| Historical 9 October exact-source parity | UNVERIFIED | Original suspended source unavailable; later changes cannot be reconstructed with certainty |
| Full browser CRUD and assistive technology | UNVERIFIED | 16 route-level repository transactions are automated; live route smoke is not every browser create/edit/delete path or screen-reader/mobile AT certification |

## Protected invariants

1. The recorded ledger amount is **not** the official verified-credit amount. Local manual, import, income-sync, reference fixture, and surcharge handoff data cannot mint authoritative `VERIFIED` credits.
2. Entries remain scoped to taxpayer TIN, assessment year and route; cross-claim Section 120 and treasury-reference duplicates are guarded.
3. Existing saved data, invalid records and raw browser storage remain recoverable; the backup exports original bytes without resetting or normalizing them.
4. All 18 visible route identities are preserved. Two original inventory routes remain **provisional legal/field mappings**: contractor/supplier and house-property rental TDS; neither is relabelled legally confirmed by this UI recovery.
5. Do not substitute official eReturn/eLedger staging UI screenshots or concept dashboards for the recovered September custom eLedger baseline.

## Open evidence and environment limits

- No signed, integrated iBAS++, A-Challan, BRTA, ASYCUDA, NBR eReturn or live treasury transactions are available to this standalone GitHub Pages app. Local examples are not government responses.
- The original September image files and inaccessible October 9 source need to be recovered for exact visual-difference certification. Earlier phase-by-phase browser comparisons stand, but new Phase 7 pixel match cannot be independently asserted.
- Backend multi-user concurrency, attachment uploads, cross-browser screen reader journeys, and complete per-route browser CRUD remain outside verified scope. See `KNOWN_GAPS.md`.
- The current live site is the **Phase 6 baseline** until this Phase 7 acceptance-only change passes protected CI and deploys. Update this statement with a verified new commit and Actions result, not an assumed success.

## Post-release verification checklist

- [ ] PR checks pass on the exact final tree and merge is accepted.
- [ ] `main` Pages deployment succeeds and its commit is recorded.
- [ ] Live JS/CSS assets match the new build and the 17 financial destinations plus 1 status modal still work.
- [ ] Any missing screenshot/source evidence remains explicitly marked UNVERIFIED.

