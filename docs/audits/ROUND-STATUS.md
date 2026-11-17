# Formulas — 50-Round Audit Status

**Master plan:** `Documents/projects/AUDIT-2026-07-06-50-round-master-plan.md`  
**Last updated:** 2026-07-06  
**Mode:** Read-only Grok audits → implement fixes in-repo  
**BUG_JOURNAL:** *Not in this repo* — use [`sciencebouk/docs/BUG_JOURNAL.md`](../../sciencebouk/docs/BUG_JOURNAL.md)

---

## Fork relationship

| Repo | Role |
|------|------|
| **sciencebouk** (`../sciencebouk`) | **Canonical** — remediated r4 docs, pruned API client, Django 5.2.15, `docs/` hub, GPL `LICENSE` |
| **formulas** (this repo) | Sibling fork — commits `docker-compose.yml`, stale README/CONTRIBUTING, legacy npm deps, larger API client |

June-14 audits in `docs/audits/` are prefixed `*sciencebouk*` but live in **this** tree. July r7–r9 reports use the `formulas` slug.

**Default remediation strategy:** cherry-pick sciencebouk fixes rather than re-deriving.

---

## Summary

| Range | Done | Pending | Notes |
|-------|------|---------|-------|
| r1–r6 | 11 | 0 | `2026-06-14-r*-sciencebouk-*` (historical filenames) |
| r7–r9 | 3 | 0 | r7 docs · r8 research · r9 api-contract — **2026-07-06** |
| r10–r50 | 0 | 41 | Per master plan |

**Next recommended:** Sync README/CONTRIBUTING/LICENSE from sciencebouk, then r9 API client prune.

---

## Round Ledger

| Round | Lens | Status | Report | Open findings |
|-------|------|--------|--------|---------------|
| 1 | security | ✅ Done | [2026-06-14-r1-sciencebouk-security.md](./2026-06-14-r1-sciencebouk-security.md) | Partial CI fixes landed |
| 2 | correctness | ✅ Done | [2026-06-14-r2-sciencebouk-correctness.md](./2026-06-14-r2-sciencebouk-correctness.md) | — |
| 2 | tests | ✅ Done | [2026-06-14-r2-sciencebouk-tests.md](./2026-06-14-r2-sciencebouk-tests.md) | CI full suite ✓ |
| 3 | arch | ✅ Done | [2026-06-14-r3-sciencebouk-arch.md](./2026-06-14-r3-sciencebouk-arch.md) | — |
| 3 | performance | ✅ Done | [2026-06-14-r3-sciencebouk-performance.md](./2026-06-14-r3-sciencebouk-performance.md) | — |
| 4 | deadcode | ✅ Done | [2026-06-14-r4-sciencebouk-deadcode.md](./2026-06-14-r4-sciencebouk-deadcode.md) | **Not pruned in formulas** |
| 4 | docs | ✅ Done | [2026-06-14-r4-sciencebouk-docs.md](./2026-06-14-r4-sciencebouk-docs.md) | **Mostly still open** — see r7 |
| 5 | research | ✅ Done | [2026-06-14-r5-sciencebouk-research.md](./2026-06-14-r5-sciencebouk-research.md) | Django 5.2.1 still |
| 5 | security | ✅ Done | [2026-06-14-r5-sciencebouk-security.md](./2026-06-14-r5-sciencebouk-security.md) | — |
| 6 | correctness | ✅ Done | [2026-06-14-r6-sciencebouk-correctness.md](./2026-06-14-r6-sciencebouk-correctness.md) | — |
| 6 | performance | ✅ Done | [2026-06-14-r6-sciencebouk-performance.md](./2026-06-14-r6-sciencebouk-performance.md) | — |
| 7 | docs | ✅ Done | [2026-07-06-r7-formulas-docs.md](./2026-07-06-r7-formulas-docs.md) | 14 (1C, 6H, 5M, 2L) |
| 8 | research | ✅ Done | [2026-07-06-r8-formulas-research.md](./2026-07-06-r8-formulas-research.md) | 13 (3H, 5M, 5L) |
| 9 | api-contract | ✅ Done | [2026-07-06-r9-formulas-api-contract.md](./2026-07-06-r9-formulas-api-contract.md) | 13 (3H, 5M, 5L) |
| 10 | ui-ux | ⏳ Pending | — | — |
| 11–50 | per master plan | ⏳ Pending | — | See master plan |

---

## r7–r9 top open items (implementation queue)

1. **r7 H2–H6** — Port sciencebouk README API table, equation order, CONTRIBUTING equation workflow
2. **r7 H5** — Add `LICENSE`, `SECURITY.md`, `docs/BUG_JOURNAL.md` (or canonical pointer)
3. **r8 H1–H3** — Django 5.2.15, simplejwt 5.5.1, npm dep prune from sciencebouk
4. **r8 M3** — Port `serve_media` hardening
5. **r9 H2** — Prune dead `hooks.ts` + `client.ts` methods (match sciencebouk PR #7)
6. **r9 H3** — `bulkSync` 207 response handling
7. **r7 C1** — Resolve Docker story vs sciencebouk (document fork role)

---

## Cross-project references

- [`sciencebouk/docs/audits/ROUND-STATUS.md`](../../sciencebouk/docs/audits/ROUND-STATUS.md) — canonical fork status
- [`sciencebouk/docs/BUG_JOURNAL.md`](../../sciencebouk/docs/BUG_JOURNAL.md) — patterns + fix log
- [`sciencebouk/docs/ARCHITECTURE.md`](../../sciencebouk/docs/ARCHITECTURE.md) — system map to port

---

*Updated by read-only audit session 2026-07-06.*