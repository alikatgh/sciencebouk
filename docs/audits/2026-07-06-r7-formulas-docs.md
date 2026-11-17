---
title: "Docs Audit — formulas (Round 7)"
repo: formulas
lens: docs
date: 2026-07-06
round: 7
---

# Docs Audit — `formulas` (Round 7)

**Scope:** README/CONTRIBUTING/onboarding drift vs current source. Read-only verification. **No `BUG_JOURNAL.md` in this repo** — cross-referenced [`sciencebouk/docs/BUG_JOURNAL.md`](../../sciencebouk/docs/BUG_JOURNAL.md) and June-14 audits (still named `*sciencebouk*` in `docs/audits/`).

**Relationship:** formulas and [`sciencebouk`](../../sciencebouk) share the same stack (`formulas_backend` Django package, identical urlconf shape, `sciencebouk-frontend` package name). **sciencebouk is the evolved canonical fork** — it fixed r4 Critical/High doc gaps (Docker honesty, full API table, `ARCHITECTURE.md`, `LICENSE`, `SECURITY.md`, equation table order). **formulas retains the pre-remediation README/CONTRIBUTING** and still commits `docker-compose.yml` (sciencebouk intentionally does not).

**Headline:** formulas docs are **~8 weeks behind sciencebouk**. Most r4-docs Critical/High findings that sciencebouk closed in June are **still open here**.

---

## CRITICAL

### C1. README + CONTRIBUTING advertise a Docker quickstart that sciencebouk deliberately removed — formulas compose may work but docs diverge from canonical guidance
- **Where:** `README.md:41-47`, `CONTRIBUTING.md:30-34` — `docker compose up --build`, ports `:3000`/`:8000`.
- **Verified:** `docker-compose.yml` **is committed** (backend + frontend services). sciencebouk `README.md:41-46` explicitly warns compose is private infra and **not** in the public repo.
- **Impact:** Two repos documenting the same product with contradictory Docker stories; operators following sciencebouk cannot compose, operators following formulas can — fork confusion.
- **Fix:** Pick one policy: either align with sciencebouk (document local-only dev) or document formulas as the "infra-included" fork with a prominent banner.

---

## HIGH

### H1. README tech stack is stale — lists removed/unused packages
- **Where:** `README.md:54-55` — "D3.js 7.9, Konva 10.2, Framer Motion 12.6".
- **Verified:** `frontend/package.json` has `"d3": "^7.9.0"`, `framer-motion`, `@use-gesture/react` — **no Konva** anywhere in `frontend/src` (grep empty). sciencebouk pruned to modular D3 submodules only.
- **Impact:** Contributors install/visualize with the wrong mental model; Konva is a phantom dependency in docs.
- **Fix:** Regenerate tech-stack row from `package.json`; drop Konva; note modular D3 migration path from sciencebouk.

### H2. README API table documents 6 of ~25 routes — omits auth, payments, progress, analytics
- **Where:** `README.md:75-82` — six public endpoints only.
- **Verified:** sciencebouk `README.md:72-118` documents the full grouped table (auth, Pro, payments, anon-progress label). formulas backend urlconfs match sciencebouk (`accounts/`, `payments/`, progress routes).
- **Impact:** API integrators miss JWT auth, invite-gated register, Stripe webhook, Pro-gated `/api/progress/*`.
- **Fix:** Port sciencebouk README API section or generate from urlconf.

### H3. README "17 Equations" table mis-orders positions 5–9 — breaks `/equation/N` deep links
- **Where:** `README.md:88-99` vs canonical `frontend/src/data/equations.json` order.
- **Verified:** README pos 5 = "Complex Numbers"; JSON id 5 = **Wave Equation**. Positions 5–9 are scrambled (same r4-docs M4 finding sciencebouk fixed 2026-06-26).
- **Impact:** `README.md:65` advertises `/equation/3` — table `#` column points at wrong equations for 5–9.
- **Fix:** Regenerate from `equations.json` / `seed_equations.py` sort_order.

### H4. README + CONTRIBUTING hardcode wrong test counts and run `courses` only
- **Where:** `README.md:109-113`, `CONTRIBUTING.md:42-43` — "Frontend: 8 tests", "Backend: 76 tests", `test courses`.
- **Verified:** CI (`.github/workflows/ci.yml:45`) runs `python manage.py test -v 2` — 265 `def test_` methods across backend apps; frontend has 40+ test files. sciencebouk fixed this in README/CI June 2026.
- **Impact:** Contributors under-test auth/payments; false confidence from stale counts.
- **Fix:** `python manage.py test -v 2` + `npm run test` without hardcoded numbers.

### H5. No engineering docs hub — missing ARCHITECTURE, BUG_JOURNAL, LICENSE, SECURITY
- **Where:** `docs/` contains only `audits/`, demo gif, poster — no `docs/README.md`, `ARCHITECTURE.md`, `BUG_JOURNAL.md`.
- **Verified:** sciencebouk has full hub + `LICENSE` (GPL-3.0-or-later) + `SECURITY.md`. formulas has **no LICENSE file** (glob empty).
- **Impact:** No "grep before debug" journal; security reports have no private channel; redistribution terms undefined despite public demo link.
- **Fix:** Port sciencebouk `docs/` hub + legal files, or add a README banner pointing to sciencebouk as canonical.

### H6. CONTRIBUTING "Adding a New Equation" points at wrong files (r4-docs H6 — still open)
- **Where:** `CONTRIBUTING.md:54-56` — `equations.ts`, `EquationVisualization.tsx`.
- **Verified:** Data lives in `equations.json`; scenes register in `sceneRegistry.ts` (sciencebouk CONTRIBUTING fixed this).
- **Fix:** Copy sciencebouk CONTRIBUTING steps 1–5.

---

## MEDIUM

### M1. Audit artifacts still named `*sciencebouk*` — fork identity undocumented
- **Where:** `docs/audits/2026-06-14-r*-sciencebouk-*.md` (11 files).
- **Verified:** Repo path is `formulas/`; README title is "Sciencebouk"; package name `sciencebouk-frontend`.
- **Impact:** Cross-repo audit tracking assumes one repo; July r7 reports must use `formulas` slug to avoid collision.
- **Fix:** Add `docs/README.md` explaining fork relationship; optionally rename audit prefix on next pass.

### M2. README body says "Formulas exists" under Sciencebouk title — same branding slip as sciencebouk
- **Where:** `README.md:1` vs `README.md:19`.
- **Fix:** Harmonize product naming.

### M3. Docker compose seeds only `seed_equations` — subject equations 18–81 missing from compose path
- **Where:** `docker-compose.yml:16` — `seed_equations` only.
- **Verified:** sciencebouk README runs `seed_subjects` in local dev; full sidebar needs both.
- **Fix:** Add `seed_subjects` to compose command or document the gap.

### M4. No `docs/LEARNING_AIDS.md` — subject "Learn more" panel undocumented
- **Verified:** sciencebouk documents 64 subject equations' facts/checks/prerequisites in `LEARNING_AIDS.md`. formulas has the data modules if synced, but no contributor doc.
- **Fix:** Port or link sciencebouk `LEARNING_AIDS.md`.

### M5. June-14 audit index is the only docs entry point — frozen at r1–r6
- **Where:** No `ROUND-STATUS.md`; no July audits until this r7 file.
- **Fix:** Add `docs/audits/ROUND-STATUS.md` (this session).

---

## LOW

### L1. Live demo URL points to sciencebo.uk — same as sciencebouk; fork deployment story unclear
- **Where:** `README.md:7`.
- **Fix:** State whether formulas is source for that deployment or a dev fork.

### L2. `SETUP.md` / `DEPLOY_*.md` exist at repo root but are not linked from README
- **Verified:** Glob shows `SETUP.md`, `DEPLOY_CPANEL.md`, `DEPLOY_NAMECHEAP.md` — README points only to `.env.example` and CONTRIBUTING.
- **Fix:** Link deploy docs from README or consolidate.

---

## Severity summary

| Sev | Count | IDs |
|-----|-------|-----|
| Critical | 1 | C1 |
| High | 6 | H1–H6 |
| Medium | 5 | M1–M5 |
| Low | 2 | L1–L2 |

**Recommendation:** Treat sciencebouk doc fixes as the merge source of truth; formulas r7 is largely r4 carryover.

*Read-only audit — 2026-07-06.*