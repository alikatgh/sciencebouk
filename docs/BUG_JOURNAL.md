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

### 2026-06-27 — Terms popup registry had 4 entries
- **Symptom:** `terms.json` only covered auth roles from ARCHITECTURE.md; equation variables had no popups.
- **Cause:** `build_terms_registry.py` only parsed markdown glossaries/bullets; sciencebouk terms live in `equations.json` + `whatItMeans.ts`.
- **Fix:** `parse_frontend_data()` + `--frontend-data`; regen to 240 full-rich terms; `test_terms_registry.py`.
- **Lesson:** non-Markdown learning data needs an explicit parser path in the registry builder.

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
    `select_related("profile")`. (r3perf-H1, r6perf-H1 → fixed 2026-06-26, `accounts/authentication.py`.)

14. **`request.user.profile` without a guard.** Users predating the `post_save`
    signal, or made via `bulk_create`/fixtures, lack the auto-created row →
    `RelatedObjectDoesNotExist` 500. Guard every access with
    `get_or_create`/`hasattr` consistently. (r2-M1, r6-M1 → fixed `f9a0ee8`.)

15. **React: N individual nodes in an unmemoized child reconcile every parent
    state change.** ChaosScene emits 9,212 `<circle>`s diffed on every slider
    drag frame. Render static clouds as one `<path>`/canvas; wrap the chart in
    `React.memo`. Drag handlers firing per-tick also re-parse KaTeX every frame →
    `requestAnimationFrame`-coalesce + memo each `InlineMath`. (r3perf-C1/M8,
    r6perf-C1/M8 → ChaosScene cloud memoized + `InlineMath` memoized 2026-06-26;
    canvas/path rewrite still optional.)

16. **`useMemo`/`useCallback` deps that are fresh literals each render.**
    `xDomain: [2.5, 4]` passed inline is a new array reference every render, so
    the referential dep check always misses and the D3 scale rebuilds. Destructure
    to primitive deps: `const [x0,x1]=xDomain; useMemo(..., [x0,x1,...])`.
    (r3perf-H3, r6perf-H3 → fixed 2026-06-26 in `useChartFrame` — stabilizes every D3 scene's scales.)

17. **Cache correctness + test isolation.** `cache_page` + `vary_on_headers
    ("Accept-Language")` with a `?locale=` → header fallback: don't drop the vary
    blindly; fold `get_requested_locale()` into the cache key. `LocMemCache` is
    per-process (not shared across workers, not rolled back between tests) → use
    `DummyCache`/`cache.clear()` under test, Redis in prod. (r2tests-C2,
    r3perf-M6, r6perf-M5/M6 → test isolation fixed 2026-06-26 via DummyCache-under-test;
    prod key covered by cache_page's full-path; Redis configurable via `DJANGO_CACHE_BACKEND`.)

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
    data is tiny. (r5research-H4/M5 → normalization + case-insensitive auth fixed
    2026-06-26; the DB `Lower('email')` unique constraint remains optional defense-in-depth.)

24. **File upload validated by filename extension only.** No magic-byte/Pillow
    check → a `.png`-named polyglot is stored and served with an inferred
    `Content-Type`; old avatars are never deleted (unbounded disk growth). Decode
    + re-encode (`PIL.Image.open(fp).verify()`), reject SVG, serve with
    `Content-Disposition: attachment` from a cookieless path. (r1-M1, r5-M1,
    r6-L4, r5research-H3 → magic-byte validation + old-file cleanup done
    2026-06-26 (PRs #9/#10); PIL re-encode / SVG-reject / Content-Disposition
    remain optional hardening.)

25. **`noUnusedLocals` can't see dead *modules* or *exports*.** ~1,426 lines of
    orphaned frontend files, a dead API/hook cluster, 4 unused npm deps, and the
    `d3` meta-package (only submodules imported) survived tsc. Grep for importers
    across static + dynamic `import()` + tests before assuming a file is live.
    (r4deadcode-H1–H9/M1–M5, r6perf-L1/L2 → all fixed 2026-06-26, PRs #5/#6/#7.)

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

30. **Side-effect imports are invisible to a `from`-grep.** `import "d3-transition"`
    (prototype augmentation, no binding) never matches `from ['"]…['"]`, so a dep it
    needs looks unused. When pruning/migrating deps, grep BOTH `from '…'` AND bare
    `import '…'`; and trust the *build*, not the tests — a missing runtime submodule
    fails `tsc`/`vite build` while Vitest stays green. (Missed `d3-transition`
    migrating off the `d3` meta-package.)

31. **Replacing a stored upload orphans the old artifact.** A re-upload that only
    rewrites the DB pointer (`avatar_url`, a file path) leaves the previous file
    on disk forever. When replacing, delete the old one — but guard: only paths
    under the media dir, never the file just written, and skip external URLs
    (OAuth pictures). (Hit on avatar re-upload.)

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
- `scripts/gen_what_it_means.mjs` — assembles `frontend/src/data/whatItMeans.ts`
  from a JSON array of authored "What does it mean?" entries (the output of the
  `author-what-it-means` Sonnet workflow). Does the precise TS/escaping so the
  generated module always compiles; does NOT judge prose quality (that's
  `whatItMeans.test.ts` + a preview check). Usage:
  `node scripts/gen_what_it_means.mjs /tmp/wim_entries.json`.
- The verified findings live in [`docs/audits/`](audits/) (r1–r6, 2026-06-14) —
  read the relevant lens before re-deriving a finding. Per global rule §3, when
  you add a backend route harness, drive the real route handler (not just the
  serializer/template), and record it here.

---

## Chronological log

Newest first. Five lines max per entry. File:line citations beat prose.

### 2026-06-28 · Avatar served without Content-Disposition: attachment (residual security r5research-H3 / r1-M1 / r6-L4)
Symptom: `SERVE_MEDIA_FROM_DJANGO` mode (dev/staging) used Django's raw `static()` helper which served avatar files with no `Content-Disposition` header — letting the browser render them inline, leaving a content-sniffing attack surface even after magic-byte validation.
Cause: `urls.py` wired `static(MEDIA_URL, document_root=MEDIA_ROOT)` with no post-processing of response headers.
Fix: replaced with a custom `serve_media` view (`formulas_backend/views.py`) that wraps `django.views.static.serve` and appends `Content-Disposition: attachment` + `Cache-Control: no-store, private` on 200 responses; `safe_join` guard preserves path-traversal protection. 286 tests pass.
Lesson: see pattern #24 — magic-byte validation is not enough; `Content-Disposition: attachment` prevents browsers from executing a valid-image polyglot as an HTML/JS resource.

### 2026-06-26 · Case-sensitive email allowed duplicate accounts (security/correctness, r5research-H4/M5)
Symptom: registration's existence check + storage were case-sensitive while the Google path lowercases — so `Me@x.com` could register, then a Google sign-in (lowercased to `me@x.com`) created a SECOND account.
Cause: `RegisterSerializer.validate_email` checked/stored the email as-typed; the default auth backend matches the username (=email) case-sensitively.
Fix: register lowercases + `email__iexact` check (`accounts/serializers.py`); new `CaseInsensitiveModelBackend` makes login case-insensitive for both new (lowercase) and pre-existing (mixed-case) accounts — no data migration. 4 tests; 286 backend tests pass.
**Lesson:** pattern #23 — normalize email at EVERY ingress (register / login / OAuth) and authenticate case-insensitively; one case-sensitive path reintroduces duplicates.

### 2026-06-26 · Tests shared a process-wide cache_page cache (test-isolation #17)
Symptom: the equation-list view is `cache_page`'d, but tests ran on LocMemCache with no clearing between tests — a cached list response could leak a stale count into a later test.
Cause: no per-test cache isolation; LocMemCache is per-process and not rolled back between tests.
Fix: `settings.py` — under `if "test" in sys.argv` swap `CACHES["default"]` to `DummyCache` (mirrors the existing throttle-rate test override). Added a regression test (list → create equation → list reflects it). 282 backend tests pass.
**Lesson:** pattern #17 — disable `cache_page` in tests (DummyCache) so cached responses can't leak; prod cache *correctness* here is already covered by cache_page's full-path key (the locale lives in `?locale=` / the `Vary`).

### 2026-06-26 · D3 scales rebuilt every render; ChaosScene re-diffed 9,212 circles per frame (perf #15/#16)
Symptom: `useChartFrame` rebuilt every scale on every render; ChaosScene re-reconciled its ~9,212-point static bifurcation cloud on every slider-drag frame.
Cause: scale `useMemo` deps were the inline-literal `xDomain`/`yDomain` arrays (a fresh ref each render); the cloud's `<circle>`s were inline JSX (recreated each render).
Fix: `useChartFrame` (`charts/simpleChart.ts`) keys scales + coord-helpers on the domain VALUES (destructured primitives) — a cascade fix for every D3 scene; ChaosScene memoizes the cloud JSX on the now-stable scales. tsc/163 tests/build green; preview-verified (marker tracks r: x 435→826 for r 3.2→3.9; cloud stable at 9,212 circles; no console errors).
**Lesson:** patterns #15/#16 — destructure inline-array deps to primitives so memos hold; memoize large static element collections so a sibling state change doesn't re-diff them.

### 2026-06-26 · README drift: stale stack + incomplete/mis-ordered tables (docs H3/H4)
Symptom: tech-stack listed removed deps (Konva, Framer Motion) + a stale D3 version; the API table omitted ~75% of routes and mislabeled the anon-progress endpoint; the "17 Equations" table order didn't match `/equation/N`.
Cause: docs drifted from code (and from this session's dep pruning + dead-code removal).
Fix: `README.md` — visualization row → modular D3/SVG; API table rebuilt complete + grouped (auth/Pro marked, anon-progress labeled); 17-equations table reordered to the canonical `equations.json` ids.
**Lesson:** when you prune a dep or move a feature, grep the README for it — public docs drift silently; verify route tables against `urls.py` and the equation table against `equations.json`.

### 2026-06-26 · N+1 profile query on every authenticated request (perf r3perf-H1/r6perf-H1)
Symptom: stock SimpleJWT `get_user` does `User.objects.get(...)` with no `select_related`, so the first `request.user.profile` access (the user serializer embeds it) fired a second query on every authenticated request.
Cause: SimpleJWT doesn't `select_related` the profile OneToOne.
Fix: `accounts/authentication.py` `ProfileJWTAuthentication.get_user` mirrors stock 5.5.1 but uses `select_related("profile")`; wired via `DEFAULT_AUTHENTICATION_CLASSES`. Tests: 0 queries to access profile post-auth + `/auth/me/` still 200. 281 backend tests pass.
**Lesson:** pattern #13 — override the auth class's `get_user` to `select_related` the embedded relation; mirror the upstream method exactly and re-verify on SDK upgrade.

### 2026-06-26 · Memoized math + rich-text rendering (perf M3/M4)
Symptom: `InlineMathRenderer` re-ran KaTeX on every parent render (e.g. `AutoFitDeferredInlineMath`'s per-frame scale change during a slider drag); `richText` rebuilt the token list + matcher `RegExp` for every text node, every render.
Cause: no memoization — react-katex re-renders unconditionally; tokens/regex (pure functions of variables+glossary) were rebuilt per node.
Fix: `memo(InlineMathRenderer)` skips re-render when `math` is unchanged; `prepareRichText()` builds tokens+regex once, memoized in `LessonMarkdown` and threaded through `enhanceRichTextNodes`. Output identical: tsc + 163 tests + build green; `/equation/1` verified in preview (KaTeX + linked terms render, no console errors).
**Lesson:** reinforces #15/#16 — memo components whose render is expensive-and-pure by props; hoist pure per-render derivations (token lists, regexes) above the nodes that consume them. (AutoFit's one-time mount still renders measure+display copies; the per-frame cost is what's gone.)

### 2026-06-26 · X-Forwarded-For client-IP was spoofable (security M2/M3)
Symptom: `get_request_meta` logged `forwarded_for.split(",")[0]` — the *leftmost* XFF entry, which is fully client-controlled, so the audited invite-redemption IP could be spoofed.
Cause: the leftmost XFF hop is the original client's claim; only the rightmost hops (added by our own proxies) are trustworthy.
Fix: `client_ip_from_forwarded()` (`accounts/invites.py`) trusts only the rightmost `TRUSTED_PROXY_COUNT` hops (new `DJANGO_TRUSTED_PROXY_COUNT`, default 1), falling back to `REMOTE_ADDR`; documented the `SECURE_PROXY_SSL_HEADER` proxy-overwrite requirement. 279 backend tests pass.
**Lesson:** the trustworthy XFF entry is the rightmost-N (proxy-added), never the leftmost (client-claimed); make the proxy depth a setting.

### 2026-06-26 · Pinned stripe.api_version (security M2)
Symptom: `payments/views.py` set only `stripe.api_key`; the API version was implicit, so an SDK upgrade could silently change request/response shapes.
Cause: no explicit `stripe.api_version` pin.
Fix: `stripe.api_version = "2025-05-28.basil"` (`payments/views.py:16`) — the version stripe-python 12.x targets; a no-op now (the SDK already defaults to it) but locked against silent upgrade drift. 25 payments tests pass.
**Lesson:** pin third-party API versions explicitly — the SDK's implicit default moves on upgrade. (Inbound webhook payload version is set in the Stripe dashboard, not here, so this only governs outbound calls.)

### 2026-06-26 · Collapsed redundant dashboard queries 7→5 (perf M1)
Symptom: `learning_dashboard` issued a separate `completed` COUNT and a standalone `Equation.objects.count()` that duplicated data it already fetched.
Cause: `completed` re-counted what `completed_equation_ids` already lists; `totalEquations` re-counted what the per-category `total`s already sum to.
Fix: `completed = len(completed_equation_ids)`; `total_equations = sum(row["total"] …)` over the materialized category rows (`courses/views.py:407`). 7→5 queries, byte-identical output; 18 dashboard tests pass.
**Lesson:** before adding a COUNT/aggregate, check whether a list/aggregate already in the view yields it — `len()` and a row-sum beat extra round-trips. (Caching seed-invariant counts is a further, riskier step — left open.)

### 2026-06-26 · Avatar re-upload leaked old files — delete previous local avatar (security M1, completion)
Symptom: every avatar re-upload wrote a new `media/avatars/<id>_<uuid>.<ext>` but never removed the prior file — unbounded storage growth.
Cause: `upload_avatar` only rewrote `profile.avatar_url`; old files were orphaned on disk.
Fix: `_remove_old_local_avatar()` (`accounts/views.py`) deletes the previous file, but only when the old URL is under `MEDIA_URL`/`avatars/` (skips external Google OAuth pictures) and isn't the file just written. 2 tests (re-upload deletes / external URL untouched); 275 backend tests pass.
**Lesson:** new pattern #31 — replacing a stored upload must delete the old artifact, with path guards.

### 2026-06-26 · Avatar upload validated by extension only — added magic-byte check (security M1)
Symptom: `upload_avatar` accepted any file whose *name* ended in an image extension — a non-image `evil.png` was stored under `media/avatars/` and served.
Cause: validation read the `file.name` extension only; never inspected the bytes.
Fix: `accounts/views.py` — `_detect_image_type()` matches PNG/JPEG/GIF/WebP signatures, rejects on no match, and derives the saved extension from the detected type (never the client name). 3 new tests (reject spoof / accept PNG / extension-follows-content); 273 backend tests pass.
**Lesson:** realizes pattern #24 — validate upload *content*, not the filename; dependency-free magic-byte checks cover the common web image types.

### 2026-06-26 · Composite index for the dashboard streak scan (perf M2)
Symptom: `learning_dashboard` streak runs `LearningEvent.objects.filter(user=user).dates("created_at","day")` against only a single-column `created_at` index + the FK index — neither serves the user-scoped, date-ordered scan well.
Cause: no composite `(user, created_at)` index for that access pattern.
Fix: added `Index(["user","-created_at"])` to `LearningEvent.Meta` (`courses/models.py:214`) + migration `0010_…`. `makemigrations --check` clean; index applies; 270 backend tests pass.
**Lesson:** a single-column index on `created_at` plus an FK index on `user` do NOT add up to a composite `(user, -created_at)` index for `filter(user).dates(created_at)` — match the index to the query's leading columns.

### 2026-06-26 · Removed 4 dead React-Query hooks + orphaned api methods (r4-deadcode M1/M2)
Symptom: 4 of 5 hooks in `api/hooks.ts` had zero consumers (`useEquations`, `useCourse`, `useSearchEquations`, `useUpdateProgress`); only `useEquation` is live.
Cause: hooks + the `api` client methods they exclusively fed outlived the UI that used them.
Fix: removed the 4 hooks and the now-orphaned `api.equations.list`/`updateProgress`, `api.courses` (+`CourseResponse`/`LessonResponse`), `api.search`, `api.payments.status`, `ProgressResponse`; trimmed `client.test.ts`. Kept `equations.listAll`/`get` (live) and `progress.update` (canonical). tsc + 163 tests + build green.
**Lesson:** reinforces #25/#30 — a dead hook orphans its api method only if no OTHER caller exists; distinguish siblings (`list` dead vs `listAll` live) and discount test-only references.

### 2026-06-26 · Pruned 6 unused npm deps + migrated d3 meta → 6 submodules (r4-deadcode M5/L2)
Symptom: `package.json` shipped `framer-motion`, `@use-gesture/react`, 3 unused `@radix-ui/*`, and the whole `d3` meta-package, though only 6 d3 submodules + 8 radix were imported.
Cause: deps accreted; the just-removed H1–H9 files were the last consumers of some.
Fix: removed the 6 unused deps; replaced `d3`/`@types/d3` with direct `d3-{array,drag,scale,selection,shape,transition}` + matching `@types/*`. Lockfile −868 lines, npm-ci-synced. tsc + 165 tests + build green.
**Lesson:** new pattern #30 — the audit said "5 submodules" but missed `d3-transition` (imported only as a side-effect); a `from`-only grep can't see it. Build caught it, tests didn't.

### 2026-06-26 · Removed 1,426 lines of orphaned frontend code (r4-deadcode H1–H9)
Symptom: 10 modules with zero importers still in the tree: `AuthModal`+`LazyAuthModal`, `InteractiveEquation`, `PythagoreanTheoremExplorer`, `GenericEquationScene`, `teaching/hooks-data`, `scenes/layout`, `math/FormulaText`, `teaching/RealWorldContext`, `hooks/useMediaQuery`.
Cause: superseded by the data-driven scene + dedicated auth pages; never deleted.
Fix: removed all 10 (exactly 1,426 lines). Re-verified each unreferenced against HEAD with a *substring* grep (not import-path only), confirming no barrel re-export / string-keyed dynamic import; `scenes/layout` is distinct from the live `layoutMode`. tsc + 165 tests + build all green.
**Lesson:** reinforces pattern #25 — before deleting "dead" code, grep the bare symbol (catches barrel re-exports and dynamic-import path strings an import-only grep misses); also beware shell glob eating `grep --include` flags (a false ZERO-importers result).

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
- C1 · ChaosScene 9,212-circle re-diff → cloud memoized 2026-06-26 (PR #19). ✓ (single `<path>`/canvas rewrite still optional.)
- H1 · SimpleJWT `get_user` N+1 → `select_related("profile")` 2026-06-26 (PR #16). ✓
- H2 · `data/equations.ts:1` — 37 KB `equations.json` statically bundled into every scene chunk; seed React Query via `initialData`. **OPEN.**
- H3/M8 · D3 scales rebuilt every render → fixed in `simpleChart.ts` 2026-06-26 (PR #19); KaTeX memoized (PR #15). ✓ (per-tick rAF-coalesce of drag handlers still optional.)
- M1 · `learning_dashboard` queries collapsed 7→5 on 2026-06-26 (see log). **Still open (optional):** cache the seed-invariant counts.
- M2 · `LearningEvent.Meta` index for the streak scan. → fixed 2026-06-26 (see chronological log); migration `0010`.
- M3/M4 · math + rich-text rendering memoized 2026-06-26 (see log) — per-frame KaTeX re-render and per-node token/regex rebuild eliminated. (AutoFit's one-time mount double-render remains, acceptable.) ✓
- M5/M6 · test isolation done via DummyCache 2026-06-26 (PR #20); prod key already includes locale (full-path); Redis configurable via `DJANGO_CACHE_BACKEND`. ✓ (caching `retrieve` still optional.)
- M7 · `useUpdateProgress` wrong-key invalidation — **resolved by removal**: the hook was deleted as dead code (PR #7).

**Dead code** (`r4-deadcode`, `r6-performance` L1/L2)
- H1–H9 · ~1,426 lines orphaned. → fixed 2026-06-26 (see chronological log); all 10 files removed, build/tests green.
- M1/M2 · 4-of-5 React-Query hooks dead → cascade-remove orphaned `api` methods. → fixed 2026-06-26 (see chronological log).
- M5/L2 · drop unused deps + d3-meta→submodules. → fixed 2026-06-26 (see chronological log); note it was **6** submodules, not 5 (`d3-transition` side-effect import).
- B1/B2 · `equation_atlas_legacy` + aliases, `course_detail`, `subscription_status` are now frontend-unused (confirmed 2026-06-26) but are **deliberately retained** — they are public, "legacy"-named HTTP routes; removal is outward-facing and needs the owner to confirm no external/bookmarked consumers. Now documented in the README API table.

**Docs** (`r4-docs`)
- C1 · README/CONTRIBUTING Docker quickstart fixed 2026-06-26 — both now state the compose files are private infra, not in the repo (no more failing `docker compose up`). (#20)
- H3/H4/M4 · API table rebuilt + anon-progress relabeled + 17-equations table reordered (2026-06-26); `docs/ARCHITECTURE.md` added covering structure/auth/Pro/invites/billing/caching. ✓ (#20)
- H6 · "Adding an Equation" points at the wrong files (`equations.ts` not `.json`; `EquationVisualization` not `sceneRegistry`). → fixed PR #3 (`78bf8c9`).
- M1/M2/M3 · three `.env.example` files disagreed; vars + load precedence undocumented. → fixed 2026-06-26 (see chronological log).
- M8/L6 · `LICENSE` added 2026-06-26 — **GPL-3.0-or-later** (user's choice); `SECURITY.md` added; L5 CI job rename done (`78bf8c9`). L4 README already documents SQLite(dev)/Postgres(prod) correctly. ✓

**Architecture** (`r3-arch`)
- C1/C2 · quadruple source of truth for equation data; backend command walks `parents[4]` into the frontend tree. (#21)
- H1 · `TeachableEquation.tsx` is an 811-line god component; lift the pure merge helpers first.
- H2 · 5 parallel localization mechanisms; no cross-tier `normalize_locale` contract test. (#21)
- H3/H4 · 5 copy-pasted Pro-gate idioms, no `IsProUser(BasePermission)`; progress field-copy + 3 serializers duplicated.
- M2/M6 · scene registry keyed by `sort_order`; glossary `highlightClass` stringly-typed D3↔React. (#22)
- M3/M5 · `UserSettings` written per-user but never read by the frontend; `payments` mutates `accounts.Profile.tier` via a lazy cross-app import.

**Research / currency** (`r5-research`)
- C1 · `Django==5.2.1` hard-pinned off the 5.2 security line; bump + `pip-audit`.
- H3 · avatar served via Django `SERVE_MEDIA` path with extension-inferred type — the real foot-gun. (#24) → `Content-Disposition: attachment` + `Cache-Control: no-store, private` added to custom `serve_media` view 2026-06-28. ✓
- H4/M5 · email not DB-unique + case-sensitive check; normalize + case-insensitive unique, ideally a custom user model. (#23)
- M2/M3 · `stripe.api_version` pinned 2026-06-26 (see log); `ProcessedStripeEvent` idempotency guard already in place (`f9a0ee8`). ✓
- M4 · `react-katex` is a maintenance risk but used in 9 files (wrapped by in-house renderer) — a scoped refactor, not a free deletion.

**Residual security** (`r1`/`r5-security`)
- M1 · avatar upload — magic-byte validation + old-file cleanup on re-upload, both done 2026-06-26 (see log). ✓ (#24)
- M2/M3 · X-Forwarded-For now trusts only the rightmost `DJANGO_TRUSTED_PROXY_COUNT` hops (fixed 2026-06-26, see log); `SECURE_PROXY_SSL_HEADER` proxy-overwrite requirement documented in settings (deployment must verify). ✓
- M5 · refresh token in `localStorage` (XSS-exfiltratable, 30-day) — move to `HttpOnly Secure SameSite` cookie.
- L1 · DOMPurify the legal-page HTML — legal docs are developer-controlled static files (`/legal/terms.html`, `/legal/privacy.html`), not user content; risk is very low. Deferred to owner.
- L3 · API landing page admin link — already DEBUG-gated at `formulas_backend/views.py:10`. ✓ Already fixed.
- L4 · Stripe price-id server-side — already fixed: `payments/views.py:127-134` takes `price_type` enum and maps to settings price_id server-side. ✓ Already fixed.

---

## Update protocol

1. Fix the bug.
2. Append a 5-line entry under "Chronological log" (newest first).
3. If the lesson is new, add a "Patterns to scan for FIRST" bullet.
4. Commit the fix + the journal entry **together**. Same SHA.

Skip step 2 and the journal decays. Don't.
