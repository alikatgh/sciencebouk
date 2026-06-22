---
title: Performance Audit (Verified) — sciencebouk Round 6
repo: sciencebouk
lens: performance
date: 2026-06-14
round: 6
---

Code-splitting and idle prefetch confirmed (`App.tsx:38-40, 306-308`, `sceneRegistry.ts:50`). The "already good" claims hold.

I have verified every finding. The draft is accurate and well-grounded. My corrections: a handful of minor line-number imprecisions, one partially-incorrect fix recommendation in M8 (the colored-span styling can't be a fully static CSS class), and a note that ChaosScene's `buildLessons(lessonCopy)` + `variables` array (re-created/re-run each `ChaosScene` render) is a minor additional finding but bounded because `TeachableEquation` owns the hot `vars` state, not `ChaosScene`. Here is the final verified report.

---

# Performance Audit (Verified) — sciencebouk (Django REST backend + Vite/React/TS frontend)

Read-only audit. Every finding below was independently re-verified against current source (Read/Grep only; no files modified, no mutating commands run). The draft report was accurate on substance; corrections are limited to a few line-number imprecisions and one partially-wrong fix detail (M8), all noted inline. No findings were removed as false positives.

This codebase is genuinely performance-aware: D3 scenes animate via refs/RAF and bypass React reconciliation; routes and scenes are code-split (`main.tsx:10-16`, `App.tsx:27`) with `requestIdleCallback` prefetch of adjacent scenes (`App.tsx:38-40, 306-308`); React Query uses `staleTime`; `bulk_sync_progress` pre-fetches equations in one `IN` query (`views.py:288-289`, no N+1). Prior performance audit at `docs/audits/2026-06-14-r3-sciencebouk-performance.md` exists; open findings re-verified as still present. **(re-confirmed)** = carried from prior round and re-verified; **(new)** = net-new this round.

---

## CRITICAL

### C1. ChaosScene renders exactly 9,212 React-managed `<circle>` nodes, reconciled on every slider/badge update **(re-confirmed — verified)**
**File:** `frontend/src/components/scenes/ChaosScene.tsx:150-162` (data build), `:263-272` (render), `:108` (`ChaosChart` is a plain function, NOT memoized).

Verified the count exactly: outer loop `for rVal=2.5; rVal<=4.0; rVal+=0.008` = **188 r-steps**; inner loop keeps `i` in `251..299` = **49 points/step**; 188 × 49 = **9,212 points**. `bifurcationData` is correctly `useMemo([])` (static), but each point is emitted as an individual `<circle>` (`:263-272`). `ChaosChart({r,x0})` is **not** `React.memo` (grep confirms zero `memo(` in the file), and its props come from `vars` in `TeachableEquation` via `children({vars,setVar,...})` (`TeachableEquation.tsx:667`). Every change to `r`/`x0` re-runs `bifurcationData.map(...)` → 9,212 vnodes diffed. Dominant jank source.

**Fix:** Render the static dot cloud as a single `<path>` (move-to dots) or to an offscreen canvas/`<image>`, computed once from `bifurcationData`; keep only the red `r`-indicator line (`:273-281`) and the 60-point time series reactive. Wrap `ChaosChart` in `React.memo`. `InformationScene.tsx:217` already uses the single-`<path>` pattern. Decimating ~9,212 → ~1,500 deduped points is a further win (heavy over-plot on a ~400px chart).

---

## HIGH

### H1. N+1: every authenticated request issues a second query for `request.user.profile` **(re-confirmed — verified, line citations corrected)**
**Profile reads (verified):** `backend/courses/views.py:219, 238, 271, 323, 376`; `backend/payments/views.py:43, 85, 106` (draft cited 41/83/104 — those are the `hasattr` guard lines one above each read); `backend/accounts/views.py:136, 170, 181` (draft omitted `:170`). Auth registered plainly at `settings.py:131-132` (`rest_framework_simplejwt.authentication.JWTAuthentication`); its `get_user` does `User.objects.get(...)` with no `select_related`.

`UserSerializer` embeds `ProfileSerializer` (`accounts/serializers.py:24`), so `/auth/me/`, login, register, google_auth all fire the extra profile query, and every Pro-gated endpoint reads `request.user.profile.tier`/`.is_pro` — a second SELECT on 100% of authenticated traffic.

**Fix:** Subclass `JWTAuthentication`, override `get_user` to `select_related("profile")`, register the subclass in `DEFAULT_AUTHENTICATION_CLASSES`.

### H2. Full 37 KB `equations.json` (17 equations) statically bundled into the per-scene `TeachableEquation` chunk **(re-confirmed — verified)**
**Chain (verified):** `frontend/src/data/equations.ts:1` (`import rawData from "./equations.json"`) → `frontend/src/data/equationConfig.ts` (static imports) → `TeachableEquation.tsx:22` (static `import { useEquationConfig }`). File is 37 KB / 17 equations. Loads on every scene open. Duplicates the runtime path — `TeachableEquation.tsx:249` already calls `useEquation(resolvedId)` to fetch that one equation from the API; the JSON only serves as the offline/pre-API fallback.

**Fix:** Seed React Query from the static config via `initialData` (instant first paint, then network refresh), or split the JSON per-equation and dynamic-import by id.

### H3. `useChartFrame` rebuilds all D3 scales + coordinate mappers every render — `useMemo`/`useCallback` defeated by array-reference deps **(re-confirmed — verified)**
**File:** `frontend/src/components/charts/simpleChart.ts:63-66` (xScale), `:67-70` (yScale), `:71-74` (y2Scale), `:76-82` (clientXToX), `:84-91` (clientYToY). Call sites pass fresh array literals each render: `ChaosScene.tsx:114-115, 120-121`, `InformationScene.tsx`, `BlackScholesScene.tsx`, `NormalDistributionScene.tsx`, `CalculusScene.tsx` (grep-confirmed pattern across scenes).

`xScale = useMemo(() => scaleLinear().domain(xDomain)..., [plotLeft, plotRight, xDomain])` — `xDomain` is a new array reference each render, so the dep check always misses and every scale/mapper rebuilds. In `ChaosChart` this compounds C1.

**Fix:** Destructure to primitives: `const [x0,x1]=xDomain; const xScale=useMemo(()=>scaleLinear().domain([x0,x1]).range([plotLeft,plotRight]),[x0,x1,plotLeft,plotRight])`. Apply to all five memos/callbacks.

---

## MEDIUM

### M1. `learning_dashboard` issues 7 uncached queries per load; seed-invariant counts recomputed every request **(re-confirmed — verified)**
**File:** `backend/courses/views.py:318-369`. Seven round-trips verified: (1) completed `.count()` `:327`; (2) `Sum` aggregate `:328`; (3) 100-row `LearningEvent` timestamp pull `:331-334`; (4) `values_list` of completed ids `:344-346`; (5) `category_stats` annotate `:347-350`; (6) `exclude(...).first()` `:357`; (7) `Equation.objects.count()` `:361`. `totalEquations` (#7) and per-category totals (within #5) are seed-invariant constants recomputed every hit.

**Fix:** Collapse #1+#2 into one aggregate (`progress.aggregate(completed=Count('id', filter=Q(completed=True)), total=Sum('time_spent_seconds'))`). Cache `totalEquations` + per-category totals in `CACHES` default keyed on a seed-version. The `filter=Q(id__in=completed_equation_ids)` at `:349` inlines the id list into SQL — fine at 17 rows.

### M2. Missing composite index for the streak query **(re-confirmed — verified)**
**File:** `backend/courses/models.py:203-219` (`LearningEvent`). Verified: `created_at` has `db_index=True` **alone** (`:212`); `Meta` (`:214-215`) has only `ordering=["-created_at"]`, **no** `indexes`. The streak query filters `user=` then orders `-created_at` (`views.py:331-334`); a single-column `created_at` index doesn't serve a `user=`-filtered, `created_at`-ordered scan. (The `UserProgress` `(user, equation)` partial unique index at `models.py:187-191` already covers the `user=` prefix for `my_progress`/dashboard — verified — so no new index needed there.)

**Fix:** Add `models.Index(fields=["user", "-created_at"])` to `LearningEvent.Meta.indexes`.

### M3. `AutoFitDeferredInlineMath` renders KaTeX twice + ResizeObserver + recursive MutationObserver **(re-confirmed — verified)**
**File:** `frontend/src/components/math/AutoFitDeferredInlineMath.tsx:24-91`. Verified: renders `<DeferredInlineMath>` twice (hidden measure copy `:77`, visible `:86`); observes the measure/container with a `ResizeObserver` (`:47-52`) AND a `MutationObserver({childList, subtree, characterData})` (`:54-62`). Each KaTeX render mutates the subtree → fires the MutationObserver → `updateScale` → `setState`, damped only by the rounded-scale equality guard (`:39-42`). Mounted in the intro hook block (`TeachableEquation.tsx:507`), which is gated by `appSettings.showHookText` (so it's "every equation" only when that setting is on — default-on).

**Fix:** Render the visible copy only, measure its `scrollWidth` via the `ResizeObserver`, and drop both the hidden duplicate and the `MutationObserver` (the effect already re-runs on `[math]`).

### M4. `enhanceRichTextNodes`/`linkTermsText` rebuilds + sorts a token table and compiles a fresh `RegExp` per text node, per render **(re-confirmed — verified)**
**Files:** `frontend/src/components/teaching/richText.tsx:19-90`; `LessonMarkdown.tsx`. Verified: `linkTermsText` (`:42`) calls `buildTokens` (builds **and** `tokens.sort(...)` `:38`) per call, constructs a new `RegExp` per text node (`:46`), and does an O(parts × tokens) `tokens.find(...)` (`:53`). `LessonMarkdown` passes `enhance` into every react-markdown element renderer; LessonRunner re-renders on hint/insight/celebration state, recompiling all of it.

**Fix:** Hoist `buildTokens(variables, glossary)` + the compiled RegExp into `useMemo([variables, glossary])` in `LessonMarkdown` and pass them down; replace `tokens.find` with a `Map<lowerWord, token>`.

### M5. `cache_page` on per-process `LocMemCache` with `Accept-Language` vary — low hit rate + key explosion **(re-confirmed — verified)**
**File:** `backend/courses/views.py:53-54`; cache backend `settings.py:226-234` (default `LocMemCache`, env-overridable via `DJANGO_CACHE_BACKEND`). Verified: `list` decorated with `cache_page(60*5)` + `vary_on_headers("Accept-Language")`. `cache_page` keys on full path incl. query string (so `?locale=`/`?category=` already split entries); the header vary then multiplies entries per distinct `Accept-Language` string. `LocMemCache` is per-process → each worker holds its own copy, low hit rate under multiple workers. Verified the caveat: `get_requested_locale` (`localization.py:51-57`) falls back to `Accept-Language` when `?locale=` is absent — so do **not** simply drop the header vary (a caller without `?locale=` would get a wrong-locale cached body).

**Fix:** Replace the header vary with an explicit cache key folding in `get_requested_locale(request)`. For multi-worker deploys, point `DJANGO_CACHE_BACKEND` at Redis/Memcached.

### M6. `/equations/{id}/` (retrieve) is uncached while `list` is cached **(re-confirmed — verified)**
**File:** `backend/courses/views.py:33-56`. Verified: only `list` is decorated (`:53-54`); `retrieve` (served via `get_serializer_class` returning the heavier `EquationSerializer` `:43-45`) has no `cache_page`. `useEquation` (`hooks.ts:16-25`) hits it on every scene open. React Query `staleTime: 5min` bounds impact to cold/cross-client requests, each re-running the query + full serialization with `prefetch_related("translations")`.

**Fix:** Add short-TTL `cache_page` to `retrieve`, locale-keyed via the M5 mechanism.

### M7. Redundant per-equation network fetch + wrong React Query invalidation key **(re-confirmed — verified)**
**Files:** `frontend/src/api/hooks.ts:16-25` (`useEquation`, key `["equation", id, lang]`), `:55-64` (`useUpdateProgress`); `TeachableEquation.tsx:249-250`. Verified: `TeachableEquation` calls both `useEquation(resolvedId)` (network, `:249`) and `useEquationConfig(resolvedId)` (bundled static, `:250`); for the 17 shipped equations the static data already has the full payload, so the fetch is redundant for first paint. Separately, `useUpdateProgress.onSuccess` invalidates `["equations"]` — the **list** key (`hooks.ts:61`) — not the detail key `["equation", id, lang]`; progress isn't in the equation payload, so this is a pointless list refetch.

**Fix:** Seed `useEquation` from static config via `initialData`; remove the `["equations"]` invalidation (progress is client-side via the external store).

### M8. Slider drag re-renders KaTeX (`InlineMath`) on every pointer-move tick **(new — generalizes prior L5; line citations corrected, one fix detail corrected)**
**Files:** `frontend/src/components/teaching/TouchableFormula.tsx:135` (`onValueChange={([v]) => onChange(variable.name, v)}` per tick), `:157` (`interactiveVars = variables.filter(...)` every render); `LiveFormula.tsx:101, 107, 141` (three unmemoized `<InlineMath>`; draft cited 101/106/142 — verified actual lines are **101, 107, 141**), `:64-77` (per-render `querySelectorAll("[style*='color']")` with `liveFormula` in deps); `TeachableEquation.tsx:308` (`setVar`), `:475-477` (`liveFormula` `useMemo` on `[..., vars]`).

Verified the chain: unlike D3 scenes (which only call `onVarChange` on drag *end*), the slider control calls `onChange` on every `onValueChange`. That updates `vars` → `liveFormula` recomputes → `LiveFormula` re-renders → `react-katex` `InlineMath` re-parses the LaTeX each drag frame. `LiveFormula`'s cursor-styling effect (`:64-77`) also re-runs `querySelectorAll` + per-span writes each tick. Neither `LiveFormula`, `SliderRow`, nor `InlineMath` is memoized.

**Fix:** Wrap each `InlineMath` in a `memo` keyed on its `math` string; `requestAnimationFrame`-coalesce slider `onChange` to one update/frame; memoize `SliderRow` and the `interactiveVars` filter. **Correction to draft:** the colored-span cursor/border styling (`:68-75`) cannot be a fully static CSS class — it applies only to spans whose color matches an interactive (non-`constant`, non-`locked`) variable via `colorLookup`. Better: keep the effect but gate it so it only runs when the *set of interactive variables* changes (not on every `liveFormula` tick), e.g. depend on a stable key derived from interactive var names/colors rather than `liveFormula`.

### M9. `App`-level global keydown handler re-subscribes on every navigation and sidebar toggle **(re-confirmed — verified)**
**File:** `frontend/src/App.tsx:248-292`. Verified: effect deps (`:292`) include `selectedId` and `sidebarOpen`, both of which change often → the window `keydown` listener is removed/re-added on every navigation and sidebar toggle. Not a hot loop, but pure churn.

**Fix:** Read changing values from refs inside the handler; give the effect stable `[]` deps so it attaches once.

---

## LOW

### L1. Orphaned components keep `framer-motion` (~5.5 MB on disk) as a dependency for zero runtime benefit **(new — verified)**
**Files:** `frontend/src/components/InteractiveEquation.tsx:3` (sole importer of `framer-motion` in the whole `src` tree — grep-confirmed), `frontend/src/components/PythagoreanTheoremExplorer.tsx`. Grep confirms **neither file is imported by any route, component, or test** — only self-references. Tree-shaking keeps them out of the production bundle (unreachable), so no shipped-bytes regression today — but `framer-motion` stays in `package.json`/`node_modules` (`node_modules/framer-motion` is 5.5 MB) purely for dead code (install/CI/audit surface + latent bundle-bloat the moment anything imports these files).

**Fix:** Delete the two orphaned files and drop `framer-motion` from `package.json` (verify no remaining importer first; confirmed there is none). `react-katex`/`d3-*` still have live consumers — leave them.

### L2. Full `d3` meta-package declared as a dependency though only granular `d3-*` submodules are imported **(new — verified)**
**File:** `frontend/package.json` (`"d3": "^7.9.0"`). Grep confirms **no** `import ... from "d3"` anywhere; only submodules are imported: `d3-array`, `d3-drag`, `d3-scale`, `d3-selection`, `d3-shape`. `node_modules/d3` is 868 KB and drags in unused submodules. `vite.config.ts:38` even lists `d3-transition` in `manualChunks` though it's only a transitive dep of full `d3`. Not in the shipped bundle today, but an unnecessary direct dependency + accidental-`from "d3"` risk.

**Fix:** Remove `"d3"` from `dependencies`; declare only the imported submodules (`d3-array`, `d3-drag`, `d3-scale`, `d3-selection`, `d3-shape`). Add `d3-transition` explicitly only if a chunk truly needs it (it's currently referenced in `manualChunks`).

### L3. `upload_avatar` writes the upload synchronously on the WSGI worker **(re-confirmed — verified)**
**File:** `backend/accounts/views.py:162` (`filepath.parent.mkdir(...)`), `:164-166` (`with open(...,'wb+')` + `for chunk in file.chunks(): dest.write(chunk)`). Blocks the worker for the full (<=5 MB) write. Acceptable at low volume; move to Django storage API / a queued path, or ensure worker headroom if avatar uploads spike.

### L4. `search_equations` translation join fans out rows before `.distinct()` **(re-confirmed — verified)**
**File:** `backend/courses/views.py:124-134`. For non-English locales the `Q(translations__...)` filters (`:128-132`) join `EquationTranslation`, producing one row per matching translation per equation; `.distinct()` (`:134`) de-dupes after the DB materializes the cross-product. Trivial at 17 equations; flagged for atlas growth.

### L5. `useContainerSize` placeholder dimensions force a throwaway first-frame scale build **(re-confirmed — verified)**
**File:** `frontend/src/hooks/useContainerSize.ts:13` (init `{900,440}`), `:22` (updates only when `width>50 && height>50`). Charts compute scales against the placeholder until the first `ResizeObserver` callback, then re-render and rebuild scales (compounds H3). Cosmetic.

### L6. `clearLegacyServiceWorkers()` runs on every app boot **(re-confirmed — verified)**
**File:** `frontend/src/main.tsx` — `void clearLegacyServiceWorkers()` invoked unconditionally at module load; calls `navigator.serviceWorker.getRegistrations()` and `caches.keys()` on every boot and can trigger `window.location.reload()`. Note: there is already a `sessionStorage` reload-loop guard (`__sciencebo_service_worker_reset__`), but not a "skip the whole check" flag — the registration/cache scan still runs every boot.

**Fix:** Gate the whole function behind a one-time `localStorage` flag once the legacy SW population has churned out.

### L7. `AuthProvider` boot does serial refresh → `/auth/me` before protected routes paint **(re-confirmed — verified)**
**File:** `frontend/src/auth/AuthContext.tsx:148-165` — `boot()` awaits `refreshUser` (→ `refreshAccessToken` then `fetchMe`, two sequential calls), and `loading` gates `RequirePro` (`main.tsx:44-47`). Largely unavoidable for protected routes; consider rendering public content optimistically while auth resolves.

---

## Things already good (verified — do not regress)
- D3 scenes (`WaveScene`, `GravityScene`, `FluidScene`, `EulerPolyhedraScene`, etc.) build SVG once and animate via refs/RAF, syncing React only on drag end. `InformationScene` renders its curve as a single `<path>` (`:217`). ChaosScene (C1) is the unique large-individual-node offender.
- `useProgress`: `useSyncExternalStore` + version-keyed snapshot cache, debounced sync with optimistic rollback, exponential backoff.
- Route + scene code-splitting (`main.tsx:10-16`, `App.tsx:27`) with `requestIdleCallback` prefetch of adjacent scenes (`App.tsx:38-40, 306-308`).
- `bulk_sync_progress` pre-fetches equations in one `IN` query (`views.py:288-289`) — N+1 already eliminated. d3/lucide/katex imported via tree-shakeable submodule imports; `manualChunks` split is reasonable.

---

## Recommended next steps (priority order)
1. **C1** — ChaosScene 9,212 `<circle>` → single `<path>`/canvas + `React.memo(ChaosChart)`. Biggest user-facing win.
2. **H1** — `JWTAuthentication.get_user` with `select_related("profile")`. Removes a query from 100% of authenticated traffic.
3. **H3 + M8** — destructure domain primitives in `useChartFrame`; memoize each `InlineMath` and rAF-coalesce slider `onChange`; gate LiveFormula's colored-span effect on interactive-var identity, not `liveFormula`.
4. **H2 / M7** — drop the eager 37 KB `equations.json` from the per-equation render path; seed React Query via `initialData`; fix the `useUpdateProgress` invalidation key.
5. **M1, M3, M4** — dashboard query collapse + static-count caching; KaTeX double-render; per-node regex/token-table rebuild.
6. **M2, M5, M6** — `LearningEvent (user, -created_at)` index; locale-aware cache key (not header vary); cache `retrieve`.
7. **L1, L2** — delete orphaned `InteractiveEquation`/`PythagoreanTheoremExplorer` and drop `framer-motion`; replace the full `d3` dep with the imported submodules.

Verification method: all checks read-only (Read/Grep/parse + arithmetic on the bifurcation loop). No files modified, no mutating commands run. Net change vs. draft: substance fully confirmed; corrected line numbers for H1 (payments `:43,85,106`; accounts add `:170`) and M8 (`LiveFormula.tsx:101,107,141`), corrected M8's "static CSS class" fix detail, and noted M3/L6 conditional/guarded nuances. No false positives found; no new high-value findings beyond the draft (the only candidate — `ChaosScene` re-running `buildLessons`/recreating `variables` each render — is bounded because the hot `vars` state lives in `TeachableEquation`, not `ChaosScene`, so it is not worth flagging above L-tier).
