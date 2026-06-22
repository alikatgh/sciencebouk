---
title: "Correctness Audit — sciencebouk Round 6 (verified)"
repo: sciencebouk
lens: correctness
date: 2026-06-14
round: 6
---

All findings are verified. I have confirmed every claim against source. Now I'll produce the final verified report with corrected file paths and a few corrections to the draft's overreaches.

Key corrections found during verification:
- **Settings path is `formulas_backend/settings.py`, not `sciencebouk/settings.py`** — the draft's path is wrong throughout (C2/H7 reference `settings.py` lines which are correct, but the package name in the header is wrong).
- **M6 is partially overstated**: `AuthContext.refreshUser` has a `hasRefreshed` guard. On the boot path (no access token in memory), a transient network failure during the initial `refreshAccessToken()` returns `null` and triggers `clearStoredTokens()` + `setUser(null)` (logout) at lines 110-114 — so the transient-blip-logout DOES occur on boot, but NOT via the `request()`/401 path the draft describes. The `request()` path (client.ts) does surface the original 401, but `refreshUser`'s try/catch only logs out if `isAuthFailureError` is true AND `hasRefreshed`. I'll re-scope M6 accordingly.

---

# Correctness Audit — sciencebouk (deep, read-only, verified)

Repo: `/Users/svetlana/Documents/projects/sciencebouk` — Django REST backend + React/TS frontend. Strictly read-only; nothing was mutated. Findings below are re-verified against current source against the prior Round-2 correctness audit (`docs/audits/2026-06-14-r2-sciencebouk-correctness.md`); each retains a STILL-PRESENT / NEW marker and current line numbers.

**Verification note (path correction):** settings live at `backend/formulas_backend/settings.py`, NOT `backend/sciencebouk/settings.py`. The cited line ranges are correct (`:183-193` DATABASE_URL → Postgres when `DATABASE_URL` set, else SQLite; `:137-138` `anon_progress` throttle default `60/minute`). Postgres-in-prod is load-bearing for C3 (the `inet` column rejects malformed IPs with `DataError`).

---

## CRITICAL

### C1. Stripe `customer.subscription.deleted` keys on a possibly-blank `stripe_subscription_id` → canceled users keep Pro forever — STILL PRESENT, CONFIRMED
`backend/payments/views.py:28-31, 142-153, 183-190`.

Verified: `checkout.session.completed` calls `upgrade_profile(profile, subscription_id or '')` (line 151). `upgrade_profile` sets `stripe_subscription_id = subscription_id or profile.stripe_subscription_id` (line 30) — so if Stripe delivers `subscription=None` and the profile had no prior sub id, the field stays `''`. The `deleted` handler does `Profile.objects.get(stripe_subscription_id=subscription_id)` (line 187), the only handler keying on the subscription id rather than `stripe_customer_id`. A blank stored field never matches the real sub id; `DoesNotExist` is swallowed (line 189) and the user is never downgraded.
**Fix:** in `deleted` (and `payment_failed`), look up by `stripe_customer_id` (always set at checkout, line 48-51) — the `deleted` event payload includes `customer`; guard against a blank lookup key before any `.get`.

### C2. Webhook has no idempotency / no event-ordering guard, and `Profile.objects.get(stripe_customer_id=...)` can raise uncaught `MultipleObjectsReturned` → 500 retry loop — STILL PRESENT, CONFIRMED
`backend/payments/views.py:114-192`; `backend/accounts/models.py:27`; `backend/payments/models.py` (verified: only the boilerplate `# Create your models here.` — no event-log model).

Verified: no persisted `event.id` dedup and no recency check anywhere in `stripe_webhook`. Stripe is at-least-once and out-of-order, so a redelivered/delayed `customer.subscription.deleted` downgrades a re-subscribed user, and a re-delivered `invoice.payment_failed` past attempt 3 re-downgrades. `stripe_customer_id` is `db_index=True` but NOT `unique` (models.py:27); every handler catches `Profile.DoesNotExist` but none catches `MultipleObjectsReturned`, so two profiles sharing a customer id make every `.get(stripe_customer_id=...)` 500 and Stripe retries forever.
**Fix:** `unique=True` on `stripe_customer_id` (and `stripe_subscription_id`); persist `event.id` for idempotency; ignore events older than the last-recorded subscription state; catch `MultipleObjectsReturned`.

### C3. Invite redemption stores attacker-controlled `X-Forwarded-For` into `GenericIPAddressField` with no validation → 500 + orphaned, gate-bypassing account — STILL PRESENT, CONFIRMED
`backend/accounts/invites.py:19-25, 62-68`; `backend/accounts/views.py:101-113`; `backend/accounts/models.py:113, 128-132`.

Verified: `get_request_meta` takes `forwarded_for.split(",")[0].strip()` from the fully client-controlled `HTTP_X_FORWARDED_FOR` (invites.py:20-21) and passes it straight into `InviteRedemption.ip_address` via `.objects.create(...)` (invites.py:62-68) — no `full_clean()`, no `validate_ipv46_address`. `ip_address` is a `GenericIPAddressField` (models.py:113). On Postgres (`inet` column, per settings.py:183-193) a header like `X-Forwarded-For: not-an-ip` raises `DataError`, which is NOT `InviteCodeError`, so `register`'s `except InviteCodeError` (views.py:111) does not catch it. By then `serializer.save()` (views.py:106) has committed the User + its `Profile`/`UserSettings` (post_save signal, models.py:128-132). The unhandled exception 500s; the compensating `user.delete()` (views.py:112) never runs → a registered account with NO `InviteRedemption` (gate bypassed), the email is now taken, and `InviteRedemption.user` is OneToOne so the victim can't retry or be reconciled.
**Fix:** validate/normalize the IP in `get_request_meta` (`validate_ipv46_address`, fall back to `None`); wrap User creation + redemption in one `transaction.atomic()` (see H1). Note SQLite-local would silently store the junk string (no `DataError`) — Postgres-in-prod is what makes this a 500.

---

## HIGH

### H1. `register` creates the User outside a transaction; any non-`InviteCodeError` failure orphans the account — STILL PRESENT, CONFIRMED
`backend/accounts/views.py:101-113`. Verified: `serializer.save()` (line 106) commits before `redeem_invite_code` runs (line 110); the only cleanup is a non-atomic `user.delete()` inside `except InviteCodeError` (line 112). A crash between save and delete, or any non-`InviteCodeError` exception (C3, a DB hiccup), leaves the user orphaned. Structural root of C3.
**Fix:**
```python
with transaction.atomic():
    user = serializer.save()
    if getattr(settings, 'INVITES_REQUIRED', False):
        redeem_invite_code(invite_code, user, get_request_meta(request))
```

### H2. Google sign-up invite gate is bypassable: redemption gated on `created`, and no lock spans User creation — STILL PRESENT, CONFIRMED
`backend/accounts/views.py:54-74`; `backend/accounts/invites.py:48-50`. Verified: gate is two separate transactions — a pre-`validate_invite_code` (its `select_for_update` lock releases at commit, invites.py:49), then a later atomic block that `get_or_create`s the user (views.py:63-67) and redeems ONLY `if created and ...` (views.py:69). Two bypasses: (a) two concurrent requests, same email + single-use code, both pass pre-validate; one `get_or_create` returns `created=True` and redeems, the other returns `created=False`, skips redemption, **and still returns 200 with valid tokens** (views.py:89-96); (b) different emails sharing one single-use code both pass pre-validate before either redeems.
**Fix:** drop the pure-TOCTOU pre-validate; inside one atomic block over `get_or_create`, redeem for any user lacking an `InviteRedemption`; enforce the cap with an atomic `UPDATE ... SET used_count = used_count + 1 WHERE id=? AND used_count < max_uses` checked via `rowcount`.

### H3. (NEW) `register` validates the invite twice with a redeem in between → duplicate-validate TOCTOU + a guaranteed double `select_for_update` — CONFIRMED
`backend/accounts/serializers.py:50-56` (`RegisterSerializer.validate` → `validate_invite_code`) + `backend/accounts/views.py:108-110` (view then calls `redeem_invite_code` → `get_available_invite` again, invites.py:57).

Verified: the serializer's `validate()` runs `validate_invite_code` in its own atomic+`select_for_update` (invites.py:48-50), commits, releasing the lock; the view opens a second transaction to redeem. The redeem re-check (`get_available_invite` inside `redeem_invite_code`) is the real correctness guard, so this is NOT a gate bypass — but the pre-validate is dead weight that (a) doubles locking round-trips per signup and (b) widens the orphaned-user window of H1/C3 (if the last use is consumed between the two checks, the just-created user is deleted via the H1 non-atomic delete). Same TOCTOU shape as H2's pre-validate. Severity is HIGH for the wasted-lock + window-widening, not for a bypass.
**Fix:** remove the invite check from `RegisterSerializer.validate` (purely advisory); make atomic redemption the single source of truth, mirroring the H2 fix.

### H4. `bulk_sync_progress` silently drops unknown equation IDs and last-write-wins duplicates, yet reports success — STILL PRESENT, CONFIRMED
`backend/courses/views.py:288-315`; client side `SyncPrompt.tsx:47-55`, `App.tsx:197-200`. Verified: (1) an item whose `equation_id` matches no `Equation` hits `equation is None → continue` (views.py:293-295) and is omitted from BOTH `results` and `errors`; the client treats the call as fully successful (`SyncPrompt.tsx:48` only branches on resolve/reject) and persists the dismissed signature (`App.tsx:197-200`), silently losing that progress. (2) Duplicate client `equation_id`s survive validation into `valid_items`; the loop runs `get_or_create` per item, so a later duplicate last-write-wins over an earlier one.
**Fix:** record skipped/unknown IDs in `errors`; de-duplicate (or reject) duplicate `equation_id`s.

### H5. Anonymous `update_progress` never sets `completed_at` → every anonymous completion is `completed_at = NULL` — STILL PRESENT, CONFIRMED
`backend/courses/views.py:86-91` (anon) vs `:258-261` and `:305-308` (both auth paths maintain `completed_at`). Verified: the anonymous loop (views.py:87-89) sets `completed` but has no `completed_at` block; the field stays NULL. Any analytics/merge keyed on `completed_at` treats completed anonymous progress as never-completed.
**Fix:** add the same `completed_at` maintenance block to `update_progress`.

### H6. (NEW) `bulk_sync_progress` (and `update_my_progress`) overwrite server progress with client values unconditionally → silent regression of higher server state — CONFIRMED
`backend/courses/views.py:255-263, 302-310`; client `useProgress.ts:357-377` (`getProgressSnapshot(false)` → local-only) and `useProgress.ts:227-239` (`mergeProgress`). Verified: both server handlers blindly `setattr(progress, field, vd[field])` for `time_spent_seconds`, `completed`, `notes`, `lesson_step`, `bookmarked`. The bulk path's client items come from `getLocalProgressSyncItems()` → `getProgressSnapshot(false)` → `readMergedProgress(equationId, false)` (useProgress.ts:357-358), i.e. **local-only, NOT server-merged**. A Pro user with higher `time_spent_seconds` / `completed=true` already on the server, who signs in on a fresh device and triggers the one-shot bulk sync, has the larger server values overwritten by the smaller local ones (time drops, `completed` can revert to `false`, notes clobbered). The optimistic per-equation path merges via `Math.max`/OR (useProgress.ts:231,229), but the bulk path has no server-side max/merge.
**Fix:** server-side merge for monotonic fields — `time_spent_seconds = max(existing, incoming)`, `completed = existing or incoming`; only set `notes`/`lesson_step` when incoming is non-empty (or row newly created).

### H7. `subscription_status` (and all entitlement) reads `tier` directly with no reconciliation source of truth — STILL PRESENT, CONFIRMED
`backend/payments/views.py:100-111`; `backend/accounts/models.py:37-39` (`is_pro == (tier == 'pro')`). Verified: `Profile.tier` is the only entitlement record, mutated solely by the gappy webhook handlers; `subscription_status` returns it verbatim (views.py:107-111). No read-through, no periodic `stripe.Subscription.retrieve` sweep. Combined with C1/C2, a missed/mis-keyed/out-of-order webhook leaves `tier` permanently wrong with no self-healing.
**Fix:** treat webhook state as a cache; reconcile against Stripe on `subscription_status` (or a daily job) for users with a `stripe_subscription_id`.

---

## MEDIUM

### M1. `me` and `update_profile` access `request.user.profile` with no guard → 500 if the profile row is missing — STILL PRESENT, CONFIRMED
`backend/accounts/views.py:127-139`; `serializers.py:24` (`UserSerializer` embeds `ProfileSerializer`). Verified: profiles are auto-created by the post_save signal (models.py:128-132), but users predating the signal or created via `bulk_create`/fixtures/raw inserts lack one. `me` returns `UserSerializer(request.user).data` (embeds profile, views.py:129) and `update_profile` does `request.user.profile` directly (views.py:136) — both raise `RelatedObjectDoesNotExist`. Every other entitlement endpoint guards with `hasattr(request.user, 'profile')` (e.g. payments/views.py:41,83,104; courses/views.py:219,238,271,323,376); these two are the outliers.
**Fix:** `Profile.objects.get_or_create(user=...)` or a `hasattr` guard.

### M2. (NEW) `google_auth` lacks `clock_skew_in_seconds`; broad `except Exception` masks config errors as auth failures — CONFIRMED (severity LOW–MEDIUM)
`backend/accounts/views.py:24-28, 43-46`. Verified: `verify_oauth2_token(credential, Request(), client_id)` validates `aud == client_id`, signature, AND issuer internally (the library checks `iss` against the accepted Google issuers by default), so the draft's "doesn't pin aud/iss" framing is **partly a false alarm** — aud and iss ARE enforced. The real defects are (a) no `clock_skew_in_seconds`, so minor clock drift surfaces "Token used too early/late" as a generic 401, failing legitimate logins intermittently; (b) the broad `except Exception` (line 45) collapses configuration errors (wrong client id, network failure reaching Google certs) into the same 401, complicating diagnosis.
**Fix:** pass `clock_skew_in_seconds=10`; log the underlying exception server-side before returning the generic 401.

### M3. `learning_dashboard` streak is computed from only the last 100 events and reports 0 if not active today — STILL PRESENT, CONFIRMED
`backend/courses/views.py:331-341`. Verified: `event_timestamps = LearningEvent.objects.filter(user=user).order_by("-created_at").values_list("created_at", flat=True)[:100]` (lines 331-335), then `dates = set(ts.date() ...)` and a walk-back from `timezone.now().date()` (lines 336-341). A user logging many events/day has their 100 newest events span only a few days, capping the reported streak far below reality. It also exits at streak 0 the moment the user hasn't logged today (active-through-yesterday → reported 0).
**Fix:** use `.dates("created_at", "day")` for distinct activity days (no `[:100]` cap); decide explicitly whether "active yesterday, not yet today" counts.

### M4. Anonymous `update_progress` `IntegrityError` retry can raise an uncaught `DoesNotExist` → 500 — STILL PRESENT, CONFIRMED
`backend/courses/views.py:77-85`. Verified: the `except IntegrityError` branch re-fetches with `UserProgress.objects.get(anon_id=..., equation=..., user=None)` (line 85) with no try/except; a concurrent delete between the failed insert and this re-fetch raises `DoesNotExist`, uncaught → 500. Endpoint is `AllowAny` with a client-supplied `anon_id` (throttled at `60/minute` per settings.py:138, which bounds volume, not the race).
**Fix:** wrap the retry fetch in try/except (retry once or return 409).

### M5. (NEW) `bulk_sync_progress` is not wrapped in a transaction — a mid-loop failure leaves a partial sync the client believes succeeded — CONFIRMED
`backend/courses/views.py:267-315`. Verified: the per-item loop (lines 292-311) calls `get_or_create` + `save()` with no surrounding `transaction.atomic()`. If item N raises mid-loop, items 1..N-1 are committed, N+1.. never run, and the request 500s; the client retries the whole batch next session, re-applying H6's overwrite to already-synced rows. There is no atomic boundary on what is conceptually one sync operation.
**Fix:** wrap the loop in `transaction.atomic()`; still return 207 on per-item validation errors, but make the DB writes atomic.

### M6. `refreshAccessToken` transient-network failure logs the user out on the boot path; on the `request()` path it surfaces the original 401 to `isAuthFailureError` consumers — STILL PRESENT, RE-SCOPED
`frontend/src/auth/tokenStorage.ts:94-136`; `frontend/src/api/client.ts:46-59`; `frontend/src/auth/AuthContext.tsx:102-145`. Verified and corrected vs the draft: there are TWO distinct paths.
- **Boot / `refreshUser` path (the real logout):** when no access token is in memory (page reload), `refreshUser` calls `refreshAccessToken()` (AuthContext.tsx:108). A transient `TypeError` makes `refreshAccessToken` return `null` WITHOUT clearing tokens (tokenStorage.ts:125-127) — but `refreshUser` then unconditionally does `clearStoredTokens(); setUser(null)` on `!access` (AuthContext.tsx:110-114). So a momentary network blip on reload DOES log the user out, defeating tokenStorage's deliberate no-clear-on-TypeError design.
- **`request()` 401 path:** on a 401, `request()` calls `refreshAccessToken()`; if it returns `null` (transient), `request()` falls through to `throw await readError(response)` using the original 401 (client.ts:51-61). Consumers using `isAuthFailureError` see a 401. In `refreshUser`'s catch, however, this only triggers logout if `hasRefreshed` is already true (AuthContext.tsx:124-128) — on the common case it retries the refresh once first. So the draft's "AuthContext.refreshUser logs the user out [on the request path]" is overstated; the dominant transient-logout is the boot path above.
**Fix:** in `refreshUser`, distinguish "refresh returned null transiently" (do NOT clear tokens; keep prior state / allow retry) from "refresh genuinely rejected"; have `refreshAccessToken` signal the transient case (e.g. throw a typed network error rather than returning a bare `null`).

---

## LOW

### L1. (NEW) `SyncPrompt` reads `getLocalProgressSyncItems()` against the static `_equationIds` list; if it fires before `registerEquationIds` runs, progress for ids beyond the default 1–17 is excluded from the one-shot bulk sync — CONFIRMED
`frontend/src/progress/useProgress.ts:8,11-16,357-377,394-399`; `frontend/src/components/SyncPrompt.tsx:30,39-61`; `frontend/src/App.tsx:111-115,202-209,411-414`. Verified: `_equationIds` defaults to `[1..17]` (useProgress.ts:8) until `registerEquationIds` replaces it (useProgress.ts:11-16). `getProgressSnapshot(false)` iterates `_equationIds` only (useProgress.ts:357), so `getLocalProgressSyncItems` can't see progress for ids >= 18 before registration. `App` registers ids in an effect after the manifest query resolves (App.tsx:111-115); `showSync` is gated on `syncSignature` (App.tsx:202-209). On a slow/uncached manifest fetch the prompt can sync against the stale 1–17 list and then persist the dismissed signature, so higher ids are never re-offered. With a cached/instant manifest the ordering is usually fine — hence LOW.
**Fix:** derive sync items from actual `localStorage` `eq-progress-*` keys (not the static id list), or gate the prompt until `registerEquationIds` has run.

### L2. (NEW) Server clears `completed`/`completed_at` on explicit `completed:false`, but `mergeProgress` keeps `completed: local || server` → UI/DB disagree on un-completion — CONFIRMED
`backend/courses/views.py:260-261, 307-308`; `frontend/src/progress/useProgress.ts:229`. Verified: server sets `completed_at = None` on explicit `completed is False` (views.py:260-261, 307-308), but `mergeProgress` computes `completed: local.completed || server.completed` (useProgress.ts:229), so once local has `completed=true` the UI can never reflect a server-side un-completion. Low impact (un-completion is rare) but the layers have inconsistent completion semantics.
**Fix:** pick one direction (completion monotonic, or server-wins) and make both layers agree.

### L3. `_default_slug` / `_unique_slug` have a check-then-create race — STILL PRESENT, CONFIRMED
`backend/courses/models.py:53-68`; `backend/courses/importers.py:116-126`. Verified: the `while queryset.filter(slug=slug).exists()` loop (models.py:59-62 / importers.py:123-125) is not atomic with the insert; two concurrent admin imports/creates can pick the same slug, one hitting the `unique=True` `IntegrityError` (slug field models.py:35). Admin-only, low likelihood.
**Fix:** catch `IntegrityError` and retry.

### L4. `upload_avatar` trusts the client-supplied extension, never validates content, and never deletes old avatars — STILL PRESENT, CONFIRMED
`backend/accounts/views.py:145-174`. Verified: `ext = file.name.rsplit('.',1)[-1].lower()` with an allowlist (jpg/jpeg/png/webp/gif, lines 155-157). Path safety is fine — the stored filename is `{user.id}_{uuid}.{ext}` (line 160), so the client filename can't escape the dir. But content is never validated (a `.png`-named file may be arbitrary bytes), and each upload writes a new file without removing the previous one (lines 164-166, then `profile.avatar_url = avatar_url`, line 171), so `media/avatars/` grows unboundedly. Not a path-traversal hole; a content-trust + disk-leak issue.
**Fix:** validate via Pillow (`Image.open(...).verify()`); delete/overwrite the prior avatar before saving the new one.

### L5. `equation_atlas_legacy` serializes ALL equations with the full heavy `EquationSerializer`, unpaginated — STILL PRESENT, CONFIRMED (latent availability)
`backend/courses/views.py:182, 201-205`. Verified: `equations = Equation.objects.prefetch_related("translations").all()` (line 182) then `EquationSerializer(equations, many=True, ...)` (lines 201-205) returns every equation's full `variables_data`/`presets_data`/`lessons_data`/`glossary_data` in one unbounded payload. Output is correct; it's an availability/payload-size concern as the set grows.
**Fix:** paginate/trim or deprecate.

### L6. Anonymous `update_progress` treats `time_spent_seconds` as an absolute overwrite; field is a plain `IntegerField` (no DB non-negativity) — STILL PRESENT, CONFIRMED (contract risk)
`backend/courses/views.py:86-89`; `backend/courses/models.py:179`; `backend/courses/serializers.py:82`. Verified: the anon loop sets fields by overwrite (views.py:87-89), consistent with the current frontend sending cumulative totals, but undocumented — a client sending a delta would corrupt the total. `time_spent_seconds` is a plain `IntegerField` (models.py:179); the serializer's `min_value=0` (serializers.py:82) is the only guard, so direct ORM/admin writes could set negatives.
**Fix:** document the absolute contract; consider `PositiveIntegerField`.

---

## Findings adjusted during verification

- **M2 (`google_auth`)** — the draft's "does not pin `aud`/`iss`" is **inaccurate**: `verify_oauth2_token` enforces both `aud == client_id` and the Google issuer by default. The genuine defects are the missing `clock_skew_in_seconds` and the diagnostics-masking broad `except`. Re-scoped to LOW–MEDIUM and corrected above.
- **M6** — the draft attributes the transient-blip logout to the `request()`/401 path and `AuthContext.refreshUser`. Verified the dominant logout is actually the **boot path** (`refreshUser` lines 110-114 clear tokens on a null refresh even when the null came from a `TypeError`). The `request()` path does surface the original 401, but `refreshUser`'s `hasRefreshed`-gated catch retries once before logging out, so it's not the primary trigger. Re-scoped above.
- **Settings path** — corrected from `sciencebouk/settings.py` to `formulas_backend/settings.py` (cited line numbers are correct).

No findings were removed as outright false positives; C1–C3, H1–H7, M1/M3/M4/M5, L1–L6 are all confirmed against source.

## Areas checked and found correct (re-verified)
- **`EquationViewSet.list` cache (views.py:53-56)** — `cache_page(60*5)` keyed on full URL incl. query string + `vary_on_headers("Accept-Language")`; `AllowAny`, and `retrieve` (locale-sensitive per-equation fetch) is NOT cached, so no cross-locale/user leakage. Correct.
- **`mergeProgress` (useProgress.ts:227-239)** — last-write-wins by max timestamp, `new Date(0)` fallback for empty strings, monotonic fields via `Math.max`/OR. Correct except the un-completion asymmetry (L2).
- **`debouncedSync` rollback (useProgress.ts:295-322)** — rollback entry captured before the optimistic write (useProgress.ts:446-448 passes pre-write `serverProgressCache.get`); correct.
- **`tokenStorage` single-flight refresh + memory-only access token** — `refreshPromise` de-dups concurrent refreshes; TypeError-vs-HTTP distinction is correct at the `refreshAccessToken` layer (the gap is the boot-path caller, M6).
- **`UserProgress` unique constraints (models.py:185-197)** — partial unique on `(user, equation)` where user not null, and `(anon_id, equation)` where user null; correct, and the source of the `IntegrityError` the M4 retry handles.
- **`AuthContext.refreshUser` `hasRefreshed` guard** — prevents an infinite refresh loop; non-auth errors short-circuit before clearing tokens (lines 120-123). Correct (the residual issue is the boot-path null handling, M6).

---

## Recommended next steps (priority order)

1. **C1 + C3 + H1 together** — one `transaction.atomic()` block in `register` wrapping `serializer.save()` + `redeem_invite_code`; normalize/validate the X-Forwarded-For IP in `get_request_meta`; switch the webhook `deleted`/`payment_failed` lookups to `stripe_customer_id`. Closes the highest-severity auth + billing failures with minimal churn.
2. **C2 + H7** — add `unique=True` to `stripe_customer_id` (migration) and catch `MultipleObjectsReturned`; persist Stripe `event.id` for idempotency + an ordering/recency guard; add a Stripe read-through/reconciliation on `subscription_status` or a daily job so `tier` self-heals.
3. **H2 + H3** — make atomic invite redemption the single source of truth for both Google and email signup; drop both pre-validate calls; enforce the use cap with a conditional `UPDATE ... WHERE used_count < max_uses` + `rowcount`.
4. **H4 + H5 + H6 + M5** — bulk sync: wrap the loop in `transaction.atomic()`, record skipped/unknown ids in `errors`, de-dup client ids, merge (not overwrite) monotonic fields; add the `completed_at` block to anon `update_progress`.
5. **M1, M2, M3, M4, M6** — profile `get_or_create`/`hasattr` guards on `me`/`update_profile`; `clock_skew_in_seconds=10` + server-side logging in `google_auth`; `.dates()` streak (drop the 100-cap); try/except on the anon retry fetch; fix `refreshUser` boot-path to not log out on a transient (TypeError) refresh failure.
6. **Low** — L1 (derive sync items from real localStorage keys), L2 (agree on completion semantics), L3 (slug `IntegrityError` retry), L4 (Pillow content validation + old-avatar cleanup), L5 (paginate/deprecate the legacy atlas), L6 (document the absolute `time_spent_seconds` contract; consider `PositiveIntegerField`).
