# Formulas (backup-pre-filter) — Security Audit (Round 1)

**Audit ID:** `2026-07-06-r1`  
**Date:** 2026-07-06  
**Scope:** Django backend, JWT auth, Stripe payments, nginx prod config, Docker compose  
**Mode:** Read-only (no code changes)

---

## Executive summary

Formulas is a **Django REST + JWT** learning platform with Stripe subscriptions. Stripe webhook signature verification and authenticated payment endpoints are sound. Main gaps: **unauthenticated anonymous progress API**, weak production defaults (`DEBUG`, `SECRET_KEY`, empty password validators), and missing nginx security headers.

| Severity | Count |
|----------|------:|
| High | 1 |
| Medium | 5 |
| Low | 3 |
| **Total** | **9** |

---

## Confirmed findings

### High

#### H1 — Unauthenticated `update_progress` allows arbitrary anon progress writes

- **Location:** `backend/courses/views.py:35-57`, routed at `courses/urls.py:24`
- **Category:** Broken access control (OWASP A01)
- **What:** `update_progress` has no `@permission_classes`; DRF default is `AllowAny`. Any client can PATCH `/api/equations/<id>/progress/` with any `user_id` string.
- **Trigger:** `curl -X PATCH /api/equations/1/progress/ -d '{"user_id":"victim","completed":true}'`
- **Impact:** Pollute/spoof anonymous progress records; potential data integrity issues if anon IDs are later synced to accounts.
- **Suggested fix:** Require auth or signed anon token; rate-limit; bind anon_id to HttpOnly cookie.

### Medium

#### M1 — `DEBUG` defaults to enabled

- **Location:** `backend/formulas_backend/settings.py:8`, `docker-compose.yml:8`
- **Category:** Misconfiguration
- **What:** `DJANGO_DEBUG` defaults `"1"` in settings and compose.
- **Impact:** Stack traces, media serving via Django, verbose errors if env not overridden in prod.
- **Suggested fix:** Default `DEBUG=0`; fail startup if `DEBUG=1` without explicit dev flag.

#### M2 — Weak default `SECRET_KEY`

- **Location:** `backend/formulas_backend/settings.py:7`, `docker-compose.yml:7`
- **Category:** Secrets (OWASP A02)
- **What:** Fallback `"dev-only-secret-key"` if `DJANGO_SECRET_KEY` unset.
- **Impact:** Forgeable JWT/session material in misconfigured deployments.
- **Suggested fix:** Require env var in production; reject known placeholders at startup.

#### M3 — `AUTH_PASSWORD_VALIDATORS` empty

- **Location:** `backend/formulas_backend/settings.py:112`
- **Category:** Authentication weakness
- **What:** `AUTH_PASSWORD_VALIDATORS = []` — no minimum length/complexity at Django layer (tests use 8+ chars but not enforced globally).
- **Impact:** Weak passwords on registration.
- **Suggested fix:** Enable Django's default validators; align with `RegisterSerializer` rules.

#### M4 — Avatar upload validates extension only, not content

- **Location:** `backend/accounts/views.py:51-72`
- **Category:** Unrestricted upload
- **What:** Checks `file.size` and extension whitelist; no magic-byte/`Pillow` verify.
- **Impact:** Polyglot files served from `/media/` could confuse browsers if MEDIA is web-accessible.
- **Suggested fix:** Re-encode with Pillow; serve media from separate domain; `Content-Disposition: attachment`.

#### M5 — nginx prod config lacks security headers and rate limits

- **Location:** `nginx.prod.conf`
- **Category:** Defense in depth
- **What:** No `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, or API rate limiting.
- **Impact:** Clickjacking, MIME sniffing; brute-force on `/api/auth/` unchecked at edge.
- **Suggested fix:** Add standard security headers; `limit_req` on auth and webhook paths.

### Low

#### L1 — Long JWT refresh lifetime (30 days)

- **Location:** `backend/formulas_backend/settings.py:65`
- **Category:** Session management
- **What:** `REFRESH_TOKEN_LIFETIME`: 30 days with rotation enabled.
- **Impact:** Stolen refresh token = month-long access unless revocation list exists.
- **Suggested fix:** Shorten refresh TTL; add token blacklist on logout.

#### L2 — Public read endpoints without explicit permission docs

- **Location:** `backend/courses/views.py:21-33`, `60-89`, `92-133`
- **Category:** API design
- **What:** `EquationViewSet`, `search_equations`, `course_detail`, `equation_atlas_legacy` are intentionally public (no auth).
- **Impact:** Low — read-only catalog data; search could be abused for scraping.
- **Suggested fix:** Add throttling on search; document public contract.

#### L3 — `db.sqlite3` present in workspace (gitignored)

- **Location:** `backend/db.sqlite3`, `.gitignore:5`
- **Category:** Data exposure
- **What:** SQLite file exists locally; correctly gitignored but may contain dev user data.
- **Impact:** Accidental copy/share leaks dev accounts.
- **Suggested fix:** Never deploy SQLite in production; use Postgres per `docker-compose.prod.yml`.

---

## Good practices observed

- Stripe webhook verifies `Stripe-Signature` (`payments/views.py:75-79`).
- Payment/checkout/portal endpoints require `IsAuthenticated`.
- Pro analytics gated on `profile.is_pro` / `tier == 'pro'`.
- CSRF middleware enabled; webhook correctly `@csrf_exempt` with signature check.
- CORS restricted to configured origins (not `CORS_ALLOW_ALL`).

---

## Project paths

| Path | Purpose |
|------|---------|
| `/Users/s_avelova/Documents/projects/formulas-backup-pre-filter/` | Project root |
| `/Users/s_avelova/Documents/projects/formulas-backup-pre-filter/backend/formulas_backend/settings.py` | Django settings |
| `/Users/s_avelova/Documents/projects/formulas-backup-pre-filter/backend/courses/views.py` | API views |
| `/Users/s_avelova/Documents/projects/formulas-backup-pre-filter/docs/audits/` | Audit reports |