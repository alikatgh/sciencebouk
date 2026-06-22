---
title: Tests Audit — sciencebouk (Round 2, verified)
repo: sciencebouk
lens: tests
date: 2026-06-14
round: 2
---

All findings verified. Notes:
- C1: Confirmed. `36257b4` (invite-gated signup) added the accounts invite tests; commits exist. `499c896`/`06bf769` from the draft are actually "mobile pinch zoom" and "admin path configurable" — the draft mis-attributed those SHAs. I'll soften the SHA attribution but keep the core point (invite/payments/accounts tests never run in CI).
- C2: Confirmed no TEST_RUNNER/test-settings cache override. The cross-test bleed within `EquationListTests` (6 tests on the same bare URL) is real; the draft's claim that `EquationListTests` vs `EquationCategoryFilterTests` collide is partly wrong (the latter uses `?category=`, a distinct cache key). I corrected the specifics.

The draft is highly accurate. The main corrections: H1 impact is overstated (caller ignores the resolved value), M4's `evilcheckout` parenthetical is muddled, M1's flakiness needs verifying (no events test, so the streak-with-events flakiness is hypothetical for tests-to-be-added — valid), the "no fake-timers anywhere" process claim is false (ProUpgrade.test.tsx uses them), and C2's collision example is partly wrong. I have enough to produce the final report.

---

# Tests Audit — sciencebouk (verified)

Read-only audit of the test suite (Django backend `backend/`, Vitest frontend `frontend/src/`). Every finding below was verified against source via Read/Grep. Severity reflects blast radius on security-sensitive paths (auth, money, access control) and likelihood of silent regression. Corrections to the draft are called out inline.

## Verification summary
- **Confirmed as-written:** C1, H2, H3, H4, M1, M2, M3, M5, M6, L1, L2, L3, L4, L5
- **Confirmed but impact/specifics corrected:** H1 (frontend impact overstated), C2 (collision example partly wrong), M4 (subdomain note muddled)
- **False positive in process notes:** "No fake-timer usage anywhere in the frontend" — `frontend/src/components/ProUpgrade.test.tsx` does use fake timers.
- **Minor inaccuracy:** C1's commit attribution (`499c896`/`06bf769`) — those SHAs are "mobile pinch zoom" and "admin path configurable", not the accounts/payments test commits. The invite tests came in `36257b4`. Point stands; attribution corrected.

---

## CRITICAL

### C1. Backend CI runs only the `courses` suite — accounts, payments, formulas_backend tests never execute
`.github/workflows/ci.yml:43` → `python manage.py test courses -v 2`

Verified. The backend job runs only `courses`. The entire `accounts` suite (`backend/accounts/tests.py`, 671 lines: register, login, JWT refresh, invite-gated signup, Google auth, profile update, Pro settings), the entire `payments` suite (`backend/payments/tests.py`, 301 lines: checkout/portal/status/webhook), and `backend/formulas_backend/tests.py` (admin-path hardening, 46 lines) are written but never run in CI. These cover the most security-sensitive paths in the app. A regression in any of them ships green.

Attribution correction: the invite tests landed in `36257b4 "Add invite-gated signup flow"`; the draft's `499c896`/`06bf769` are unrelated commits.

**Fix:** Change line 43 to `python manage.py test -v 2` (runs all apps; picks up new apps automatically), or explicitly list `courses accounts payments formulas_backend`.

### C2. Real `LocMemCache` + `cache_page(60*5)` on the equation list, never neutralized in tests → process-global cache bleed
`backend/courses/views.py:53-56`, `backend/formulas_backend/settings.py:226-234`

Verified: `CACHES.default` is `LocMemCache` (not Dummy); `grep` for `CACHES`/`cache.clear`/`DummyCache`/`TEST_RUNNER` across settings and all `tests.py` returns nothing. Django rolls back the DB per `TestCase` but **LocMemCache is process-global and is not rolled back**, and the 5-minute TTL outlives the whole test run.

**Correction to the draft's example:** the draft says `EquationListTests` and `EquationCategoryFilterTests` collide. They do not — `EquationCategoryFilterTests` GETs `/api/equations/?category=...` and `EquationLocalizationAPITests` GETs `?locale=de`, both of which are *distinct cache keys* from the bare list URL. The real exposure is narrower but still real: `EquationListTests` (views.py is cached on the bare `/api/equations/` path) runs **6 tests all hitting the identical bare URL** (tests.py:298-326). The first GET caches the body; the other 5 read the cached copy. They pass today only because they share `BaseAPITest`'s identical 3-equation dataset. Any new sibling `BaseAPITest` subclass that seeds *different* equations and GETs the bare list URL would receive `EquationListTests`'s stale cached body — an order-dependent false pass or failure.

**Fix:** Override `CACHES` to `DummyCache` under test (dedicated test settings or `if "test" in sys.argv`), or add a base `setUp`/`tearDown` calling `django.core.cache.cache.clear()`. This also matters for L3 (throttling uses the same cache).

---

## HIGH

### H1. `bulk_sync_progress` 207 error branch is untested; client types disagree with the 207 envelope
`backend/courses/views.py:281-315` (esp. 313-314), `backend/courses/serializers.py:97-105`, `frontend/src/api/client.ts:241-242`

Verified. `BulkProgressItemSerializer.equation_id` is a required `IntegerField`, so a non-integer item fails `is_valid()` and the view returns `{"results", "errors"}` with HTTP 207 (views.py:313-314). No backend test ever sends a malformed item — the bulk-sync tests (tests.py:1110-1203) only send valid items or a valid-but-unknown id (`9999`, tests.py:1162, which is silently dropped, not a validation error). The 207 path is dead-untested.

The client types the endpoint as `request<ProgressItem[]>` (client.ts:241-242). A 207 is `response.ok === true`, so `request()` returns the `{results, errors}` **object** where an array is declared — a real type/contract mismatch.

**Correction to the draft's impact claim:** the draft says the SyncPrompt onboarding flow does `.map`/`.length` on the result and "gets wrong behavior." It does not — `SyncPrompt.tsx:47-55` calls `api.progress.bulkSync(localItems).then(() => setStatus("done"))` and **never reads the resolved value**. So today the mismatch is latent (no caller is broken), not actively breaking the frontend. It remains a HIGH-value gap: the contract is untested on both sides and the next caller that trusts the `ProgressItem[]` type will break silently.

**Fix:** Backend test posting valid + invalid items, asserting status 207 and body shape. Decide and pin the contract (either always return a list with per-item errors elsewhere, or change the client type to a 207-aware envelope) and test it.

### H2. Avatar upload endpoint has zero tests despite filesystem writes + validation
`backend/accounts/views.py:142-174`, route `me/avatar/`

Verified. `upload_avatar` validates size (5 MB), extension allowlist (`jpg/jpeg/png/webp/gif`), defaults extension-less names to `jpg` (views.py:155), and writes to `MEDIA_ROOT`. No backend test posts to `/api/auth/me/avatar/`. The similarly-named `test_avatar_url_is_read_only_and_not_updated` (accounts/tests.py:479) tests the *profile serializer's* read-only field, not the upload endpoint. (There is one frontend test, client.test.ts:85, but it only asserts the request omits the JSON Content-Type header — it does not exercise the backend validation.) Untested: success (200 + `avatar_url`, profile updated), missing file (400), >5 MB (400), disallowed extension (400), unauthenticated (401), extension-less default path.

**Fix:** Backend tests with `SimpleUploadedFile` under `override_settings(MEDIA_ROOT=tmp_path)` covering each branch.

### H3. Invite-code lifecycle: expiry, revocation, multi-use, generated-code format, and the concurrency guard are untested
`backend/accounts/invites.py:28-45`, `backend/accounts/models.py:81-106`

Verified. `get_available_invite` enforces four failure modes — invalid (tested implicitly via "required"), revoked (invites.py:38-39), expired (40-41), exhausted (42-43). Only the **exhausted single-use** path is tested (`test_register_blocks_reused_single_use_invite`, accounts/tests.py:203). Untested:
- `is_expired` → "Invite code has expired." (models.py:93-94)
- `is_revoked` → "Invite code has been revoked." (models.py:96-98)
- `max_uses > 1` allowing N redemptions then blocking the N+1th (`remaining_uses`, models.py:100-102)
- `generate_code()` format `SCB-XXXX-XXXX-XXXX` round-tripping through `set_code`/`hash_invite_code` (models.py:81-90)
- the `select_for_update()` concurrency guard (invites.py:34) — the mechanism that prevents two users redeeming the last use simultaneously.

These are the integrity guarantees of a gated launch.

**Fix:** Model-level tests for expiry/revocation/multi-use boundaries and `generate_code` format; register + google-auth integration tests for expired and revoked codes. A `TransactionTestCase` driving two concurrent redemptions of a `max_uses=1` code locks in the invariant.

### H4. Google OAuth new-user side effects (display name, avatar, unusable password) are never asserted
`backend/accounts/views.py:76-87`

Verified. On first Google sign-in the view sets `display_name` and `avatar_url` from the Google profile and calls `set_unusable_password()`. `test_google_auth_redeems_invite_for_new_user` (accounts/tests.py:263) supplies `name='New Google'` and `picture` in the mock but asserts only invite redemption (lines 278-282) — never the profile population or that the password is unusable (critical: a Google-only account must not be password-loginable). The existing-user path (`test_google_auth_existing_user_does_not_need_invite`, line 285) asserts only a 200 — it does not assert that an existing user's `display_name`/`avatar_url` are NOT clobbered (correct, since the population is guarded by `if created`, but untested).

**Fix:** Extend the new-user test to assert `profile.display_name == 'New Google'`, `profile.avatar_url == picture`, `user.has_usable_password() is False`. Add an existing-user test asserting no clobber.

---

## MEDIUM

### M1. Dashboard streak logic tested only for the zero case; the actual counter is untested and would be time-fragile
`backend/courses/views.py:330-341`, `backend/courses/tests.py:1375`

Verified. The only streak test is `test_dashboard_streak_zero_with_no_events` (tests.py:1375). The real algorithm — walking back consecutive days from `timezone.now().date()` over `LearningEvent` timestamps — is never exercised with events. There is no time mocking in the backend (`freezegun`/patched `timezone.now` grep is empty; the one `timezone.now()` hit at tests.py:1199 is data setup, not a frozen clock). A naive "events today + yesterday → streak == 2" test added without a frozen clock would flake around UTC midnight.

**Fix:** Streak tests with `timezone.now()` frozen (`unittest.mock.patch('django.utils.timezone.now')` or freezegun): consecutive-day streak, gap breaks streak, same-day multiple events count once.

### M2. Client `request()` "refresh failed → original 401 surfaces" branch is untested
`frontend/src/api/client.ts:50-67`, `:81-89`

Verified. `client.test.ts` covers the happy refresh-and-retry (line 57) but not the branch where `refreshAccessToken()` returns `null` (network blip): the code falls through to `throw await readError(response)` re-using the **original 401 `Response`** whose `.json()` body may already be consumed. No test for that, and none for the `requestAllPages` 401→failed-refresh path (client.ts:81-89). Given the heavy comment about intentionally *not* clearing tokens, the negative path warrants a regression test.

**Fix:** Test: token present, first call 401, refresh returns non-ok (so `refreshAccessToken` → null), assert `request` rejects with an HttpError carrying 401 and does not loop. Mirror for `requestAllPages`.

### M3. `useProgress` (519 lines) is the most complex client module and has 3 tests, none covering merge/sync correctness
`frontend/src/progress/useProgress.ts`, `frontend/src/progress/useProgress.test.tsx`

Verified: exactly 3 tests ("persists local progress", "keeps server sync errors visible", "no cross-component-update warning"). Untested correctness-critical logic:
- `mergeProgress` (useProgress.ts:227-239): OR of `completed`, `Math.max` of time, union of variables, latest `lastViewed`. No test verifies a locally-completed equation stays completed when the server says incomplete.
- `debouncedSync` rollback (297-322): comment stresses capturing `rollbackEntry` *before* the optimistic write; on sync failure it restores prior server state. Untested.
- `getServerProgressMap` 30s backoff (268-293) and `ensureServerProgressUser` cache reset on user switch (220-225): untested — a user-switch leaking another user's cached progress is a privacy bug.

**Fix:** Unit table-test for `mergeProgress`; fake-timer tests for `debouncedSync` success and failure-rollback; a backoff test (second call within 30 s does not refetch); a user-switch test asserting cache reset.

### M4. `safeRedirect` (open-redirect / `javascript:` guard) has no test
`frontend/src/lib/safeRedirect.ts` (no `frontend/src/lib/*.test.ts` exists)

Verified: the file is a security primitive (only `https:` on `checkout.stripe.com`/`billing.stripe.com` or their subdomains via `hostname === d || hostname.endsWith("." + d)`), with no test file in `src/lib/`.

**Correction to the draft's subdomain note:** the draft's parenthetical about `evilcheckout.stripe.com` is muddled. The check `endsWith("." + d)` requires the literal suffix `.checkout.stripe.com`, so `evilcheckout.stripe.com` is correctly **rejected** (only `something.checkout.stripe.com` passes). The guard is sound; the point is simply that it's pinned by *no* test, so a future loosening would be silent.

**Fix:** `safeRedirect.test.ts`: allows `https://checkout.stripe.com/x`; blocks `http://...`, `javascript:alert(1)`, `https://evil.com`, `https://stripe.com.evil.com`, `https://evilcheckout.stripe.com`, malformed URLs; asserts `window.location.href` is set only on allowed inputs.

### M5. `config/api.ts` production-fallback logic is untested
`frontend/src/config/api.ts` (no `config/*.test.ts` exists)

Verified. `resolveApiBase()`/`buildProductionFallbackApiBase()` (added in `e72d282 "Harden production API fallback"`) have no tests. The security-adjacent guard that *ignores a local `VITE_API_URL` on a public host* (api.ts:40-53) would silently regress to pointing production at `localhost`. The `api.`-prefix derivation and `www.` stripping (api.ts:18-29) are pure and easily testable. Note: neither helper is exported (only `API_BASE`/`SITE_BASE` at lines 68-70), so they must be exported or driven via `vi.stubEnv`/`stubGlobal` over `import.meta.env`/`window.location`.

**Fix:** Export the resolver (or stub env + hostname) and test: PROD + public host + local configured → fallback; PROD + explicit good URL → used; dev → localhost.

### M6. Webhook idempotency and customer-not-found paths are untested
`backend/payments/views.py:142-190`

Verified. Tested: paid-upgrade (tests.py:153), unpaid-ignore (183), subscription deleted-downgrade (212), `subscription.updated` `past_due`-downgrade (240), `invoice.payment_failed` after retries (271). **Untested:**
- duplicate delivery of `checkout.session.completed` (idempotency — should remain `pro`, not double-apply; Stripe delivers at-least-once)
- the four `Profile.DoesNotExist` swallow branches (views.py:152-153, 167-168, 180-181, 189-190) — unknown customer/subscription should 200 with no crash
- `payment_status == 'no_payment_required'` (the other accepted status at views.py:145)
- `customer.subscription.updated` with `status='trialing'` (upgrade branch, views.py:163; only `past_due` downgrade is tested)

**Fix:** Tests for duplicate delivery, unknown-customer (200 + no state change), `no_payment_required`, and `trialing → upgraded`.

---

## LOW

### L1. Hardcoded "exactly 17 equations" assertions are brittle to content changes
`frontend/src/data/equations.test.ts`, `backend/courses/tests.py:686,705`, `frontend/src/progress/useProgress.ts:8`

Verified. `test_seed_command_creates_17_equations` (tests.py:686) and the idempotency test (705) assert `Equation.objects.count() == 17`; `useProgress.ts:8` defaults `_equationIds` to `length: 17`. A legitimate content addition breaks the seed tests and silently desyncs the client default.

**Fix:** Keep one canonical count test; replace others with structural invariants (unique ids, required fields present). Derive the seed count from the seed source rather than a literal.

### L2. `seed_subjects` management command has no tests
`backend/courses/management/commands/seed_subjects.py`

Verified: the command exists; `grep` for `seed_subjects`/`SeedSubjects` in `tests.py` is empty, while its sibling `seed_equations` is well tested (idempotency, count, categories).

**Fix:** Idempotency + creates-expected-rows test mirroring `SeedEquationsCommandTests`.

### L3. Anonymous progress throttle is configured but never tested
`backend/courses/views.py:59-66`, `settings.py:138` (`anon_progress: 60/minute`)

Verified. `AnonymousProgressThrottle` on `update_progress` is the only rate-limit in the app; no `429` assertion exists. A regression removing the decorator or misconfiguring the scope would be invisible.

**Fix:** Test overriding the rate to something tiny and asserting the N+1th anon PATCH returns 429. Clear the throttle cache between tests (ties into C2 — throttling shares the cache).

### L4. No test pins the anonymous-vs-authenticated progress routing in the client
`frontend/src/api/client.ts:212-226`

Verified. `api.equations.updateProgress` branches on `getAccessToken()`: authenticated → `/progress/{id}/` (stripping `user_id`), anonymous → `/equations/{id}/progress/` (keeping `user_id`). `client.test.ts` has no test for either branch — exactly where a regression would route an authenticated user's data to the anon endpoint or leak `user_id`.

**Fix:** Two tests — token present → PATCH `/progress/1/` with `user_id` removed; no token → PATCH `/equations/1/progress/` with `user_id` intact.

### L5. JSON-list translation fields default to `None`; API fallback to the base *list* is only partially covered
`backend/courses/models.py:93-99, 116-119`, `backend/courses/serializers.py:9-16`

Verified. `EquationTranslation.variables_data`/`presets_data`/`lessons_data`/`glossary_data` default to `None` (models.py:116-119); base `Equation` versions default to `list` (models.py:45-48). `get_localized_value` (models.py:97) returns the base value when the translation value is `None`. `test_detail_falls_back_to_base_field_when_translation_omits_it` (tests.py:385) covers only the **text** field `description`. No test asserts a JSON-list field where the translation row omits `variables_data` returns the base *list* (not `null`).

**Fix:** Detail test for an equation whose translation row omits `variables_data`, asserting the response returns the base equation's list, not `null`.

---

## Process / structural gaps

- **No `docs/BUG_JOURNAL.md`** (your global rule §1). `docs/` exists with an `audits/` subdir but no journal. Several hardening commits (`e72d282`, `36257b4`, `06bf769`, `5609f41`) shipped *source* with thin or no tests (M5, H2, H3, M6). `/init-bug-journal` would bootstrap it.
- **`createStorageMock` duplicated verbatim in 4 files** — `tokenStorage.test.ts`, `client.test.ts`, `useProgress.test.tsx`, `AuthProvider.test.tsx` (your rule §2 says promote on the second occurrence; this is the 4th copy). Extract to `src/test/storageMock.ts`.
- **Correction to draft:** the draft claims "No fake-timer usage anywhere in the frontend." That is **false** — `frontend/src/components/ProUpgrade.test.tsx` already uses `vi.useFakeTimers`. The accurate statement: fake timers exist but are not yet applied to the `setTimeout`-based `debouncedSync` (useProgress.ts:301) or the `Date.now()` 30s backoff, which is why M3's debounce/backoff branches can be tested cleanly using the pattern already established in `ProUpgrade.test.tsx`.

---

## Recommended next steps (highest leverage first)

1. **C1** — flip CI to `python manage.py test -v 2`. One line; immediately runs ~90 already-written accounts/payments/formulas tests that currently never execute. This is the single biggest risk: money and auth tests exist but are dead in CI.
2. **C2** — neutralize the cache under test (DummyCache or base `cache.clear()`). Prevents future order-dependent flakes/false-greens on the cached list endpoint, and unblocks L3.
3. **H2 / H3 / H4 / H1** — cover the untested money/auth/access surfaces: avatar upload validation, invite expiry/revocation/multi-use + generated-code format, Google new-user side effects + unusable password, and the bulk-sync 207 contract (decide the contract, then pin it on both sides).
4. **M6** — webhook idempotency + unknown-customer + `trialing`/`no_payment_required` (cheap, high value once C1 makes them run).
5. **M3** — `mergeProgress` table tests + `debouncedSync` rollback under fake timers (reuse the `ProUpgrade.test.tsx` fake-timer pattern + extracted `storageMock`).
6. **M4 / M5** — add the two missing security-primitive test files (`safeRedirect`, `config/api` resolver).
7. **Bootstrap `docs/BUG_JOURNAL.md`** and extract `src/test/storageMock.ts` to stop the 4-way duplication.
