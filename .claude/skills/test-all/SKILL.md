---
name: test-all
description: Run all frontend and backend tests with coverage reporting
user-invocable: true
allowed-tools: Bash, Read
---

Run the full test suite for the Sciencebouk project:

## Frontend Tests
```bash
cd /Users/s_avelova/Documents/projects/formulas/frontend
npx vitest run --reporter=verbose 2>/dev/null || echo "No frontend tests configured yet. Run: npm install -D vitest @testing-library/react @testing-library/jest-dom"
```

## Backend Tests
```bash
cd /Users/s_avelova/Documents/projects/formulas/backend
source .venv/bin/activate 2>/dev/null
python manage.py test --verbosity=2 2>/dev/null || echo "No backend tests found. Create test files in courses/test_views.py"
```

## TypeScript Type Check
```bash
cd /Users/s_avelova/Documents/projects/formulas/frontend
npx tsc --noEmit
```

Report a summary: how many passed, failed, and any type errors found.
If tests don't exist yet, suggest creating them and list which components/endpoints need coverage.
