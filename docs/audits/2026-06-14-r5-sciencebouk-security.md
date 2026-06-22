---
title: Security Audit (Verified) — sciencebouk
repo: sciencebouk
lens: security
date: 2026-06-14
round: 5
---

This confirms my finding and reveals that the **prior r1 audit made the same mistake** — it claims `SECURE_CONTENT_TYPE_NOSNIFF`/`SECURE_REFERRER_POLICY` are "not set" and the nosniff header is "not set anywhere." That is wrong for Django 5.2: both default to `True`/`"same-origin"` and are emitted by the installed `SecurityMiddleware` regardless of the `if not DEBUG` block (which only ADDS HSTS/SSL/secure-cookies). The draft I'm reviewing inherited and even doubled-down on this error in M4. This is the single most important correction.

I have everything I need. Producing the final verified report.

---

# Security Audit (Verified) — sciencebouk

**Repo:** `/Users/svetlana/Documents/projects/sciencebouk` · **HEAD:** `36257b4` ("Add invite-gated signup flow") · **Scope:** read-only, full independent re-verification of the draft against live source. Stack: Django 5.2.1 + DRF 3.16.0 / SimpleJWT 5.4.0 / Stripe 12.2.0 / Google OAuth (google-auth 2.40.0) backend; React 19 + Vite 6 frontend.

**Verification verdict:** Of the draft's 14 findings, **12 are confirmed as written**, **1 (M4) is materially overstated and corrected below**, and **1 (L2) is confirmed but its severity/wording is tightened**. No findings are outright false positives. I add **one new finding (N1)** the draft and the prior r1 audit both missed, and I flag that **the prior audit `2026-06-14-r1-sciencebouk-security.md` contains the same M4 error** propagated into this draft.

**Overall posture:** genuinely security-conscious. ORM-only (zero raw SQL / `eval` / `exec` / `pickle` / `marshal` / `subprocess` / `os.system` / `mark_safe` / `format_html` in app code — grep-confirmed), signature-verified Stripe webhook reading the raw body, SHA-256-hashed invite codes with `select_for_update`, mass-assignment protection (`tier`/`avatar_url` read-only), server-side Pro gating on every Pro endpoint, env-based secrets with production startup guards, and no live secrets tracked (only `*.env.example` files; `db.sqlite3` is untracked). The findings below are the residual gaps.

---

## HIGH

### H1. Unauthenticated cross-user data tampering via attacker-chosen `anon_id`  — CONFIRMED
**`backend/courses/views.py:63-93`** (`update_progress`, `@permission_classes([AllowAny])`, `@throttle_classes([AnonymousProgressThrottle])`); serializer **`serializers.py:76-84`**; model **`courses/models.py:173,181,192-196`**.
`PATCH /api/equations/<id>/progress/` keys every read/create/overwrite on a client-supplied `user_id`, stored as `anon_id`. `ProgressUpdateSerializer.user_id` is only `CharField(max_length=100)` — no entropy/ownership/format constraint — and the model enforces a unique `(anon_id, equation)` row for anon users, so any unauthenticated caller can create or **overwrite the progress row (incl. `notes`, `variables_explored`) of any `anon_id` they supply**. The `anon_progress` throttle (60/min, `settings.py:138`) caps volume, not the authorization flaw.
**Severity: High** (unauthenticated cross-tenant write/tamper).
**Fix:** Require `user_id` to be a server-issued UUIDv4 (strict regex in the serializer) or migrate anon progress to a signed `HttpOnly` cookie token. Keep the throttle.

### H2. No throttling / lockout on auth & registration endpoints; account-enumeration oracle  — CONFIRMED
**`accounts/views.py:20`** (`LoginView`), **`:31`** (`google_auth`), **`:99`** (`register`); **`accounts/urls.py`** (`refresh/` → `TokenRefreshView`); **`settings.py:127-140`**.
`REST_FRAMEWORK` defines `DEFAULT_THROTTLE_RATES` for `anon_progress` only and **no `DEFAULT_THROTTLE_CLASSES`** (DRF's default is `[]` — vendored-confirmed); no auth view carries a throttle class (`grep throttle accounts/ payments/` → none). SimpleJWT's `TokenObtainPairView`/`TokenRefreshView` subclass `GenericAPIView` and inherit the empty throttle list. Result: `login` is brute-forceable, `register`/`google` can be sprayed, and `RegisterSerializer.validate_email` (`serializers.py:37-40`) returns a distinct *"An account with this email already exists."* — an enumeration oracle.
**Severity: High.**
**Fix:** Attach `ScopedRateThrottle`/`AnonRateThrottle` (~5/min/IP) to login/register/google/refresh; consider `django-axes` for lockout; make registration failure generic.

### H3. Invite-code path inherits H2's no-throttle and leaks lifecycle state  — CONFIRMED
**`accounts/invites.py:28-50`** (`get_available_invite`), **`serializers.py:50-55`**, **`views.py:54-74`**, model **`accounts/models.py:82-101`**.
Hashing (SHA-256) + `select_for_update` is correct, but validate/redeem runs through the un-throttled `register`/`google_auth`, and the per-state messages — *"invalid"* / *"revoked"* / *"expired"* / *"already used"* (`invites.py:36-43`) — leak code lifecycle. Keyspace is large (`secrets.choice` over `[A-Z2-9]`, 32¹² ≈ 1.1×10¹⁸ → brute force impractical), so the real issue is the oracle + missing rate limit gating all signups when `INVITES_REQUIRED=1`.
**Severity: High** (in invite-gated mode).
**Fix:** Rate-limit invite attempts per IP; collapse all failures into one generic *"Invite code is invalid or no longer available."*

---

## MEDIUM

### M1. Avatar upload validated by filename extension only — no content/MIME sniffing  — CONFIRMED (reachability nuance, see M4)
**`accounts/views.py:142-174`**; media serving **`urls.py:15-16`**, **`settings.py:110,221-222`**.
Checks `file.size ≤ 5MB` and the **extension string** (`jpg/jpeg/png/webp/gif`) — never decodes the bytes. Stored name `avatars/{user.id}_{uuid4().hex[:8]}.{ext}` makes path traversal **not** exploitable, but arbitrary content (HTML/JS polyglot) can be stored under a `.png`/`.gif`. When `SERVE_MEDIA_FROM_DJANGO` is on (always in DEBUG; opt-in via `DJANGO_SERVE_MEDIA` in prod), `static()` serves it directly.
**Note vs the draft:** the draft (and prior audit) claim this is reachable because `X-Content-Type-Options: nosniff` is absent. **That premise is false** — Django 5.2 emits `nosniff` by default (see M4). The residual risk is real but narrower: a victim who *opens the file URL directly* still gets a forced download/inline-render decision driven by the server's `Content-Type`, and there is still **no `Content-Disposition: attachment` and no cookieless media origin**.
**Fix:** `PIL.Image.open(fp).verify()` then re-encode; reject SVG explicitly; serve user media with `Content-Disposition: attachment` from a cookieless path.

### M2. `X-Forwarded-For` trusted blindly for invite-redemption IP logging  — CONFIRMED
**`accounts/invites.py:19-25`**. `get_request_meta` takes `HTTP_X_FORWARDED_FOR.split(",")[0]` with no trusted-proxy count, writing an attacker-forgeable value to `InviteRedemption.ip_address` (`models.py:113`, a `GenericIPAddressField` — so a malformed value is rejected on save, but a *valid-looking forged IP is accepted*). Audit-integrity only (not an auth bypass).
**Fix:** Derive client IP from a known proxy hop count (or `django-ipware` configured to the proxy depth). Never trust the leftmost XFF entry.

### M3. `SECURE_PROXY_SSL_HEADER` trusts client-supplied `X-Forwarded-Proto`  — CONFIRMED
**`settings.py:240-241`**. `SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")` + `SECURE_SSL_REDIRECT = True`. The bundled `frontend/nginx.conf:16` does `proxy_set_header X-Forwarded-Proto $scheme`, so under that nginx it's contained. But the primary deploy target is Passenger/cPanel (`backend/passenger_wsgi.py` confirmed present). If that proxy doesn't *unconditionally* overwrite `X-Forwarded-Proto`, a client sending `X-Forwarded-Proto: https` is treated as secure, defeating SSL redirect + secure-cookie logic.
**Fix:** Verify/enforce that the production proxy unconditionally overwrites the header; document this next to the setting.

### M4. Missing **Content-Security-Policy** — CORRECTED (nosniff & referrer-policy are NOT missing)
**`settings.py:236-243`**; **`frontend/nginx.conf`** (caching headers only).
**Correction (important — the draft and the prior r1 audit are both wrong here):** Django 5.2 defaults `SECURE_CONTENT_TYPE_NOSNIFF = True` and `SECURE_REFERRER_POLICY = "same-origin"` (vendored `global_settings.py:661,667`), and the installed `SecurityMiddleware` (MIDDLEWARE[0]) emits `X-Content-Type-Options: nosniff` and `Referrer-Policy: same-origin` **by default, in DEBUG and prod alike** — independent of the `if not DEBUG` block, which only *adds* HSTS/SSL-redirect/secure-cookies. `XFrameOptionsMiddleware` is also installed and `X_FRAME_OPTIONS` defaults to `DENY`. So `nosniff`, `Referrer-Policy`, and `X-Frame-Options` **are emitted**; the draft's claim that "the `X-Content-Type-Options` header is not emitted" is false.
**What genuinely remains:** there is **no Content-Security-Policy anywhere** (not in `requirements.txt`, not vendored — `django-csp` absent — not in nginx, not in Django config; grep-confirmed). This is the one valid part of M4 and the real backstop gap for L1 and M5.
**Severity: Medium → Low/Medium** (CSP-only; the header-omission half is invalid).
**Fix:** Add a CSP (nginx `add_header Content-Security-Policy` or `django-csp`). Optionally pin `SECURE_HSTS`/cookie settings as already done. No need to set `SECURE_CONTENT_TYPE_NOSNIFF`/`SECURE_REFERRER_POLICY` — they're already on by default; setting them explicitly is harmless documentation only.

### M5. JWT refresh token stored in `localStorage` (XSS-exfiltratable; 30-day lifetime)  — CONFIRMED
**`frontend/src/auth/tokenStorage.ts:6-7,55-92`**; **`settings.py:142-147`**.
Access token is memory-only (good); the **refresh token** is written to `localStorage` (`saveTokens`, line 60) and read on refresh (line 91). `REFRESH_TOKEN_LIFETIME` defaults to 30 days. The file's own comments (lines 3-5) flag it as a stopgap. With no CSP (M4), one XSS = up to 30-day takeover. `ROTATE_REFRESH_TOKENS` + `BLACKLIST_AFTER_ROTATION` are enabled (good), but a stolen token is valid until next rotated.
**Fix:** Move the refresh token to an `HttpOnly`, `Secure`, `SameSite=Strict` cookie (the in-file TODO); meanwhile ship CSP and shorten the refresh lifetime.

---

## LOW

### N1 (NEW — missed by draft and prior audit). `login`/`refresh` JWT responses persist refresh tokens, but `register`/`google_auth` issue tokens with **no per-account or global token cap** — combined with H2's no-throttle, unbounded account+token creation
**`accounts/views.py:89-96,115-122`**, **`settings.py:142-147`**.
`register` and `google_auth` both call `RefreshToken.for_user(user)` and return a 30-day refresh token. With no throttle (H2) and (in non-invite mode) no signup gate, an attacker can mint unlimited accounts, each yielding a long-lived refresh token and a `Profile` + related rows. `BLACKLIST_AFTER_ROTATION` populates `token_blacklist` tables that grow unbounded under spray. This is the account/token-creation amplification of H2 and a storage-growth vector distinct from H1's anon path.
**Severity: Low** (DoS/storage; fully mitigated by fixing H2).
**Fix:** Resolved by the H2 throttles; additionally schedule cleanup of expired blacklisted/outstanding tokens (`flushexpiredtokens`).

### L2. Unbounded arbitrary JSON on multiple endpoints incl. an unauthenticated one  — CONFIRMED, severity tightened to LOW
**`courses/serializers.py:83,93,104` (`variables_explored = ListField(child=JSONField())`), `:112` (`data = DictField()`); `courses/models.py:181` (`JSONField(default=list)`), `:211`; `accounts/views.py:197-205`** (UserSettings PATCH `{**settings_obj.data, **incoming}`).
No per-field size/depth/element cap on any of these. The anonymous `update_progress` (H1) accepts `variables_explored` as an unbounded `ListField(child=JSONField())`, so an unauthenticated caller can persist large/deep JSON on a free-form `anon_id`.
**Nuance vs the draft:** Django's `DATA_UPLOAD_MAX_MEMORY_SIZE` default of **2.5 MB** (vendored `global_settings.py:315`, not overridden) **does** cap each request body, so a *single* request is bounded; the genuine vector is **repetition across many `anon_id` values (storage growth)** plus parse-cost of a 2.5 MB nested blob — not "unbounded per request." The "serialization-DoS" framing is therefore weak. Severity Low (not Low-Medium).
**Fix:** Validate `variables_explored` length and element types; validate the settings blob against a key/type allowlist; optionally lower `DATA_UPLOAD_MAX_MEMORY_SIZE`.

### L1. `dangerouslySetInnerHTML` for legal pages — safe today, fragile by design  — CONFIRMED
**`frontend/src/components/LegalDocumentPage.tsx:55`** (consumed by `TermsPage.tsx:5` / `PrivacyPage.tsx:5`, both hardcoding `documentPath="/legal/terms.html"|"/legal/privacy.html"`).
HTML is `fetch`ed from a hardcoded same-origin static path and injected unsanitized — the **only** `dangerouslySetInnerHTML` in the frontend (grep-confirmed). Source is developer-authored static files, so current impact is low; latent stored-XSS sink if those docs ever become dynamic/CMS-sourced. `LessonMarkdown.tsx` uses `react-markdown` + `remarkGfm` with **no `rehype-raw`** → lesson markdown is safe.
**Fix:** Run fetched HTML through DOMPurify, or render via the existing `ReactMarkdown` pipeline. CSP (M4) as backstop.

### L3. Verbose API landing page leaks the endpoint map (and the obscured admin path under DEBUG)  — CONFIRMED
**`formulas_backend/views.py:5-86`.** `GET /` always renders the full API route inventory (static HTML, no user-input reflection); when `settings.DEBUG` it additionally reveals `ADMIN_URL_ABSOLUTE_PATH` (lines 10-13), undermining the obscured `DJANGO_ADMIN_PATH`. The admin row is correctly hidden when `DEBUG=0`, so production impact is reconnaissance-level only.
**Fix:** Gate the page behind `DEBUG` or serve a minimal page in production.

### L4. Stripe upgrade keyed solely on `customer` id — not bound to the configured Pro price/product  — CONFIRMED
**`payments/views.py:142-153`** (`checkout.session.completed`), **`:155-166`** (`customer.subscription.updated`). The webhook upgrades to `pro` for any completed/active session on that `customer_id` without verifying the line item matches `STRIPE_PRO_MONTHLY/YEARLY_PRICE_ID`. Signature verification is correct (`:133-138`) so it's not externally forgeable — but a customer completing checkout for a different/cheaper product would still be upgraded. Authorization-tightness gap.
**Fix:** Inspect session line items / subscription items and confirm a configured Pro price before `upgrade_profile`.

### L5. No dependency vuln scanning in CI; backend job runs only `courses` tests  — CONFIRMED
**`.github/workflows/ci.yml`** (last step: `python manage.py test courses -v 2`), `backend/requirements.txt`, `frontend/package.json`. Pins are recent/clean (Django 5.2.1, DRF 3.16.0, simplejwt 5.4.0, stripe 12.2.0, google-auth 2.40.0; React 19, Vite 6). But CI runs lint/type-check/test/build + `migrate` only — **no `pip-audit`/`npm audit`** — and the backend test target is **`courses` only**, so `accounts`/`payments` security tests (auth/invite/Stripe) **never run in CI**.
**Fix:** Add `pip-audit` + `npm audit` (or Dependabot); change the backend target to `python manage.py test` (all apps).

---

## Checked and confirmed OK
- **SQLi / injection / dangerous eval-family:** ORM-only with parameterized `__icontains`/filter args (`courses/views.py:124-134`); zero `eval`/`exec`/`pickle`/`marshal`/`subprocess`/`os.system`/`mark_safe`/`format_html`/`__import__`/`yaml.load` in app code (grep-confirmed).
- **Insecure deserialization / JSON import:** `import-json/` is `admin_view`-gated (`courses/admin.py:78`), uses structured `json` parsing — no pickle/eval.
- **Mass-assignment / privilege escalation:** `ProfileSerializer` marks `tier`/`avatar_url`/`created_at` read-only (`serializers.py:13`); Pro set only via the signature-verified Stripe webhook; every Pro endpoint re-checks `profile.tier=='pro'`/`is_pro` server-side.
- **IDOR on authed endpoints:** `update_my_progress`, `bulk_sync_progress`, `my_progress`, `learning_dashboard`, `log_event` all scoped to `request.user`.
- **Google OAuth:** ID token verified server-side against the configured client ID with `email_verified` enforced (`accounts/views.py:24-52`); invite redemption rolls back via `user.delete()` inside the transaction.
- **Open redirect:** `safeRedirect` enforces HTTPS + Stripe-domain allowlist (subdomain-safe via `endsWith("." + d)`); `sanitizeNextPath` rejects cross-origin and protocol-relative (`//`) paths.
- **Default security headers:** `nosniff`, `Referrer-Policy: same-origin`, `X-Frame-Options: DENY` ARE emitted (Django 5.2 defaults + installed middleware). Only CSP is missing (M4).
- **Secrets:** all from env; startup guards reject the dev `SECRET_KEY` (`settings.py:103-104`) and a `localhost` `FRONTEND_URL` (`:124-125`) in prod. No live secrets tracked (only `*.env.example`); `db.sqlite3` untracked.
- **CORS:** `CORS_ALLOW_CREDENTIALS` default `False`; origins from an env allowlist (`settings.py:76-82`); Bearer-token auth (not cookie) → no CSRF-via-CORS exposure.

## Recommended next steps (priority order)
1. **H2 + H3 + N1** — per-IP throttling on login/register/google/refresh + generic error messages. Closes brute-force, account & invite enumeration, spray, and unbounded account/token creation in one move.
2. **H1 + L2 (anon path)** — constrain anon `user_id` to a server-issued UUIDv4 and bound `variables_explored` length/types; closes the no-auth IDOR and the anon JSON-write together.
3. **M5 + M4** — move the refresh token to an `HttpOnly Secure SameSite=Strict` cookie; add a CSP. (Do **not** waste effort "adding" nosniff/referrer-policy — already default-on.)
4. **M1** — Pillow decode/re-encode avatars, reject SVG, serve media with `Content-Disposition: attachment` from a cookieless path.
5. **M2 + M3** — fix trusted-proxy IP derivation; verify the Passenger/cPanel proxy unconditionally overwrites `X-Forwarded-Proto`.
6. **L4, L3, L5, L1** — bind Stripe upgrades to a configured price; gate the landing page behind DEBUG; add `pip-audit`/`npm audit` + broaden CI to all apps; DOMPurify the legal HTML.

**Auditor note:** The prior audit `docs/audits/2026-06-14-r1-sciencebouk-security.md` should be corrected — its M4 ("`SECURE_CONTENT_TYPE_NOSNIFF`/`SECURE_REFERRER_POLICY` … not set", "`nosniff` is not set anywhere") is inaccurate for Django 5.2 and was propagated into this draft.
