---
title: "Docs Audit — sciencebouk (Round 7)"
repo: sciencebouk
lens: docs
date: 2026-07-06
round: 7
---

# Docs Audit — `sciencebouk` (Round 7)

**Scope:** Post-r4 docs drift — README, CONTRIBUTING, `docs/` hub, onboarding gaps. Read-only verification against HEAD. Cross-referenced [`docs/BUG_JOURNAL.md`](../BUG_JOURNAL.md) (r4-docs remediation log + open backlog).

**Relationship:** [`formulas`](../../formulas) is a sibling fork of the same Django/React stack (`formulas_backend` package name in both). **sciencebouk is the evolved canonical repo** (fixed README/API table, `docs/ARCHITECTURE.md`, `BUG_JOURNAL`, GPL `LICENSE`, `SECURITY.md`, custom `serve_media`). formulas still carries the June-14 audit filenames and stale root docs — see `formulas/docs/audits/2026-07-06-r7-formulas-docs.md`.

**Headline:** r4 Critical/High doc holes are largely closed in the README and new `docs/` hub. Residual drift is **CONTRIBUTING ↔ CI mismatch**, **invite onboarding still undocumented in setup**, and **hub index frozen at r1–r6**.

---

## HIGH

### H1. CONTRIBUTING backend test command still runs `courses` only — contradicts CI and README
- **Where:** `CONTRIBUTING.md:42` — `python manage.py test courses -v 2`.
- **Verified:** `.github/workflows/ci.yml:49` runs `python manage.py test -v 2` (all apps). `README.md:148-149` matches CI. CONTRIBUTING is the outlier new contributors copy from PR guidelines.
- **Impact:** A contributor following CONTRIBUTING never runs 89 `accounts` + 25 `payments` tests (286 total backend tests per BUG_JOURNAL) before opening a PR.
- **Fix:** Change CONTRIBUTING to `python manage.py test -v 2`; drop any hardcoded test counts.

### H2. CONTRIBUTING backend setup omits `seed_subjects` — fresh backend lacks subject equations 18–81
- **Where:** `CONTRIBUTING.md:17` runs only `seed_equations`; `README.md:31-32` runs both seeds.
- **Verified:** `ARCHITECTURE.md:74-76` documents subject equations ids 18–81 from `seed_subjects`. `equationManifest.ts` loads from `/api/equations/` — without `seed_subjects`, a CONTRIBUTING-only setup shows only the core 17.
- **Impact:** Contributors reproducing the full sidebar (CS, chemistry, physics subjects) get an incomplete dataset and may file false "missing equation" bugs.
- **Fix:** Add `python manage.py seed_subjects` to CONTRIBUTING backend setup; one sentence on what each seed produces (already partially in "Adding a New Equation").

### H3. CONTRIBUTING visualization standards cite Framer Motion — dependency removed from the tree
- **Where:** `CONTRIBUTING.md:49` — "Framer Motion for animations".
- **Verified:** `frontend/package.json` has modular D3 submodules only; no `framer-motion`, `@use-gesture/react`, or `d3` meta-package (pruned 2026-06-26 per BUG_JOURNAL). `README.md:53` correctly lists modular D3.
- **Impact:** New scene authors add the wrong animation library or hunt for imports that no longer exist.
- **Fix:** Align CONTRIBUTING with README: "SVG preferred, D3 submodules for scales/paths; no Framer Motion".

---

## MEDIUM

### M1. Invite-gated signup is documented in the API table but not in the setup path — `create_invite` still absent
- **Where:** `README.md:102` notes invite-gated register; no mention of `DJANGO_INVITES_REQUIRED` or `python manage.py create_invite` in Quick Start or CONTRIBUTING.
- **Verified:** `backend/.env.example:3` defaults `DJANGO_INVITES_REQUIRED=1`. `accounts/management/commands/create_invite.py` exists. A fresh clone with default env cannot register without an undocumented invite mint step (r4 H5/M6 still open).
- **Fix:** Add a "Getting an invite (dev)" subsection: `create_invite`, env flag, and the anonymous-vs-account feature tiers.

### M2. `docs/README.md` audit index stops at r1–r6 — no r7 ledger or `ROUND-STATUS.md` pointer
- **Where:** `docs/README.md:21-25` lists only the `2026-06-14-r*` batch and the `2026-06-23` security review.
- **Verified:** No `ROUND-STATUS.md` exists yet under `docs/audits/`; July r7–r9 reports are unindexed from the canonical docs hub (same pattern as circles r7 H1).
- **Impact:** Engineers landing on `docs/README.md` believe the June-14 snapshot is current; post-remediation status in BUG_JOURNAL is disconnected from the hub.
- **Fix:** Add r7–r9 entries + link to `docs/audits/ROUND-STATUS.md`; banner "status as of 2026-07-06".

### M3. `FEATURES.md` 106/100 feature tracker is orphaned from the docs hub and README
- **Where:** `docs/FEATURES.md:8` claims "106 / 100 product features ✅"; `docs/README.md` living-docs table (`:8-13`) lists ARCHITECTURE, BUG_JOURNAL, FEATURES, LEARNING_AIDS — but root `README.md` and `CONTRIBUTING.md` never link to FEATURES or LEARNING_AIDS.
- **Verified:** Subject-equation learning aids (64 equations) are documented in `LEARNING_AIDS.md` but invisible from root onboarding; FEATURES mixes `[x]` session-built vs `[P]` pre-existing counts without a regeneration guard.
- **Impact:** Contributors extending subject scenes miss `LEARNING_AIDS.md`; the FEATURES tally reads as marketing, not an auditable checklist.
- **Fix:** Link `docs/FEATURES.md` + `docs/LEARNING_AIDS.md` from README "Features" or Contributing; add "last verified" date to FEATURES header.

### M4. README keyboard-shortcuts line remains incomplete (r4 M5 carryover)
- **Where:** `README.md:67` — "arrow keys to navigate, `/` to search, `Esc` to close."
- **Verified:** `App.tsx` uses **j/k and Up/Down** (not left/right arrows), `/` **and Cmd/Ctrl+K**, plus `?`, `h`, `r`, `f`, number keys 1–9/0, and sidebar toggle — documented in FEATURES M5 but not README.
- **Fix:** Replace with accurate bindings or point to the in-app `?` overlay.

### M5. `BUG_JOURNAL.md` open backlog still cites stale r5-research items closed in code
- **Where:** `BUG_JOURNAL.md:469-470` — "C1 · `Django==5.2.1` hard-pinned".
- **Verified:** `backend/requirements.txt:1` is `Django==5.2.15`; CI runs `pip-audit` (`.github/workflows/ci.yml:46-47`). Journal open section was not reconciled after the bump.
- **Impact:** Operators treat resolved currency findings as still open; undermines BUG_JOURNAL as status dashboard.
- **Fix:** Reconcile open backlog against HEAD; move closed items to chronological log with commit SHAs.

---

## LOW

### L1. README branding slip — title says Sciencebouk, body says "Formulas exists"
- **Where:** `README.md:1` title "Sciencebouk"; `README.md:19` "Formulas exists to flip that order".
- **Verified:** `package.json` name is `sciencebouk-frontend`; live demo is sciencebo.uk.
- **Fix:** Use "Sciencebouk" consistently or explain the product name vs repo name once.

### L2. `ARCHITECTURE.md` says anonymous progress uses a "server-issued `user_id`" — code requires client UUIDv4
- **Where:** `ARCHITECTURE.md:40-41` — "server-issued `user_id` (UUID)".
- **Verified:** `ProgressUpdateSerializer` (`courses/serializers.py:101-104`) validates a **client-supplied** UUIDv4 via `validate_uuid4_user_id`; no server issuance endpoint is documented. Frontend no longer calls the anon endpoint (localStorage-only for free users).
- **Fix:** Correct ARCHITECTURE to "client-generated UUIDv4" or document the issuance flow if one is planned.

---

## Severity summary

| Sev | Count | IDs |
|-----|-------|-----|
| High | 3 | H1–H3 |
| Medium | 5 | M1–M5 |
| Low | 2 | L1–L2 |

**Top fixes:** H1 (CONTRIBUTING tests), H2 (seed_subjects), M1 (invite onboarding).

*Read-only audit — no files modified. 2026-07-06.*