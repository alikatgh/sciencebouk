---
title: "Research Audit — sciencebouk (Round 8)"
repo: sciencebouk
lens: research
date: 2026-07-06
round: 8
---

# Research / Currency Audit — `sciencebouk` (Round 8)

**Scope:** Dependency pins, CI currency gates, security best-practice vs upstream guidance. Read-only verification against HEAD + lockfile. Cross-referenced [`docs/BUG_JOURNAL.md`](../BUG_JOURNAL.md) (patterns #18, #19, #23–#25; open research backlog).

**Relationship:** formulas (`../../formulas`) still pins `Django==5.2.1` and `djangorestframework-simplejwt==5.4.0` with legacy npm deps (Framer Motion, `d3` meta-package) — see `formulas/docs/audits/2026-07-06-r8-formulas-research.md`. sciencebouk has absorbed most r5-research CI fixes.

**Headline:** Django and backend CI currency are **materially improved** since r5 (5.2.15 + `pip-audit` + full test suite). Residual gaps: **no `npm audit` / Dependabot**, **refresh token still in `localStorage`**, **`manage.py check --deploy` absent**.

---

## HIGH

### H1. CI runs `pip-audit` but not `npm audit` — frontend supply-chain gate is one-sided
- **Where:** `.github/workflows/ci.yml:46-47` (`pip-audit` only); frontend job (`:23-26`) has no audit step.
- **Verified:** r5-research L5 called for both; BUG_JOURNAL pattern #18 lists `npm audit` as fixed scope in `f9a0ee8` but only `pip-audit` landed in current CI. No `npm audit` / `osv-scanner` in workflow.
- **Impact:** A compromised or CVE-patched npm transitive can ship while Python deps are gated.
- **Fix:** Add `npm audit --audit-level=high` (or `osv-scanner`) to the frontend job; fail on high/critical or document waivers.

### H2. Refresh token persisted in `localStorage` — 30-day XSS exfiltration window (r5research-H1, still open)
- **Where:** `frontend/src/auth/tokenStorage.ts` — `REFRESH_TOKEN_KEY` via `safeStorageSet`; explanatory TODO at file top.
- **Verified:** Access token is memory-only; refresh uses rotation + blacklist (`settings.py` `ROTATE_REFRESH_TOKENS`, `token_blacklist` app). BUG_JOURNAL residual security M5 marks this **still open**.
- **Impact:** Any XSS (CSP reduces but legal-page `dangerouslySetInnerHTML` remains) can steal the long-lived refresh credential.
- **Fix:** HttpOnly `Secure; SameSite` cookie for refresh; keep access in memory.

### H3. No Dependabot or Renovate config — no automated upstream PRs
- **Where:** `.github/` — no `dependabot.yml` (verified absent via glob).
- **Verified:** r5-research L5 flagged this; pins are manual (`requirements.txt`, `package.json` floors). Django bump 5.2.1→5.2.15 happened outside an automated gate.
- **Impact:** Security patches rely on human memory; drift between lockfile resolved version and `package.json` floor is invisible until someone runs audit manually.
- **Fix:** Add Dependabot for `pip` + `npm` (weekly, grouped minor/patch).

---

## MEDIUM

### M1. Vite floor `^6.3.2` admits pre-6.4.1 dev-server CVE range — lockfile is patched but floor is not
- **Where:** `frontend/package.json:61` — `"vite": "^6.3.2"`; `package-lock.json` resolves **6.4.1** (verified).
- **Verified:** r5-research C2 down-rated runtime risk (dev-server only); process gap remains. A fresh `npm install` on a machine without lockfile could resolve a vulnerable 6.3.x.
- **Fix:** Raise floor to `^6.4.1`; keep lockfile committed.

### M2. `manage.py check --deploy` not run in CI — production security settings unvalidated on merge
- **Where:** `.github/workflows/ci.yml` backend job — migrate + test + pip-audit only.
- **Verified:** Prod block in `settings.py` sets HSTS, SSL redirect, secure cookies, CSP middleware (`formulas_backend/middleware.py`). `check --deploy` would catch misconfigurations before ship.
- **Fix:** Add `DJANGO_DEBUG=0 python manage.py check --deploy` with minimal prod env vars in CI.

### M3. `react-katex` remains a direct dependency — 9-file maintenance surface (r5research-M4)
- **Where:** `frontend/package.json:36`; wrapped by in-house `components/math/InlineMathRenderer`.
- **Verified:** Not dead (grep importers across scenes + teaching); removal is a scoped refactor, not a free deletion. KaTeX 0.16.45 is current-ish.
- **Impact:** Third-party math wrapper + KaTeX version coupling on every slider-drag hot path (mitigated by memoization per BUG_JOURNAL 2026-06-26).
- **Fix:** Track KaTeX/react-katex releases; consider collapsing to direct KaTeX render only.

### M4. `djangorestframework-simplejwt==5.5.1` — verify against latest 5.5.x on each Django bump
- **Where:** `backend/requirements.txt:5`.
- **Verified:** formulas fork still on **5.4.0** — sciencebouk is ahead. No upper bound; no CI check that simplejwt release notes are reviewed on Django minor bumps.
- **Fix:** Document upgrade pairing in CONTRIBUTING; add release-note step to dependency bump PRs.

### M5. `stripe==12.2.0` + pinned `stripe.api_version` — SDK upgrade requires deliberate dashboard alignment
- **Where:** `payments/views.py:20` — `stripe.api_version = "2025-05-28.basil"` (fixed 2026-06-26).
- **Verified:** Good practice; webhook payload version is dashboard-controlled (BUG_JOURNAL pattern #2). Bumping `stripe` without re-verifying Basil compatibility is a silent contract risk.
- **Fix:** Add a one-line comment in `requirements.txt` linking to the pinned api_version line.

---

## LOW

### L1. BUG_JOURNAL research backlog still lists `Django==5.2.1` — doc currency lags code
- **Where:** `BUG_JOURNAL.md:470`.
- **Verified:** `requirements.txt:1` is `Django==5.2.15`.
- **Fix:** Close C1 in journal; note pip-audit CI as the recurrence guard.

### L2. Terms registry auto-generated prose for `no-pip-audit-npm-audit` is stale — npm audit still missing
- **Where:** `docs/assets/terms.json` entry `no-pip-audit-npm-audit` (introduced r5-security).
- **Verified:** pip-audit now runs; npm audit does not — popup text is half-outdated.
- **Fix:** Regenerate terms after CI hardening; or hand-edit the entry to "no npm audit in CI".

---

## Severity summary

| Sev | Count | IDs |
|-----|-------|-----|
| High | 3 | H1–H3 |
| Medium | 5 | M1–M5 |
| Low | 2 | L1–L2 |

**Top fixes:** H1+H3 (npm audit + Dependabot), H2 (refresh cookie migration).

*Web-cited CVE numbers for Django/Vite were not re-fetched; local anchors (pins, CI steps, lockfile) verified in-repo. Read-only — 2026-07-06.*