# Sciencebouk — 50-Round Audit Status

**Master plan:** `Documents/projects/AUDIT-2026-07-06-50-round-master-plan.md`  
**Last updated:** 2026-07-06  
**Mode:** Read-only Grok audits → implement fixes in-repo  
**BUG_JOURNAL:** [`docs/BUG_JOURNAL.md`](../BUG_JOURNAL.md) — grep before debugging

---

## Fork relationship

| Repo | Role |
|------|------|
| **sciencebouk** (this repo) | Canonical evolved fork — fixed r4 docs, pruned API client, Django 5.2.15, `docs/` hub |
| **formulas** (`../formulas`) | Sibling fork — same `formulas_backend` stack; stale README, larger API client, Django 5.2.1 |

July r7–r9 audits exist for **both** repos. Merge sciencebouk fixes into formulas deliberately — do not assume parity.

---

## Summary

| Range | Done | Pending | Notes |
|-------|------|---------|-------|
| r1–r6 | 13 | 0 | `2026-06-14-r*` + `2026-06-23-branch-review-security` |
| r7–r9 | 3 | 0 | r7 docs · r8 research · r9 api-contract — **2026-07-06** |
| r10–r50 | 0 | 41 | Per master plan lens schedule |

**Next recommended round:** r10 (ui-ux) or implement r9 H1/H2 (bulkSync 207, UserSettings wire/delete).

---

## Round Ledger

| Round | Lens | Status | Report | Open findings |
|-------|------|--------|--------|---------------|
| 1 | security | ✅ Done | [2026-06-14-r1-sciencebouk-security.md](./2026-06-14-r1-sciencebouk-security.md) | Mostly remediated `f9a0ee8` + June fixes |
| 2 | correctness | ✅ Done | [2026-06-14-r2-sciencebouk-correctness.md](./2026-06-14-r2-sciencebouk-correctness.md) | Remediated per BUG_JOURNAL |
| 2 | tests | ✅ Done | [2026-06-14-r2-sciencebouk-tests.md](./2026-06-14-r2-sciencebouk-tests.md) | CI runs full suite |
| 3 | arch | ✅ Done | [2026-06-14-r3-sciencebouk-arch.md](./2026-06-14-r3-sciencebouk-arch.md) | C1/C2 equation SoT open |
| 3 | performance | ✅ Done | [2026-06-14-r3-sciencebouk-performance.md](./2026-06-14-r3-sciencebouk-performance.md) | H2 bundle open |
| 4 | deadcode | ✅ Done | [2026-06-14-r4-sciencebouk-deadcode.md](./2026-06-14-r4-sciencebouk-deadcode.md) | Pruned 2026-06-26 |
| 4 | docs | ✅ Done | [2026-06-14-r4-sciencebouk-docs.md](./2026-06-14-r4-sciencebouk-docs.md) | Partial — see r7 carryover |
| 5 | research | ✅ Done | [2026-06-14-r5-sciencebouk-research.md](./2026-06-14-r5-sciencebouk-research.md) | Django bumped; npm audit open |
| 5 | security | ✅ Done | [2026-06-14-r5-sciencebouk-security.md](./2026-06-14-r5-sciencebouk-security.md) | M5 refresh token open |
| 6 | correctness | ✅ Done | [2026-06-14-r6-sciencebouk-correctness.md](./2026-06-14-r6-sciencebouk-correctness.md) | Remediated per BUG_JOURNAL |
| 6 | performance | ✅ Done | [2026-06-14-r6-sciencebouk-performance.md](./2026-06-14-r6-sciencebouk-performance.md) | Most perf items closed |
| — | branch security | ✅ Done | [2026-06-23-branch-review-security.md](./2026-06-23-branch-review-security.md) | APPROVED |
| 7 | docs | ✅ Done | [2026-07-06-r7-sciencebouk-docs.md](./2026-07-06-r7-sciencebouk-docs.md) | 10 (3H, 5M, 2L) |
| 8 | research | ✅ Done | [2026-07-06-r8-sciencebouk-research.md](./2026-07-06-r8-sciencebouk-research.md) | 10 (3H, 5M, 2L) |
| 9 | api-contract | ✅ Done | [2026-07-06-r9-sciencebouk-api-contract.md](./2026-07-06-r9-sciencebouk-api-contract.md) | 12 (2H, 5M, 5L) |
| 10 | ui-ux | ⏳ Pending | — | — |
| 11–50 | per master plan | ⏳ Pending | — | See master plan |

---

## r7–r9 top open items (implementation queue)

1. **r9 H1** — `bulkSync` client handle HTTP 207 `{results, errors}` (`client.ts:194`, `SyncPrompt.tsx:47`)
2. **r9 H2** — Wire `/api/auth/settings/` to `SettingsContext` or delete model+endpoint (`ARCHITECTURE.md` + README table)
3. **r8 H1 + H3** — Add `npm audit` + Dependabot (pip-audit already in CI)
4. **r8 H2** — Refresh token → HttpOnly cookie (`tokenStorage.ts`)
5. **r7 H1** — CONTRIBUTING `python manage.py test` (not `test courses`)
6. **r7 H2 + M1** — CONTRIBUTING `seed_subjects` + `create_invite` onboarding
7. **r7 M5** — Reconcile BUG_JOURNAL open backlog (Django 5.2.15, closed items)

---

## Cross-project references

- [`formulas/docs/audits/ROUND-STATUS.md`](../../formulas/docs/audits/ROUND-STATUS.md) — sibling fork r7–r9
- [`docs/README.md`](../README.md) — docs hub (update with r7–r9 links)
- r1–r6 remediation: BUG_JOURNAL chronological log + commit `f9a0ee8`

---

*Updated by read-only audit session 2026-07-06.*