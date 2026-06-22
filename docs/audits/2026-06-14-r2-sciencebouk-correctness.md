---
title: Correctness Audit — sciencebouk (Round 2, Verified)
repo: sciencebouk
lens: correctness
date: 2026-06-14
round: 2
---

L4 confirmed safe (off-by-one checked, no overflow). The "found correct" notes are accurate. simpleChart.ts is in `components/charts/` not `lib/` — minor path correction. I have enough to finalize.

Let me do a final check on one thing the draft missed: in `update_my_progress` and `bulk_sync_progress`, the `completed_at` clearing logic `elif vd.get("completed") is False` — and whether there's a real concern. Also let me verify M4's IntegrityError retry `DoesNotExist` claim and confirm the `update_progress` anon endpoint includes `time_spent_seconds`/`notes`/`bookmarked` in serializer (it does, except `variables_explored` — wait, ProgressUpdateSerializer has `variables_explored`? No — let me check). Looking at serializers.py:76-84: `ProgressUpdateSerializer` does NOT include `variables_explored`. But the loop at views.py:87 includes `variables_explored`. Since it won't be in `vd`, it's just skipped. Not a bug.

Let me verify one more potential missed finding: the `me`/M1 guard. `UserSerializer` has `profile = ProfileSerializer(read_only=True)`. If profile doesn't exist, accessing `request.user.profile` raises `RelatedObjectDoesNotExist`. Confirmed for M1. The other views (payments, courses) all guard with `hasattr`. `me` and `update_profile` do not. Confirmed.

I have verified everything. Let me compile the final report.

Final verification complete. Here is the verified report.

---

# Correctness Audit — sciencebouk (verified)

Repo: `/Users/svetlana/Documents/projects/sciencebouk` (Django REST backend + React/TS frontend). Read-only audit. Every finding below was checked against source; the draft's `cache_page` intro paragraph was dropped (verified non-issue — see Notes), several findings were re-worded for accuracy, and one new finding (H6) was added. Severity-sorted.

Production runs **PostgreSQL** (`dj_database_url`, settings.py:186) when `DATABASE_URL` is set, SQLite locally (settings.py:188-193) — this is load-bearing for C1.

---

## CRITICAL

### C1. Invite redemption stores attacker-controlled `X-Forwarded-For` into a `GenericIPAddressField` with no validation → 500 + orphaned, gate-bypassing user — CONFIRMED
`backend/accounts/invites.py:19-25` (`get_request_meta`), `:62-68` (`InviteRedemption.objects.create`); `backend/accounts/views.py:101-113` (`register`), `:63-74` (`google_auth`).

`get_request_meta` reads `HTTP_X_FORWARDED_FOR` (fully client-controlled), takes its first comma-segment, and passes it straight into `InviteRedemption.ip_address`. A client sending `X-Forwarded-For: not-an-ip` reaches `InviteRedemption.objects.create(...)`, which does **not** run `full_clean()`. On PostgreSQL (`inet` column) this raises `DataError`; that exception is **not** an `InviteCodeError`, so the `except InviteCodeError` handler in `register` (views.py:111-113) does not catch it. By that point `serializer.save()` (views.py:106) has already committed the User (+ its `Profile`/`UserSettings` via the `post_save` signal, models.py:128-132), so the unhandled exception bubbles as a 500 and the `user.delete()` cleanup is never reached. Net: a registered, invite-gate-bypassing account with no `InviteRedemption`, while the `used_count` increment rolls back inside `redeem_invite_code`'s atomic block. Worse, `InviteRedemption.user` is a `OneToOneField` (models.py:111) and the email is now taken, so the victim can neither retry nor be cleanly reconciled.

**Fix:** validate/normalize the IP before storing (`validate_ipv46_address`, fall back to `None`), and wrap user-creation + redemption in one `transaction.atomic()` (see H1).

### C2. Google sign-up invite gate is bypassable: validate ≠ redeem, redemption is gated on `created`, and no lock spans User creation — CONFIRMED
`backend/accounts/views.py:54-74`; `backend/accounts/invites.py:48-50`.

For Google auth the gate is two separate transactions: (1) `validate_invite_code` (its own `transaction.atomic()`, invites.py:49) whose `select_for_update` lock releases the instant that transaction commits; then (2) a later `transaction.atomic()` that `get_or_create`s the user and only redeems **when `created is True`** (views.py:69). Two failure modes, both verified:
- **Same email, same single-use code, concurrent:** both pass `validate`; one `get_or_create` returns `created=True` (redeems), the other returns `created=False`, **skips redemption entirely, and still returns 200 with valid tokens.**
- **Different emails sharing one single-use code:** both can pass the pre-`validate` check before either redeems, because the lock from step (1) is already gone by step (2).

The `register` flow is safer (redemption always runs, guarded by `select_for_update` inside `redeem_invite_code`), but Google's `created`-gated redemption is genuinely racy and lets accounts through the gate without consuming a use.

**Fix:** drop the separate pre-`validate` call (it is pure TOCTOU). Inside one atomic block covering the `get_or_create`, attempt `redeem_invite_code` for any user lacking an `InviteRedemption` (not just `created`). Enforce the limit with an atomic `UPDATE ... SET used_count = used_count + 1 WHERE id=? AND used_count < max_uses` and check `rowcount`.

---

## HIGH

### H1. `register` creates the User outside a transaction; any non-`InviteCodeError` failure (or a crash mid-compensation) leaves the account behind — CONFIRMED
`backend/accounts/views.py:101-113`.

`serializer.save()` (line 106) commits the User before `redeem_invite_code` runs. The `InviteCodeError` path calls `user.delete()` (line 112) — a non-atomic compensating delete, so a crash between `save()` and `delete()` orphans the user. Any other exception (C1, a DB hiccup) skips the delete entirely. This is the structural root of C1.

**Fix:**
```python
with transaction.atomic():
    user = serializer.save()
    if getattr(settings, 'INVITES_REQUIRED', False):
        redeem_invite_code(invite_code, user, get_request_meta(request))
```

### H2. `bulk_sync_progress` silently drops unknown/duplicate equation IDs and reports the sync as successful — CONFIRMED (re-worded)
`backend/courses/views.py:288-315`.

Two real defects (the draft's "dedupes by `sort_order`" phrasing was imprecise — the `equations` dict at line 289 is keyed off the *DB* query, where `sort_order` is unique; the duplication risk is in the client payload):
1. **Unknown IDs are silently swallowed.** An item whose `equation_id` has no matching `Equation` hits `equation is None` → `continue` (lines 294-295) and is omitted from **both** `results` and `errors`. The client (`SyncPrompt.tsx:47-55`) treats the call as fully successful and may clear local data that never reached the server.
2. **Duplicate client `equation_id`s → silent last-write-wins.** `valid_items` preserves duplicates; the loop runs `get_or_create` per item, so a second item for the same id overwrites the first with no error.

**Fix:** record skipped/unknown IDs into `errors`; de-duplicate or reject duplicate `equation_id`s explicitly.

### H3. Anonymous `update_progress` sets `completed` but never `completed_at`, so anonymous completions are `completed_at = NULL` — CONFIRMED
`backend/courses/views.py:86-91` (anonymous) vs. `:258-261` / `:305-308` (authenticated).

`update_my_progress` and `bulk_sync_progress` both maintain `completed_at` (`if vd.get("completed") and not progress.completed_at: ... ; elif vd.get("completed") is False: ... = None`). The anonymous `update_progress` view does **not** — its loop (lines 87-89) sets `completed` but there is no `completed_at` block, so every anonymous completion lands with `completed_at = NULL`. Any analytics/merge logic keying on `completed_at` treats completed anonymous progress as never-completed. (The draft's lengthy walk-through of the authenticated branch was noise; the defect is solely the missing block on the anonymous view.)

**Fix:** apply the same `completed_at` maintenance block to `update_progress`.

### H4. Webhook downgrade keys on `stripe_subscription_id`, which can be blank → user never downgraded after cancellation — CONFIRMED
`backend/payments/views.py:28-31` (`upgrade_profile`), `:142-153` (`checkout.session.completed`), `:183-190` (`customer.subscription.deleted`).

`upgrade_profile` only sets `stripe_subscription_id` when a truthy id is passed (`subscription_id or profile.stripe_subscription_id`, line 30). `checkout.session.completed` passes `subscription_id or ''` (line 151) — if Stripe delivers that event with `subscription=None` (it can, depending on mode/timing), the profile is upgraded to Pro with `stripe_subscription_id == ''`. A later `customer.subscription.deleted` does `Profile.objects.get(stripe_subscription_id=subscription_id)` (line 187); the real sub id won't match the blank field, the lookup raises `DoesNotExist`, is swallowed, and **the user keeps Pro after canceling.**

**Fix:** in `deleted` and `payment_failed`, look up by `stripe_customer_id` (always populated at checkout, line 48-51) instead of `stripe_subscription_id`, and never match on a blank id.

### H5. Webhook has no idempotency / event-ordering protection, and `Profile.objects.get(stripe_customer_id=...)` can raise the uncaught `MultipleObjectsReturned` — CONFIRMED
`backend/payments/views.py:114-192`; `backend/accounts/models.py:27`.

Stripe delivers at-least-once and out of order. There is no dedup on `event.id` and no recency check, so a redelivered/delayed `customer.subscription.deleted` can downgrade a user who has since re-subscribed, and a re-delivered `payment_failed` past 3 attempts re-downgrades. Separately, `stripe_customer_id` is only `db_index=True`, **not `unique`** (models.py:27); the handlers catch `Profile.DoesNotExist` but **not** `MultipleObjectsReturned`, so if two profiles ever share a customer id every `Profile.objects.get(stripe_customer_id=...)` call 500s and Stripe retries forever.

**Fix:** add `unique=True` to `stripe_customer_id` (and ideally `stripe_subscription_id`); persist processed `event.id`s for idempotency; ignore events older than the recorded subscription state.

### H6. `subscription_status` endpoint reads `is_pro` directly from the DB tier with no entitlement source of truth — NEW (MEDIUM-HIGH)
`backend/payments/views.py:100-111`; `backend/accounts/models.py:37-39`.

`is_pro` is simply `tier == 'pro'` (models.py:38). Combined with H4/H5, the `Profile.tier` field is the **only** record of entitlement and is mutated exclusively by webhook handlers that have the gaps above. There is no reconciliation path (no periodic `stripe.Subscription.retrieve` sweep, no read-through on `subscription_status`). The practical consequence: any webhook that is missed, mis-keyed (H4), or processed out of order (H5) leaves `tier` permanently wrong with no self-healing — a user who canceled keeps `is_pro: true` indefinitely, or a paying user who hit a transient webhook failure loses Pro until manual intervention.

**Fix:** treat the webhook state as a cache, not the source of truth — on `subscription_status` (or a daily job) reconcile against Stripe for users with a `stripe_subscription_id`, or at minimum add a management command that re-syncs tier from live Stripe subscription status.

---

## MEDIUM

### M1. `me` and `update_profile` access `request.user.profile` with no guard → 500 if the profile row is missing — CONFIRMED
`backend/accounts/views.py:127-139`; `serializers.py:24`.

Profiles are auto-created by the `post_save` signal (models.py:128-132), but users created before the signal existed, via `bulk_create`, or via fixtures/raw inserts will lack one. `UserSerializer` embeds `ProfileSerializer` (serializers.py:24) and `update_profile` does `request.user.profile` directly (views.py:136) — both raise `RelatedObjectDoesNotExist` → 500. Every other endpoint (`payments/views.py:41,83,104`, `courses/views.py:219,238,271,323,376`) guards with `hasattr`; these two are the inconsistent outliers.

**Fix:** `Profile.objects.get_or_create(user=...)` in these views, or guard with `hasattr` for consistency.

### M2. Google token verification has no `clock_skew_in_seconds` → legitimate logins fail on minor clock drift — CONFIRMED
`backend/accounts/views.py:24-28`.

`verify_oauth2_token(credential, google_requests.Request(), client_id)` is called with no skew tolerance. The `google-auth` library recommends a small `clock_skew_in_seconds`; without it, "Token used too early/late" surfaces as the generic 401 "Invalid Google credential" (views.py:45-46).

**Fix:** pass `clock_skew_in_seconds=10`.

### M3. `learning_dashboard` streak is computed from only the last 100 events → long/active streaks silently truncate — CONFIRMED
`backend/courses/views.py:331-341`.

`event_timestamps = LearningEvent...order_by("-created_at")...[:100]` then walks back day-by-day from today over the dates present. A user logging many events/day has their 100 most-recent events span only a few days, capping the reported streak far below the real value. It also starts at `timezone.now().date()` and exits immediately with streak 0 if the user wasn't active *today* (active-through-yesterday → reported 0) — an undocumented edge.

**Fix:** use `.dates("created_at", "day")` for distinct activity days instead of slicing 100 rows, and decide explicitly whether "active yesterday, not yet today" counts.

### M4. Anonymous `update_progress` trusts a client-supplied `anon_id` and its `IntegrityError` retry can itself raise an uncaught `DoesNotExist` — CONFIRMED
`backend/courses/views.py:63-93`; `frontend/src/api/client.ts:212-226`.

The frontend routes authenticated users to `/progress/<id>/` and only anonymous users to `/equations/<id>/progress/` (client.ts:215-225), but the anonymous endpoint is `AllowAny` and trusts `user_id` as `anon_id`, so any client can write arbitrary `anon_id` rows. More concretely: the `IntegrityError` retry re-fetches with `UserProgress.objects.get(...)` (views.py:85); a concurrent delete between the failed insert and the re-fetch raises `DoesNotExist` (uncaught → 500). The throttle (`anon_progress`, 60/min, settings.py:138) bounds abuse but not the race.

**Fix:** wrap the retry fetch in try/except; optionally validate `anon_id` shape.

### M5. `refreshAccessToken` transient-network failure surfaces to callers as a genuine auth (401) error — CONFIRMED (low-medium)
`frontend/src/auth/tokenStorage.ts:94-136`; `frontend/src/api/client.ts:46-68`.

The single-flight refresh and "don't clear tokens on `TypeError`" handling (tokenStorage.ts:121-128) are correct. But when refresh returns `null` due to a network blip, `request()` falls through to `if (!response.ok) throw await readError(response)` (client.ts:61-62) using the **original 401 response** — so a transient network failure during refresh is presented to callers (e.g. `isAuthFailureError` consumers) as a real 401.

**Fix:** distinguish "refresh failed transiently" (surface a network error / allow retry) from "refresh rejected (401)".

*(Draft M5 about `safeRedirect` was dropped — see Notes; the `.checkout.stripe.com` subdomain rule is correct and matches the documented intent, no bug.)*

---

## LOW

### L1. `_default_slug` / `_unique_slug` have a check-then-create race — CONFIRMED (low likelihood)
`backend/courses/models.py:53-68`, `backend/courses/importers.py:116-126`. The `while queryset.filter(slug=slug).exists()` loop is not atomic with the subsequent insert; two concurrent imports/creates can pick the same slug, one hitting the `unique=True` `IntegrityError`. The importer wraps in `@transaction.atomic` (importers.py:231,285), narrowing but not closing the window; writes are admin-only. **Fix:** catch `IntegrityError` and retry.

### L2. Translation-update path's `update_fields=[*updates.keys(), "locale"]` asymmetry is fragile but not currently a bug — CONFIRMED (not a defect)
`backend/courses/importers.py:332-341`. The `created` branch calls full `save()`; the update branch uses `update_fields` plus `"locale"` (so `EquationTranslation.save`'s `normalize_locale` still runs). Correct today, but if a future field is added to `_build_translation_updates` and forgotten elsewhere, silent data loss could result. Consider dropping `update_fields` here (imports are infrequent).

### L3. `SyncPrompt` one-shot auto-sync can fire before `registerEquationIds` runs, dropping progress for equation IDs beyond the static 1–17 default — CONFIRMED
`frontend/src/progress/useProgress.ts:8,11-16,357-378,394-399`; `frontend/src/components/SyncPrompt.tsx:30,40-61`. `getLocalProgressSyncItems` iterates `_equationIds`, which defaults to `[1..17]` (useProgress.ts:8) until `registerEquationIds` replaces it. `SyncPrompt` reads `getLocalProgressSyncItems()` at mount and syncs once (`attempted` ref, SyncPrompt.tsx:44). If the auto-sync fires before the API manifest registers the full id list, a Pro user's progress on ids ≥ 18 is **excluded from the one-shot bulk sync**. **Fix:** gate `SyncPrompt`'s auto-sync until `registerEquationIds` has run, or derive sync items from actual `localStorage` keys (the `eq-progress-*` prefix) rather than the static id list.

### L4. `LessonRunner` progress bar — checked, no overflow — CONFIRMED SAFE (no fix)
`frontend/src/components/teaching/LessonRunner.tsx:151`. `((currentStepIndex + (stepCompleted ? 1 : 0)) / steps.length) * 100` maxes at exactly 100% on the last completed step; `onAdvance` does not push `currentStepIndex` past the last index. Noted only to record the off-by-one was verified.

### L5. `equation_atlas_legacy` serializes **all** equations with the full `EquationSerializer` (all teaching JSON blobs), unpaginated — CONFIRMED (latent perf, not correctness)
`backend/courses/views.py:182,201-205`. As the equation set grows this returns an unbounded heavy payload (full `variables_data`/`presets_data`/`lessons_data`/`glossary_data` per row). Not incorrect, but a latent availability cliff on a "legacy alias." **Fix:** paginate/trim, or deprecate.

### L6. Anonymous `update_progress` treats `time_spent_seconds` as an absolute overwrite — CONFIRMED (contract risk)
`backend/courses/views.py:86-89`. `setattr(progress, "time_spent_seconds", vd[...])` overwrites. The frontend sends cumulative totals (`useProgress.ts:241-251,302`), so it's consistent today, but any client sending a delta would corrupt the total. **Fix:** document the absolute-not-delta contract on the serializer.

---

## Notes on areas checked and found correct
- **`cache_page` on `EquationViewSet.list` (`courses/views.py:53-56`)** — correct. `cache_page` keys on the full URL *including* query string, so `?locale=de` is a distinct entry, and `vary_on_headers("Accept-Language")` folds the header into the key as well; both locale-selection paths (`get_requested_locale`, localization.py:51-57) are covered. Default `LocMemCache` is per-process (inconsistent across workers) but not *incorrect*. (Draft's intro paragraph on this was muddled; no finding.)
- **`safeRedirect` (`lib/safeRedirect.ts:9-19`)** — `https:`-only + exact-or-subdomain allowlist of Stripe hosts; matches the documented intent. No bug. (Draft M5 dropped.)
- **`tokenStorage` single-flight refresh + memory-only access token (`tokenStorage.ts`)** — sound.
- **`useProgress` optimistic write + rollback-captured-before-update (`useProgress.ts:295-322,445-448`)** — correctly captures pre-optimistic server state.
- **`sanitizeNextPath` (`auth/navigation.ts`)** — rejects non-`/`, `//`, and cross-origin; correct.
- **`parseStoredSettings` (`SettingsContext.tsx:105-136`)** — type-guards every field with `Number.isFinite`; robust against corrupt localStorage.
- **`mergeProgress` (`useProgress.ts:227-239`)** — last-write-wins by max timestamp; `new Date(0)` fallback handles empty strings.
- **`simpleChart.ts`** (note: lives at `frontend/src/components/charts/simpleChart.ts`, not `lib/`) — `clamp` used consistently; plot dims floored to avoid divide-by-zero.

---

## Recommended next steps (priority order)
1. **C1 + H1 together:** validate/normalize the IP in `get_request_meta`, and wrap User creation + `redeem_invite_code` in a single `transaction.atomic()` in `register`. One change closes the orphaned-account + 500 path.
2. **C2:** make redemption the single source of truth for Google sign-up — redeem (not pre-validate) inside one atomic block for any user lacking an `InviteRedemption`; enforce `max_uses` via a conditional `UPDATE ... WHERE used_count < max_uses` + `rowcount`.
3. **H4 + H5 + H6 (subscription correctness):** key webhook downgrades on `stripe_customer_id`; add `unique=True` to `stripe_customer_id` and catch `MultipleObjectsReturned`; persist processed `event.id`s for idempotency; add a Stripe-reconciliation job/read-through so `tier` self-heals.
4. **H2 + H3:** make `bulk_sync_progress` report skipped/unknown IDs in `errors`; add the `completed_at` maintenance block to the anonymous `update_progress`.
5. **M1, M2:** guard `me`/`update_profile` with `get_or_create`/`hasattr`; add `clock_skew_in_seconds=10` to Google verification.
6. **M3, L3:** fix the streak query (`.dates(...)`); gate `SyncPrompt` auto-sync until `registerEquationIds` has run.
7. Lower-priority hardening: M4 retry try/except, L1 slug `IntegrityError` retry, L5 pagination/deprecation, L6 contract docs.

Most-impactful, smallest-surface fixes first: **C1+H1** (one atomic block + IP validation) and **H4** (one-line lookup-key change) eliminate the highest-severity correctness failures with minimal code churn.
