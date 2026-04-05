---
paths:
  - "**/*.{test,spec}.{ts,tsx}"
  - "**/test_*.py"
  - "**/*_test.py"
---

# Testing Rules

## Frontend (Vitest + React Testing Library)
- Test files: `ComponentName.test.tsx` alongside the component
- Test behavior, not implementation — query by role/text, not class names
- Mock D3/Konva canvas calls in unit tests
- Snapshot tests for KaTeX formula rendering

## Backend (pytest + Django TestCase)
- Test files: `test_views.py`, `test_models.py` in each app
- Use Django's test client for API endpoint tests
- Assert status codes AND response body structure
- Test CORS headers are set correctly

## General
- Every new feature needs at least one test
- Bug fixes must include a regression test
- Keep tests fast — mock external dependencies
