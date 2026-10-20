# eLedger frontend-only release checkpoint — 20 October 2026

## Scope

This repository is a standalone React/Vite reconstruction. Supabase, SQL, NBR
Rules Engine, taxpayer API connectivity, and a hosted backend are **not**
dependencies of this frontend release. Browser-local claim records are not
government-verified tax credits.

The existing September UI shell, 18-route registry, category fields, menu,
calculation semantics, and local taxpayer/assessment-year isolation remain
unchanged. The authenticated AY 2026–2027 route/control crosswalk is recorded
in `ELEDGER_EXACT_FIELD_PARITY_GATE_2026-10-20.md`.

## Corrected in this checkpoint

1. Empty read-only and official manual tables render as one legible mobile
   empty-state row, not a two-column pseudo-card with a phantom Action line.
2. Sanchayapatra record status displays localized user copy instead of raw
   storage enum values; persisted status values are unmodified.
3. Manual service/other-TDS edits with the unsupported legacy `OTHER`
   document type stop without silently converting or rewriting the entry.
4. Missing legacy document types in Salary (Others), Service Payment, and
   Other TDS remain unselected on edit. Users must choose the original
   challan/certificate type before saving; new-entry defaults and the
   observed source fields are unchanged.

## Pre-release safety

- Existing Git repository cloned and original source checked at
  `dac503578c61a8286fd7eba761a3d6f8a826583f` before edits.
- Complete pre-release Git bundle stored outside GitHub as
  `eLedger_PRE_RELEASE_full_git_history_dac5035_2026-10-20.bundle`.
- Local bundle SHA-256:
  `95ab1363cc848ac0f4c158c79775b84711178531168e0b19f3948d1d3545efbe`.
- Bundle independently verified and restored to the same commit; Drive upload
  readback confirmed the file exists and has a 1,530,047-byte size.
- Frontend test suite, TypeScript check, production Vite build and npm
  production dependency security audit must pass on the final commit.

## Acceptance boundary

Passing local tests and hosted smoke checks prove this checkpoint builds and
the observed UI contracts behave as tested. They do **not** certify pixel-level
identity with every historical screenshot, every conditional government
taxpayer state, or authoritative credit verification. Those statuses must remain
separate from successful frontend publication.
