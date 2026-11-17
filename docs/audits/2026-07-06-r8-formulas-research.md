---
title: "Research Audit — formulas (Round 8)"
repo: formulas
lens: research
date: 2026-07-06
round: 8
---

# Research / Currency Audit — `formulas` (Round 8)

**Scope:** Dependency pins, CI gates, security currency vs [`sciencebouk`](../../sciencebouk) canonical fork. Read-only. June-14 r5-research audits in this repo still describe **`test courses` + no pip-audit** — partially obsolete for formulas CI.

**Relationship:** sciencebouk bumped `Django==5.2.15`, `simplejwt==5.5.1`, pruned npm deps, added custom `serve_media`, and runs `pip-audit` + full tests. **formulas lags on framework pins and ships heavier legacy frontend deps.**

---

## HIGH

### H1. `Django==5.2.1` hard-pinned — behind sciencebouk 5.2.15 security line
- **Where:** `backend/requirements.txt:1`.
- **Verified:** sciencebouk `requirements.txt:1` is `Django==5.2.15`. r5-research C1 (web-cited security releases on 5.2.x) motivated bump; formulas never received it.
- **Impact:** Missed framework security patches; recurrence risk without automated bump PRs.
- **Fix:** Align to latest 5.2.x; keep `pip-audit` in CI (already present — see M1).

### H2. `djangorestframework-simplejwt==5.4.0` — behind sciencebouk 5.5.1
- **Where:** `backend/requirements.txt:5`.
- **Verified:** sciencebouk pins **5.5.1** with `ProfileJWTAuthentication` (`accounts/authentication.py`). formulas may lack the `select_related("profile")` auth subclass — grep recommended on merge.
- **Impact:** JWT/auth bugfixes and N+1 perf fix absent on the fork.
- **Fix:** Bump simplejwt; port `ProfileJWTAuthentication` from sciencebouk.

### H3. Legacy npm deps still in `package.json` — `d3` meta-package, Framer Motion, `@use-gesture/react`
- **Where:** `frontend/package.json:29-30, 37`.
- **Verified:** sciencebouk migrated to six `d3-*` submodules and removed framer-motion (BUG_JOURNAL 2026-06-26, −868 lockfile lines). formulas still ships the old graph.
- **Impact:** Larger bundle, meta-package tree-shaking failures, unused gesture/motion deps accruing CVE noise.
- **Fix:** Cherry-pick sciencebouk dep pruning PR (#6/#7 equivalent).

---

## MEDIUM

### M1. CI now runs `pip-audit` + full `manage.py test` — June audit claims partially fixed
- **Where:** `.github/workflows/ci.yml:42-45`.
- **Verified:** r5-research L5 said "test courses only, no pip-audit" — **formulas CI now matches sciencebouk** on these two points. June audit text in `docs/audits/` is stale.
- **Fix:** Update local audit index; still add npm audit (M2).

### M2. No `npm audit` in CI — same gap as sciencebouk r8 H1
- **Where:** `.github/workflows/ci.yml` frontend job — tsc, test, build only.
- **Fix:** Add `npm audit --audit-level=high` or osv-scanner.

### M3. Media served via Django `static()` helper — not sciencebouk's hardened `serve_media` view
- **Where:** `backend/formulas_backend/urls.py:15-16` — `static(MEDIA_URL, document_root=MEDIA_ROOT)`.
- **Verified:** sciencebouk uses `serve_media` with `Content-Disposition: attachment` + `Cache-Control: no-store, private` (BUG_JOURNAL 2026-06-28).
- **Impact:** Avatar polyglot sniffing surface in `DJANGO_SERVE_MEDIA=1` dev/staging modes.
- **Fix:** Port `formulas_backend/views.py:serve_media` from sciencebouk.

### M4. No `LICENSE` / `SECURITY.md` — supply-chain and vuln reporting policy absent
- **Verified:** sciencebouk has both; formulas has neither (glob empty).
- **Fix:** Port legal/security files or reference sciencebouk policy.

### M5. No Dependabot — manual pin drift vs sciencebouk (same r8 H3)
- **Where:** `.github/` — no `dependabot.yml`.
- **Fix:** Add pip + npm Dependabot; consider tracking sciencebouk renovate commits.

---

## LOW

### L1. Vite `^6.3.2` floor — lockfile version not verified in this pass
- **Where:** `frontend/package.json:55`.
- **Fix:** Match sciencebouk: floor `^6.4.1`, verify lockfile.

### L2. `stripe.api_version` pin — verify parity with sciencebouk `payments/views.py:20`
- **Fix:** On merge from sciencebouk, ensure explicit `2025-05-28.basil` pin exists.

### L3. Refresh token in `localStorage` — same r5research-H1 as sciencebouk (likely identical `tokenStorage.ts`)
- **Fix:** Port HttpOnly cookie migration when sciencebouk lands it.

### L4. June-14 r5-research audit file describes obsolete CI — doc currency failure
- **Where:** `docs/audits/2026-06-14-r5-sciencebouk-research.md:122`.
- **Fix:** Annotate with "partially remediated in formulas CI 2026-07" banner.

### L5. Docker image uses `gunicorn` — verify version pin in `backend/Dockerfile` on bump
- **Where:** `docker-compose.yml:17`.
- **Fix:** Pin gunicorn in requirements or Dockerfile; scan with pip-audit.

---

## Severity summary

| Sev | Count | IDs |
|-----|-------|-----|
| High | 3 | H1–H3 |
| Medium | 5 | M1–M5 |
| Low | 5 | L1–L5 |

**Top fixes:** H1+H2 (Django/simplejwt align), H3 (npm dep prune), M3 (serve_media).

*Read-only — 2026-07-06.*