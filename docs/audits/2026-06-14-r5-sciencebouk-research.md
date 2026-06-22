---
title: "Research Audit (Verified) — sciencebouk"
repo: sciencebouk
lens: research
date: 2026-06-14
round: 5
---

All local facts verified:
- Vite lockfile resolves to 6.4.1 (report's claim confirmed; the patched version, floor `^6.3.2`).
- esbuild 0.25.12, framer-motion 12.38.0 (report said 12.38.0 — confirmed).
- jsdom `^29.0.1` confirmed.
- nginx has no `/media/` location (confirmed).
- `stripe.error.SignatureVerificationError` — valid for stripe 12.x.

I now have enough to finalize. The web-cited CVE/version claims (C1 Django security releases, C2 specific Vite CVE numbers, advisory comparisons) are external facts I cannot fully re-verify in a read-only repo audit without web access; I'll mark those as "cited, not independently re-verified here" rather than assert them as confirmed. The verifiable local anchors (pinned versions, floors, absent CI scanning) are all confirmed.

Here is the final verified report:

---

# Research Audit (Verified) — sciencebouk (Django 5.2 REST API + React 19 / Vite 6 SPA)

**Repo:** `/Users/svetlana/Documents/projects/sciencebouk` · **Lens:** research (version-currency / advisory comparison / best-practice) · **Date:** 2026-06-14 · **Mode:** strictly read-only (verification pass — no files mutated)

**Verifier note on method:** Every in-repo claim below was checked against source with Read/Grep. Web-cited facts (CVE numbers, upstream release dates, vendor guidance) are external and were **not** re-fetched in this read-only pass — they are flagged `[web-cited, not re-verified locally]`. The verifiable *local anchors* for those findings (pinned versions, floors, missing CI gates) were all confirmed. Net change from the draft: **2 findings materially corrected (M4, H3), 1 down-rated, several framings tightened; no findings fabricated; 1 finding added (N1).**

**Verdict:** The draft is largely accurate. Most findings hold. The two notable corrections: (H3) uploaded avatars **are** servable via Django (`DJANGO_SERVE_MEDIA=1`), so "not served at all" is wrong — and that Django serve path is the actual XSS foot-gun; (M4) `react-katex` is **not** redundant — it's imported in 9 files and the in-house `components/math/` renderers wrap it — so "drop it" is not a cheap change.

---

## CRITICAL

### C1 — Django 5.2.1 is far behind the 5.2 security line `[web-cited, not re-verified locally]`
- **File:** `backend/requirements.txt:1` — confirmed `Django==5.2.1` (verified).
- **Local anchor (verified):** version is hard-pinned to `5.2.1`; no upper-bound flexibility, no CI currency gate (see L5).
- **Web claim (not re-verified here):** several 5.2.x security releases shipped since May 2025 (incl. a `FilteredRelation` SQL-injection fix on PostgreSQL + DoS issues). The repo does **not** use `FilteredRelation` (grep: 0 hits), so that specific CVE is not directly reachable; the value is general framework patch-currency.
- **Why it matters:** Running a hard-pinned framework version with no upgrade path is the highest-leverage *currency* exposure here. Severity as stated (CRITICAL) is reasonable on the currency lens; the project also runs SQLite + `BILLING_ENABLED=0`, so live blast radius is smaller than a production fintech app.
- **Fix:** Bump to the latest 5.2.x; add `pip-audit` to CI (L5).

### C2 — Vite floor `^6.3.2` admits known dev-server CVEs; installed build is patched `[web-cited, not re-verified locally]`
- **File:** `frontend/package.json` — confirmed `"vite": "^6.3.2"` (verified); lockfile resolves to **6.4.1** (verified via `package-lock.json`), esbuild **0.25.12** (verified).
- **Verifier correction to severity:** The *installed* version is patched and these are **dev-server** CVEs (only exploitable when `vite --host` exposes the dev server on a network — not a production concern, since prod is served by nginx from `dist/`). The real, verifiable finding is purely **process** (no `npm audit`/lockfile-floor enforcement). **This is over-graded at CRITICAL** — the concrete current risk is low. Recommend treating C2 as **MEDIUM (process gap)**, folded into L5.
- **Fix:** Raise floor to `vite@^6.4.1`; add `npm audit`/`osv-scanner` to CI; never expose the dev server.

---

## HIGH

### H1 — Refresh token in `localStorage` (XSS exfiltration vector) — confirmed
- **File:** `frontend/src/auth/tokenStorage.ts:6-7,55-62` — confirmed `REFRESH_TOKEN_KEY` persisted via `safeStorageSet` in `saveTokens` (`:60`); access token is memory-only (`:18,56-57`); explanatory TODO at `:3-5`. All verified.
- **Mitigants (verified):** `ROTATE_REFRESH_TOKENS=True` + `BLACKLIST_AFTER_ROTATION=True` (`settings.py:145-146`), `token_blacklist` in `INSTALLED_APPS` (`:94`). 30-day refresh lifetime (`:144`). All confirmed.
- **Why it matters:** Refresh token is the long-lived credential; XSS can read it. The team did the access-token half correctly. Real HIGH.
- **Fix:** Migrate refresh token to `HttpOnly; Secure; SameSite` cookie (the code already documents this migration).

### H2 — Missing CSP / `nosniff` / referrer-policy headers — confirmed (with one correction)
- **Files (verified):** `settings.py:236-243` prod block has HSTS, SSL redirect, secure cookies, `SECURE_PROXY_SSL_HEADER` — but **no** `SECURE_CONTENT_TYPE_NOSNIFF` and **no** `SECURE_REFERRER_POLICY` (confirmed absent). `frontend/nginx.conf` has **no** CSP, `X-Content-Type-Options`, `Referrer-Policy`, or `Permissions-Policy` (confirmed).
- **Correction:** Draft implied no clickjacking protection context — note `XFrameOptionsMiddleware` **is** present (`settings.py:157`), so `X-Frame-Options` is set. The CSP/nosniff/referrer gaps are real; X-Frame is covered.
- **Added detail (verified):** nginx serves `.svg`/`.gif` static assets with `expires 1y` and **no `nosniff`** (`nginx.conf` regex location), which compounds H3 for any SVG/GIF that lands in the SPA static root.
- **Fix:** Add CSP + `nosniff` + referrer-policy in nginx; add `SECURE_CONTENT_TYPE_NOSNIFF=True` and `SECURE_REFERRER_POLICY` in Django prod block; run `manage.py check --deploy` in CI.

### H3 — Avatar upload validates by extension only; serving path uses extension-sniffing — confirmed, **draft's "not served at all" claim corrected**
- **File:** `backend/accounts/views.py:145-174` — confirmed ext-only check (`:155-157`), allows `gif` but **not** `svg` (so the SVG-script vector is excluded — draft correctly noted this), no magic-byte/Pillow verification, raw bytes written to `MEDIA_ROOT` (`:160-166`), filename uses `uuid4().hex[:8]` (verified).
- **CORRECTION (material):** Draft said avatars "aren't served at all in the documented setup." **False.** `backend/formulas_backend/urls.py:15-16` serves `MEDIA_URL` via Django's `static()` serve view when `settings.SERVE_MEDIA_FROM_DJANGO` is true — i.e. when `DEBUG` **or** `DJANGO_SERVE_MEDIA=1` (`settings.py:110`), and `.env.example:8` exposes `DJANGO_SERVE_MEDIA=0` as a documented toggle. So there **is** a first-party serving path, and it is **exactly the extension-inferring Django serve view** the draft warned about — making H3 more concrete, not less. nginx separately has no `/media/` location (verified), so the nginx route is indeed unbuilt, but the Django route exists.
- **Why it matters:** With `DJANGO_SERVE_MEDIA=1` an uploaded `.gif`/`.png` carrying a polyglot payload is served with extension-inferred `Content-Type` and no `nosniff` (H2) — a stored-content sniffing risk. Blast radius still bounded (no SVG, 5MB cap, authenticated upload only).
- **Fix:** Validate with magic bytes / Pillow `verify()` + re-encode; serve media with forced `Content-Type` + `nosniff`; never use the bare `static()`/`serve` view for user uploads in production.

### H4 — Email not DB-unique + case-sensitive registration check → duplicate/confused accounts — confirmed
- **Files (all verified):** `serializers.py:37-39` case-sensitive `User.objects.filter(email=value)`; `:60-64` `create_user(username=email, email=email)` with **no lowercasing**; contrast `views.py:48` Google path **does** `.lower()`; `views.py:55,64` `get_or_create(email=email)` on the lowercased value.
- **Partial mitigant (verified):** `username` is set to the email and `username` is unique (default `auth.User`), so identical-case duplicates are blocked — but mixed-case across the password vs Google paths (`Me@x.com` vs `me@x.com`) collide into two users. Confirmed real.
- **Model root (verified):** `accounts/models.py:20-23` — `Profile` hangs off default `auth.User` via OneToOne; default User has no `unique=True` on `email`.
- **Fix:** Normalize email on all ingress; add a case-insensitive DB unique constraint (`UniqueConstraint(Lower('email'))`); make the check `email__iexact`. Best done via a custom user model (M5).

---

## MEDIUM

### M1 — Default `LocMemCache` backs both `cache_page` and the anon-progress throttle; unbounded anon row creation — confirmed
- **Files (verified):** `settings.py:226-234` default `LocMemCache`; `courses/views.py:53-56` `cache_page(60*5)` on equation list; `:59-66` `AnonymousProgressThrottle(AnonRateThrottle)` on the `AllowAny` PATCH; rate `anon_progress=60/minute` (`settings.py:137-139`); `serializers.py:78` `user_id = CharField(max_length=100)` mapped to `UserProgress.anon_id` (`views.py:76-82`).
- **Why it matters:** Each distinct `anon_id` (client-supplied, ≤100 chars) creates a `UserProgress` row via `get_or_create`. Under multi-worker deployment LocMemCache makes the throttle per-process (effective limit = N×rate) and `cache_page` non-shared — so the only abuse guard is structurally weakened. Storage-growth/cost DoS. Confirmed real; env hook `DJANGO_CACHE_BACKEND` exists (`:228`) to fix.
- **Fix:** Mandate shared Redis/Memcached in prod; cap/bound anon rows; assert backend in `check --deploy`.

### M2 — Stripe API version not pinned in SDK — confirmed
- **File:** `payments/views.py:12` — confirmed only `stripe.api_key = ...`, **no** `stripe.api_version`. `requirements.txt:6` `stripe==12.2.0` (verified — the SDK pin fixes a *default* API version, but it's implicit and drifts on bump).
- **Why it matters:** Latent — `BILLING_ENABLED=0` by default (`settings.py:114`), so dormant pre-launch. A future SDK bump could silently change webhook payload deserialization (`views.py:142-190` uses `.get(...)` accessors). Correct MEDIUM.
- **Fix:** Set `stripe.api_version` explicitly to match the Dashboard webhook endpoint version.

### M3 — Stripe webhook handler not idempotent — confirmed
- **File:** `payments/views.py:114-192` — confirmed no processed-event-id store; each delivery re-runs `upgrade_profile`/`downgrade_profile` (`:22-31`).
- **Why it matters:** Current ops are coincidentally idempotent (setting `tier='pro'` twice is harmless), so impact is **low today** (draft correctly says so). Becomes a real double-fulfilment bug the moment side effects (emails, credits) are added. Synchronous DB work in-request. Correct MEDIUM.
- **Fix:** Add `ProcessedStripeEvent(event_id unique)`; insert-or-skip at handler top.

### M4 — `react-katex` is a maintenance risk — **draft's "redundant / drop it" framing CORRECTED**
- **Files (verified):** `package.json` `react-katex ^3.1.0`, `katex ^0.16.45`; custom shim `frontend/src/types/react-katex.d.ts` (confirmed — it's a `declare module` stub, the package ships no types).
- **CORRECTION (material):** Draft said the wrapper "may be largely redundant" because the app "hand-rolls renderers in `components/math/*`." **False.** `react-katex` is imported in **9 source files** (`AuthPage`, `SettingsPage`, `PythagoreanTheoremExplorer`, `InteractiveEquation`, `scenes/GenericEquationScene`, `scenes/ConfigurableEquationScene`, `math/InlineMathRenderer`, `teaching/LiveFormula`), and the in-house `components/math/InlineMathRenderer.tsx:3,10` **wraps `react-katex`'s `InlineMath`** rather than replacing it. So dropping `react-katex` is a real refactor across 9 files, not a free deletion. The maintenance-risk angle (unmaintained wrapper + React 19) stands; the "redundant" justification does not.
- **Fix:** If migrating, replace all 9 usages with direct `katex.renderToString` or a maintained fork — scope it as a real task, not a cleanup.

### M5 — Default User model blocks clean auth evolution — confirmed (direction-of-travel)
- **Files (verified):** `serializers.py:60-64`; `models.py:20-23` Profile OneToOne on `auth.User`. Confirmed username is a copy of email — email-first intent is clear.
- **Why it matters:** Retrofitting a custom user model post-migrations is costly; cheapest now (SQLite, beta). Resolves H4 at the root. Correct MEDIUM advisory.
- **Fix:** Introduce custom user model with `USERNAME_FIELD='email'` + case-insensitive unique email while data is tiny.

---

## LOW

### L1 — `dangerouslySetInnerHTML` on legal pages — confirmed first-party, low
- **File:** `frontend/src/components/LegalDocumentPage.tsx:55`; source paths `TermsPage.tsx:5` / `PrivacyPage.tsx:5` are relative same-origin `/legal/terms.html` / `/legal/privacy.html` (verified — no remote URL). No current XSS. Correct LOW.
- **Fix:** Keep build-time; sanitize with DOMPurify if ever remote-sourced. Add an invariant comment.

### L2 — `X-Forwarded-For` trusted without proxy allowlist — confirmed, low
- **File:** `accounts/invites.py:19-25` — confirmed `forwarded_for.split(",")[0]`, used **only** for `InviteRedemption.ip_address` audit (`invites.py:62-67`, `models.py:113`), no security decision. Spoofing only pollutes an audit field. nginx sets `X-Forwarded-For $proxy_add_x_forwarded_for` (verified). Correct LOW.
- **Fix:** Document the trusted-proxy assumption; do not reuse raw XFF for throttling.

### L3 — `framer-motion` legacy package name — confirmed local pin, advisory
- **File:** `package.json` `"framer-motion": "^12.6.3"`, lockfile **12.38.0** (verified). No functional/security issue. Correct LOW.

### L4 — `jsdom ^29` behind toolchain (`vitest 4`) — confirmed local pin, dev-only
- **File:** `package.json` `"jsdom": "^29.0.1"` (verified). Dev-only, no prod risk. Correct LOW.

### L5 — No dependency-vuln scanning in CI (meta-finding behind C1/C2/M2) — confirmed
- **File:** `.github/workflows/ci.yml` (verified) — runs `tsc --noEmit`, `npm run test`, `npm run build` (frontend) and `migrate` + `python manage.py test courses` (backend). **No** `pip-audit`, `npm audit`, `osv-scanner`; **no** `.github/dependabot.yml` (verified absent); **no** `manage.py check --deploy`. Also note: backend CI tests **only the `courses` app** (`test courses`) — `accounts` and `payments` tests are not run in CI (verified, additional gap).
- **Fix:** Add `pip-audit` + `npm audit`/`osv-scanner` + Dependabot + `check --deploy`; broaden backend test to all apps (`python manage.py test`).

---

## NEW (added by verifier)

### N1 — CI runs only the `courses` test suite; `accounts` and `payments` are untested in CI — confirmed
- **File:** `.github/workflows/ci.yml` backend job: `python manage.py test courses -v 2` (verified). The auth/email-normalization logic (H4), invite redemption, and Stripe webhook handling (M3) live in `accounts`/`payments` and are **never exercised by CI**, even if local tests exist for them.
- **Why it matters:** The highest-risk seams in this audit (auth boundary, billing) have no CI regression net. This is a research-grade process finding distinct from L5's "no vuln scanning."
- **Fix:** Change to `python manage.py test` (all apps) or enumerate `courses accounts payments`.

---

## Confirmed positives (verified, unchanged from draft)
- Access token memory-only with one-time localStorage promotion (`tokenStorage.ts:18,56-57,77-88`) — verified.
- Refresh rotation + blacklist-after-rotation (`settings.py:145-146`, `token_blacklist` `:94`) — verified.
- Webhook raw-body signature verification as a plain Django view (`payments/views.py:114-138`) — verified, with explanatory docstring.
- Invite codes SHA-256 hashed at rest, generated with `secrets` (`models.py:16-17,82-85`) — verified; only `code_hash`/`code_preview` stored.
- Open-redirect/`javascript:` guard (`lib/safeRedirect.ts`, HTTPS + allowlist `checkout.stripe.com`/`billing.stripe.com`) — verified; actually used in `ProUpgrade.tsx:83`, `ProfilePage.tsx:75`, `Dashboard.tsx:43`.
- `react-markdown` without `rehype-raw` (`teaching/LessonMarkdown.tsx:94`, only `remarkPlugins={[remarkGfm]}`) — verified; raw HTML not rendered.
- Secrets hygiene: only `*.env.example` tracked; `.env`, `backend/db.sqlite3`, `backend/media/`, `frontend/.env` gitignored (verified via `git ls-files` + `.gitignore`).
- Prod fail-fast assertions for `SECRET_KEY` and non-localhost `FRONTEND_URL` (`settings.py:103-104,124-125`) — verified.
- `X-Frame-Options` via `XFrameOptionsMiddleware` (`settings.py:157`) — verified (clarifies H2 scope).

---

## Severity-sorted summary

| ID | Sev | Finding | Status |
|----|-----|---------|--------|
| C1 | CRITICAL | Django 5.2.1 hard-pinned, off the security line | Confirmed (web-cited facts not re-verified locally) |
| C2 | ~~CRITICAL~~ → **MEDIUM** | Vite floor admits dev-server CVEs; installed 6.4.1 is patched | **Down-rated** — dev-only, prod unaffected; real issue is process gap (fold into L5) |
| H1 | HIGH | Refresh token in localStorage | Confirmed |
| H2 | HIGH | No CSP / nosniff / referrer-policy | Confirmed (X-Frame IS present) |
| H3 | HIGH | Ext-only avatar validation + extension-sniffing serve path | Confirmed; **draft's "not served at all" corrected** — Django `SERVE_MEDIA` path exists & is the foot-gun |
| H4 | HIGH | Email not DB-unique + case-sensitive check | Confirmed |
| M1 | MEDIUM | LocMemCache breaks throttle + cache_page; unbounded anon rows | Confirmed |
| M2 | MEDIUM | Stripe api_version unpinned | Confirmed (dormant, billing off) |
| M3 | MEDIUM | Webhook not idempotent | Confirmed (low impact today) |
| M4 | MEDIUM | react-katex maintenance risk | Confirmed risk; **"redundant/drop it" framing corrected** — used in 9 files, wrapped by in-house renderer |
| M5 | MEDIUM | Default User model blocks auth evolution | Confirmed (advisory) |
| L1 | LOW | dangerouslySetInnerHTML on legal pages | Confirmed first-party |
| L2 | LOW | XFF trusted for audit only | Confirmed |
| L3 | LOW | framer-motion legacy name | Confirmed |
| L4 | LOW | jsdom behind toolchain | Confirmed |
| L5 | LOW | No dep-vuln scanning in CI | Confirmed |
| N1 | LOW | **NEW** — CI tests only `courses`, not `accounts`/`payments` | Added by verifier |

---

## Recommended next steps
1. **C1** — Bump Django to the latest 5.2.x (highest currency leverage, low effort).
2. **L5 + N1 + C2** — One CI hardening PR: add `pip-audit` / `npm audit` (or `osv-scanner`) + Dependabot + `manage.py check --deploy`, raise Vite floor to `^6.4.1`, and broaden the backend test step to `python manage.py test` (all apps). This single change prevents C1/C2/M2 recurrence **and** closes the auth/billing CI blind spot.
3. **H2** — Add CSP + `X-Content-Type-Options: nosniff` + `Referrer-Policy` (nginx + Django prod block). Cheap; multiplies the value of H1/H3/L1.
4. **H1** — Migrate refresh token to `HttpOnly; Secure; SameSite` cookie (migration already documented in code).
5. **H4 + M5** — Lowercase email on all ingress + DB-level case-insensitive unique constraint, ideally via a custom user model while the dataset is tiny.
6. **H3** — Magic-byte/Pillow validation + re-encode for avatars; settle the media-serving story (Django `SERVE_MEDIA` path forces correct `Content-Type` + `nosniff`, or move to nginx with `nosniff`) **before** flipping `DJANGO_SERVE_MEDIA=1` in any exposed environment.
7. **M2 + M3** — Before billing go-live: pin `stripe.api_version`, add a `ProcessedStripeEvent` idempotency table.
8. **M4** — Treat the `react-katex` migration as a scoped 9-file refactor (or accept the dependency); it is not a free deletion.

**Persistence note:** Per the project audit convention this report should be saved to `docs/audits/2026-06-14-r5-sciencebouk-research.md` (siblings r1–r4 confirmed present). I did not write it — returned inline for the orchestrator to persist. Read-only verification pass; no files created, edited, or executed with side effects.
