---
title: "API Contract Audit — sciencebouk (Round 9)"
repo: sciencebouk
lens: api-contract
date: 2026-07-06
round: 9
---

# API Contract Audit — `sciencebouk` (Round 9)

**Scope:** Frontend `api` client + `AuthContext` fetch paths vs Django urlconfs/serializers. Read-only. Cross-referenced [`docs/BUG_JOURNAL.md`](../BUG_JOURNAL.md) (patterns #7, #9–#11; deadcode B1/B2; arch M3 UserSettings).

**Relationship:** formulas retains a **larger stale client surface** (`api.equations.list`, `updateProgress`, `courses.get`, `search`, `payments.status`, dead hooks) — see `formulas/docs/audits/2026-07-06-r9-formulas-api-contract.md`. sciencebouk pruned the client (PR #7) but backend legacy routes remain.

**Headline:** Live UI paths **mostly match** backend contracts. Gaps: **`bulkSync` 207 shape**, **`/auth/settings/` orphan**, **legacy course/anon-progress endpoints unused**, **error-field inconsistency** on Pro-gated routes.

---

## HIGH

### H1. `bulkSync` client types `ProgressItem[]` but server returns `{results, errors}` on HTTP 207
- **Client:** `frontend/src/api/client.ts:194-195` — `request<ProgressItem[]>('/progress/sync/', …)`.
- **Server:** `backend/courses/views.py:400-402` — on partial failure: `Response({"results": results, "errors": errors}, status=207)`; on full success: bare `results` array (200).
- **Verified:** `courses/tests.py:1286-1295` asserts 207 + errors for unknown equation ids. `SyncPrompt.tsx:47-48` calls `bulkSync` and treats any 2xx as success without reading body shape.
- **Impact:** Typed as array; runtime JSON is an object on 207. Any future consumer mapping `results` will break; partial sync success is silently ignored.
- **Fix:** Union type `{ results: ProgressItem[]; errors: … } | ProgressItem[]`; branch on status 207; surface `errors` in SyncPrompt.

### H2. `/api/auth/settings/` is live + README-documented but has **zero** frontend client
- **Server:** `accounts/urls.py:22` → `user_settings` (`accounts/views.py:235-263`) — Pro-gated GET/PUT/PATCH JSON blob (`UserSettingsSerializer`: `data`, `updated_at`).
- **Client:** `api/client.ts` — no `settings` method (grep: no `/auth/settings/` in `frontend/src`).
- **Verified:** `SettingsPage.tsx` uses local `SettingsContext` only; `api.progress.clear()` on reset — never syncs language/theme to server. BUG_JOURNAL arch M3 + open backlog confirm orphan. README `README.md:109` documents the endpoint.
- **Impact:** Every user gets a `UserSettings` row (`post_save` signal) that the SPA never reads/writes — Pro users lose settings on new devices despite backend support.
- **Fix:** Add `api.settings.get/patch` wired to `SettingsContext` for Pro users, or delete endpoint + model and update README.

---

## MEDIUM

### M1. `PATCH /api/equations/{id}/progress/` — server live, client removed (intentional orphan)
- **Server:** `courses/urls.py:24` — `AllowAny`, requires `user_id` UUIDv4 (`ProgressUpdateSerializer`).
- **Client:** No caller in `frontend/src` (removed with dead hooks PR #7); progress uses localStorage for non-Pro users.
- **Verified:** Contract is valid for external/legacy clients; sciencebouk SPA no longer exercises it. Tests still cover the route.
- **Fix:** Document as "legacy anonymous API" in README or deprecate with sunset header.

### M2. Course endpoints orphan — `course_detail` + legacy atlas aliases unused by SPA
- **Server:** `courses/urls.py:34-37` — `courses/equation-atlas/`, `courses/foundational-algebra/`, `courses/<slug>/`.
- **Client:** `equationManifest.ts` uses `api.equations.listAll` only; no `api.courses` namespace.
- **Verified:** BUG_JOURNAL B1/B2 — deliberately retained for external consumers. `equation_atlas_legacy` returns a different envelope (`course`, `equationAtlas`, …) than `CourseDetailSerializer`.
- **Fix:** Keep routes; add "legacy / external" note in README API section (partially done for aliases).

### M3. `GET /api/payments/status/` — backend + README, no SPA caller
- **Server:** `payments/urls.py:7` → `{ tier, is_pro, billing_enabled }`.
- **Client:** Pro status from `user.profile.tier` via `/auth/me/` (`AuthContext.tsx:267`); `api.payments` has only `checkout` + `portal`.
- **Verified:** Intentional per deadcode audit M2; README still lists the route for API consumers.
- **Fix:** None required for SPA; optional OpenAPI tag "external".

### M4. `ProgressItem` interface omits `created_at` the server serializer includes
- **Client:** `client.ts:135-145` — no `created_at`.
- **Server:** `UserProgressSerializer` (`serializers.py:92-96`) includes `created_at`.
- **Verified:** Client maps `lesson_step` → `lessonStep`, etc., in `useProgress.ts`; extra server field is ignored (safe). Type drift if strict codegen is added.
- **Fix:** Add optional `created_at?: string` to `ProgressItem` or strip from serializer for API minimalism.

### M5. Pro-gated progress routes return `{error: "Pro required"}` — client `readError` expects `detail` or `message`
- **Server:** `courses/views.py:303,322,349` — `{"error": "Pro required"}` with 403.
- **Client:** `client.ts:12-20` — `body?.detail ?? body?.message`.
- **Verified:** Free authenticated users hitting progress APIs (shouldn't happen — `useProgress` gates on `isPro`) get generic `API 403: Forbidden` instead of "Pro required".
- **Fix:** Standardize on DRF `{"detail": …}` or extend `readError` to read `error`.

---

## LOW

### L1. `log_event` returns 201 + `{ok: true}` — client types `{ ok: boolean }` (match ✓) but ignores 201 semantics
- **Client:** `api.analytics.logEvent` — fire-and-forget `.catch(() => {})` in `TeachableEquation.tsx`.
- **Server:** `views.py:488` — 201 Created.
- **Verified:** No functional bug; contract aligned.

### L2. Avatar upload response `{avatar_url}` — client and server match; profile refresh not automatic
- **Client:** `ProfilePage.tsx:85-86` — uses returned URL; does not call `refreshUser()`.
- **Server:** `accounts/views.py` returns `{"avatar_url": …}`.
- **Verified:** Minor UX drift if `UserSerializer` embeds a different URL shape later.

### L3. Register/google return `{user, tokens}` — contract matches `AuthContext.tsx:236-254` ✓
- **Verified:** `LoginSerializer` adds `user` to login response (`serializers.py:87`) — `login()` optional `data.user` path is live.

### L4. Search endpoint `GET /api/search/?q=` — no `api.search` wrapper (UI uses client-side `searchEquationManifest`)
- **Server:** `courses/views.py:192-234` — paginated or array response.
- **Client:** No REST search call in production UI.
- **Verified:** Orphan for SPA; server contract tested. Not a mismatch, dead server path for this client.

### L5. `DELETE /api/progress/` — client `api.progress.clear()` matches Pro-gated `my_progress` DELETE ✓
- **Verified:** `SettingsPage.tsx:137`; server returns `{"ok": true}`.

---

## Contract summary

| Metric | Count |
|--------|-------|
| Live UI calls matched | 14 |
| Request/response mismatches | 2 (H1, M4) |
| Auth/orphan endpoints | 5 (H2, M1–M3, L4) |
| Error-shape gaps | 1 (M5) |

**Top fixes:** H1 (bulkSync 207), H2 (wire or delete UserSettings).

*Read-only audit — 2026-07-06.*