---
title: Deadcode Audit (Verified) — sciencebouk
repo: sciencebouk
lens: deadcode
date: 2026-06-14
round: 4
---

# Deadcode Audit (Verified) — sciencebouk

Repo: `/Users/svetlana/Documents/projects/sciencebouk` (Django backend; React/TS frontend). Strictly read-only — no files changed. Every finding below was re-verified by direct Read/Grep over the whole tree (static + dynamic `import()` + test files). `tsconfig` has `noUnusedLocals`/`noUnusedParameters` on, so trivial local dead vars are already caught by tsc; this audit targets what tsc cannot see: unused **exports**, orphaned **modules**, transitively-dead clusters, deprecated paths, and unused deps.

**Corrections made to the draft during verification (called out inline below):**
- Orphan-line total was overstated. The 10 HIGH files sum to **1,426 lines**, not "~1,850+". Summary corrected.
- All `sceneRegistry` citations were wrong path: the file is `frontend/src/components/sceneRegistry.ts` (NOT `components/scenes/sceneRegistry.ts`). Fallback is `genericScene = ConfigurableEquationScene` (line 11/43); scene ids map at lines 15–32.
- `getBillingDisabledCopy` (L-row) is **more dead than stated**: not even test-referenced. Tests `vi.mock` the module; they never call the standalone fn. Promoted to its own dead-export note.
- M3: confirmed `Sparkles` will NOT orphan (used at `ProUpgrade.tsx:184`); only `SoftPromptProps` orphans with `ConversionPrompt`. Draft's hedge was right.
- H9: dropped the unverifiable "uses `useNnarrow`-style checks inline" claim — no such symbol exists in the tree.
- `ProgressResponse` (L-row) re-verified as correct: both its usages (`client.ts:217,222`) live **inside** the dead `equations.updateProgress`; the live `progress.update` returns `ProgressItem` directly (`client.ts:239`). So it does become fully dead once M1 lands.

## Summary of impact
- **~1,426 lines of fully orphaned frontend code** across 10 files (entire modules never imported anywhere — verified no static/dynamic/test/barrel reference).
- A **dead modal-auth subsystem** (`AuthModal` + `LazyAuthModal`) superseded by route-based `AuthPage`.
- A **dead API/data cluster**: 4 of 5 React-Query hooks unused, cascading into 4 unused `api` client methods + `payments.status`.
- ~25 redundant `export` keywords and several fully-dead exports.
- **4 unused npm deps** + the `d3` meta-package (only 5 sub-packages actually imported).

---

## CRITICAL
None. Everything here is unreachable/unused, not broken — no dead path causes a runtime failure.

---

## HIGH — fully orphaned files / dead subsystems (safe to delete)

### H1. Dead modal-auth subsystem — `AuthModal` + `LazyAuthModal` (123 lines)
- `frontend/src/auth/LazyAuthModal.tsx:15` (29 lines) — never imported anywhere (no static/dynamic/test ref). Verified.
- `frontend/src/auth/AuthModal.tsx:14` (94 lines) — reached **only** via the orphaned `LazyAuthModal` (`import("./AuthModal")` at `LazyAuthModal.tsx:12`) → transitively dead.
- **Why:** app uses route-based auth. `main.tsx:126-127` routes `/login` and `/signup` to `<AuthPage>` (`main.tsx:23`); every "open auth" site navigates (`App.tsx:179,192`). Confirmed.
- **Fix:** delete both files.

### H2. `InteractiveEquation` — orphaned prototype
- `frontend/src/components/InteractiveEquation.tsx:119` (433 lines) — exported, zero references. Self-contained balance-scale demo; imports `d3-selection`/`d3-drag` (relevant to M5).
- **Fix:** delete the file.

### H3. `PythagoreanTheoremExplorer` — orphaned
- `frontend/src/components/PythagoreanTheoremExplorer.tsx:26` (473 lines) — exported, zero references. Superseded by `scenes/PythagorasScene.tsx` (registered for equation id 1 at `components/sceneRegistry.ts:16`). Also imports `d3-selection`/`d3-drag` (M5).
- **Fix:** delete the file.

### H4. `GenericEquationScene` — orphaned fallback scene
- `frontend/src/components/scenes/GenericEquationScene.tsx:6` (58 lines) — exported, never referenced (verified — grep for importers returned nothing). The registry's true fallback is `ConfigurableEquationScene` (`components/sceneRegistry.ts:10-11,43`). Note: this file *does* import the live `useEquation` hook, but the file itself has no consumer.
- **Fix:** delete the file.

### H5. `teaching/hooks-data.ts` — orphaned data module (75 lines)
- `frontend/src/components/teaching/hooks-data.ts` — both exports dead: `EquationHook:1`, `equationHooks:6`. No file imports `hooks-data` (verified). Superseded by API-driven hook fields.
- **Fix:** delete the file.

### H6. `scenes/layout.ts` — orphaned module (95 lines)
- `frontend/src/components/scenes/layout.ts` — all four exports dead: `SceneLayout:6`, `computeLayout:45`, `splitRows:75`, `splitCols:86`. No scene imports `./layout` (verified). `PythagorasScene.tsx:159` defines its **own local** `computeLayout` (different signature) — not this one.
- **Fix:** delete the file.

### H7. `math/FormulaText.tsx` — orphaned (121 lines)
- `frontend/src/components/math/FormulaText.tsx:68` — exported, zero references. Live math path uses the `InlineMathRenderer` family.
- **Fix:** delete the file.

### H8. `teaching/RealWorldContext.tsx` — orphaned (25 lines)
- `frontend/src/components/teaching/RealWorldContext.tsx:9` — exported, zero references.
- **Fix:** delete the file.

### H9. `hooks/useMediaQuery.ts` — orphaned module (23 lines)
- `frontend/src/hooks/useMediaQuery.ts` — both exports dead: `useMediaQuery:3` and `useNarrow:21` (`useNarrow` calls `useMediaQuery` internally; nothing outside the file calls either). Verified no importers.
- **Fix:** delete the file.

---

## MEDIUM — dead exports in otherwise-live files; dead API/data cluster

### M1. Dead React-Query hooks (4 of 5) in `api/hooks.ts` + client cascade
- `frontend/src/api/hooks.ts` — `useEquations:6`, `useCourse:27`, `useSearchEquations:36`, `useUpdateProgress:55` all unused. Only `useEquation:16` is live (used in `GenericEquationScene` [itself dead — H4], `ConfigurableEquationScene.tsx:8`, `TeachableEquation.tsx:8`). Verified.
- **Cascade** — these dead hooks are the **only non-test** consumers of these `client.ts` methods:
  - `api.equations.list` (`client.ts:205`) — only `hooks.ts:11` + `client.test.ts:49`.
  - `api.courses.get` (`client.ts:229`) — only `hooks.ts:30` + `client.test.ts:53`. Entire `courses` client block (`client.ts:228-231`) becomes dead.
  - `api.search` (`client.ts:232`) — only `hooks.ts:49` + `client.test.ts:54,128,169`.
  - `api.equations.updateProgress` (`client.ts:212`) — only `hooks.ts:59` + `client.test.ts:51`. Live progress write path is `api.progress.update` (`client.ts:239`, used by `useProgress.ts:302`).
- **Fix:** delete the 4 hooks, then the 4 now-orphaned client methods; update `client.test.ts` (drop its `search`/`courses`/`list`/`updateProgress` assertions).

### M2. `api.payments.status` — completely unused
- `frontend/src/api/client.ts:259` — zero references anywhere, including tests (verified). Pro status is derived from `user.profile.tier` (`AuthContext.tsx:257`), not `/payments/status/`.
- **Fix:** remove the `status` method. (Backend `subscription_status` endpoint kept pending external-client confirmation — see B2.)

### M3. `ConversionPrompt` — fully built, never rendered
- `frontend/src/components/ProUpgrade.tsx:397` (~24 lines) — exported, never imported/rendered. Its sibling exports (`ProPricingPage`/`ProSuccessPage`/`ProCancelPage`) are routed and live. Verified: `SoftPromptProps:307` is used only by `ConversionPrompt`, so it orphans too; `Sparkles` does **not** orphan (live at `ProUpgrade.tsx:184`).
- **Fix:** remove `ConversionPrompt` + `SoftPromptProps`, or wire it into the lesson flow if still wanted.

### M4. Fully-dead standalone exports
Each referenced only on its own definition line (verified):
- `frontend/src/data/equationConfig.ts:259` `useAllEquationConfigs` — dead hook. It is the **only** caller of `getAllConfigs:255` (`equationConfig.ts:262`), so that becomes dead too once removed (see L-table).
- `frontend/src/progress/useProgress.ts:401` `getLocalProgressSyncSignature` — dead (sibling `getLocalProgressSyncItems:394` IS live — used by `SyncPrompt.tsx:6,30`).
- `frontend/src/components/teaching/types.ts:34` `EquationTeachingConfig` — dead interface.
- **Fix:** delete each.

### M5. Unused npm dependencies
`frontend/package.json` declares packages with zero imports across `src` (verified, incl. CSS):
- `@radix-ui/react-collapsible`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-tabs` — zero refs.
- `@use-gesture/react` — zero refs.
- `d3` (`package.json:29`) — code imports **only** the sub-packages `d3-scale`, `d3-shape`, `d3-selection`, `d3-drag`, `d3-array` (which arrive transitively). No top-level `from "d3"` import exists anywhere (verified). The meta-package pulls in force/geo/zoom/contour/etc. that nothing uses.
- **Fix:** remove the 4 radix/gesture deps. For `d3`: declare the 5 sub-packages as explicit direct deps and drop the `d3` meta-package (also removes the latent fragility of relying on them transitively).

---

## MEDIUM — deprecated/legacy backend paths with no remaining first-party client
Public HTTP endpoints (could have external consumers) — confirm before deleting.

### B1. `equation_atlas_legacy` view + its two URL aliases
- `backend/courses/views.py:163` — docstring states it's kept for FE backward-compat during migration to `/api/equations/`. The frontend has fully migrated: it fetches via `api.equations.listAll` (`equationManifest.ts:36`) and has **zero** references to `equation-atlas`, `foundational-algebra`, or the `equationAtlas` envelope (verified — all such hits are backend-only).
- Wired at `backend/courses/urls.py:34,35`. Now referenced only by `courses/tests.py` (lines 405-672) and an API-docs HTML page (`formulas_backend/views.py:56`, labeled "legacy").
- **Fix:** after confirming no external API consumers, remove the view + both URL aliases + related tests + the docs-page row. Keep `EQUATION_ATLAS_SLUG` (`views.py:20`) — still used by `seed_equations.py` and the importer.

### B2. `course_detail` / `subscription_status` — no live frontend client (lower confidence)
- `course_detail` (`backend/courses/views.py:98`, route `courses/<slug>/` at `urls.py:37`) — its only FE caller was `api.courses.get`, dead per M1. Models stay live (seeded/tested); the detail endpoint currently serves no first-party client.
- `subscription_status` (`backend/payments/views.py:102`, route `status/` at `payments/urls.py:7`) — FE `api.payments.status` is dead (M2); no caller (only `payments/tests.py:92,99,110`).
- **Fix:** verify no external/mobile clients, then consider removing. Lower confidence — conventional API surface.

---

## LOW — redundant `export` keywords (symbol used only inside its own file)
Not dead *code* (used internally) but the `export` widens the public surface for no consumer. Dropping `export` is safe. Verified each has no external/test consumer unless noted.

| File:line | Symbol | Note |
|---|---|---|
| `settings/SettingsContext.tsx:52` | `SETTINGS_STORAGE_KEY` | used at lines 91/99/200 internally only |
| `progress/useProgress.ts:161` | `getLocalProgress` | internal only (407/417) |
| `progress/useProgress.ts:324` | `ProgressSnapshot` | internal type only (42/345) |
| `components/teaching/richText.tsx:42` | `linkTermsText` | used by line 95 only |
| `components/ScientistModal.tsx:26` | `getScientistByEquation` | internal only (37) |
| `data/equationConfig.ts:255` | `getAllConfigs` | only via dead `useAllEquationConfigs` (M4) → **fully dead** once M4 removed |
| `api/client.ts:166` | `ProgressResponse` | `@deprecated` (165); used only inside dead `equations.updateProgress` (217/222) → fully dead once M1 lands |
| `api/client.ts:128,135,144,187,196` | `PaginatedResponse`, `CourseResponse`, `LessonResponse`, `UserProfile`, `AuthenticatedUser` | used only within `client.ts`; reasonable to keep as public API types but no external consumer today |
| `components/ui/badge.tsx:5` / `button.tsx:6` | `badgeVariants`, `buttonVariants` | exported, consumed only internally |
| `components/ui/scroll-area.tsx:19` | `ScrollBar` | exported, rendered only inside `ScrollArea` (line 13) |

### L-extra. Fully-dead exports
- `config/site.ts:2` `SITE_URL` — exported, never read anywhere (verified). `SITE_DOMAIN`/`SUPPORT_EMAIL`/`GITHUB_URL` in the same file are live. Dead export → delete the line.
- `config/billing.ts:7` `getBillingDisabledCopy` — **dead, not even test-referenced** (tests `vi.mock` the module). Live code uses `useBillingDisabledCopy` (11 consumers) which calls `useBillingContent()`, not this fn. Delete it.
- `config/billing.ts:5` `BILLING_DISABLED_COPY` — referenced only inside test `vi.mock` blocks (`ProGate.test.tsx:26`, `ProUpgrade.test.tsx:28`), never by live code. Test-only; safe to drop if the mocks are updated.
- shadcn UI primitives, never referenced even internally: `dialog.tsx:7,8` `DialogTrigger`/`DialogClose` (export at :61); `sheet.tsx:7` `SheetTrigger` (export at :69; note `SheetClose` IS used at :45). Low priority — shadcn boilerplate.

---

## Verified NON-findings (do not re-derive)
- `data/equations.ts` (+ `.json`) — **live**: `equations` consumed at `equationConfig.ts:3,199`.
- `resetTokenStorageForTests` (`tokenStorage.ts:72`) — legitimate test helper, used by 3 suites — keep.
- Backend `*Admin`/`*Inline`/`create_profile` — framework-wired (`@admin.register`, `@receiver`) — not dead.
- `Course`/`Lesson` models — live (seeded + tested) even though the FE no longer fetches them.
- `db.sqlite3`, `*.tsbuildinfo`, config `.d.ts` — NOT git-tracked (build artifacts; the `.tsbuildinfo` files in `find` output are untracked) — no hygiene finding.
- No barrel/index files in `frontend/src/components` and no large commented-out blocks — verified.

---

## Recommended next steps (lowest risk first)
1. **H2, H3, H4, H5, H6, H7, H8, H9** — delete the 8 orphaned files (no consumers, no tests). ~1,303 lines.
2. **H1** — delete the two auth-modal files. 123 lines.
3. **M3, M4, M5** — remove `ConversionPrompt`+`SoftPromptProps`, the dead hooks/types, and the 4 unused deps; switch `d3` → the 5 explicit sub-packages.
4. **M1, M2** — delete the 4 dead hooks, cascade-clean the orphaned `api` client methods (`courses` block, `search`, `equations.list`, `equations.updateProgress`, `payments.status`), and update `client.test.ts`. `ProgressResponse` (L) becomes fully dead here — remove it in the same change.
5. **L items** — drop the dead exports (`SITE_URL`, `getBillingDisabledCopy`, unused UI members) and the redundant `export` keywords / `getAllConfigs`.
6. **B1, then B2** — only after confirming no external/mobile API consumers.

Process note: this repo has no `docs/BUG_JOURNAL.md` (global rule §1). Out of scope for a read-only audit, but worth bootstrapping so the cleanup commits can record any lesson. If these deletions proceed, run the frontend test suite + `tsc --noEmit` and the Django test suite after each batch — the cascade in M1 and B1 touches tests that must be updated in the same commit.
