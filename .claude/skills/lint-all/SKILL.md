---
name: lint-all
description: Run linters and type checkers on the entire codebase
user-invocable: true
allowed-tools: Bash, Read
---

Run all linting and type checking for the Formulas project.

## Frontend
```bash
cd /Users/s_avelova/Documents/projects/formulas/frontend

# TypeScript type check
echo "=== TypeScript Type Check ==="
npx tsc --noEmit 2>&1

# ESLint (if configured)
echo "=== ESLint ==="
npx eslint src/ --ext .ts,.tsx 2>/dev/null || echo "ESLint not configured. Run: npm install -D eslint @typescript-eslint/eslint-plugin"
```

## Backend
```bash
cd /Users/s_avelova/Documents/projects/formulas/backend
source .venv/bin/activate 2>/dev/null

# Python linting
echo "=== Python Lint ==="
python -m flake8 . --exclude=.venv,__pycache__,migrations 2>/dev/null || echo "flake8 not installed. Run: pip install flake8"

# Django checks
echo "=== Django System Checks ==="
python manage.py check 2>&1
```

Report a summary of all issues found, grouped by severity.
