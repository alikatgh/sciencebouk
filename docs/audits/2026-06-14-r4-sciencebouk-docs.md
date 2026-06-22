---
title: "Docs Audit — ScienceBouk (Verified)"
repo: sciencebouk
lens: docs
date: 2026-06-14
round: 4
---

H3 fully confirmed: `update_progress` is `AllowAny` (anonymous, throttled, keyed on `anon_id`), while the real user-progress endpoints (`my_progress`, `update_my_progress`, `bulk_sync_progress`, `learning_dashboard`, `log_event`) are all `IsAuthenticated` and undocumented in the README. The README mislabels the anonymous endpoint as "Update user progress."

I have verified every finding. Let me do a final consolidation check on the exact README/CONTRIBUTING line numbers cited and confirm the LICENSE/SECURITY absence one more time (already done: no matches). I have everything needed. Here is the final verified report.

---

# Docs Audit — Sciencebouk (VERIFIED)

Repo: `/Users/svetlana/Documents/projects/sciencebouk` · branch `main` · HEAD `36257b4` · **read-only, no files modified.**

Every finding below was re-checked against the working tree. Corrections to the draft are flagged inline. Net: **1 Critical, 6 High, 8 Medium, 5 Low**, with one Low (L5) downscoped for an inaccurate citation, and a new Low (L6) added. No findings removed as false positives — all draft claims held up.

## Severity summary
| Sev | Count | IDs |
|-----|-------|-----|
| Critical | 1 | C1 |
| High | 6 | H1–H6 |
| Medium | 8 | M1–M8 |
| Low | 6 | L1–L6 |

---

## CRITICAL

### C1. The headline Docker quickstart cannot run from a clean clone — all compose/Dockerfile/nginx-prod files are gitignored
- `README.md:41-47` ("### Docker", `docker compose up --build`, "Frontend: http://localhost:3000 / API: http://localhost:8000") and `CONTRIBUTING.md:30-34` document Docker as a primary run path.
- `.gitignore:73-77` ignores `docker-compose.yml`, `docker-compose.prod.yml`, `nginx.prod.conf`, `backend/Dockerfile`, `frontend/Dockerfile`. **Verified absent:** `git ls-files | grep -iE 'docker|compose|Dockerfile|nginx'` returns only `frontend/nginx.conf`.
- `frontend/nginx.conf:2` is `listen 80;` and `:12` is `proxy_pass http://backend:8000;` — it references a `backend` compose service that exists in no tracked file and never binds `:3000`. The `:3000` in the README comes from a gitignored compose port mapping no cloner has.
- **Impact:** a fresh clone running the advertised Docker command hits "no configuration file provided." Verified accurate.
- **Fix:** either commit a minimal non-secret `docker-compose.yml` + both Dockerfiles for the dev path, or delete the Docker sections from README/CONTRIBUTING and label Docker as private infra. Don't document a path whose files are intentionally excluded.

---

## HIGH

### H1. Docs + CI run only the `courses` test app — 93 of 247 backend tests (all of accounts + payments) never run, and the stated "76" is wrong
- `README.md:112-113` ("Backend: 76 tests", `python manage.py test courses -v 2`), `CONTRIBUTING.md:43` (same command), and `.github/workflows/ci.yml:43` (`python manage.py test courses -v 2`).
- **Verified counts (`def test_` methods):** `courses` 154, `accounts` 70, `payments` 18, `formulas_backend` 5 = **247 total**. The documented command runs only `courses`, skipping **93** tests — the entire auth (70) and Stripe-payments (18) suites plus 5 project-level. CI has the same hole.
- **Fix:** change docs + `ci.yml:43` to `python manage.py test` (whole suite); drop the brittle hardcoded "76".

### H2. Frontend test count is stale by ~9×
- `README.md:109` claims "Frontend: 8 tests". **Verified:** 23 test files, 71 `it()`/`test()` cases under `frontend/src`.
- **Fix:** drop the hardcoded count or say "run `npm run test`".

### H3. README API table omits ~75% of the API and mislabels the progress endpoint as a user endpoint when it is anonymous
- `README.md:75-82` lists 6 endpoints. **Verified** routes across `formulas_backend/urls.py`, `courses/urls.py`, `accounts/urls.py`, `payments/urls.py` total ~25:
  - Auth (`/api/auth/`, `accounts/urls.py:7-14`): `register/`, `google/`, `login/`, `refresh/`, `me/`, `me/profile/`, `me/avatar/`, `settings/` — undocumented.
  - Payments (`/api/payments/`, `payments/urls.py:5-8`): `checkout/`, `portal/`, `status/`, `webhook/` — undocumented.
  - Authenticated progress + analytics (`courses/urls.py:27-32`): `progress/sync/`, `progress/<id>/`, `progress/`, `analytics/dashboard/`, `analytics/event/` — undocumented; all `@permission_classes([IsAuthenticated])` (`courses/views.py:216,235,268,319,373`).
  - Legacy course aliases (`courses/urls.py:34-35`): `courses/equation-atlas/`, `courses/foundational-algebra/` — undocumented.
- **Mislabel (verified):** README documents `PATCH /api/equations/{id}/progress/` as "Update user progress." In code that route is `update_progress` with `@permission_classes([AllowAny])` + throttle, looking up by `sort_order` and writing an **anonymous** `anon_id` row with `user=None` (`courses/views.py:63-86`). Its own docstring says "Mark progress on a single equation identified by sort_order." The real *user* progress system is the `IsAuthenticated` `/api/progress/*` endpoints the README omits entirely.
- **Fix:** regenerate the table from the urlconfs, group by app, mark auth requirements, and relabel the anon endpoint. Consider a DRF OpenAPI schema so it can't drift.

### H4. README + CONTRIBUTING entirely omit auth, payments, Pro tier, OAuth, and invite-gated signup
- **Verified:** grep of both docs for `stripe|invite|oauth|billing|pro tier|subscription|accounts|payments` returns nothing.
- Reality: `INSTALLED_APPS` (`settings.py:96-98`) = `courses`, `accounts`, `payments`; Google OAuth (`settings.py:107-108`); Stripe billing (`settings.py:114-122`); JWT with rotation + blacklist (`settings.py:142-147`, `INSTALLED_APPS` includes `token_blacklist`); Pro tier with `RequirePro` route guard (`frontend/src/main.tsx:44,118`) + `/pro`, `/pro/success`, `/pro/cancel`, `/dashboard` routes; invite-gated signup (`accounts/views.py:107-114`).
- **Fix:** add an "Architecture" section / `docs/ARCHITECTURE.md` covering the three apps, the auth model, Pro/billing flags, and the invite flow. This is the single biggest onboarding gap.

### H5. "No signup is required" is true only for anonymous exploration — signup is invite-gated by default and account features need auth, none of which is documented
- `README.md:9`: "No signup is required to explore the core experience." Accurate for public equations, but the docs never state that signup *is* gated by invite codes when `DJANGO_INVITES_REQUIRED=1` (the default in `backend/.env.example:3`), nor that progress sync / dashboard / Pro need accounts.
- **Verified:** `register` redeems an invite when `INVITES_REQUIRED` (`accounts/views.py:107-114`); `google_auth` validates/redeems for new users (`accounts/views.py:57-75`); serializer enforces it too (`accounts/serializers.py:51-53`). A user on a default deploy is blocked with no documented way to get an invite.
- **Fix:** document the two tiers and the invite requirement + `create_invite` (see M6).

### H6. CONTRIBUTING "Adding a New Equation" points at the wrong files
- `CONTRIBUTING.md:54` Step 1 "Add entry to `frontend/src/data/equations.ts`" — **wrong.** `equations.ts:1` is `import rawData from "./equations.json"`; it only declares TS interfaces. Data lives in `frontend/src/data/equations.json` (verified, 17 entries) plus the manifest layer (`equationManifest.ts`).
- `CONTRIBUTING.md:56` Step 3 "Register in `frontend/src/components/EquationVisualization.tsx`" — **wrong.** That file only calls `getScene()` (`EquationVisualization.tsx:4,22`). Scene registration is the `sceneLoaders: Record<number, SceneLoader>` map in `frontend/src/components/sceneRegistry.ts:15+`.
- **Fix:** Step 1 → `equations.json`; Step 3 → add a loader to `sceneRegistry.ts`; mention the manifest + `equation-locales/` layers.

---

## MEDIUM

### M1. Root `.env.example` omits ~9 backend env vars the code reads
- **Verified present in `settings.py`, absent from `.env.example`:** `GOOGLE_OAUTH_CLIENT_SECRET` (`:108`), `DJANGO_INVITES_REQUIRED` (`:109`), `STRIPE_PRO_PRICE_ID` legacy (`:118`), `DJANGO_PAGE_SIZE` (`:129`), `DJANGO_ANON_PROGRESS_RATE` (`:138`), `JWT_ACCESS_LIFETIME_SECONDS` / `JWT_REFRESH_LIFETIME_SECONDS` (`:143-144`), `DJANGO_CACHE_BACKEND` / `DJANGO_CACHE_LOCATION` (`:228-232`), `DJANGO_SECURE_HSTS_SECONDS` (`:237`). `DJANGO_INVITES_REQUIRED` (which drives H5) is absent from the root template but present in `backend/.env.example:3` — inconsistent (see M3).
- **Fix:** add these commented with defaults, or a config-reference table. `GOOGLE_OAUTH_CLIENT_SECRET` matters since `.env.example:20-21` implies only the client ID is needed.

### M2. The root `.env.example` "Frontend" block is obsolete; the real VITE vars are undocumented and one var is miscategorized
- **Verified** `grep -roE 'import.meta.env.VITE_[A-Z_]+' frontend/src`: `VITE_API_URL`, `VITE_BILLING_ENABLED`, `VITE_GITHUB_URL`, `VITE_GOOGLE_CLIENT_ID`, `VITE_SITE_DOMAIN`, `VITE_SUPPORT_EMAIL`.
- Root `.env.example:23-27` lists `FRONTEND_URL`, `VITE_API_URL`, `VITE_GOOGLE_CLIENT_ID`, `VITE_BILLING_ENABLED` — missing `VITE_SITE_DOMAIN`, `VITE_GITHUB_URL`, `VITE_SUPPORT_EMAIL`. `FRONTEND_URL` is a **backend** var (`settings.py:122`), miscategorized under "Frontend."
- `frontend/.env.example` has `VITE_API_URL`, `VITE_SITE_DOMAIN`, `VITE_GOOGLE_CLIENT_ID`, `VITE_BILLING_ENABLED` — missing `VITE_GITHUB_URL`, `VITE_SUPPORT_EMAIL`.
- **Fix:** reconcile both templates against the grep; move `FRONTEND_URL` to the backend block; add the two/three missing VITE vars.

### M3. The two `.env.example` files disagree, and load precedence is undocumented
- Root `.env.example` mixes backend + frontend + prod-only (`DOMAIN`, `DB_PASSWORD`); `backend/.env.example` is 3 lines including `DJANGO_INVITES_REQUIRED=1` (which root lacks); `frontend/.env.example` is separate. `settings.py:54-55` loads `backend/.env` first then root `.env`, and the loader keeps the **first** occurrence (`settings.py:29` `if ... key in os.environ: continue`) — so `backend/.env` overrides root `.env`. No doc explains this or which template seeds which file.
- **Fix:** document the precedence (`backend/.env` wins) and the copy targets; make shared keys consistent across the three.

### M4. README "The 17 Equations" table is mis-ordered for positions 5–9 and uses non-canonical titles, breaking the advertised `/equation/N` deep links
- **Verified** canonical order in `equations.json` (array order) and `seed_equations.py:36-181` (`sort_order`), which match `sceneRegistry.ts:19-23`:
  - pos 5 = **Wave Equation** (README says Complex Numbers)
  - pos 6 = **The Square Root of Minus One** (README says Euler's Polyhedra)
  - pos 7 = **Euler's Formula for Polyhedra** (README says Normal Distribution)
  - pos 8 = **Normal Distribution** (README says Fourier Transform)
  - pos 9 = **Fourier Transform** (README says Wave Equation)
- Title drift: README "Complex Numbers" vs data "The Square Root of Minus One"; README "Thermodynamics" vs data "Second Law of Thermodynamics"; README "Navier-Stokes" vs data "Navier-Stokes Equation"; README "Black-Scholes" vs data "Black-Scholes Equation".
- Route is `/equation/:id` (`main.tsx:114`) and `update_progress` keys on `sort_order` (= JSON id), so the scrambled `#` column points readers/links at the wrong equation. `README.md:65` even advertises `/equation/3`.
- **Fix:** regenerate the table from `equations.json` order + canonical titles; verify `#` == route id.

### M5. README keyboard-shortcuts line is inaccurate and incomplete
- `README.md:68`: "arrow keys to navigate, `/` to search, `Esc` to close." **Verified** handlers in `frontend/src/App.tsx:247-287`: navigation is **Up/Down and j/k** (not left/right); search is `/` **or Cmd/Ctrl+K**; `Esc` closes; plus undocumented `?` (overlay), `h`/`H` (home), Cmd/Ctrl+`[` (toggle sidebar), and number keys `1`–`9`/`0` (jump to equation).
- **Fix:** list the real bindings or point at the in-app `?` overlay.

### M6. `create_invite` is undocumented despite the default-on invite gate
- **Verified:** `backend/accounts/management/commands/create_invite.py` exists; `backend/.env.example:3` ships `DJANGO_INVITES_REQUIRED=1`. With that default, nobody can register without an invite and no doc says how to mint one.
- **Fix:** document `python manage.py create_invite` in setup, alongside H5's invite explanation.

### M7. CONTRIBUTING omits `seed_subjects`, and neither doc explains what each seed command produces
- `README.md:31-32` runs both `seed_equations` and `seed_subjects`; `CONTRIBUTING.md:17` runs only `seed_equations`. **Verified:** `seed_equations.py` seeds the 17 equations **and** a course "The Equations That Changed the World" with lesson rows (`seed_equations.py:210,219-221`); `seed_subjects.py` adds CS/ML/chemistry/physics subjects (Big-O, Bayes, Ideal Gas Law, Ohm's Law, …). The relationship between the "17", the subjects, and courses/lessons is never explained.
- **Fix:** make CONTRIBUTING include `seed_subjects`; add one sentence on what each command produces.

### M8. No LICENSE file on a public repo with a live demo that solicits PRs
- **Verified absent:** no `LICENSE`/`LICENSE.*` (glob returns no matches; not in `git ls-files`). `CONTRIBUTING.md` invites PRs, but with no license the contribution/redistribution terms are undefined.
- **Fix:** add an explicit license referenced from the README, or state proprietary intent clearly.

---

## LOW

### L1. Duplicate `DJANGO_SECRET_KEY` in `.env.example` is a silent-override footgun
- `.env.example:2` `DJANGO_SECRET_KEY=change-me-...` and `:30` `DJANGO_SECRET_KEY=generate-a-real-secret-key` (under "# Production"). The loader keeps the first occurrence (`settings.py:29`), so a user who copies this to `.env` and edits the line-30 value sees no effect. Confusing in a template.
- **Fix:** keep one key; comment the prod block so it's clear it's only meaningful in a separate prod env file.

### L2. `.gitignore` ignores `package-lock.json`, but the lockfile is committed and CI requires it
- `.gitignore:105` `package-lock.json`; **verified** `frontend/package-lock.json` is tracked (`git ls-files`), and `ci.yml:21-23` uses `cache-dependency-path: frontend/package-lock.json` + `npm ci` (both require it). The ignore rule is misleading and risks a future lockfile being silently untracked.
- **Fix:** remove or scope/annotate the `package-lock.json` ignore line to match the committed-lockfile + `npm ci` strategy.

### L3. `docs/audits/*` are dated, AI-flavored internal audit reports with no index, shipped in a public repo
- **Verified:** five files under `docs/audits/` (`...security.md`, `...correctness.md`, `...tests.md`, `...arch.md`, `...performance.md`), all dated `2026-06-14`, none linked from README/CONTRIBUTING, no `docs/README.md` index. `2026-06-14-r3-sciencebouk-arch.md` front-matter literally reads `title: "Architecture Audit — ScienceBouk (Verified)"` with internal verification notes (e.g. "H3 fully confirmed: 5 occurrences of `tier != PRO_TIER`…") — clearly internal working artifacts.
- **Fix:** add a `docs/README.md` explaining/labeling them, or move them to a private location.

### L4. Tech Stack says "SQLite" but prod uses Postgres
- `README.md:57` lists "SQLite". **Verified:** `settings.py:183-193` uses `DATABASE_URL` via `dj_database_url` when set; `.env.example:12` ships a `postgres://` `DATABASE_URL`. SQLite is the dev-only fallback.
- **Fix:** "SQLite (dev) / PostgreSQL (prod via `DATABASE_URL`)".

### L5. The CI "lint" job name promises a lint step that doesn't exist; the documented pre-submit check differs from the build's typecheck (CORRECTED SCOPE)
- **Correction to draft:** the draft claimed "`README.md`/`ci.yml` reference `npx tsc --noEmit`." **Verified false for README** — `npx tsc --noEmit` appears only in `CONTRIBUTING.md:64` and `ci.yml:24`, not the README.
- Confirmed: `ci.yml:11` job is named "Frontend (lint, type-check, test)" and `ci.yml:29` "Backend (lint, test)", but there is **no `lint` script** in `frontend/package.json` (scripts: `dev`, `build`, `preview`, `test`, `test:watch`) and **no ESLint config** in the repo (no `.eslintrc*` / `eslint.config.*`). CI runs `npx tsc --noEmit` + `npm run test` + `npm run build`, never a lint. The `build` script is `tsc -b --force && vite build` (a different typecheck path than the documented `npx tsc --noEmit`).
- **Fix:** add an ESLint config + `lint` script to match the job names, or rename the CI jobs to "type-check, test" and drop "lint" so docs don't promise a missing check.

### L6. No SECURITY.md despite handling JWT auth, OAuth, and Stripe payments (NEW)
- **Verified absent:** no `SECURITY*` file (glob returns no matches; not in `git ls-files`). The app processes Google OAuth (`settings.py:107-108`), JWT with rotation/blacklist (`settings.py:142-147`), and Stripe webhooks/checkout (`payments/views.py`, `payments/urls.py`). A public repo handling auth + payments with no disclosure policy gives security researchers no reporting channel.
- **Fix:** add a `SECURITY.md` with a private disclosure contact (the env memory shows a `VITE_SUPPORT_EMAIL` already exists to point at).

---

## In good shape (verified, no action)
- Localization docs are accurate and high quality: `frontend/src/content/TRANSLATING_LESSONS.md` and both `frontend/src/data/content/{equation,scene}-locales/README.md` match the code's fallback/merge behavior.
- CONTRIBUTING prerequisites (Node 20+, Python 3.12+) match `ci.yml:20,38` and `requirements.txt`.
- The local (non-Docker) dev quickstart (`README.md:25-39`) is correct end-to-end (venv → migrate → seed → runserver; npm install → dev), modulo the seed/test discrepancies in H1/M7.

---

## Recommended next steps (highest leverage first)
1. **C1** — make the Docker quickstart real (commit a non-secret dev `docker-compose.yml` + Dockerfiles) or delete the Docker sections from README/CONTRIBUTING. The primary documented run path currently fails on a clean clone.
2. **H1 + H3 + H4** — switch docs and `ci.yml:43` to `python manage.py test` (close the 93-test / accounts+payments coverage hole); regenerate the API table from the urlconfs with auth markers and fix the anon-vs-user progress mislabel; add an Architecture section covering the three apps, auth, Pro/billing, and invites. This trio is the core onboarding gap.
3. **H6 + M4** — fix "Adding an Equation" file paths (`equations.json`, `sceneRegistry.ts`) and regenerate the 17-equations table from canonical order/titles; both actively mislead and break deep links.
4. **H5 + M6** — document the invite gate (`DJANGO_INVITES_REQUIRED` default-on) and `python manage.py create_invite`.
5. **M1 + M2 + M3** — reconcile all three `.env.example` files against the env vars the code reads; document load precedence; move `FRONTEND_URL` to the backend section.
6. **M8 + L6** — add `LICENSE` and `SECURITY.md`.
7. **L1–L5** — dedupe the `.env.example` secret key; fix the `package-lock.json` `.gitignore` contradiction; index or relocate `docs/audits/`; correct the "SQLite" stack line; make CI job names match reality (add ESLint or drop "lint").

All file:line citations verified against HEAD `36257b4`. No files modified. Files of interest: `/Users/svetlana/Documents/projects/sciencebouk/README.md`, `/Users/svetlana/Documents/projects/sciencebouk/CONTRIBUTING.md`, `/Users/svetlana/Documents/projects/sciencebouk/.gitignore`, `/Users/svetlana/Documents/projects/sciencebouk/.env.example`, `/Users/svetlana/Documents/projects/sciencebouk/frontend/.env.example`, `/Users/svetlana/Documents/projects/sciencebouk/backend/.env.example`, `/Users/svetlana/Documents/projects/sciencebouk/.github/workflows/ci.yml`, `/Users/svetlana/Documents/projects/sciencebouk/frontend/nginx.conf`, `/Users/svetlana/Documents/projects/sciencebouk/backend/formulas_backend/settings.py`, `/Users/svetlana/Documents/projects/sciencebouk/backend/{courses,accounts,payments}/urls.py` and `views.py`, `/Users/svetlana/Documents/projects/sciencebouk/frontend/src/{App.tsx,main.tsx,data/equations.json,components/sceneRegistry.ts}`.
