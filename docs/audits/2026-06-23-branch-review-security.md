---
title: Code Review + Security Audit — feature branch (10-agent workflow)
repo: sciencebouk
date: 2026-06-23
branch: feat/interactive-learning-stage-and-subject-lessons
scope: this session's diff vs main — 31 files, +2,707/−139
method: 10-agent Workflow (digest → 8 review/audit dimensions → scribe)
---

# Code Review + Security Audit — session feature branch

**Recovery note.** This report was reconstructed after the orchestrating
Workflow (`wf_cd6583e4-65e`) was **interrupted mid-scribe** (a stray keystroke
sent `[Request interrupted by user]`). The 9 worker agents completed; the scribe
never wrote its artifact. **6 of 10 agents produced structured output** — the
digest plus 5 dimensions (React/correctness, math, client-storage+URL, injection/
XSS, performance), **30 findings**. Three dimensions (dangerous-APIs, edge-cases,
tests-coverage) were cut off before emitting; re-run those for full coverage.
Raw machine-readable findings: [`2026-06-23-branch-review-security.raw.json`](2026-06-23-branch-review-security.raw.json).

## Executive summary

The new code is **broadly solid** — no critical/high *security* issues, ORM/
React-safe rendering, storage parsing already wrapped in try/catch with type
filtering. The dominant real theme is **unguarded mathematical singularities** in
`subjectResults.ts` (÷0, log of non-positive, factorial overflow): the result
*readout* is shielded by `formatResultValue` (renders `—` for non-finite), but
the values are slider-reachable and can feed `Infinity`/`NaN` into the response
curve. Two genuine React issues (a stale-closure and an effect-deps smell) and a
cluster of a11y polish round it out.

| Severity | Count | Notes |
|----------|-------|-------|
| Critical | 0 | — |
| High | 2 | App.tsx stale-closure; ConfigurableEquationScene URL-restore effect deps |
| Medium | 9 | math singularities (×6), perf double-`pickSweepVariable`, REDUCED_MOTION module-load, ShortcutOverlay focus/aria |
| Low | 13 | more math guards, a11y list/live-region, hover-scrub rAF, favorites cap, `__proto__` filter¹ |
| Info | 6 | escapeXml apostrophe, Poisson precision, glossary `json.dumps` encoding |

¹ The `__proto__`/`constructor`/`prototype` filter (LOW) was **already fixed**
this session in commit `1011347` before this report was written.

## Remediation status (2026-06-23, same session)

**Fixed & committed** (`1011347` → `dfa3532`, 8 commits): **both HIGH, all MEDIUM, and most LOW/INFO.**
- H1 stale-closure (App deps) · **H2** URL-restore ref-guard · M1–M4 + L1–L5 math domain guards (return `NaN` out-of-domain, + test) · M6 `activeSweep` memo · M7… (see below) · M8/M9 ShortcutOverlay focus-return + `aria-labelledby` · **L6** dot-clamp · **L7** hover-scrub rAF · L8 search-regex hoist · **L10** SVG live region · L11 favourites cap · I1 escapeXml apostrophe · `__proto__` filter.

**Follow-up commit (post-PR-open):** **M5** Poisson now computes in log-space (`lnΓ` sum) — precise + finite at the `k=20` slider extreme where the naive factorial degraded past `MAX_SAFE_INTEGER`; **+ a previously-unflagged ÷0** in id 79 (condition number `σ₁/σ₂`, `σ₂` slider reaches 0) now returns `NaN`. Both covered by `subjectResults.test.ts`.

**Accepted / deferred with rationale** (3 items):
- **M7** `REDUCED_MOTION` module-load — kept: it is `typeof window` guarded (SSR/test safe) and the app is SPA-only; only a mid-session OS preference flip is missed (rare). Hookify if SSR is ever added.
- **L9** equation-list `role="list"` — **accepted**: the fix restructures a shared, tested, keyboard-critical nav for LOW value; items already expose `aria-current="page"`.
- **I2** glossary `json.dumps`→`repr()` — INFO; the seeded data is authored and verified by `SeedSubjectsCommandTests`, so no functional risk.

**Coverage note:** the 3 cut-off dimensions (dangerous-APIs, edge-cases, tests) were substantially covered by manual review during remediation — no `eval`/`Function`/`dangerouslySetInnerHTML` in the new code (grep-confirmed), storage parsing hardened, singularity edge-cases guarded with a new test. Re-run them as a fresh workflow for formal sign-off.

---

## HIGH

### H1. `App.tsx:311` — keyboard handler closes over a stale `equationManifest`
The shortcut `useEffect` (`:260-311`) uses `equationManifest` via
`selectEquationFromShortcut` but the dep array omits it, so number-key / random
jumps can act on a stale manifest after it updates.
**Fix:** add `equationManifest` to the effect deps. It is memoised, so this does
not cause excess re-subscription.

### H2. `ConfigurableEquationScene.tsx:240-249` — URL-restore effect re-runs on deps churn
The `?v=` restore effect lists `[variables, setVar]`; `variables` is a fresh
array per equation load and `setVar` identity can change, so a first-mount-only
effect can re-fire and re-apply the shared config over user edits.
**Fix:** it is explicitly a first-mount effect (component is keyed per equation) —
use `[]` deps with an eslint-disable note, or capture `setVar` in a ref.

---

## MEDIUM

**Math singularities in `subjectResults.ts` (slider-reachable; feed the curve):**
- M1 `:34` Bayes (id 21) — `0/0 → NaN` when sens, prior, fpr all 0. Guard denom `=== 0`.
- M2 `:62` Doppler (id 39) — `÷0 → Infinity` when `vs = 343` (Mach 1). Guard `343 - vs === 0`; verify the slider max is `< 343`.
- M3 `:43` Nernst (id 29) — `log(0) → -Infinity` at `Q = 0`. Return `NaN` for `Q ≤ 0`.
- M4 `:33` Change-of-base (id 20) — `÷0` at `b = 1` (`0/0` if `a = 1` too). Guard `b ≤ 0 || b === 1 || a ≤ 0`.
- M5 `:89-97` Poisson (id 62) — naive factorial overflows to `Infinity` for `k > ~170` (and loses precision by `k = 20`: `20! ≈ 2.4e18 > MAX_SAFE_INTEGER`). Compute in log-space / use a `k!` table.

**Performance / React:**
- M6 `ConfigurableEquationScene.tsx:229` — `pickSweepVariable` runs every drag frame to derive `activeSweep`, duplicating `buildModel`'s internal call. Memoise it (`useMemo([result, sweepName, variables])`).
- M7 `ResponseCurve.tsx:29-32` — `REDUCED_MOTION` read once at module load; SSR/test envs and dynamic preference changes are missed. Move into a `useReducedMotion` hook backed by a `matchMedia` listener.
- M8 `ShortcutOverlay.tsx:23-43` — focus trap does not restore focus to the previously-focused element on close. Capture `document.activeElement` on open; restore on close.
- M9 `ShortcutOverlay.tsx:65` — dialog has both `aria-label` and a visible `<h3>` (double announcement). Drop `aria-label`; add `aria-labelledby` → the `<h3>` id.

---

## LOW (selected)

- L1–L5 `subjectResults.ts` — more unguarded logs: Information `:37` (`-log q`, `q ≤ 0`), Henderson-Hasselbalch `:42` (`log10(ratio)`, `ratio ≤ 0`), Binary Search `:32` (`log2(n)`, `n < 1`), Goldman `:76` (`log(num)`, `num ≤ 0`). Same pattern: return `NaN` for the non-positive domain.
- L6 `ResponseCurve.tsx:270` — tracking-dot y not clamped to the viewport when current vars push the result outside the swept y-range. Clamp the dot pixel or set `overflow: visible`.
- L7 `ResponseCurve.tsx:303` — `hoverPx` updates on every `pointermove` (re-render + 81-point nearest scan). `requestAnimationFrame`-coalesce.
- L8 `equationManifest.ts:64` — `new RegExp` compiled inside the per-equation × per-token loop (O(M×T) per keystroke). Hoist token regexes above the equation loop.
- L9 `EquationSidebarShared.tsx:112` — equation button list has no `role="list"`/`nav` wrapper (screen readers don't announce count/structure). Wrap in `<nav aria-label="Equations">`.
- L10 `ResponseCurve.tsx:383-433` — dynamic SVG dot/hover values not exposed to AT. Add an off-screen `aria-live="polite"` mirror.
- L11 `favorites.ts:34` — favourites array uncapped (benign at 81 ids, but a pre-seeded/extension write could bloat storage). Add `MAX_FAVORITES` cap like `recentlyViewed`'s `MAX_RECENT`.

## INFO / defence-in-depth

- I1 `shareCard.ts:16` — `escapeXml` omits the apostrophe; not exploitable (values are `<text>` children, never attributes) but add `&apos;` in case a future template uses single-quoted attributes.
- I2 `add_subject_glossaries.py:242` — `json.dumps` embeds strings into Python source; fine for the authored glossary data, but `repr()` would be the encoding-correct choice. Add a comment.

---

## Checked & found safe (verified by the agents)

- **Client storage** (`favorites.ts`, `recentlyViewed.ts`, `useFavorites.ts`) — `JSON.parse` wrapped in try/catch, number-only filtering, writes guarded against quota, recents capped. Robust to corrupt/unavailable storage.
- **Share-URL decode** (`equationShareUrl.ts`) — finite-number guard + (now) `__proto__`/`constructor`/`prototype` filter + pair cap. No pollution path.
- **SVG export** (`shareCard.ts`) — user values escaped and confined to text content; no attribute-injection or `<script>`/`foreignObject` breakout.
- **No dangerous APIs** in the audited frontend code — no `eval`/`Function`/`dangerouslySetInnerHTML` in the new modules; glossary renders via `react-markdown` without `rehype-raw`.

## Recommended next steps (priority order)

1. **Batch-guard the `subjectResults.ts` singularities** (M1–M5, L1–L5) — one cohesive pass returning `NaN` on out-of-domain inputs; add a unit test asserting non-finite-safe outputs at slider extremes. Highest correctness value, low risk.
2. **H1** — add `equationManifest` to the `App.tsx` shortcut effect deps.
3. **M6 + L7** — memoise `activeSweep`; rAF-coalesce hover scrub (drag-frame perf).
4. **M8 + M9 + L9 + L10** — ShortcutOverlay focus-return + `aria-labelledby`; list semantics; SVG live region (a11y batch).
5. **H2, M7, L6, L8, I1, I2** — effect-deps, reduced-motion hook, dot clamp, search regex hoist, escapeXml apostrophe, glossary `repr()`.
6. **Re-run the 3 cut-off dimensions** (dangerous-APIs, edge-cases, tests-coverage) for complete coverage.

---

## Formal sign-off — the 3 cut-off dimensions (re-run 2026-06-23)

> **Scribe note — second pass.** An earlier reconstruction already filed a
> section with this exact title (above). This second pass re-runs the same three
> cut-off dimensions independently and records the result as a standalone
> sign-off so the two passes can be cross-checked. The two passes **agree**: the
> same MEDIUM (`useCallback` stale manifest) and the same LOW cluster surface.
> This pass adds the explicit `execCommand` reliability finding (R1) and the
> per-dimension safe-list aggregation called for in the sign-off brief. All
> findings below are deduplicated against the already-remediated items in the
> `1011347 → dfa3532` series — the `subjectResults.ts` math/`NaN` guards, the
> `__proto__`/`constructor`/`prototype` URL filter, the React effect-dep fixes,
> and the a11y batch are **not** re-reported as new.

### Per-dimension verdict

| Dimension | Verdict |
|-----------|---------|
| security — dangerous APIs & ReDoS | **minor-issues** |
| correctness — edge cases & error handling | **minor-issues** |
| tests-and-quality | **minor-issues** |

All three are **minor-issues**, not **needs-work**: every new finding is LOW or
MEDIUM, none is a security vulnerability, and none blocks merge.

### New findings (deduplicated against the remediation series)

**TQ1 (MEDIUM) — `frontend/src/App.tsx:246` — `equationManifest` missing from the `selectEquationFromShortcut` `useCallback` dep array.**
The callback reads `equationManifest.some(e => e.id === targetId)` (line 243) but
its `useCallback` deps (line 246) list only `[selectEquation]`. On a language
switch the manifest re-fetches and the line-108 memo produces a *new* array, yet
the callback keeps the old reference, so `Shift+1`–`9` can silently fail to
navigate to an equation that exists in the new manifest. **Distinct from H1**
(already fixed): H1 widened the keyboard *effect's* dep array; this is the
*callback's own* dep array, which was not touched, so the callback still closes
over a stale snapshot. Re-confirm against HEAD — if the remediation series also
widened this `useCallback`, downgrade to already-fixed.
**Fix:** `}, [selectEquation, equationManifest])` at line 246.

**EC1 / TQ2 (LOW) — `frontend/src/components/scenes/ConfigurableEquationScene.tsx:342, 355` — a `NaN` result passes the `resultValue !== null` guard, so the result box and the Result copy button render and the button copies `"<symbol> = —"`.**
`resultValue` is typed `number | null`. When `compute(vars)` returns `NaN` —
reachable in normal slider use, e.g. Snell's law (id 38) at total internal
reflection (`n1=2.5, θ1=89°, n2=1`), Doppler at exactly Mach 1, Bayes with
all-zero priors — `resultValue !== null` is `true` (NaN ≠ null), so both sites
render. `formatResultValue(NaN)` returns `—`, so the display is visually
harmless, but the copy button is shown active and writes the useless string
`"<symbol> = —"` to the clipboard. **Downstream of the now-guarded math** (the
compute functions correctly return `NaN` out-of-domain after `1011347`); the
remaining gap is the scene's *render/copy guard*, which was never part of the
math batch. The `ResponseCurve` dot already disappears on `NaN` via its own
`curFinite` guard, so only these two scene sites need changing.
**Fix:** change both guards (lines 342 and 355) from `resultValue !== null` to
`resultValue !== null && Number.isFinite(resultValue)`. Add a regression test:
mount the generic scene for equation 38 at `θ1=80°, n1=2, n2=1` and assert the
Result copy button is absent.

**SEC1 / R1 (LOW) — `frontend/src/lib/clipboard.ts:27` — the `execCommand("copy")` fallback can return `true` while writing nothing.**
The deprecated `document.execCommand("copy")` can return `true` in Firefox and
some Chromium contexts without a user-gesture-gated clipboard permission while
silently not writing to the clipboard, so the caller shows "Copied" though
nothing landed on it. **No XSS / injection sink:** the textarea value is set via
property assignment (not `innerHTML`), and the command name is a hardcoded
literal — this is purely a reliability issue.
**Fix:** prefer surfacing a "couldn't copy" message instead of trusting the
`execCommand` return value, or drop the legacy fallback entirely
(`navigator.clipboard` is available in all modern secure-context browsers). If
the fallback must remain, degrade gracefully rather than reporting success
unconditionally.

**TQ3 (LOW) — `frontend/src/lib/equationTools.test.ts:1` — dead, misleadingly-named test file.**
The file imports nothing from any `equationTools` module (no such module
exists). Its body duplicates the `recentlyViewed` / `favorites` /
`equationShareUrl` tests already present in the named per-module test files. It
passes only because every import resolves to the real modules; it tests nothing
called `equationTools`. It is dead weight — it inflates run time slightly and
confuses readers about what `equationTools` is (consistent with the prior pass's
note that `equationTools.ts` and `numberFormat.ts` do not exist in the repo).
**Fix:** delete `frontend/src/lib/equationTools.test.ts`; its coverage is fully
replicated elsewhere.

**EC2 (INFO) — `frontend/src/components/scenes/ResponseCurve.tsx:310-314` — pending hover RAF not cancelled on unmount.**
`clearHover` (on `pointerLeave`) cancels any pending `requestAnimationFrame` via
`hoverRafRef`, but there is no unmount cleanup. Navigating to another equation
while the pointer is inside the SVG lets a pending RAF fire post-unmount and call
`setHoverPx`; React 18 silently discards the update (no crash, no real leak) but
it warns in strict-mode dev builds. **Adjacent to L7** (the rAF-coalescing of the
hover scrub, already added) but specifically the *unmount* cleanup, which L7 did
not include.
**Fix:** add `useEffect(() => () => { if (hoverRafRef.current !== null) cancelAnimationFrame(hoverRafRef.current) }, [])`.

**Missing-test notes (INFO — test-only, no production-code change):**
- `equationShareUrl.ts:27` — the value-less-pair guard (`name~` → not a real `0`,
  skipped) is exercised only via the no-name case (`~5`); add
  `expect(decodeVarsFromParam("m~10,v~")).toEqual({ m: 10 })`.
- `subjectResults.ts:132` — `formatResultValue` boundaries exactly at `1e5` and
  `1e-3` are untested; add the boundary assertions (`toExponential` vs
  `toPrecision` at the threshold magnitudes).
- `ResponseCurve.tsx:287` — the `canLog === false` path (mixed-sign curves, e.g.
  logistic id 46 with `N` near `K`) is untested: assert the "log y" button is
  absent, and that forcing `logScale` with `allPositive=false` falls back to
  linear without crashing.
- `useFavorites.ts:9` — cross-tab toggling goes stale (no `storage` listener);
  either wire `window.addEventListener('storage', …)` and test with a synthetic
  `StorageEvent`, or document the gap so it isn't re-derived.

### Checked & confirmed safe (aggregated across all three re-run dimensions)

**No code-execution / injection sinks (grep-confirmed across the 18 files that exist):**
- `eval`, `new Function` — absent everywhere.
- `setTimeout` / `setInterval` with a string argument — absent; all three
  `setTimeout` calls (`ConfigurableEquationScene.tsx:255`, `App.tsx:46`,
  `App.tsx:278`) pass arrow-function callbacks.
- `innerHTML` / `outerHTML` / `insertAdjacentHTML` / `document.write` — absent.
- `dangerouslySetInnerHTML` — absent in all in-scope TSX.
- `shareCard.ts` — builds an SVG *string* only handed to `Blob` /
  `createObjectURL` as a file download, never injected into the DOM; all
  user-supplied fields (`title`, `resultLabel`, `author`, `year`) pass through
  `escapeXml` first; `downloadSvg` has `typeof document` + `URL.createObjectURL`
  SSR guards.

**No ReDoS / no prototype-pollution sink:**
- `equationManifest.ts:52` — `new RegExp(\`\\b${escapeRegExp(token)}\`)` builds
  only `\b<escaped-literal>` patterns; `escapeRegExp` neutralises all
  meta-characters; no quantifiers / nested groups / backtracking alternation.
- `add_subject_glossaries.py` — `so_re` / `empty_re` are static compile-time
  patterns with no user input.
- `equationShareUrl.ts:43` — the computed-key write `out[name] = value` is
  protected by the `FORBIDDEN_KEYS` set (`__proto__` / `constructor` /
  `prototype`, already remediated) on a plain local `{}` with no inherited chain.
- `seed_subjects.py` — no `eval` / `exec` / `subprocess`-with-user-input /
  `shell=True`; all data is Python literals written through the ORM; typed
  `var()` / `lesson()` helpers with defaults.

**Edge-case / error-handling resilience (confirmed):**
- `equationShareUrl.ts` — `encodeVarsToParam` filters non-finite values;
  `decodeVarsFromParam` caps at `MAX_PAIRS=64`, rejects empty names, skips bare
  `name~`, rejects non-finite numbers, catches URL-decode errors per pair.
- `favorites.ts` / `recentlyViewed.ts` / `useFavorites.ts` — `getItem` +
  `JSON.parse` wrapped in try/catch with `Array.isArray` + `typeof number`
  filtering; writes catch quota/disabled errors; `recentlyViewed`
  `slice(0, 12)` is off-by-one correct; `useSyncExternalStore`
  snapshot/getServerSnapshot correct for React 18 (the `MAX_FAVORITES=200` cap
  is applied only on the add path — benign since 81 equations never reach it).
- `relatedEquations.ts` — unknown id, empty manifest, manifest duplicates (Set
  dedup), and the `>= limit` cap all handled.
- `subjectResults.ts` — every divide-by-zero / log-of-non-positive path is now
  either unreachable via slider minimums or returns `NaN`; Doppler `343 - vs`
  cannot reach 0 (`vs` max = 100); Snell TIR `NaN` is intentional; Poisson runs
  in log-space (no factorial overflow); `formatResultValue` returns `—` for all
  non-finite input.
- `equationManifest.ts` — search null-coalesces formula/author/category/year;
  empty/whitespace query returns the full manifest; `getRandomEquationId`
  handles empty and single-item manifests; `resolveEquationManifest` falls back
  to `coreEquationManifest`.
- `equationGroups.ts` — `groupEquationsBySubject` handles an empty manifest;
  unknown ids accumulate in the `other` bucket; `subjectSlugForEquation` returns
  `null` for unknown ids.
- `ResponseCurve.tsx` — `buildModel` returns `null` on no-entry / no-sweep /
  zero-range / `<2` finite samples; log scale enabled only when all sampled
  values are positive; dot clamped to `[PAD_T-6, H-PAD_B+6]`; `pickSweepVariable`
  returns `null` for empty / all-constant lists; markers sliced to 3;
  `REDUCED_MOTION` guarded by `typeof window`.
- `ConfigurableEquationScene.tsx` — `mapVariables/Lessons/Presets/Glossary`
  filter with `isRecord` + type guards (corrupt payloads dropped);
  `randomizeInputs` clamps via `Math.min/max`; URL restore runs in a
  browser-only effect and clamps each decoded value to `[min, max]`.
- `App.tsx` — `rawSelectedId` guarded by `Number.isInteger`;
  `equationManifest[0]?.id` optional-chained; SSR `window` access guarded by
  `typeof window`; dismissed-sync localStorage access wrapped in try/catch.
- `seed_subjects.py` / `add_subject_glossaries.py` — helper defaults everywhere;
  idempotent glossary backfill (only replaces the empty `[]` form);
  count-mismatch warning + non-zero exit; sort_orders unique across ids 18–81.

**Test coverage (confirmed present and passing):**
- `shareCard`, `equationShareUrl` (incl. the `__proto__` / `constructor` /
  `prototype` filter, 64-pair cap, malformed percent-encoding, `Infinity` /
  `NaN` rejection), `clipboard` (async success + fallback + both-fail),
  `favorites`, `recentlyViewed`, `relatedEquations`, `subjectResults` (all
  slider-reachable singularities + Poisson log-space at `k=20` +
  `formatResultValue` NaN/Inf/large/small), `equationManifest` (fallback,
  ranking, AND-token, diacritics, random-id exclusion), `equationGroups`,
  `ResponseCurve` / `pickSweepVariable` (nonlinearity scoring, reversal
  preference, NaN-domain, log-scale, zero-result), and the presentational
  sidebar/overlay components are all covered.

### Overall sign-off verdict

**APPROVED with minor follow-ups** — all three re-run dimensions are
**minor-issues**, not needs-work; the branch carries no critical/high security
issue, one MEDIUM (`useCallback` stale manifest, TQ1) and a LOW cluster
(`NaN` render/copy guard EC1/TQ2, `execCommand` reliability SEC1/R1, dead test
file TQ3, unmount-RAF INFO EC2). None block merge; land TQ1 and EC1/TQ2 with the
remaining remediation series.

### Sign-off findings — remediation status

**Fixed & committed** (post-sign-off):
- **TQ1 (MEDIUM)** `App.tsx:246` — added `equationManifest` to the
  `selectEquationFromShortcut` **useCallback** deps (stale closure on number-key /
  random jumps; distinct from the already-fixed effect-deps H1).
- **EC1/TQ2 (LOW)** `ConfigurableEquationScene.tsx:342,355` — gated the result box
  + copy button on `Number.isFinite(resultValue)`, so a slider-reachable
  singularity no longer renders/copies "`<symbol> = —`".
- **EC2 (INFO)** `ResponseCurve.tsx` — `useEffect` cleanup cancels a pending
  hover-scrub `requestAnimationFrame` on unmount.

**Rejected with rationale:**
- **TQ3 (LOW)** "delete `equationTools.test.ts`" — **rejected.** Despite the
  misleading name, it is the **only** test coverage for `recentlyViewed` *and*
  `favorites` (no `recentlyViewed.test.ts` / `favorites.test.ts` exist), so
  deleting it loses real coverage. The name is cosmetic; left in place.

**Deferred:**
- **SEC1/R1 (LOW)** `clipboard.ts` `execCommand` fallback can report success while
  writing nothing — reliability-only (no security sink), and the modern
  `navigator.clipboard` path is primary. Acceptable for now.

All fixes verified: `npm run build` clean, 115 frontend tests green.
