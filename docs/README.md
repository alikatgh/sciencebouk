# `docs/` index

Internal engineering docs for sciencebouk. (Addresses the "no docs index" finding
in `audits/2026-06-14-r4-sciencebouk-docs.md` L3.)

## Living docs

| File | What it is |
|------|------------|
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | System map: backend apps, auth/authorization tiers, invites, billing, content model, caching, frontend layout. |
| [`BUG_JOURNAL.md`](BUG_JOURNAL.md) | Generalized bug patterns ("scan first") + a chronological fix log. **Grep this before debugging.** |
| [`FEATURES.md`](FEATURES.md) | Feature roadmap/tracker: `[x]` built, `[P]` pre-existing-verified, `[—]` consciously declined. |
| [`LEARNING_AIDS.md`](LEARNING_AIDS.md) | The data-driven "Learn more" panel (facts / worked examples / concept checks / prerequisites) and how to extend it. |

## Audits (`audits/`)

Verified, dated code-review / security / architecture / performance reports.
Read the relevant lens before re-deriving a finding — most "new" bugs here are
already documented.

- **Rounds r1–r6 (2026-06-14):** the original multi-lens audit set (security,
  correctness, tests, architecture, performance, dead-code, docs, research).
- **`2026-06-23-branch-review-security.md`** (+ `.raw.json`): the 10-dimension
  multi-agent review + security audit of this feature branch, with remediation
  status. Verdict: **APPROVED**, all findings triaged.

> These are internal working artifacts (AI-assisted, dated). They are not user
> documentation; the README/CONTRIBUTING at the repo root cover setup and usage.
