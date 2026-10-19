# eLedger historical UI parity — visual recovery checkpoint

Date: 2026-10-19

Status: **release authorized by the user on 2026-10-19; production deployment and post-release visual checks to be confirmed separately**.

## References examined

The reference images are held in the user's ChatGPT Library, not copied into the production bundle:

1. `Shihab UX/eReturn Ledger Tax Dashboard.png` — archived eLedger dashboard design: light top masthead, fixed left grouped navigation, summary cards, category progress, recent activity, quick actions and help/footer.
2. `Shihab UX/eReturn Ledger Payment Dashboard.png` — archived eLedger payment-status design: light left rail, breadcrumb/page title, expandable breakdown, blue and green action surfaces.
3. `Shihab UX/Screenshot 2026-10-08 at 12.11.01 PM.png` — authenticated old-system AIT Import (120) details table and menu.
4. `Shihab UX/Screenshot 2026-10-08 at 12.10.28 PM.png` — authenticated old-system other TDS inline entry row.
5. `Shihab UX/Screenshot 2026-10-08 at 12.09.41 PM.png` — authenticated old-system Source Tax LTU detail modal.
6. `Shihab UX/Screenshot 2026-10-08 at 12.12.01 PM.png` — authenticated old-system Tax Payment Status summary.
7. `Shihab UX/image(20261019-020800).png` — current deployed recovery dashboard reported as visually incorrect.

## Confirmed visual defects in deployed recovery

| Element | Deployed screen | Historical/archived references | Correction |
| --- | --- | --- | --- |
| Masthead | Dark green double banner | Slim white/pale masthead with eReturn Ledger and taxpayer/AY context | Light header with working selectors and backup |
| Navigation | Dark horizontal tab bar | Persistent left grouped route menu; nested claim categories | Compact left rail with Salary, Financial Assets, Service & Professional, Trade & Other, AIT, and other-credit categories; all 18 routes accessible, historic saved-route fallback retained |
| Dashboard | 18-route documentation directory consumes home | Four summary cards, progress/activity/quick actions | Data-bound Source Tax, AIT, Other Tax Credits and Verified Tax Credit cards; no invented verification |
| Route pages | Banner-heavy route tabs and dark overview | Page title strip, category table/forms and simple pale section panels | Light contextual route titles, mobile route tabs, pale evidence panel |
| Credit total | Mixed recorded and verified visual emphasis | Separate ledger record totals and status review | Keep verified credit explicitly zero until authoritative confirmation |
| Mobile | Horizontal navigation-style layout | Compact menu to same routes | Mobile drawer with retained AY/taxpayer selection |

## Verification completed

- `npm run lint` — pass.
- `npm test` — 104 passing regression tests (including added UI structural checks).
- `npm run build` — pass.
- `git diff --check` — pass.
- Previous reconciliation and persistence service modules untouched.
- Source-tax navigation grouped and collapsed into the four archived dashboard category labels, with route links revealed on expansion.
- External “Go to eReturn” destination independently confirmed at `https://etaxnbr.gov.bd/`.
- Local Vite preview responded `200 OK` to a server-side HTTP check.

## Post-release visual acceptance

A real rendered desktop/mobile screenshot comparison and interactive route smoke test remain required. The user explicitly authorized private preview access on 2026-10-19, but the separate cloud browser returned `ERR_BLOCKED_BY_CLIENT` for the private preview URL, and the connected desktop browser previously could not reach it. The preview HTML was served correctly in the same local network namespace; this does not establish visual parity. The user subsequently instructed an immediate live release, accepting that this visual step would move to post-release review. Do not bypass browser access restrictions.

This checkpoint is approved for release following the user’s explicit instruction to make it live. Record production verification and any remaining visual differences as follow-up work.
