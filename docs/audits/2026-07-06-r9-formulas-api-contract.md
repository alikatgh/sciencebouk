---
title: "API Contract Audit — formulas (Round 9)"
repo: formulas
lens: api-contract
date: 2026-07-06
round: 9
---

# API Contract Audit — `formulas` (Round 9)

**Scope:** `frontend/src/api/client.ts`, `hooks.ts`, `AuthContext`, progress layer vs Django routes. Read-only. Compared to [`sciencebouk`](../../sciencebouk) pruned client (sciencebouk removed dead methods in PR #7).

**Relationship:** Backend urlconfs match sciencebouk shape. **formulas frontend retains a larger API client + dead React Query hooks** that sciencebouk deleted. Several hooks have **zero UI importers** — contract dead code, not runtime mismatches.

---

## HIGH

### H1. `api.equations.updateProgress` routes authenticated users to Pro-gated `/api/progress/{id}/` without tier check
- **Client:** `client.ts:212-220` — if `getAccessToken()`, PATCH `/progress/${id}/` (strips `user_id`).
- **Server:** `update_my_progress` (`courses/views.py:319-322`) — `IsAuthenticated` + **`profile.tier == "pro"`** or 403.
- **Verified:** `useProgress.ts` gates server sync on `isPro` (`:444-448`) — live path is safe. **`useUpdateProgress` hook** (`hooks.ts:55-63`) calls `updateProgress` with **no Pro guard** and could be used by future UI.
- **Impact:** Any caller of `useUpdateProgress` for a free logged-in user gets silent 403; hook invalidates `["equations"]` on success only.
- **Fix:** Remove dead hook or add `isPro` guard + match sciencebouk (local-only for non-Pro).

### H2. Dead React Query hooks call live endpoints but have **zero** component importers
- **Where:** `frontend/src/api/hooks.ts` — `useEquations`, `useCourse`, `useSearchEquations`, `useUpdateProgress`.
- **Verified:** Grep `frontend/src` — hooks only referenced in `hooks.ts` itself and `client.test.ts`. sciencebouk deleted this file's dead exports (only `useEquation` remains).
- **Impact:** Contract surface area diverges from actual UI; tests assert dead methods (`client.test.ts:49-54`).
- **Fix:** Prune hooks + client methods to match sciencebouk `client.ts` / single `useEquation` hook.

### H3. `bulkSync` expects `ProgressItem[]` but server returns `{results, errors}` on HTTP 207 (same as sciencebouk H1)
- **Client:** `client.ts:241-242`; `SyncPrompt.tsx:47`.
- **Server:** `courses/views.py:400-402`; tested in `courses/tests.py:1286+`.
- **Fix:** Union response type; handle 207 partial success.

---

## MEDIUM

### M1. `api.payments.status` — client method with no UI caller (sciencebouk removed it)
- **Client:** `client.ts:259-260` → `GET /payments/status/`.
- **Server:** Returns `{ tier, is_pro, billing_enabled }`.
- **Verified:** `AuthContext` uses `user.profile.tier` from `/auth/me/`; grep shows no `api.payments.status` in components.
- **Fix:** Delete client method; keep server route for external API consumers.

### M2. `/api/auth/settings/` — server live, no client (arch M3 orphan)
- **Server:** `accounts/urls.py:22`, Pro-gated blob CRUD.
- **Client:** No `/auth/settings/` method; `SettingsContext` is local-only.
- **Verified:** Same gap as sciencebouk r9 H2.
- **Fix:** Wire or delete; port sciencebouk decision.

### M3. `api.equations.list` builds path `/equations/${params}` — fragile but currently valid
- **Client:** `client.ts:205-207` — `params` is `""` or `"?category=…"`.
- **Verified:** Produces `/equations/` or `/equations/?category=x` — works with DRF router. Dead code (only `hooks.ts` `useEquations` calls it).
- **Fix:** Remove with hook prune; production uses `listAll` via `equationManifest.ts:36`.

### M4. `api.courses.get` + `api.search` — live server routes, hook-only callers
- **Server:** `course_detail`, `search_equations` — tested.
- **Client:** `hooks.ts` only; no page imports.
- **Fix:** Remove or document as SDK for external tools.

### M5. Anonymous `PATCH /equations/{id}/progress/` still in client fallback branch
- **Client:** `client.ts:222-225` — when no access token, sends `user_id` to anon endpoint.
- **Server:** Requires UUIDv4 `user_id` (`ProgressUpdateSerializer`).
- **Verified:** `useProgress` uses localStorage for non-Pro; `updateProgress` API path likely unused in UI (hook dead). sciencebouk removed client anon path entirely.
- **Fix:** Align with sciencebouk local-only anon storage.

---

## LOW

### L1. `CourseResponse` / `LessonResponse` types — only consumed by dead `api.courses.get`
- **Fix:** Delete with courses client removal.

### L2. `ProgressResponse` deprecated alias — duplicate of `ProgressItem`
- **Where:** `client.ts:165-166`.
- **Fix:** Remove alias on cleanup.

### L3. Login/register/google contracts match `AuthContext` ✓ (same serializers as sciencebouk)
- **Verified:** Register returns `{user, tokens}` 201; google 200.

### L4. `api.analytics.logEvent` body `{ equation_id, event_type, data }` matches `LogEventSerializer` ✓

### L5. Avatar `FormData` field name `avatar` matches `upload_avatar` parser ✓

---

## Orphan / dead summary

| Kind | Items |
|------|-------|
| Dead client methods | `equations.list`, `updateProgress`, `courses.get`, `search`, `payments.status` |
| Dead hooks | `useEquations`, `useCourse`, `useSearchEquations`, `useUpdateProgress` |
| Server orphan (SPA) | `course_detail`, legacy atlas, `payments/status`, `auth/settings` |
| Shared bug | `bulkSync` 207 shape (H3) |

**Recommendation:** Cherry-pick sciencebouk `api/client.ts` + `hooks.ts` prune as one contract-alignment PR.

*Read-only audit — 2026-07-06.*