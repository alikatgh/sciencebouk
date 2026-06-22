---
title: Security Audit — sciencebouk (Django REST + React/TypeScript)
repo: sciencebouk
lens: security
date: 2026-06-14
round: 1
---

All findings verified. The `LessonMarkdown` uses `react-markdown` with only `remarkGfm` and no `rehype-raw`, so raw HTML is not rendered — safe claim confirmed. `safeRedirect.ts` is at `frontend/src/lib/safeRedirect.ts` (not `auth/`), with an HTTPS + Stripe-domain allowlist — confirmed.

I have enough to finalize. Let me note one nuance I want to verify on H1's "unbounded row creation" and the `a` tag `href` in LessonMarkdown (could be a `javascript:` link sink, a finding the draft missed). The `href` is passed straight through to `<a href>`. React does sanitize `javascript:` URLs in href as of React 16.9+ (logs warning) — but markdown link content is developer-authored lesson content (from admin import), not user-controlled, so impact is low. I'll note it briefly. Now compiling the final report.

Based on full verification against the source, here is the final report:

---

# Security Audit — sciencebouk (Django REST + React/TypeScript)

Repo: `/Users/svetlana/Documents/projects/sciencebouk` · Read-only audit. Backend is Django 5.2 + DRF + SimpleJWT + Stripe + Google OAuth; frontend is React/Vite. Every finding below was verified against the actual code. The codebase is broadly security-conscious (JWT auth, parameterized ORM queries, signature-verified Stripe webhook, SHA-256-hashed invite codes with `select_for_update`, env-based secrets, mass-assignment protection on the profile serializer). Findings are ordered by severity. Two minor path/scope corrections to the draft are noted inline.

---

## HIGH

### H1. Anonymous progress endpoint — unauthenticated cross-user data tampering via attacker-chosen `anon_id`
**File:** `backend/courses/views.py:63-93` (`update_progress`); serializer `backend/courses/serializers.py:76-84`; model `backend/courses/models.py:173,192-194` (`anon_id` `max_length=100`, `unique_anon_equation` constraint)
**VERIFIED.** `PATCH /api/equations/<id>/progress/` is `AllowAny` and keys every write on a client-supplied `user_id` stored as `anon_id`. `ProgressUpdateSerializer` enforces only `CharField(max_length=100)` — no format/ownership/entropy constraint. Any unauthenticated caller can read, create, or overwrite the progress row of any `anon_id` string they choose via `get_or_create(anon_id=anon_id, equation=equation, user=None)`. The `notes` field (`max_length=2000`) is attacker-controlled persisted text.
**Impact:** Cross-user tampering/clobbering of anonymous progress, and unbounded row creation (one row per invented `(anon_id, equation)` pair). The `anon_progress` throttle (`60/min`, `settings.py:138`) limits volume but not the core authorization flaw.
**Fix:** Treat `anon_id` as opaque high-entropy — reject anything that isn't a server-issued UUIDv4 (enforce a strict regex in `ProgressUpdateSerializer`), or move anonymous progress to a signed/`HttpOnly` cookie token rather than a free-form client string. Keep the existing throttle.

### H2. No throttling / lockout on authentication & registration endpoints (credential brute-force, account enumeration, free-account spray)
**Files:** `backend/accounts/views.py:99` (`register`), `:31` (`google_auth`), `:20` (`LoginView`); `backend/accounts/urls.py:7-10` (incl. `refresh` via `TokenRefreshView`); `backend/formulas_backend/settings.py:134-139`
**VERIFIED.** `DEFAULT_THROTTLE_RATES` defines only the `anon_progress` scope, and there is **no** `DEFAULT_THROTTLE_CLASSES`. `LoginView`, `register`, `google_auth`, and the `refresh` route carry no throttle classes. Therefore:
- `POST /api/auth/login/` is brute-forceable with no rate limit or lockout.
- `POST /api/auth/register/` can be sprayed to mass-create accounts (when `INVITES_REQUIRED=0`) or used to enumerate invite codes (when required — see H3).
- `RegisterSerializer.validate_email` (`serializers.py:37-40`) returns a distinct "An account with this email already exists." enabling **email/account enumeration**.
**Fix:** Attach DRF `ScopedRateThrottle`/`AnonRateThrottle` to login, register, google, and refresh with tight per-IP rates (e.g. `5/min`). Use a generic registration-failure message to remove the enumeration oracle.

### H3. Invite-code validation is not rate-limited and leaks lifecycle state via distinct errors
**Files:** `backend/accounts/invites.py:28-50`, `backend/accounts/serializers.py:50-55`, `backend/accounts/views.py:54-74`, model `backend/accounts/models.py:81-85`
**VERIFIED.** Codes are SHA-256 hashed with `select_for_update` (good), but the validation path inherits H2's complete absence of throttling on `register`/`google_auth`. The keyspace is the human-typed `SCB-XXXX-XXXX-XXXX` over `A-Z2-9` (`generate_code`, 32^12) — large, but the per-state messages ("invalid" vs "revoked" vs "expired" vs "already used", `invites.py:36-43`) leak code lifecycle state and aid enumeration/abuse triage.
**Fix:** Rate-limit invite attempts per IP, and collapse all failure outcomes into one generic message ("Invite code is invalid or no longer available.").

---

## MEDIUM

### M1. Avatar upload validates type by file-extension only — no content/MIME sniffing
**File:** `backend/accounts/views.py:142-174`; serving `backend/formulas_backend/urls.py:15-16`, `settings.py:110,221-222`
**VERIFIED (path traversal correctly mitigated).** The handler checks `file.size` and the **filename extension** only (`ext not in (jpg,jpeg,png,webp,gif)`) — never the actual bytes (no Pillow decode / magic-byte check). The stored name is `avatars/{request.user.id}_{uuid4().hex[:8]}.{ext}` (line 160), so path traversal via `file.name` is **not** exploitable. But arbitrary content can be stored under a `.png`/`.gif` name (HTML/JS polyglot, or — though `svg` isn't an accepted ext — a sniffable payload). When `SERVE_MEDIA_FROM_DJANGO` is on (always in DEBUG; opt-in in prod), Django's `static()` serves these directly, and `X-Content-Type-Options: nosniff` is **not** set anywhere (see M4), so a browser may sniff and execute a content-spoofed file opened directly.
**Fix:** Validate real content (`PIL.Image.open(fp).verify()` then re-encode), reject SVG explicitly, set a safe stored content-type, and serve user media with `Content-Disposition: attachment` + `nosniff` from a cookieless path.

### M2. `X-Forwarded-For` trusted blindly for invite-redemption IP logging (spoofable audit data)
**File:** `backend/accounts/invites.py:19-25`
**VERIFIED.** `get_request_meta` takes `HTTP_X_FORWARDED_FOR.split(",")[0]` as the client IP with no trusted-proxy count. A client can forge `X-Forwarded-For` to write an arbitrary `InviteRedemption.ip_address` (`models.py:113`), corrupting abuse-investigation data and potentially framing another IP. Audit-integrity only — not an auth bypass.
**Fix:** Derive the client IP from a known number of trusted proxies (take the correct hop from the right, or use `django-ipware` configured with the proxy count). Never trust the leftmost XFF entry.

### M3. `SECURE_PROXY_SSL_HEADER` trusts client-supplied `X-Forwarded-Proto`
**File:** `backend/formulas_backend/settings.py:240-241`
**VERIFIED (deployment-dependent).** `SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")` paired with `SECURE_SSL_REDIRECT = True`. The bundled `frontend/nginx.conf:16` *does* overwrite the header (`proxy_set_header X-Forwarded-Proto $scheme`), so under that nginx the risk is contained. But the project's primary deploy target is Passenger/cPanel (`backend/passenger_wsgi.py` present). If that fronting proxy does not unconditionally overwrite the header, a client sending `X-Forwarded-Proto: https` is treated as secure, undermining the SSL redirect and secure-cookie logic.
**Fix:** Confirm the production proxy (Passenger/cPanel) unconditionally sets `X-Forwarded-Proto`; document this requirement next to the setting.

### M4. Missing security response headers (`SECURE_CONTENT_TYPE_NOSNIFF`, `SECURE_REFERRER_POLICY`, no CSP)
**File:** `backend/formulas_backend/settings.py:236-243`; `frontend/nginx.conf` (no `add_header` for security headers)
**VERIFIED.** The `if not DEBUG` block sets HSTS + SSL redirect + secure cookies but **not** `SECURE_CONTENT_TYPE_NOSNIFF` (which adds `X-Content-Type-Options: nosniff`) and **not** `SECURE_REFERRER_POLICY`. There is no Content-Security-Policy anywhere — relevant given the `dangerouslySetInnerHTML` legal-page sink (L1) and the unsniffed avatar storage (M1). `nginx.conf` adds only caching headers.
**Fix:** Add `SECURE_CONTENT_TYPE_NOSNIFF = True` and `SECURE_REFERRER_POLICY = "same-origin"`. Add a CSP (nginx `add_header` or `django-csp`) — defense-in-depth that also blunts M1/L1/M5.

### M5. JWT refresh token stored in `localStorage` (XSS-exfiltratable; 30-day lifetime)
**File:** `frontend/src/auth/tokenStorage.ts:6-7,55-92`; `backend/formulas_backend/settings.py:142-147`
**VERIFIED.** The access token lives in memory (good), but the **refresh token** is written to `localStorage` (`saveTokens`, line 60) and read back on refresh (line 91). `REFRESH_TOKEN_LIFETIME` defaults to 30 days (`settings.py:144`). The file's own comments (lines 3-5) flag this as a stopgap pending `HttpOnly` cookies. Combined with the absence of CSP (M4), a single XSS yields up to a 30-day takeover via refresh-token theft. `ROTATE_REFRESH_TOKENS` + `BLACKLIST_AFTER_ROTATION` are enabled (good), but a stolen token is valid until next used/rotated.
**Fix:** Move the refresh token to an `HttpOnly`, `Secure`, `SameSite=Strict` cookie (the TODO already in the file). Until then, prioritize CSP (M4) and shorten the refresh lifetime.

---

## LOW

### L1. `dangerouslySetInnerHTML` for legal pages — safe today, fragile by design
**File:** `frontend/src/components/LegalDocumentPage.tsx:55` (consumed by Terms/Privacy pages fetching same-origin static `*.html`)
**VERIFIED.** Raw HTML is `fetch`ed from a same-origin static `documentPath` and injected with `dangerouslySetInnerHTML` (line 55), unsanitized. Source is developer-authored static files, not user input, so current impact is low — but it is a latent stored-XSS sink if those docs ever become dynamic/CMS-sourced, and it depends entirely on the static host serving them. Confirmed this is the **only** `dangerouslySetInnerHTML`/`rehype-raw` usage in the frontend; `LessonMarkdown.tsx` renders via `react-markdown` + `remarkGfm` with **no** `rehype-raw`, so lesson markdown is safe from raw-HTML injection.
**Fix:** Run the fetched HTML through DOMPurify before injection, or render the legal docs through the existing safe `ReactMarkdown` pipeline. CSP (M4) as backstop.

### L2. `UserSettings` PATCH merges an unbounded arbitrary JSON blob
**File:** `backend/accounts/views.py:197-205`; model `backend/accounts/models.py:42-45` (`data = JSONField(default=dict)`)
**VERIFIED.** `user_settings` is Pro-gated (line 181, good), but PATCH does `{**settings_obj.data, **incoming}` for any dict (line 201) with no size/depth/key-allowlist validation on the free `JSONField`. An authenticated Pro user can persist an arbitrarily large/deep document (storage abuse, potential serialization DoS).
**Fix:** Cap payload size and validate the settings shape against an allowlist of keys/types instead of accepting any dict.

### L3. Verbose API directory page leaks endpoint map (and configurable admin path when DEBUG)
**File:** `backend/formulas_backend/views.py:5-86`
**VERIFIED.** `GET /` always renders a full inventory of API endpoints; when `settings.DEBUG` is true it additionally reveals the configurable admin path (lines 10-13). The admin path is deliberately made obscure via `DJANGO_ADMIN_PATH` (`settings.py:59`), so leaking it on the public root in debug undermines that. The admin row is correctly hidden when `DEBUG=0`, so production impact is reconnaissance-level only.
**Fix:** Gate the whole landing page behind `DEBUG`, or return a minimal page in production.

### L4. Stripe `checkout.session.completed` upgrade keyed solely on `customer` id — not bound to the Pro price/product
**File:** `backend/payments/views.py:142-153`
**VERIFIED.** The webhook upgrades a profile to `pro` on any completed session for that `customer_id` with `payment_status in {paid, no_payment_required}`, without verifying the line item matches `STRIPE_PRO_MONTHLY/YEARLY_PRICE_ID`. If the same Stripe customer ever completes a checkout for a different/cheaper product, they'd be upgraded. Signature verification is correct (lines 134-138), so this is not externally forgeable — it's an authorization-tightness gap. (Note: the `customer.subscription.updated` path at lines 155-166 also upgrades on any `active`/`trialing` subscription regardless of which price — same class of gap.)
**Fix:** Inspect the session line items / subscription items and confirm the purchased price matches a configured Pro price before `upgrade_profile`.

### L5. No dependency vulnerability scanning in CI
**File:** `.github/workflows/ci.yml:9-43`, `backend/requirements.txt`, `frontend/package.json`
**VERIFIED.** Backend pins are recent (Django 5.2.1, DRF 3.16.0, simplejwt 5.4.0, stripe 12.2.0, google-auth 2.40.0) with no obviously vulnerable versions, but the CI workflow runs only lint/type-check/test/build and `migrate` — **no** `pip-audit` or `npm audit` step. (Minor note: the backend job runs only `python manage.py test courses`, so `accounts`/`payments` tests are not executed in CI — a test-coverage gap worth flagging.)
**Fix:** Add `pip-audit` and `npm audit` (or Dependabot) to CI; broaden the backend test target to all apps.

### L6 (added). Markdown link `href` rendered without scheme allowlist
**File:** `frontend/src/components/teaching/LessonMarkdown.tsx:64-75`
**VERIFIED — low impact.** The custom `a` renderer passes `href` straight to `<a href={href}>`. React strips `javascript:` URIs in `href` at render (warning only), and lesson markdown is developer/admin-authored (imported via the admin-only JSON importer), not end-user input — so this is not currently exploitable. Flagged only because it would become a vector if lesson content ever accepted user submissions.
**Fix:** If lesson content ever becomes user-supplied, add an explicit `http`/`https`/`mailto` scheme allowlist in the `a` renderer.

---

## Corrections to the draft
- **M1:** The draft listed `SECURE_REFERRER_POLICY`/CSP/`nosniff` as absent — confirmed. It also referenced a `SERVE_MEDIA_FROM_DJANGO` flag; verified that flag exists (`settings.py:110`) and gates `static()` media serving (`urls.py:15-16`).
- **L1/Notes:** The draft cited the redirect helper as `safeRedirect.ts` in `frontend/src/auth/`. Actual path is **`frontend/src/lib/safeRedirect.ts`**; the finding (HTTPS + `checkout.stripe.com`/`billing.stripe.com` allowlist, subdomain-suffix match) is otherwise accurate. `sanitizeNextPath` lives in `frontend/src/auth/navigation.ts` and correctly rejects non-same-origin and protocol-relative (`//`) paths.

## Things checked and confirmed OK
- **SQL injection:** all queries use the ORM with parameterized `__icontains`/filter args (`courses/views.py:124-134`); no raw SQL, no string-built queries.
- **Stripe webhook signature** is verified against the raw `request.body` via a plain non-DRF `@csrf_exempt` view, with the documented rationale (`payments/views.py:114-138`) — correct pattern.
- **Mass-assignment / self-promotion:** `ProfileSerializer` marks `tier`, `avatar_url`, `created_at` read-only (`serializers.py:13`), so `PATCH /me/profile/` cannot self-promote to Pro. Pro is set only via the Stripe webhook.
- **Pro gating** is enforced server-side on every Pro endpoint (`my_progress`, `update_my_progress`, `bulk_sync_progress`, `learning_dashboard`, `log_event`, `user_settings`) by checking `profile.tier == 'pro'` / `is_pro`.
- **Google OAuth:** ID token verified server-side against the configured client ID with `email_verified` enforced (`accounts/views.py:24-52`); invite redemption is rolled back (`user.delete()`) on failure inside the transaction.
- **Admin JSON import:** admin-only (`self.admin_site.admin_view`), uses `json.loads` (not `pickle`/`eval`), validates structure (`courses/admin.py:84-91`, `importers.py:58`) — no insecure deserialization.
- **Secrets:** `SECRET_KEY`, Stripe keys, OAuth secrets all read from env; production startup guards reject the dev `SECRET_KEY` and a `localhost` `FRONTEND_URL` (`settings.py:103-104,124-125`).
- **Open redirect:** both `safeRedirect` (HTTPS + Stripe-domain allowlist) and `sanitizeNextPath` (same-origin, blocks `//`) correctly constrain navigation.
- **Markdown:** lessons render with no raw-HTML plugin (`rehype-raw` absent) — safe.

---

## Recommended next steps (priority order)
1. **H2 + H3** — add per-IP throttling (`5/min`) to `login`/`register`/`google`/`refresh`, and collapse invite-code + registration-email errors into generic messages. Single highest-leverage fix; closes brute-force, account/email enumeration, and free-account spray together.
2. **H1** — constrain anonymous `user_id` to a server-issued UUIDv4 (regex in `ProgressUpdateSerializer`), or migrate anonymous progress to a signed cookie token.
3. **M5 + M4** — ship a Content-Security-Policy and `SECURE_CONTENT_TYPE_NOSNIFF`/`SECURE_REFERRER_POLICY`; plan the refresh-token move to an `HttpOnly` `Secure` `SameSite=Strict` cookie (TODO already in `tokenStorage.ts`).
4. **M1** — add real content validation (Pillow decode + re-encode, reject SVG) and serve avatars with `Content-Disposition: attachment` + `nosniff`.
5. **M2 + M3** — fix trusted-proxy IP derivation for invite logging; document/verify that the production Passenger/cPanel proxy overwrites `X-Forwarded-Proto`.
6. **L4** — bind the Stripe upgrade paths to a configured Pro price ID before granting `pro`.
7. **L2, L5, L1, L3, L6** — bound the settings JSON, add `pip-audit`/`npm audit` (and broaden CI tests to all apps), DOMPurify the legal HTML, gate the API landing page behind `DEBUG`, and (if lesson content ever becomes user-supplied) add an `href` scheme allowlist in `LessonMarkdown`.
