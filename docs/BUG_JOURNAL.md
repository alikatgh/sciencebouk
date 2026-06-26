# Bug Journal

**Read this before debugging.** Every fix here taught a generalizable lesson.
The top section is the cheat-sheet; the chronological log has the receipts.

When you fix a bug, append an entry. **Same commit as the fix.** Five lines
max per entry. No drift.

Global rules: `~/.claude/CLAUDE.md`.

> Provenance: the patterns + chronological log below were mined from the 11
> verified audit reports under [`docs/audits/`](audits/) (rounds r1–r6,
> 2026-06-14) and reconciled against HEAD. Rounds-1–3 correctness/security/auth/
> billing/CI findings were fixed in `f9a0ee8`; the remaining findings
> (performance, deadcode, docs, architecture, research + residual security) are
> still open — see "Open audit backlog" at the bottom. Re-confirm any open item
> against current source before acting; line numbers drift.

---

## Patterns to scan for FIRST

Before reproducing, grep this list for the shape of your bug.

1. **Webhook/event handler keyed on a blank-able or wrong field.** Stripe
   `customer.subscription.deleted` looked up by `stripe_subscription_id`, which
   could be stored as `''` → canceled users kept Pro forever. Key downgrades on
   the always-populated stable id (`stripe_customer_id`); guard against a blank
   lookup key before any `.get()`. (r2-H4, r6-C1 → fixed `f9a0ee8`.)

2. **External events are at-least-once and out-of-order.** No `event.id` dedup +
   no recency guard → redelivered `deleted` downgrades a re-subscribed user.
   Persist processed `event.id` (idempotency table), ignore events older than
   recorded state, and treat the provider as a cache — reconcile, don't trust it
   as the sole entitlement record. (r2-H5/H6, r6-C2/H7, r5research-M3.)

3. **`Model.objects.create()` / `get_or_create()` skip `full_clean()`.** A
   client-controlled `X-Forwarded-For` string reached a `GenericIPAddressField`
   unvalidated; on Postgres (`inet` column) it raised `DataError` and 500'd —
   where SQLite silently stored junk. Validate/normalize (`validate_ipv46_address`,
   fall back to `None`) before persisting. Dev-on-SQLite hides prod-on-Postgres
   type errors. (r2-C1, r6-C3 → fixed `f9a0ee8`.)

4. **Non-atomic "create then compensate".** `serializer.save()` committed the
   User, then a bare `user.delete()` ran only inside `except InviteCodeError`;
   any other exception (or a crash mid-compensation) orphaned a gate-bypassing
   account. Wrap create + side-effect in one `transaction.atomic()`. (r2-H1,
   r6-H1 → fixed `f9a0ee8`.)

5. **TOCTOU: the lock must span the mutation.** A pre-`validate` with its own
   `select_for_update` released the lock before redeem ran. Make redeem the
   single source of truth; enforce a cap atomically with
   `UPDATE ... SET used_count = used_count + 1 WHERE id=? AND used_count < max_uses`
   + `rowcount`. Pre-validate calls are pure TOCTOU dead weight. (r2-C2, r6-H2/H3
   → fixed `f9a0ee8`.)

6. **`created`-gated side effects in `get_or_create`.** Redeeming only
   `if created` let a concurrent duplicate request skip redemption yet still
   return 200 + tokens. Redeem for any user lacking the side-effect row, inside
   the atomic block. (r2-C2, r6-H2.)

7. **AllowAny endpoint keyed on a client-supplied id.** Anon progress keyed on a
   free-form `user_id` (`CharField(max_length=100)`) → cross-tenant overwrite +
   unbounded row creation. Require a server-issued UUIDv4 (strict regex) or a
   signed `HttpOnly` cookie token; a throttle caps volume, not the authz flaw.
   (r1-H1, r5-H1 → fixed `f9a0ee8`.)

8. **Auth endpoints have no throttle by default.** DRF's default
   `DEFAULT_THROTTLE_CLASSES` is `[]`; login/register/refresh/oauth were
   brute-forceable + sprayable. Distinct errors ("email exists", "code revoked")
   are enumeration oracles → collapse to one generic message. (r1-H2/H3,
   r5-H2/H3/N1 → fixed `f9a0ee8`.)

9. **Parallel code paths that must agree but silently diverge.** Anonymous
   `update_progress` lacked the `completed_at` block the authenticated paths had
   → every anon completion stored `completed_at = NULL`. The same field-copy loop
   + three near-identical serializers were duplicated 3× and drift in lockstep.
   Extract one shared `apply_progress_update()`. (r2-H3/H4-arch, r6-H5.)

10. **Bulk/sync endpoint that drops items but reports success.** Unknown/duplicate
    `equation_id`s hit `continue` and were omitted from both `results` and
    `errors`; the client cleared local data it believed synced. Record skipped ids
    in `errors`; de-dup client ids; wrap the loop in `transaction.atomic()`.
    (r2-H2, r6-H4/M5.)

11. **Server overwrite vs. merge for monotonic fields.** Bulk sync blindly
    `setattr`'d client values over higher server state → a fresh-device sync
    regressed `time_spent_seconds` / reverted `completed`. Server-side
    `max(existing, incoming)` / OR-merge; only set `notes`/`lesson_step` when
    incoming is non-empty. (r6-H6.)

12. **Slice-then-compute caps the result.** The streak walked only the last
    `[:100]` events → long streaks truncated, and it reported 0 unless active
    *today*. Use `.dates("created_at", "day")` for distinct activity days; decide
    explicitly whether "active yesterday" counts. (r2-M3, r6-M3 → fixed `f9a0ee8`.)

13. **N+1 from auth.** SimpleJWT `get_user` does `User.objects.get(...)` with no
    `select_related`, so every authenticated request fires a second query for
    `request.user.profile` (the serializer embeds it). Subclass `get_user` to
    `select_related("profile")`. (r3perf-H1, r6perf-H1 — OPEN.)

14. **`request.user.profile` without a guard.** Users predating the `post_save`
    signal, or made via `bulk_create`/fixtures, lack the auto-created row →
    `RelatedObjectDoesNotExist` 500. Guard every access with
    `get_or_create`/`hasattr` consistently. (r2-M1, r6-M1 → fixed `f9a0ee8`.)

15. **React: N individual nodes in an unmemoized child reconcile every parent
    state change.** ChaosScene emits 9,212 `<circle>`s diffed on every slider
    drag frame. Render static clouds as one `<path>`/canvas; wrap the chart in
    `React.memo`. Drag handlers firing per-tick also re-parse KaTeX every frame →
    `requestAnimationFrame`-coalesce + memo each `InlineMath`. (r3perf-C1/M8,
    r6perf-C1/M8 — OPEN.)

16. **`useMemo`/`useCallback` deps that are fresh literals each render.**
    `xDomain: [2.5, 4]` passed inline is a new array reference every render, so
    the referential dep check always misses and the D3 scale rebuilds. Destructure
    to primitive deps: `const [x0,x1]=xDomain; useMemo(..., [x0,x1,...])`.
    (r3perf-H3, r6perf-H3 — OPEN.)

17. **Cache correctness + test isolation.** `cache_page` + `vary_on_headers
    ("Accept-Language")` with a `?locale=` → header fallback: don't drop the vary
    blindly; fold `get_requested_locale()` into the cache key. `LocMemCache` is
    per-process (not shared across workers, not rolled back between tests) → use
    `DummyCache`/`cache.clear()` under test, Redis in prod. (r2tests-C2,
    r3perf-M6, r6perf-M5/M6 — OPEN.)

18. **CI silently runs a subset.** `python manage.py test courses` skipped the
    `accounts`/`payments` suites — the most security-sensitive code never gated
    merges. Run `manage.py test` (all apps); add `pip-audit`/`npm audit`/
    `manage.py check --deploy`. (r2tests-C1, r3arch-M4, r5-L5, r5research-N1 →
    fixed `f9a0ee8`.)

19. **Don't assert a framework default is missing — check the version.** Two
    audits (r1, then the r5 draft) both claimed `nosniff`/`Referrer-Policy` were
    absent; Django 5.2 emits them (and `X-Frame-Options: DENY`) by default. Only
    CSP was genuinely missing. Verify against vendored `global_settings.py`
    before reporting an "absent header". (r5-M4 correction.)

20. **Docs/data drift from a hidden source of truth.** Hardcoded "76 tests",
    a README equation table mis-ordered for positions 5–9 (breaking `/equation/N`
    deep links), "Adding an Equation" pointing at the wrong files, and a Docker
    quickstart whose compose files are `.gitignore`d. Generate tables/counts from
    the source of truth (the urlconf, `equations.json`, the seed). (r4docs-C1/H1–H6/M4.)

21. **One concept, N representations / N mechanisms.** Equation data lives in 4
    places (`equations.json`, seed hardcode, DB, scene TSX); localization is
    implemented 5 ways; a backend management command walks `parents[4]` into the
    frontend tree (layering violation). Pick one authority; generate the rest.
    (r3arch-C1/C2/H2.)

22. **Stringly-typed cross-layer contracts with no enforcement.** Scene registry
    keyed by DB `sort_order` (reorder → wrong scene), glossary `highlightClass`
    magic strings shared between imperative D3 and React, lesson slug must equal
    the file/equation slug — all fail only at runtime. Key by the stable `slug`;
    define `const HIGHLIGHTS = {...} as const`. (r3arch-M2/M6.)

23. **Email identity not normalized.** Registration check was case-sensitive
    while the Google path lowercased → `Me@x.com` and `me@x.com` become two
    accounts. Lowercase on every ingress; add a case-insensitive DB unique
    (`UniqueConstraint(Lower('email'))`), ideally via a custom user model while
    data is tiny. (r5research-H4/M5 — OPEN.)

24. **File upload validated by filename extension only.** No magic-byte/Pillow
    check → a `.png`-named polyglot is stored and served with an inferred
    `Content-Type`; old avatars are never deleted (unbounded disk growth). Decode
    + re-encode (`PIL.Image.open(fp).verify()`), reject SVG, serve with
    `Content-Disposition: attachment` from a cookieless path. (r1-M1, r5-M1,
    r6-L4, r5research-H3 — OPEN.)

25. **`noUnusedLocals` can't see dead *modules* or *exports*.** ~1,426 lines of
    orphaned frontend files, a dead API/hook cluster, 4 unused npm deps, and the
    `d3` meta-package (only submodules imported) survived tsc. Grep for importers
    across static + dynamic `import()` + tests before assuming a file is live.
    (r4deadcode-H1–H9/M1–M5, r6perf-L1/L2 — OPEN.)

26. **Vite `.env` is shared by dev server, build, AND Vitest.** A temporary
    `frontend/.env` (`VITE_API_URL=…`) added for a live preview shifts `API_BASE`
    and silently fails URL-asserting tests — which pass in isolation but fail in
    the full run. Strip any verification-only `.env` before `npm run build`/
    `vitest`. The dev server bakes `.env` in at startup, so a running preview is
    unaffected by removing it.

27. **Guard math singularities at the SOURCE, not just the display layer.** A
    pure compute fn with user/slider-reachable ÷0, `log(≤0)`, `asin(>1)`, or
    factorial-overflow returns `Infinity`/`NaN` — and a *downstream* consumer (a
    chart, an aggregate) ingests the raw value even when the on-screen readout
    formats it as `—`. Return `NaN` on out-of-domain input inside the function;
    compute factorials/products in log-space (a naive `k!` loses integer
    precision by `k=20`, overflows by `k≈170`). (`subjectResults.ts`; audit
    2026-06-23 M1–M5/L1–L5.)

28. **Duplicate object-literal keys: the build catches them, the runtime tests
    can't.** Adding a `Record<id, …>` entry whose id already exists is a `tsc`
    error (`TS1117`), but Vitest sees only the merged object (JS keeps the last
    duplicate), so an integrity test passes while `npm run build` fails. When
    extending the keyed data modules (`equationFacts`, `conceptChecks`,
    `prerequisites`, …), trust the build — not just the test — as the dup-key
    guard. (Hit while extending `prerequisites.ts`.)

29. **Env-template drift: `.env.example` lies if it's hand-maintained.** Example
    files silently fall behind the actual `os.getenv(...)` / `import.meta.env.*`
    reads, so a fresh clone is missing vars or sets dead ones. Verify templates
    against code mechanically: `comm -23 <(grep code-reads) <(grep documented-keys)`
    should be empty for both tiers. Document load precedence too (here:
    `backend/.env` overrides root `.env`). (Hit reconciling the 3 `.env.example`.)

---

## Reusable tools

Add entries here for any reusable harness you build in `scripts/`. Format:
script name → one-line "what bug it was built to catch".

- `scripts/add_subject_glossaries.py` — idempotently fills the empty
  `"glossary": []` lists in `seed_subjects.py` (subject equations ids 18–81)
  with authored term/colour/tooltip data. Built to close the "incomplete
  lessons for all subjects" gap; re-running is a no-op. Does NOT validate
  variable/preset/lesson correctness. Re-seed with `manage.py seed_subjects`
  after running.
- The verified findings live in [`docs/audits/`](audits/) (r1–r6, 2026-06-14) —
  read the relevant lens before re-deriving a finding. Per global rule §3, when
  you add a backend route harness, drive the real route handler (not just the
  serializer/template), and record it here.

---

## Chronological log

Newest first. Five lines max per entry. File:line citations beat prose.

### 2026-06-26 · Three `.env.example` files disagreed; vars undocumented
Symptom: root / `backend/` / `frontend/` `.env.example` contradicted each other; ~9 backend + 3 VITE vars the code reads were undocumented; load precedence undocumented; root duplicated `DJANGO_SECRET_KEY`.
Cause: hand-maintained templates drifted from `settings.py` (`os.getenv`) and `import.meta.env.*` reads; root file mixed both tiers.
Fix: `backend/.env.example` made authoritative (all 26 backend vars, grouped); `frontend/.env.example` all 6 VITE vars with in-code defaults; root `.env.example` → precedence guide (dup key removed). Coverage asserted by `comm -23` grep diff. (r4-docs M1/M2/M3.)
**Lesson:** new pattern #29 — verify env templates against the actual code reads mechanically; document which `.env` wins.

### 2026-06-23 · Slider-reachable math singularities feed Infinity/NaN downstream
Symptom: `subjectResults.ts` compute fns hit ÷0 / log(≤0) / factorial-overflow at slider extremes (Doppler at Mach 1, Nernst Q=0, condition-number σ₂=0, Poisson k=20).
Cause: pure math with no domain guard; the result readout was shielded (`formatResultValue`→`—`) but the response curve ingested raw `Infinity`/`NaN`.
Fix: return `NaN` on out-of-domain input at the source (`subjectResults.ts` ~10 fns); Poisson in log-space; id-79 ÷0 guard. Commits `c0f2c54`→`8c18c41`. Surfaced by the 10-agent audit (`docs/audits/2026-06-23-*`).
**Lesson:** new pattern #27 — guard singularities at the source, not just the display layer; a downstream consumer (chart) sees the raw value.

### 2026-06-23 · A local `.env` override silently fails URL-asserting tests
Symptom: `vitest` showed 5 `client.test.ts` failures in the full run, but the files passed in isolation.
Cause: a temporary `frontend/.env` (`VITE_API_URL=…:8001`) added for a live preview — Vitest reads `.env` too, shifting `API_BASE` away from the `:8000` the tests assert.
Fix: remove `frontend/.env` before running the suite. The dev server bakes `.env` in at startup, so the already-running preview still works.
**Lesson:** new pattern #26 — Vite `.env` is shared by dev server, build, AND test runner. Verification scaffolding in `.env` leaks into tests; strip it before `vitest`/`npm run build`.

### 2026-06-23 · Red build: unused import trips `noUnusedLocals`
Symptom: `npm run build` / CI `tsc -b` failed on `main` (HEAD f9a0ee8), blocking every frontend ship.
Cause: `AuthProvider.test.tsx:5` imported `saveTokens` but never used it; `noUnusedLocals` is on.
Fix: `frontend/src/auth/AuthProvider.test.tsx:5` — drop the unused import. Verified `npm run build` green.
**Lesson:** `noUnusedLocals`/`noUnusedParameters` block the *build*, not just lint — a dead import in a **test** file reddens CI. tsc checks test files too; run `npm run build` (not only `vitest`) before claiming green.

### 2026-06-22 · Stripe webhook idempotency + correct downgrade keying
Symptom: canceled users kept Pro; redelivered events re-applied; `MultipleObjectsReturned` could 500-loop.
Cause: downgrade keyed on blank-able `stripe_subscription_id`; no `event.id` dedup; `customer_id` not unique.
Fix: `payments/models.py` `ProcessedStripeEvent(event_id unique)`; lookups by `stripe_customer_id`; non-empty-unique constraint. Commit `f9a0ee8`.
**Lesson:** patterns #1, #2. (Audits r2-H4/H5, r6-C1/C2.)

### 2026-06-22 · Atomic invite redemption + IP validation
Symptom: malformed `X-Forwarded-For` 500'd registration, orphaning a gate-bypassing account.
Cause: client IP stored via `.create()` (no `full_clean`); User committed before a non-atomic compensating delete.
Fix: `accounts/invites.py:31` `validate_ipv46_address`; `accounts/views.py:73,119` wrap save+redeem in `transaction.atomic()`. Commit `f9a0ee8`.
**Lesson:** patterns #3, #4, #5. (Audits r2-C1/C2/H1, r6-C3/H1/H2/H3.)

### 2026-06-22 · Auth throttles + generic errors + UUIDv4 anon progress
Symptom: login brute-forceable, registration sprayable + email-enumerable; anon progress cross-tenant writable.
Cause: no `DEFAULT_THROTTLE_CLASSES`; distinct error messages; anon `user_id` was a free-form `CharField`.
Fix: `accounts/throttles.py` `AuthRateThrottle` on login/google/register/refresh; `courses/serializers.py:14` `validate_uuid4_user_id`. Commit `f9a0ee8`.
**Lesson:** patterns #7, #8. (Audits r1-H1/H2/H3, r5-H1/H2/H3/N1.)

### 2026-06-22 · Progress merge for anon/bulk sync + completed_at
Symptom: bulk sync regressed higher server progress; anon completions stored `completed_at = NULL`; unknown ids dropped silently.
Cause: blind `setattr` overwrite; missing `completed_at` block on the anon path; skipped ids absent from `errors`.
Fix: server-side monotonic merge + `completed_at` maintenance on `update_progress`; skipped ids reported. Commit `f9a0ee8`.
**Lesson:** patterns #9, #10, #11. (Audits r2-H2/H3, r6-H4/H5/H6/M5.)

### 2026-06-22 · Security-headers / CSP middleware
Symptom: no Content-Security-Policy anywhere (backstop gap for the legal-page `dangerouslySetInnerHTML` + localStorage refresh token).
Cause: prod settings set HSTS/SSL/secure-cookies but never a CSP; nginx had caching headers only.
Fix: `formulas_backend/middleware.py` `SecurityHeadersMiddleware` sets CSP + `nosniff` + `Referrer-Policy`. Commit `f9a0ee8`.
**Lesson:** pattern #19 — CSP was the *only* genuinely-missing header; nosniff/referrer were already Django defaults. (Audits r1-M4, r5-M4.)

### 2026-06-22 · CI runs the whole backend suite
Symptom: ~90 auth + Stripe tests existed but never ran in CI; a regression in money/auth shipped green.
Cause: `ci.yml` ran `python manage.py test courses` only.
Fix: `.github/workflows/ci.yml:45` → `python manage.py test -v 2` (all apps). Commit `f9a0ee8`.
**Lesson:** pattern #18. (Audits r2tests-C1, r3arch-M4, r5-L5, r5research-N1.)

### 2026-06-22 · Boot refresh preserves session on transient network error
Symptom: a momentary network blip on page reload logged the user out.
Cause: boot `refreshUser` unconditionally cleared tokens on a `null` refresh, even when `null` came from a `TypeError`.
Fix: distinguish transient refresh failure from a genuine 401; keep prior session on transient. Commit `f9a0ee8`.
**Lesson:** a `null` return conflates "rejected" with "couldn't reach server" — signal the transient case explicitly. (Audits r2-M5, r6-M6.)

### 2026-06-22 · Profile guard + streak query
Symptom: `me`/`update_profile` 500'd for users with no profile row; dashboard streak truncated at 100 events.
Cause: direct `request.user.profile` access; streak walked `LearningEvent...[:100]`.
Fix: `accounts/views.py:141,149` `Profile.objects.get_or_create`; `courses/views.py:419` `.dates("created_at", "day")`. Commit `f9a0ee8`.
**Lesson:** patterns #14, #12. (Audits r2-M1/M3, r6-M1/M3.)

---

## Open audit backlog

Confirmed against HEAD as **still open** (not in `f9a0ee8`'s scope). Grouped by
lens; `id · file — one-line lesson`. Full detail + fixes in [`docs/audits/`](audits/).
When you fix one, move it up into the Chronological log with its commit SHA.

**Performance** (`r3`/`r6-performance`)
- C1 · `scenes/ChaosScene.tsx:263` — 9,212 React `<circle>`s reconcile every drag; single `<path>`/canvas + `React.memo`. (#15)
- H1 · SimpleJWT `get_user` — no `select_related("profile")`; +1 query on all authed traffic. (#13)
- H2 · `data/equations.ts:1` — 37 KB `equations.json` statically bundled into every scene chunk; seed React Query via `initialData`.
- H3/M8 · `charts/simpleChart.ts:63` + `LiveFormula.tsx` — D3 scales + KaTeX rebuilt every render/drag tick; primitive deps + memo + rAF-coalesce. (#15,#16)
- M1 · `courses/views.py:318` — `learning_dashboard` = 7 uncached queries; collapse + cache seed-invariant counts.
- M2 · `LearningEvent.Meta` — add `Index(["user","-created_at"])` for the streak scan.
- M3/M4 · KaTeX double-render in `AutoFitDeferredInlineMath`; per-text-node regex/token rebuild in `richText.tsx`.
- M5/M6 · locale-aware cache key (not header vary); cache `retrieve`. LocMemCache → Redis for multi-worker. (#17)
- M7 · `useUpdateProgress` invalidates the wrong key (`["equations"]` list, not the detail key).

**Dead code** (`r4-deadcode`, `r6-performance` L1/L2)
- H1–H9 · ~1,426 lines orphaned: `AuthModal`+`LazyAuthModal`, `InteractiveEquation`, `PythagoreanTheoremExplorer`, `GenericEquationScene`, `teaching/hooks-data.ts`, `scenes/layout.ts`, `math/FormulaText.tsx`, `teaching/RealWorldContext.tsx`, `hooks/useMediaQuery.ts`. (#25)
- M1/M2 · 4-of-5 React-Query hooks dead → cascade-remove `api` client methods (`courses` block, `search`, `equations.list/updateProgress`, `payments.status`).
- M5/L2 · drop unused deps (`@radix-ui/*` ×3, `@use-gesture/react`, `framer-motion`); replace `d3` meta-package with the 5 imported submodules.
- B1/B2 · `equation_atlas_legacy` + aliases, `course_detail`, `subscription_status` — remove after confirming no external API consumers.

**Docs** (`r4-docs`)
- C1 · README Docker quickstart fails from a clean clone (compose/Dockerfiles `.gitignore`d). (#20)
- H3/H4/M4 · API table omits ~75% of routes + mislabels the anon progress endpoint; no Architecture/auth/Pro/invite docs; 17-equations table mis-ordered (breaks `/equation/N`). (#20)
- H6 · "Adding an Equation" points at the wrong files (`equations.ts` not `.json`; `EquationVisualization` not `sceneRegistry`). → fixed PR #3 (`78bf8c9`).
- M1/M2/M3 · three `.env.example` files disagreed; vars + load precedence undocumented. → fixed 2026-06-26 (see chronological log).
- M8/L6 · no `LICENSE` (still open — needs a licensing decision); `SECURITY.md` added; L5 CI job rename done (`78bf8c9`). L4 README SQLite-vs-Postgres still open.

**Architecture** (`r3-arch`)
- C1/C2 · quadruple source of truth for equation data; backend command walks `parents[4]` into the frontend tree. (#21)
- H1 · `TeachableEquation.tsx` is an 811-line god component; lift the pure merge helpers first.
- H2 · 5 parallel localization mechanisms; no cross-tier `normalize_locale` contract test. (#21)
- H3/H4 · 5 copy-pasted Pro-gate idioms, no `IsProUser(BasePermission)`; progress field-copy + 3 serializers duplicated.
- M2/M6 · scene registry keyed by `sort_order`; glossary `highlightClass` stringly-typed D3↔React. (#22)
- M3/M5 · `UserSettings` written per-user but never read by the frontend; `payments` mutates `accounts.Profile.tier` via a lazy cross-app import.

**Research / currency** (`r5-research`)
- C1 · `Django==5.2.1` hard-pinned off the 5.2 security line; bump + `pip-audit`.
- H3 · avatar served via Django `SERVE_MEDIA` path with extension-inferred type — the real foot-gun. (#24)
- H4/M5 · email not DB-unique + case-sensitive check; normalize + case-insensitive unique, ideally a custom user model. (#23)
- M2/M3 · pin `stripe.api_version`; add a `ProcessedStripeEvent` idempotency guard before billing go-live (partly done in `f9a0ee8`).
- M4 · `react-katex` is a maintenance risk but used in 9 files (wrapped by in-house renderer) — a scoped refactor, not a free deletion.

**Residual security** (`r1`/`r5-security`)
- M1 · avatar upload validated by extension only — no Pillow/magic-byte check; old files never deleted. (#24)
- M2/M3 · `X-Forwarded-For` trusted for IP audit; `SECURE_PROXY_SSL_HEADER` trusts client `X-Forwarded-Proto` (verify the cPanel/Passenger proxy overwrites it).
- M5 · refresh token in `localStorage` (XSS-exfiltratable, 30-day) — move to `HttpOnly Secure SameSite` cookie.
- L1/L3/L4 · DOMPurify the legal-page HTML; gate the API landing page behind `DEBUG`; bind Stripe upgrade to a configured Pro price id.

---

## Update protocol

1. Fix the bug.
2. Append a 5-line entry under "Chronological log" (newest first).
3. If the lesson is new, add a "Patterns to scan for FIRST" bullet.
4. Commit the fix + the journal entry **together**. Same SHA.

Skip step 2 and the journal decays. Don't.
