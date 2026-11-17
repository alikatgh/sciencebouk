# Security Audit Round Status — Formulas (backup-pre-filter)

**Last updated:** 2026-07-06

| Round ID | Date | Scope | Report | Findings | Status |
|----------|------|-------|--------|----------|--------|
| `2026-07-06-r1` | 2026-07-06 | Django API, Stripe, nginx | [2026-07-06-r1-formulas-backup-pre-filter-security.md](./2026-07-06-r1-formulas-backup-pre-filter-security.md) | 9 (1 High, 5 Med, 3 Low) | 🔴 Open |

## Open backlog

### High

| ID | Summary | Location |
|----|---------|----------|
| H1 | Unauthenticated anon progress PATCH | `courses/views.py:35-57` |

### Medium

| ID | Summary | Location |
|----|---------|----------|
| M1 | DEBUG defaults on | `settings.py:8` |
| M2 | Weak SECRET_KEY default | `settings.py:7` |
| M3 | No password validators | `settings.py:112` |
| M4 | Avatar upload content not verified | `accounts/views.py:51-72` |
| M5 | nginx missing security headers | `nginx.prod.conf` |

### Low

| ID | Summary | Location |
|----|---------|----------|
| L1 | 30-day refresh JWT | `settings.py:65` |
| L2 | Public search scraping | `courses/views.py:70-83` |
| L3 | Local sqlite artifact | `backend/db.sqlite3` |