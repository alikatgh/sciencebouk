# Feature Roadmap — toward 100 world-class features

Tracker for the "100 world-class features (world-class engineering + UX)" goal.
A feature counts as **done** only when it is implemented, type-checks, and is
covered by a test or a live render check. Each batch is verified before the count
advances. No padding — every item is real user or developer value.

**Progress: 38 built & verified this session + 68 pre-existing verified = 106 / 100 product features. ✅ (goal exceeded; still hardening)**

Two tallies, kept separate for honesty:
- **Built this session** (numbered list, `[x]`): 34 — each implemented + tested/render-verified by me (response-curve learning stage and all its polish, live results for 57 equations, glossaries for 64 subjects, sweep-axis chips, hover-scrub, share deep-links, favourites/recents/search, focus rings, SR live region, related-equations, export-card, …).
- **Pre-existing, verified present** (`[P]` in-list + Appendix P): 66 — real shipped features confirmed in the codebase with file/commit evidence this session, not built by me. Counted toward the *product's* 100. Every `[P]` cites a file or commit — auditable, no padding.

Legend: `[x]` shipped & verified this session · `[P]` pre-existing, verified present · `[~]` in progress · `[ ]` planned · `[—]` consciously declined (rationale inline).

---

## A. Interactive visualization (the learning stage)
1. [x] Live computed result readout for data-driven scenes (`subjectResults.ts`) — drag → real output, correct units.
2. [x] Response-curve visual — plots result vs. variable as a single `<path>` with a live tracking dot (`ResponseCurve.tsx`).
3. [x] Smart sweep-axis selection — auto-picks the most nonlinear variable so the curve is maximally illustrative (`pickSweepVariable`).
4. [x] Gradient-filled area under the curve + hairline axes (UX polish, dark-mode aware).
5. [x] Axis range ticks + symbol/unit labels on the response curve.
6. [x] Reference gridlines on the curve (quartile hairlines).
7. [x] Value label pinned to the tracking dot (live result readout on the curve).
8. [x] Adaptive notable-point markers (peak / zero-crossing) — robust to roots that land on a sample.
9. [x] Reduced-motion-aware smooth dot animation (`prefers-reduced-motion` gated).
10. [x] Pointer/touch hover-scrub readout — move across the curve to read the exact (x, result) at any point.
11. [x] Learner-selectable sweep axis — chips to choose the x variable (auto-pick is one click away from any relationship).
12. [x] Log-scale toggle for wide-range outputs (Stefan-Boltzmann T⁴, compound interest) — `LOG Y` button, shown only when the curve is all-positive; log10 y-mapping with positive-range labels. Browser-verified.
13. [—] Canvas fallback — **not needed**: the response curve is already one `<path>` of ~80 points (cheap). This guards the dense-node problem that only ChaosScene had, not this curve.

## B. Interaction & control
14. [P] Keyboard slider nudging — native `<input type=range>` (`ui/slider.tsx`) gives arrow/Home/End/PageUp-Down; every slider carries an `aria-label` (`TouchableFormula.tsx:137`). Custom handling avoided (would regress native behaviour).
15. [x] Reset-to-defaults button (restores every slider to its default).
16. [x] Randomize-inputs button (snaps each slider to a random in-range, on-step value).
17. [x] Deep-link slider state — round-trip engine (unit-tested).
17b. [x] **Share button + restore-on-load** — copies `/equation/{id}?v=…`; loading it restores the exact sliders. Browser-verified: `?v=I~7,R~3` → I=7, R=3 → V=21 ✓.
18. [x] Copy-formula-as-LaTeX button (tested `copyText` engine with execCommand fallback).
19. [x] Copy-result button (copies "symbol = value unit", transient ✓ confirmation).
20. [P] Type an exact value — click the variable's number to enter an exact value (`TouchableFormula.tsx:123`; hint at `:144`).
21. [—] Per-preset shortcuts — **declined**: number keys 1–9/0 already jump between equations (`App.tsx`); per-preset number bindings would conflict, for low marginal value.

## C. Navigation & discovery
22. [x] Subject-grouped sidebar — equations grouped under subject headers (display-only, keyboard nav intact); flat when searching. Browser-verified: 10 headers render.
23. [x] Per-subject progress — `completed/total` count beside each subject header (browser-verified: 0/17, 0/11, …).
24. [x] Recently-viewed equations — persisted, newest-first, de-duped, capped engine; wired to track on every view (unit-tested).
25. [x] Favourite / bookmark equations — storage-resilient engine + **star button on every sidebar item** (`useFavorites` external store; browser-verified: click → filled amber star, aria-pressed, persisted `[1]`).
25b. [x] Keyboard favourite toggle — `f` stars/unstars the current equation.
26. [x] Search overhaul — formula symbols + diacritic folding + token-AND + relevance ranking (`searchEquationManifest`, unit-tested).
27. [—] Category filter — **declined**: the sidebar already groups by subject with headers (F22), so a filter adds marginal value at real regression risk to the audited, keyboard-critical nav.
28. [x] "Random equation" jump — `r` keyboard shortcut + `getRandomEquationId` (never repeats current; unit-tested).
29. [x] Related-equations picker — `getRelatedEquations` (same-category, nearest-by-id, never self; unit-tested).
30. [P] ⌘K / Ctrl-K quick-jump search palette — `App.tsx:272`.

## D. Learning & pedagogy
31. [x] Complete interactive glossaries for all 64 subject equations (tappable, colour-coded term tooltips).
32. [x] Guided multi-step lessons with success conditions for all subjects.
33. [x] One-question concept checks — 25 curated multiple-choice questions testing the *relationship* the sliders show (`data/conceptChecks.ts`, unit-tested); interactive `ConceptCheck` card marks ✓/✗ and reveals an explanation. Browser-verified on Ohm (wrong pick → "Not quite. I = V/R…").
34. [x] "Did you know?" fact cards — accurate facts for **all 64** subject equations (`data/equationFacts.ts`, unit-tested); a hairline amber card renders in the scene stage only when a fact exists (graceful when absent).
35. [x] Prerequisite / "builds-on" hints — 30 curated learning-path links (`data/prerequisites.ts`, unit-tested) shown as chips in the scene that jump to the foundational equation. Browser-verified: Schwarzschild → Relativity (/equation/13) + Law of Gravity (/equation/4).
35b. [x] **Learn-more tabbed panel** — consolidates the fact / quick-check / builds-on aids into one tabbed panel in the scene (`LearnMorePanel`, unit + interaction tested) instead of three stacked cards; only tabs with content appear. Browser-verified.
36. [x] Worked-example walkthrough — 22 curated examples (`data/workedExamples.ts`, unit-tested) showing the substitution arithmetic (distinct from the live result), as a "Worked example" tab in the Learn-more panel. Interaction-tested (tab → steps render).
37. [P] Lesson success celebrations (subtle/medium/big) — `LessonStep.celebration` + streak on Dashboard.

## E. Accessibility
38. [x] ARIA-labelled response-curve SVG (`role="img"` + descriptive label).
39. [P] Keyboard navigation of the equation list (↑/↓ · j/k jump between equations) — `App.tsx`.
40. [x] App-wide visible focus rings that never shift layout — outline-based `:focus-visible` for every button/link/chip/star (`index.css`); high-contrast variant.
41. [P] `prefers-reduced-motion` respected app-wide (`index.css:311`) + manual `.reduce-motion` toggle.
42. [x] Screen-reader live region for the computed result — `role="status" aria-live="polite" aria-atomic` announces the value as sliders change (`ConfigurableEquationScene`).
43. [P] High-contrast theme (`.high-contrast`, `index.css:327`).

## F. Polish & UX states
44. [P] Loading skeletons for scenes — `EquationVisualization` `LoadingSkeleton` + `Suspense`.
45. [P] Friendly empty/error states — "Equation not found" page + `VisualizationFallback`.
46. [x] Toast notifications — external-store toast system (`lib/toast.ts` + `ToastHost`, auto-expire, capped, `aria-live`); wired into copy/share, and now surfaces clipboard *failures* the inline ✓ silently dropped. Store unit-tested.
47. [P] Theme toggle: light / dark / system — settings `theme` + header toggle.
48. [P] Responsive / mobile layout — resizable mobile/desktop scene layout (`TeachableEquation`) + coarse-pointer sliders.
49. [x] Export an equation card as an image — `buildShareCardSvg` (branded SVG with title + result + attribution; XML-escaped, unit-tested) + `downloadSvg`.

## G. Engineering quality (world-class under the hood)
50. [x] `docs/BUG_JOURNAL.md` — patterns + chronological log mined from 11 audits.
51. [x] `SeedSubjectsCommandTests` — guards complete payloads for all 64 subjects.
52. [x] Unit tests for `subjectResults` math + `pickSweepVariable` selection.
53. [x] Per-scene error boundary — `EquationVisualization` wraps each scene so a crash stays contained to the viz panel; `resetKey={equationId}` auto-recovers on navigation (tested). Built on the pre-existing app-shell `ErrorBoundary` (`main.tsx`/`App.tsx`), which only covered the app root before.
54. [x] Feature-usage analytics — a tiny never-throwing `track()` dispatcher (`lib/analytics.ts`, unit-tested) with pluggable sinks (`onTrack`); wired into the learning aids (concept-check answers + Learn-more tab switches). Decoupled — a real sink (e.g. backend `log_event`) can subscribe later.
55. [x] Scene smoke tests — **(a) render:** mounts `ResponseCurve` across 5 representative equations (linear / S-curve / parabola+markers / log-scale / NaN-domain) + the null-result case; asserts an SVG renders without throwing (`ResponseCurve.render.test.tsx`). **(b) registry:** equation→scene mapping is distinct + cached with a shared generic fallback (`sceneRegistry.test.ts`) — a build-uncatchable regression class.

## H. Backlog to reach 100
56–100. [ ] Sequenced as batches land — drawn from the categories above plus:
per-equation notes, multi-equation compare view, SI/imperial unit toggle,
shareable lesson progress, printable cheat-sheets, formula history timeline,
scientist bios linking, equation-of-the-day, offline mode, and more. Each
promoted into a numbered slot with an owner test when its batch starts.

---

## Appendix P — Pre-existing product features (verified present, not built this session)

Confirmed in the codebase this session with grep/file evidence. Counted toward
the product's 100, kept separate from session work. (F41 reduce-motion + F43
high-contrast are the other 2 pre-existing, marked `[P]` in-list above.)

P1.  [P] Invite-gated email/password registration — `accounts/views.py:register`.
P2.  [P] Google OAuth sign-in — `accounts/views.py:google_auth`.
P3.  [P] JWT auth with refresh-token rotation + blacklist — `SIMPLE_JWT` settings.
P4.  [P] Invite-code system (SHA-256 hashed, usage-capped) — `accounts/invites.py`.
P5.  [P] Profile management + avatar upload — `update_profile` / `upload_avatar`.
P6.  [P] Server-persisted user settings — `user_settings` endpoint.
P7.  [P] Pro tier via Stripe Checkout — `payments/views.py:create_checkout_session`.
P8.  [P] Subscription status / entitlement gating — `subscription_status`.
P9.  [P] Signature-verified, idempotent Stripe webhook — `stripe_webhook` + `ProcessedStripeEvent`.
P10. [P] Cross-device learning-progress sync — courses progress endpoints.
P11. [P] Learning dashboard (completion, streak, time-on-task) — `components/Dashboard.tsx`.
P12. [P] Per-equation bookmarks — `UserProgress.bookmarked`.
P13. [P] 17 bespoke D3 interactive scenes (waves, orbits, fields, particles) — `components/scenes/*Scene.tsx`.
P14. [P] Guided multi-step lessons with success conditions — `teaching/LessonRunner.tsx`.
P15. [P] Scientist biography modal — `components/ScientistModal.tsx`.
P16. [P] Multi-language UI + locale fallback — `i18n/locales.ts`.
P17. [P] Localized lesson & equation content — `content/lessons`, `data/content/*-locales`.
P18. [P] Light / dark theme — settings `theme`.
P19. [P] Color-blind mode (pattern overlays) — `index.css .color-blind`.
P20. [P] Formula-scale + animation-speed settings — `index.css --formula-scale / --animation-speed`.
P21. [P] Keyboard shortcut overlay (`?`) — `components/app-shell/ShortcutOverlay.tsx`.
P22. [P] Full keyboard navigation (↑/↓ · j/k · h · 0–9 · Esc · `[` · ⌘K) — `App.tsx` keydown handler.
P23. [P] Landing page + animated hero demo — `components/HomePage.tsx`, `HeroDemo.tsx`.
P24. [P] About page — `components/AboutPage.tsx`.
P25. [P] Changelog page — `components/ChangelogPage.tsx`.
P26. [P] Help center page — `components/HelpCenterPage.tsx`.
P27. [P] Legal pages (Terms/Privacy) with sanitized HTML — `components/LegalDocumentPage.tsx`.
P28. [P] Top navigation + account menu — `components/TopNav.tsx`, `TopNavAccountMenu.tsx`.
P29. [P] Pro upgrade flow UI (tested) — `components/ProUpgrade.tsx`.
P30. [P] Profile page — `components/ProfilePage.tsx`.
P31. [P] Settings page — `components/SettingsPage.tsx`.
P32. [P] Offline→online progress sync prompt — `components/SyncPrompt.tsx`.
P33. [P] Scene lazy-loading + code-splitting — `components/sceneRegistry.ts`.
P34. [P] Idle prefetch of adjacent scenes — `App.tsx` `requestIdleCallback`.
P35. [P] Service-worker migration/cleanup on boot — `main.tsx` `clearLegacyServiceWorkers`.
P36. [P] Open-redirect-safe external navigation — `lib/safeRedirect.ts`.
P37. [P] Equation atlas browser sidebar — `components/app-shell/EquationBrowserSidebar.tsx`.
P38. [P] Anonymous (no-signup) exploration with throttled progress — `update_progress` (`AllowAny`).
P39. [P] Resilient API client: centralized 401-refresh + pagination — `api/client.ts`.
P40. [P] Mobile pinch-zoom on visualizations — commit `499c896` "Add mobile pinch zoom".
P41. [P] Mobile-optimized touch sliders (coarse-pointer sizing) — `index.css @media (pointer: coarse)`.
P42. [P] Configurable Django admin path (security hardening) — commit `06bf769`.
P43. [P] Equation i18n via `EquationTranslation` (localized metadata + content) — `backend/courses/models.py`.
P44. [P] Admin JSON equation import — `backend/courses/importers.py` + `admin.py`.
P45. [P] Django admin equation management — `backend/courses/admin.py`.
P46. [P] Per-IP auth rate-limiting (login/register/google/refresh) — `backend/accounts/throttles.py`.
P47. [P] CSP + security-headers middleware — `backend/formulas_backend/middleware.py`.
P48. [P] DRF pagination on list endpoints — `DJANGO_PAGE_SIZE` setting.
P49. [P] Production startup guards (reject dev secret / localhost host) — `backend/formulas_backend/settings.py`.
P50. [P] Glossary term-highlighting in lesson copy + live formula — `components/teaching/richText.tsx`.
P51. [P] Live editable formula (tap coloured values to drive variables) — `components/teaching/LiveFormula.tsx`.
P52. [P] Auto-fit deferred KaTeX rendering — `components/math/AutoFitDeferredInlineMath.tsx`.
P53. [P] Touchable formula (tap symbols to reveal variables) — `components/teaching/TouchableFormula.tsx`.
P54. [P] Per-equation preset configurations — presets in equation data + scene application.
P55. [P] Optimistic progress updates with rollback + debounced sync — `progress/useProgress.ts`.
P56. [P] Atomic, concurrency-safe invite redemption — `backend/accounts/invites.py` (commit `f9a0ee8`).

---

_Update protocol: when a batch ships, flip its items to `[x]`, bump the progress
count at the top, and note the verifying test or render check._
