---
title: "Architecture Audit — ScienceBouk (Verified)"
repo: sciencebouk
lens: arch
date: 2026-06-14
round: 3
---
H3 fully confirmed: 5 occurrences of `tier != PRO_TIER` in courses/views.py (lines 219/238/271/323/376), `accounts/views.py:181` uses `not is_pro`, `payments/views.py:87` uses `not profile.is_pro`, `accounts/models.py:38` defines the `is_pro` property, and no custom `BasePermission` class exists. The idiom count is accurate.

All findings verified. The only material correction needed is the nuance in C1 about the merge precedence (structural fields like slider `max` are scene-owned, not silently won by merge order; only copy fields merge). Here is the final verified report.

---

# Architecture Audit — ScienceBouk (Verified)

**Scope:** Full repository (`backend/` Django 5.2 + DRF, `frontend/` React 19 + Vite/TS). Read-only. Lens: tight coupling, leaky abstractions, layering violations, god modules, inconsistent patterns, tech-debt hotspots, scalability. Every finding below was checked against source; line numbers re-verified.

**Verification outcome:** All 15 draft findings confirmed against code. One correction applied to C1 (merge-precedence nuance — see strikethrough). Two path corrections: `sceneRegistry.ts` lives at `frontend/src/components/sceneRegistry.ts` (not `components/scenes/`); `ConfigurableEquationScene` is at `components/scenes/ConfigurableEquationScene.tsx`. No false positives found. One added observation (M3b) and one nuance flag.

**Headline:** The dominant problem is **content source-of-truth fragmentation** — equation/teaching data is duplicated across 4 representations and localization is implemented 5 ways. Secondary: a backend→frontend filesystem layering violation, an 811-line god component, 5 copy-pasted Pro-gate idioms, and a module-global singleton store. None block shipping; all compound as content grows past 17 equations.

---

## CRITICAL

### C1. Quadruple source of truth for equation/teaching data — CONFIRMED
**Files:** `frontend/src/data/equations.json` (17 entries, full payload) · `backend/courses/management/commands/seed_equations.py:34-188` (17 entries, hardcoded metadata) · `backend/courses/models.py:8` `Equation` (DB) · each bespoke `frontend/src/components/scenes/*.tsx` (variables/lessons/glossary inline, e.g. `PythagorasScene.tsx:12-49`).

The same metadata/teaching content lives in four independent representations:
1. **`equations.json`** — rich bundled file (verified: 17 entries, ids 1-17, keys `variables`/`presets`/`lessons`/`glossary`).
2. **`seed_equations.py`'s hardcoded `equations_data`** — title/formula/author/year/category/description for all 17 (verified: 17 entries, **0 title mismatches vs the JSON today**). The same file *also* reads `equations.json` via `_load_rich_data()` (`:16-21, 28`) for the rich fields — so metadata is effectively defined twice in one command.
3. **The DB** (`Equation`/`EquationTranslation`) — what the API serves.
4. **The bespoke scene TSX** — `PythagorasScene` re-declares `variables`/`glossary`/lessons inline; `TeachableEquation` then merges scene props with `useEquationConfig` (bundled JSON) and `useEquation` (API) — three live inputs at runtime (`TeachableEquation.tsx:249-275`).

`ConfigurableEquationScene` (ids without a bespoke scene) is **API-only** (`ConfigurableEquationScene.tsx:141-143`, `useEquation` → `equation.variables_data`), while bespoke scenes are **TSX-first**. The same product feature has two opposite data-flow architectures. (Confirmed.)

> **Correction (merge nuance):** The draft said "editing an equation's `max` slider value… requires touching up to 4 files, and the merge order silently decides which wins." Verified against `mergeSceneVariables/Presets/Glossary` (`TeachableEquation.tsx:170-234`): the merge overrides **copy fields only** (`description`, `symbol`, `latex`, `unit`, `label`, `words`, `tooltip`, `color`). Structural fields (`min`/`max`/`step`/`value`, `highlightClass`, lesson success conditions) are **owned solely by the scene props** for bespoke scenes — the API/config values for those are ignored, not "silently won." So the *duplication* across 4 files is real, but the silent-precedence risk applies to **copy/localization fields**, not slider bounds. The recommendation is unchanged.

**Fix:** Pick one authority. Recommended: DB is runtime authority (API already serves the full payload); `equations.json` becomes a backend-owned seed fixture (delete the hardcoded `equations_data` list and derive everything from JSON); bespoke scenes own only the *visualization*, consuming teaching data via `useEquation`/context. Add a CI consistency check (or, better, eliminate the independent definitions).

### C2. Backend reaches across the tier boundary into the frontend source tree — CONFIRMED
**File:** `backend/courses/management/commands/seed_equations.py:12-13`
```python
_REPO_ROOT = Path(__file__).resolve().parents[4]
EQUATIONS_JSON = _REPO_ROOT / "frontend" / "src" / "data" / "equations.json"
```
A Django management command walks `parents[4]` (verified: commands→management→courses→backend→repo-root) into the **frontend** package's `src/`. Layering violation: backend now depends on the monorepo layout, the frontend's internal source organization, and a sibling deployable being co-located on disk. Any of these breaking (separate frontend deploy, backend Docker image without the frontend tree, frontend reorg) silently degrades seeding to "without rich data" (`:32`) — empty `variables_data`/`lessons_data`, no error. The `parents[4]` index also breaks if the command file moves.

**Fix:** Move canonical seed data into the backend (`backend/courses/fixtures/equations.json` or a data module). If the frontend needs the same content, generate the frontend copy *from* the backend at build time — never the reverse.

---

## HIGH

### H1. `TeachableEquation` is a god component (811 lines) — CONFIRMED
**File:** `frontend/src/components/teaching/TeachableEquation.tsx` (verified: 811 lines)
One component owns: layout (mobile/desktop resizable), the lesson state machine + success-condition eval, progress persistence + time-tracking interval, Pro analytics logging, runtime localization merge of variables/presets/glossary from 3 sources (`:170-277`), preset application with locked-var filtering (`:323-330`), mobile gesture/drag, and the render of every teaching sub-panel. ~15 `useState`/`useRef` and many `useEffect` hooks in one body. Highest churn-risk file; effectively untestable in isolation. The merge helpers (`mergeSceneVariables/Presets/Glossary`, `:170-234`, and `buildSceneLocalizationFromApi`, `:150-168`) are already **pure** and self-contained.

**Fix:** Extract `useLessonStateMachine`, `useSceneLocalization` (lift the pure merge helpers `:150-234` to a module and unit-test them), `useTeachingLayout`, and a presentational `TeachingPanel`.

### H2. Five parallel localization mechanisms, no shared abstraction — CONFIRMED
**Files:** `backend/courses/localization.py` + `EquationTranslation` (DB i18n) · `frontend/src/i18n/locales.ts:13-23` · `frontend/src/data/equationConfig.ts:52-71` (`equation-locales/*.json` glob merge) · `frontend/src/data/sceneCopy.ts:8-56` (`scene-locales/*.json` glob merge) · `frontend/src/components/teaching/lessonContent.ts:8-18` (`content/lessons/*/*.md` glob + custom markdown parser).

Five independent locale resolve+merge pipelines; three on the frontend each re-implement "resolve candidates → find localized file → deep-merge over English." **Cross-tier contract duplication confirmed:** `normalize_locale`/`resolve_locale_candidates` (`localization.py:9-31`) and `normalizeLocale`/`resolveLocaleCandidates` (`i18n/locales.ts:13-23`) implement the same semantics (trim, lowercase, `_`→`-`, base-language fallback, append default) with **no shared test** guaranteeing they stay in sync. A single equation's translation can come from the DB, `equation-locales/de.json`, `scene-locales/de.json`, or `lessons/de/*.md` depending on field and scene.

**Fix:** Consolidate the three frontend glob-merge pipelines behind one `createLocalizedContent(globPattern, mergeStrategy)` (the `sceneCopy.ts:26-49` merge is already generic). Document precedence in one place. For the cross-tier duplication, add a shared golden-table contract test run on both sides.

### H3. Inconsistent Pro-gating: 5 idioms for one rule, no permission class — CONFIRMED
**Files:** `courses/views.py:219,238,271,323,376` (`not hasattr(request.user, "profile") or request.user.profile.tier != PRO_TIER` — verified **5** occurrences) · `accounts/views.py:181` (`not request.user.profile.is_pro`) · `payments/views.py:87` (`not profile.is_pro`) · `accounts/models.py:37-39` (`is_pro` property) · `main.tsx:44-51` `RequirePro` reading `isPro` from `useAuth`.

The "is this user Pro?" check is written multiple ways across three apps; `courses` repeats the verbose `hasattr … tier != PRO_TIER` form inline at the top of all 5 gated views. **No `BasePermission` subclass exists anywhere** (verified via grep). `PRO_TIER = "pro"` (`courses/views.py:19`) duplicates `Profile.TIER_CHOICES`/`is_pro` semantics in `accounts/models.py:21,38`. Adding a gated endpoint means copy-pasting the idiom; changing tier semantics (e.g. a "trialing" grace state) means hunting 5+ spots.

**Fix:** Add one `class IsProUser(BasePermission)` in a shared location; use `permission_classes=[IsProUser]` on every gated view. Drop the inline checks. Use `Profile.is_pro` as the single definition.

### H4. Progress field-copy loop + near-identical serializers duplicated 3× — CONFIRMED
**File:** `courses/views.py:87-92, 255-262, 302-309` — the
```python
for field in ["completed","lesson_step","time_spent_seconds","variables_explored","notes","bookmarked"]:
    if field in vd: setattr(progress, field, vd[field])
```
block (plus `completed_at`/`last_viewed` logic) is repeated **verbatim three times**. `ProgressUpdateSerializer` / `AuthProgressUpdateSerializer` / `BulkProgressItemSerializer` (`serializers.py:76-105`) are three near-identical serializers differing only by `user_id` vs `equation_id` presence. The magic field-list array is maintained in lockstep across 3 call sites and 3 serializers — adding a progress field means editing ~6 places.

**Fix:** Extract `apply_progress_update(progress, validated_data)` as the single owner of the field copy + `completed_at`/`last_viewed`. Collapse the three serializers into one base + thin subclasses (a shared `ProgressFieldsMixin`).

---

## MEDIUM

### M1. `useProgress` is a 519-line module-global singleton store — CONFIRMED
**File:** `frontend/src/progress/useProgress.ts` (verified: 519 lines)
Holds ~12 mutable module-level globals (`_equationIds:8`, `syncTimers:39`, `progressListeners:40`, `localProgressCache:41`, `progressSnapshotCache:42`, `serverProgressCache:45`, `serverProgressPromise:46`, `hasFetchedServerProgress:47`, `serverProgressBackoffUntil:48`, `activeServerUserId:49`, `serverSyncErrorState:50`, `progressVersion:51`). A hand-rolled store with versioning, snapshot caching, optimistic writes+rollback, debounce, exponential backoff, and cross-tab `storage` sync — all as free functions mutating globals, living *next to* TanStack Query (server cache) and React Context. `registerEquationIds` mutating a global from `App.tsx:113` is action-at-a-distance. Impossible to reset cleanly between tests.

**Fix:** Most defensible singleton here (intentionally spans components + tabs) — no urgent rewrite. But the server half (fetch/sync/backoff) duplicates React Query; consider moving server progress into a Query/mutation with optimistic updates, leaving this module to own only localStorage. At minimum wrap the globals in one store object for testability.

### M2. Scene registry, lesson copy, and API keyed by 3 unrelated identifier systems — CONFIRMED
**Files:** `frontend/src/components/sceneRegistry.ts:15-33` (keyed by **numeric 1-17**) · `useEquation(id)` (numeric `id`, which the serializer sources from `sort_order` — `serializers.py:20`) · `lessonContent.ts` + scenes (`useLessonCopy("pythagoras")` — free-string slug; verified across all 17 scenes, e.g. `"euler-polyhedra"`, `"black-scholes"`).

`sceneLoaders[1] = PythagorasScene` couples the visualization to the equation's **DB `sort_order`** (the API `id` *is* `sort_order`). Reordering the atlas silently maps the wrong scene to the wrong equation. The slug `"pythagoras"` must match `content/lessons/pythagoras.md` and the equation's slug, but nothing enforces it — a typo throws only at runtime (`lessonContent.ts:154`).

**Fix:** Key the scene registry by the stable `slug` (already unique in the model) instead of `sort_order`; derive the lesson-copy key from that same slug. One identifier (slug) addresses scene + lesson + API.

### M3. Dead/orphaned features inflate surface area — CONFIRMED
- **Backend `UserSettings` is unreachable.** `accounts/views.py:177-205` exposes a Pro-gated GET/PUT/PATCH settings-blob endpoint; `accounts/models.py:42-48` defines the model and `:128-132` a `post_save` signal creating a `UserSettings` row for **every** user. But the `api` client (`api/client.ts:203-278`) has **no method** for it (verified — no `userSettings`/`/settings/` reference in the frontend; the only `/settings/` hits are the unrelated `SettingsContext` path). Every user gets a `UserSettings` row that nothing reads; `settings.language` (which drives all i18n) is never persisted server-side, so Pro users lose language/theme on a new device despite the backend being built to store it.
- **`useCourse` + `course_detail` + 2 legacy atlas aliases are unused.** `api/hooks.ts:27` `useCourse` is defined but called by **zero components** (verified — only referenced internally; `api.courses.get` is touched solely by `api/client.test.ts:53`). `equation_atlas_legacy` is wired to `/courses/equation-atlas/` and `/courses/foundational-algebra/` (`courses/urls.py:34-35`) "while [the frontend] migrates" (`views.py:166`), but the frontend only calls `/equations/` (no `equation-atlas`/`foundational-algebra`/`equationAtlas` reference anywhere in `frontend/src`). Pure carrying cost.

**Fix:** Either wire `UserSettings` to the frontend (a Pro-sync path mirroring `useProgress`) or delete the model + endpoint + signal. Remove `useCourse`, `equation_atlas_legacy`, and the two legacy aliases if the migration is complete. *(Note: `api.courses.get` is the only thing keeping `course_detail` alive at all — verify nothing else consumes the course endpoint before deletion.)*

### M4. CI does not run the `accounts` and `payments` test suites — CONFIRMED
**File:** `.github/workflows/ci.yml:43` — `python manage.py test courses -v 2`.
The backend CI runs **only** `courses`. Verified counts: `accounts/tests.py` = **670 lines, 70** `test_` methods (auth, invites, Google OAuth, registration); `payments/tests.py` = **300 lines, 18** tests (Stripe webhook signature, upgrade/downgrade). The most security-sensitive subsystems have tests that **never execute in CI** and don't gate merges. An architectural gap in the quality pipeline.

**Fix:** Change to `python manage.py test -v 2` (whole project). Split into parallel jobs if runtime matters, but do not silently exclude two apps.

### M5. `payments` mutates `accounts` domain state via a lazy cross-app import — CONFIRMED
**File:** `payments/views.py:22-31` (`upgrade_profile`/`downgrade_profile` write `profile.tier`/`stripe_subscription_id`), `:140` (`from accounts.models import Profile` *inside* the webhook handler).
The Stripe webhook reaches into `accounts.Profile` and flips `tier`. The lazy import is a circular-dependency workaround. Tier-mutation logic lives in `payments`, but the tier field and its `is_pro` semantics live in `accounts` — billing owns a write path into the accounts domain with no service boundary. As billing grows (proration, grace periods, multiple plans) this entanglement makes both apps harder to change independently.

**Fix:** Give `accounts` (or a small `subscriptions` service) the single function owning tier transitions — `accounts.services.set_subscription(profile, active, sub_id)` — and have the webhook call it. Removes the lazy import; puts tier policy next to the field.

### M6. Glossary highlighting is a stringly-typed contract between imperative D3 and React — CONFIRMED
**Files:** `PythagorasScene.tsx:15,21,27,33,39` (glossary `highlightClass: "sq-c" | "right-angle" | "all-squares" | "tri"`) ↔ `:239-250, 384-397` (D3 `g.select(".sq-c")`, `highlightedTerm === "sq-c"`, `.attr("class","sq-c")`) ↔ `richText.tsx:78` (`token.termRef?.highlightClass`) → `onTermHighlight` → `highlightedTerm`.
The visualization (imperative D3) and the teaching glossary (declarative data) share magic-string class names with **no shared constant or type**. A rename in one place silently breaks the highlight with no compile error. The teaching layer must know each scene's internal DOM class taxonomy — a leaky abstraction. (Note: `TeachableEquation.tsx:133,220-224` also keys glossary merges by `highlightClass`, so the string is load-bearing in the merge layer too.)

**Fix:** Per scene, define `const HIGHLIGHTS = { hypotenuse: "sq-c", ... } as const` and reference it from both the D3 `select`/`classed` calls and the glossary array, so the linkage is type-checked.

---

## LOW

### L1. Mid-file `import` in `courses/views.py:21` — CONFIRMED
The `from .serializers import (...)` block sits **after** the `PRO_TIER`/`EQUATION_ATLAS_SLUG` module constants (`:19-20`) instead of with the top imports (`:1-17`). Cosmetic; reads like an accidental edit and trips import-order linters. Move it up.

### L2. ~17 scenes re-implement the same D3 mount boilerplate — CONFIRMED
Verified: **11** scenes import `d3-selection`, **12** use `ResizeObserver`/`useContainerSize`, each with a near-identical `useEffect(() => { const svg = select(ref)… }, […])` mount/cleanup. The §4c "uniform transform + shared context" smell — each scene re-pays for the same setup. A `useD3Scene(drawFn, deps)` hook owning select/sizing/cleanup would remove a large copy-paste slab and standardize teardown (a common React+D3 leak source). Opportunistic, not a fan-out rewrite.

### L3. `settings.py` env loader is a hand-rolled `.env` parser — CONFIRMED
`formulas_backend/settings.py:13-39` `load_env_file` reimplements dotenv parsing (quote stripping, `export ` prefix, `#` comments, `key in os.environ` precedence). Works and is dependency-free, but a maintenance liability vs `python-dotenv`; subtle parsing bugs here affect every secret. Low priority.

---

## What's architecturally sound (do not "fix")
- **Provider composition** (`main.tsx`) — Query → Settings → Auth → Router, correctly ordered.
- **API client** (`api/client.ts`) — single `request()` choke point with centralized 401-refresh (`:46-68`), pagination (`requestAllPages` `:70-105`), typed responses. Good seam.
- **Scene lazy-loading + prefetch** (`sceneRegistry.ts:38-62`) — genuine extensibility/perf win (the *keying* by sort_order is the M2 problem, not the lazy-load pattern).
- **The merge helpers within each i18n mechanism** (`equationConfig.ts`, `sceneCopy.ts`, the `TeachableEquation` merge fns) — well-factored and pure. The problem (H2) is that there are five mechanisms, not that any one is bad.
- **`LocalizedEquationSerializerMixin`** (`serializers.py:6-16`) — clean DRF abstraction; `EquationSerializer` extends `EquationSummarySerializer` correctly.
- **Stripe webhook** is a plain Django view (not `@api_view`) specifically to read `request.body` before DRF consumes it for signature verification (`payments/views.py:114-121`) — a correct, well-documented choice.

---

## Recommended next steps (highest leverage first)
1. **Collapse the content authority (C1 + C2 together).** Make the DB the runtime authority; move `equations.json` into `backend/courses/fixtures/` as the seed fixture; delete the hardcoded `equations_data` list in `seed_equations.py`; have bespoke scenes consume teaching data from `useEquation`/context and own only the visualization. This kills the cross-tier filesystem walk (C2) and the quadruple-source problem (C1) in one refactor — the single biggest maintenance-surface reduction.
2. **Add `IsProUser(BasePermission)` (H3)** — one class, applied to all 6 gated endpoints; delete the 5 inline `tier != PRO_TIER` checks and the `PRO_TIER` constant. Low effort, removes a whole class of "wrong idiom on a new endpoint" bugs.
3. **Fix CI to run all three apps (M4)** — `python manage.py test -v 2`. One-line change; immediately starts gating 88 security-sensitive tests (auth, invites, OAuth, Stripe) that currently never run.
4. **Extract `apply_progress_update()` + collapse the 3 progress serializers (H4).** Small, mechanical, removes 6-place lockstep editing.
5. **Decide `UserSettings`' fate (M3)** — either wire it to the frontend so `settings.language` persists for Pro users across devices, or delete the model + endpoint + signal. Today it writes a row per user that nothing reads.
6. **Re-key the scene registry by `slug` (M2)** so reordering the atlas is safe; derive the lesson-copy key from the same slug.
7. **Opportunistic / lower priority:** consolidate the 3 frontend i18n glob-merge pipelines + add a cross-tier `normalize_locale` contract test (H2); per-scene `HIGHLIGHTS as const` (M6); `useD3Scene` hook (L2); decompose `TeachableEquation` by lifting the already-pure merge helpers first (H1); move the mid-file import (L1).

**Severity rollup (verified):** 2 critical, 4 high, 6 medium, 3 low — 15/15 draft findings confirmed, 0 false positives, 1 correction (C1 merge-precedence nuance). The two criticals share one root cause — no single content authority — so fixing C1/C2 together is the highest-leverage move.
