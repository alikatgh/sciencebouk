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
