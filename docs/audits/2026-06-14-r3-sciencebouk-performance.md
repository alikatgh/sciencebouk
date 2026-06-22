---
title: Performance Audit — sciencebouk (Django REST + Vite/React/TS) — VERIFIED
repo: sciencebouk
lens: performance
date: 2026-06-14
round: 3
---

EntropyScene has only `PARTICLE_COUNT = 24` (6×4), all memoized (`useMemo`, lines 175, 178). Not a hot-path issue — ghost states are bounded and small. Not a missed finding.

I have verified all findings. One high-value addition the auditor missed: `EquationViewSet.retrieve` (the `/equations/{id}/` endpoint, the hottest per-equation read called by `useEquation` on every scene open) is **not** cached, while `list` is. Let me quickly confirm retrieve has no caching and check whether the time-series circles in ChaosScene are correctly bounded (60).

The time-series renders `timeSeriesData.map` (60 points, line 348) — correctly small. Now let me confirm retrieve isn't cached (the draft notes `/equations/{id}/` is fetched per equation open but doesn't flag it as cacheable).

The `EquationViewSet` (courses/views.py:33-56) only decorates `list` with `cache_page`; `retrieve` is uncached. Each scene open fetches `/equations/{id}/` (confirmed via `useEquation`→`api.equations.get`). This payload is static content (changes only on reseed) but hits the DB every time. This is a legitimate MEDIUM addition. With React Query `staleTime: 5min` it's cached client-side per session, but server-side every cold/cross-client request re-serializes. I'll add it as a qualified medium.

I have everything verified. Here is the final report.

---

# Performance Audit — sciencebouk (Django REST + Vite/React/TS) — VERIFIED

Read-only audit. Every finding below was checked against source. Verdicts: **CONFIRMED** (reproduced in code), **CONFIRMED w/ correction** (real, but the draft's line cite, fix, or framing needed adjustment), **ADDED** (high-value, auditor missed). No false positives were found in the draft — but two findings carry correctness caveats that must be respected when fixing, and the C1 fix recommendation needs one guardrail.

Stack is genuinely performance-aware: D3 scenes animate via refs/RAF and bypass React; route+scene code-splitting with idle prefetch; React Query `staleTime`; progress store uses `useSyncExternalStore` + snapshot cache; the `bulk_sync_progress` N+1 was already fixed (M14 comment, verified at `views.py:288-289`).

---

## CRITICAL

### C1. ChaosScene renders 9,212 React-managed `<circle>` nodes, reconciled on every slider drag — CONFIRMED
**File:** `frontend/src/components/scenes/ChaosScene.tsx:150-162` (data), `:263-272` (render)

Verified the exact count by running the loop: `for (rVal=2.5; rVal<=4.0; rVal+=0.008)` = **188 r-steps**, inner `for (i=0;i<300)` pushes when `i>250` = **49 points/step** → **9,212 points**, each emitted as an individual `<circle>` at `:263-272`.

The re-render path is confirmed end-to-end: `setVar` (`TeachableEquation.tsx:308`) → `setVars` updates `vars` state → `visualizationContent` recomputes via `children({ vars, setVar, ... })` (`TeachableEquation.tsx:667`) → `<ChaosChart r={vars.r} x0={vars.x0}>` re-renders. **`ChaosChart` is not wrapped in `React.memo`**, so every slider drag frame re-runs `bifurcationData.map(...)` and reconciles all 9,212 vnodes. `bifurcationData` itself is correctly `useMemo([])`, so the data isn't recomputed — but the JSX map and DOM diff are. This is the dominant user-facing jank source.

**Fix (cheapest first):**
1. Render the static dot cloud as a **single `<path>`** (one `d` string of dots) computed once from `bifurcationData`, or render to an offscreen canvas/`<image>` once. Only the red `r` indicator line (`:273-281`) and the time series need to stay reactive.
2. If keeping SVG nodes, hoist the cloud into a `memo`'d component with stable props so reconciliation is skipped — **but this still pays React's mount cost once and keeps 9k DOM nodes live**; the single-path/canvas route is strictly better.
3. Decimate to ~1,500 deduped points (the 9,212 over-plot a ~400px-wide chart heavily).

**Guardrail on the fix:** whichever option, also wrap `ChaosChart` in `React.memo` (or move the dot layer into a memoized child) — otherwise the time-series and tick `.map()`s still reconcile per frame. The time-series chart (`:348-350`, 60 circles) is fine as-is.

---

## HIGH

### H1. N+1: every authenticated request loads `request.user.profile` in a second query — CONFIRMED
**Files (all read `request.user.profile`):** `backend/courses/views.py:219, 238, 271, 323, 376`; `backend/payments/views.py:41, 43, 83, 85, 104`; `backend/accounts/views.py:136, 181`. Root cause confirmed at `backend/.venv/.../rest_framework_simplejwt/authentication.py:130`: `get_user` does `self.user_model.objects.get(...)` with **no** `select_related`. Settings registers the plain class (`settings.py:131-133`).

Confirmed `UserSerializer` embeds `ProfileSerializer` (`accounts/serializers.py:24`, `profile = ProfileSerializer(read_only=True)`), so `/auth/me/` (`accounts/views.py:129`), login, register, and google_auth all fire the extra profile query too. Two queries where one join suffices, on 100% of authenticated traffic.

**Fix:** Subclass `JWTAuthentication.get_user` to fetch with `select_related("profile")` and register it in `DEFAULT_AUTHENTICATION_CLASSES`. (The draft's `type(user).objects.select_related(...).get(pk=user.pk)` works but does a second query — better to override `get_user` to do the single joined fetch from the start.)

### H2. Full 37 KB `equations.json` eagerly bundled into the per-scene `TeachableEquation` chunk — CONFIRMED (size corrected: 37 KB, not 35 KB)
**Files:** `frontend/src/data/equations.ts:1` (`import rawData from "./equations.json"`) → `frontend/src/data/equationConfig.ts:3-9` (static `import { equations } from "./equations"`) → `frontend/src/components/teaching/TeachableEquation.tsx:22` (static `import { useEquationConfig }`).

Verified: `equations.json` is **37 KB / 17 equations** (`ls` + parse). All three imports are static (no `await import`), so the entire dataset for all 17 equations lands in the chunk that loads on **every** scene. This is redundant with the runtime path — `TeachableEquation.tsx:249` already calls `useEquation(resolvedId)` which fetches the single equation's full payload from `/equations/{id}/`. The bundled JSON is only the offline/SSR-absent fallback for `localizedEquationConfig` (`:250`).

**Fix:** Lazy-import `equationConfig` only when the API payload is absent, OR split the JSON per-equation and dynamic-import by id, OR drop the static dep from the render path and seed React Query from it via `initialData` (see M7). Saves ~37 KB parse+download on first equation view.

### H3. `useChartFrame` rebuilds D3 scales every render — `useMemo` defeated by inline array deps — CONFIRMED
**File:** `frontend/src/components/charts/simpleChart.ts:63-74` (scales) and `:76-91` (`clientXToX`/`clientYToY`). Call sites pass fresh array literals: `ChaosScene.tsx:114-115` (`xDomain: [2.5, 4]`, `yDomain: [0, 1]`), same pattern in `InformationScene`, `CalculusScene`, `BlackScholesScene`, `NormalDistributionScene`.

Confirmed: `xScale = useMemo(() => scaleLinear().domain(xDomain)..., [plotLeft, plotRight, xDomain])`. `xDomain` is a new array reference every render, so the referential dep check always misses and the scale rebuilds. Same for `yScale`, `y2Scale`, and both `useCallback` coordinate mappers (`:82`, `:91` list `xDomain`/`yDomain`/`y2Domain`). In `ChaosChart` this compounds C1: 3 scales + 2 callbacks rebuilt every drag frame.

**Fix:** Destructure to primitives and depend on those: `const [x0,x1]=xDomain; useMemo(()=>scaleLinear().domain([x0,x1]).range([plotLeft,plotRight]),[x0,x1,plotLeft,plotRight])`. Apply to all five memo/callbacks.

---

## MEDIUM

### M1. `learning_dashboard` runs ~7 uncached queries per load; static counts recomputed every request — CONFIRMED (query count: 7, not "~6")
**File:** `backend/courses/views.py:318-369`

Verified queries per request: (1) `progress.filter(completed=True).count()` `:327`; (2) `Sum` aggregate `:328`; (3) 100-row `LearningEvent` timestamp pull `:331-334`; (4) `values_list` of completed ids `:344-345`; (5) `category_stats` `values().annotate()` `:347-350`; (6) `Equation.objects.exclude(...).first()` `:357`; (7) `Equation.objects.count()` `:361` — **seven** DB round-trips, none cached. `totalEquations` (#7) and per-category `total` (within #5) are seed-invariant constants recomputed per request.

**Fix:** Cache `totalEquations` + per-category totals in the existing `CACHES` default keyed on a seed-version. Collapse #1+#2 into one `aggregate(completed=Count('id', filter=Q(completed=True)), total=Sum('time_spent_seconds'))`. The `filter=Q(id__in=completed_equation_ids)` embeds the id list into SQL — fine at 17 equations, watch if the atlas grows.

### M2. Missing composite index for the streak query — CONFIRMED (with scope correction)
**File:** `backend/courses/models.py:203-219` (`LearningEvent`), `:165-201` (`UserProgress`)

Confirmed `LearningEvent.created_at` has `db_index=True` **alone** (`:212`); the streak query filters `user=` then orders `-created_at` (`views.py:331-334`), which a single-column `created_at` index doesn't serve for the `user=` filter. **Correction to the draft's `UserProgress` half:** the `(user, equation)` unique constraint (`:187-191`) is a *partial* index (`condition=Q(user__isnull=False)`), so it covers the `user=` filter prefix for `my_progress`/dashboard well — no new index needed there. Only the `LearningEvent` index is actionable.

**Fix:** Add `models.Index(fields=["user", "-created_at"])` to `LearningEvent.Meta`.

### M3. `AutoFitDeferredInlineMath` renders KaTeX twice + ResizeObserver + recursive MutationObserver — CONFIRMED
**File:** `frontend/src/components/math/AutoFitDeferredInlineMath.tsx:24-91`

Confirmed: two `<DeferredInlineMath>` renders (hidden measure `:77`, visible `:86`) — KaTeX builds the formula DOM twice per instance. `ResizeObserver` on both container and measure (`:51-52`) **plus** a `MutationObserver({childList, subtree, characterData})` on the measure node (`:54-62`). Each KaTeX (re)render mutates the measured subtree → fires the MutationObserver → `updateScale` → `setState`; only damped by the rounded-scale equality guard (`:39-42`). Used in the intro hook block of every equation (`TeachableEquation.tsx:507`).

**Fix:** Render the visible copy only, measure its `scrollWidth` via the `ResizeObserver`, drop the hidden duplicate and the `MutationObserver` (the effect already re-runs on `[math]`, `:68`, covering formula changes).

### M4. `enhanceRichTextNodes` rebuilds + sorts a token table and compiles a fresh RegExp per text node, per LessonRunner render — CONFIRMED
**Files:** `frontend/src/components/teaching/richText.tsx:19-90`; `frontend/src/components/teaching/LessonMarkdown.tsx:26-90`

Confirmed: `LessonMarkdown` passes `enhance` (`useCallback`, `:26-35`) into react-markdown `components`; every element renderer (`p`, `strong`, `li`, …, `:39-87`) calls `enhance` → `enhanceRichTextNodes` → per string child calls `linkTermsText` (`:42`), which calls `buildTokens` (builds + **sorts**, `:38`) and constructs a fresh `RegExp` (`:46-47`) **per text node**. The per-part match is `tokens.find(...)` (`:54`) — O(parts × tokens). LessonRunner re-renders on hint/insight/celebration state, recompiling all of this each time.

**Fix:** Hoist `buildTokens(variables, glossary)` + the compiled RegExp into a `useMemo([variables, glossary])` in `LessonMarkdown`, pass them down. Replace `tokens.find` with a `Map<lowerWord, token>`.

### M5. App-level keydown handler re-subscribes on every navigation/sidebar toggle — CONFIRMED (minor)
**File:** `frontend/src/App.tsx:247-292`

Confirmed deps (`:292`) include `selectedId` and `sidebarOpen`, both of which change frequently, so `window.removeEventListener`/`addEventListener` churns on every navigation and sidebar toggle. Not a hot loop; pure churn on a global listener.

**Fix:** Read the changing values from refs inside the handler; give the effect stable/`[]` deps so it attaches once.

### M6. `cache_page` + `vary_on_headers("Accept-Language")` on per-process `LocMemCache` — CONFIRMED, but the draft's fix has a correctness risk
**File:** `backend/courses/views.py:53-56`; cache backend default `LocMemCache` (`settings.py:226-234`).

Confirmed: `list` is decorated with `vary_on_headers("Accept-Language")` + `cache_page(60*5)`. `cache_page` keys on full path incl. query string, so `?category=`/`?locale=` already produce distinct entries; the header vary then multiplies entries by every distinct `Accept-Language` value. Default backend is per-process `LocMemCache`, so each worker holds its own copy and the cache isn't shared.

**Correction — do NOT blindly drop the header vary.** Verified `get_requested_locale` (`localization.py:51-57`) uses `?locale=` *if present*, but **falls back to the `Accept-Language` header** when it's absent (`:56`). The frontend always appends `?locale=` (`client.ts:5-9, 207-211`), so for the SPA the header vary is redundant — but `/equations/` is `AllowAny` and any direct/third-party consumer hitting it *without* `?locale=` would, after the vary is removed, be served a wrong-locale cached response. **Safe fix:** keep correctness by normalizing locale into the cache key explicitly (e.g. a `key_prefix`/custom cache-key func that includes `get_requested_locale(request)`), rather than relying on `Accept-Language` vary. For multi-worker deploys, point `DJANGO_CACHE_BACKEND` at Redis/Memcached so the cache is shared and bounded.

### M7. Redundant per-equation network fetch + wrong invalidation key — CONFIRMED
**Files:** `frontend/src/api/hooks.ts:16-25, 55-64`; `TeachableEquation.tsx:249-250`

Confirmed: `TeachableEquation` calls both `useEquation(resolvedId)` (network fetch of one equation's full payload, `:249`) and `useEquationConfig(resolvedId)` (bundled static data, `:250`); for the 17 shipped equations the static data already has variables/presets/lessons/glossary, so the fetch is redundant for first paint. Confirmed `useUpdateProgress` (`hooks.ts:55-64`) invalidates `["equations"]` (`:61`) — which is the **list** query key (`useEquations`, `:10`), not the per-equation detail key `["equation", id, lang]` (`:20`). Since progress isn't part of the equation list payload, this invalidation triggers an unnecessary list refetch. Low traffic, but pure waste.

**Fix:** Seed React Query from the static config via `initialData` so scenes paint instantly and the fetch only refreshes/localizes. Remove the `["equations"]` invalidation from `useUpdateProgress` (progress is tracked client-side via the external store).

### M8. `/equations/{id}/` (retrieve) is uncached while `list` is cached — ADDED
**File:** `backend/courses/views.py:33-56`

The `EquationViewSet` decorates only `list` with `cache_page` (`:53-54`); `retrieve` has no server-side cache. `retrieve` is the hottest per-equation read — `useEquation` calls it on **every scene open** (`hooks.ts:21` → `api.equations.get` → `/equations/{id}/`). The payload is seed-static (the full `EquationSerializer` with all translations prefetched). React Query `staleTime: 5min` caches it per client session, so the impact is bounded to cold/cross-client requests — but every such request re-runs the DB query + full serialization (incl. `prefetch_related("translations")`). Worth a short-TTL `cache_page` on `retrieve`, keyed on locale via the same mechanism as M6.

**Severity:** medium-low — mitigated by client-side React Query caching; matters under cross-user cold traffic.

---

## LOW

### L1. `upload_avatar` writes the upload synchronously on the WSGI worker — CONFIRMED
**File:** `backend/accounts/views.py:164-166` — `open(filepath,'wb+')` + `for chunk in file.chunks(): dest.write(chunk)` blocks the worker for the full (≤5 MB) write; `filepath.parent.mkdir(...)` (`:162`) hits the FS every upload. Acceptable at low volume; offload to Django storage API or ensure worker headroom if avatar uploads spike.

### L2. `search_equations` translation join fans out rows before `.distinct()` — CONFIRMED (trivial at current scale)
**File:** `backend/courses/views.py:124-134` — for non-English locales the `Q(translations__...)` filters join `EquationTranslation`, producing one row per matching translation per equation; `.distinct()` (`:134`) de-dupes after the DB materializes the cross-product. `EquationTranslation.locale` is indexed (`models.py:111`). Trivial at 17 equations / few locales; flagged for atlas growth.

### L3. `AuthProvider` boot does serial refresh → `/auth/me` before first paint of protected routes — CONFIRMED
**File:** `frontend/src/auth/AuthContext.tsx:151-165` — `boot()` (`:151`) awaits `refreshUser` → `refreshAccessToken` (`:108/131`) then `fetchMe` (`:118/138`), two sequential network calls, and `loading` gates `RequirePro` (`main.tsx:45-47`). Unavoidable for protected routes; consider rendering public content optimistically while auth resolves.

### L4. `useContainerSize` placeholder dims drive a throwaway first-frame scale build — CONFIRMED
**File:** `frontend/src/hooks/useContainerSize.ts:13,22` — defaults to `{900,440}`, only updates when `width>50 && height>50`; charts compute scales against the placeholder until the first ResizeObserver callback, then re-render + rebuild scales (compounds H3). Cosmetic, not a correctness issue.

### L5. `LiveFormula` re-runs DOM `querySelectorAll` + per-span style writes on every variable change; `<InlineMath>` unmemoized — CONFIRMED
**File:** `frontend/src/components/teaching/LiveFormula.tsx:64-77, 107` — the effect at `:64-77` (deps `[liveFormula, variables, onVariableChange, colorLookup]`) does `container.querySelectorAll("[style*='color']")` and writes `cursor`/`borderBottom` per span on every `liveFormula` change (i.e. every drag frame); `<InlineMath math={liveFormula}>` (`:107`) is not memoized so KaTeX re-parses each frame. Cheap for a small formula but per-frame. Consider memoizing the render and styling via a container CSS class.

### L6. `clearLegacyServiceWorkers()` runs on every app boot — CONFIRMED
**File:** `frontend/src/main.tsx:75-102` — invoked unconditionally at module load (`:102`); calls `getRegistrations()` (`:80`) and `caches.keys()` (`:86`) every boot, and can trigger a reload. Intentional migration cleanup; gate behind a one-time localStorage flag once the legacy SW population has churned out.

---

## Things already good (don't regress these)
- D3 scenes (`GravityScene`, `FluidScene`, `EulerPolyhedraScene`) build SVG once and animate via refs/RAF, bypassing React; clean up RAF + ResizeObserver on unmount. **EntropyScene verified safe too** — only 24 particles (`GRID_COLS*GRID_ROWS`), all `useMemo`'d (`:175,178`), bounded ghost states. **InformationScene verified safe** — its ~196-point curve renders as a single `<path>` via `buildLinePath` (`:217`), not individual nodes. ChaosScene (C1) is the *unique* large-individual-node offender.
- `useProgress`: snapshot cache + `useSyncExternalStore`, debounced sync with rollback, exponential backoff — solid.
- Route/scene code-splitting + idle prefetch of adjacent scenes (`App.tsx:301-315`) — well done.
- `bulk_sync_progress` pre-fetches equations in one `IN` query (`views.py:288-289`, M14) — N+1 already eliminated. The per-item `get_or_create`+`save` loop (`:297-310`) is one query pair per item — acceptable for localStorage-sized syncs; batch with `bulk_create(update_conflicts=True)` only if syncs grow.

---

## Recommended next steps (priority order)
1. **C1** — ChaosScene 9,212 nodes → single `<path>`/canvas for the static cloud **and** wrap `ChaosChart` in `React.memo`. Biggest user-facing win, isolated. (Confirmed 9,212 exact.)
2. **H1** — subclass `JWTAuthentication.get_user` with `select_related("profile")`. One change, removes a query from 100% of authenticated traffic.
3. **H3** — destructure domain primitives in `useChartFrame` memo deps. Trivial; compounds with C1.
4. **H2 / M7** — drop the eager 37 KB `equations.json` from the per-equation render path; seed React Query via `initialData`. Bundle + first-view win.
5. **M3, M4, M1** — KaTeX double-render, per-node regex rebuild, dashboard query collapse + static-count caching.
6. **M2 (`LearningEvent` `(user, -created_at)` index), M6 (locale cache-key, not header-vary drop), M8 (cache `retrieve`)** — backend hardening for cross-user/scaled traffic.

All checks were read-only (Read/Grep/parse only); no files were modified and no mutating commands were run.
