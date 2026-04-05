---
name: deploy
description: Build and prepare the project for deployment
user-invocable: true
allowed-tools: Bash, Read, Glob
---

Build and prepare the Sciencebouk project for deployment.

**Usage**: `/deploy [staging|production]`

## Steps

### 1. Pre-flight Checks
```bash
cd /Users/s_avelova/Documents/projects/formulas

# Check for uncommitted changes
git status --porcelain 2>/dev/null

# TypeScript check
cd frontend && npx tsc --noEmit

# Django checks
cd ../backend && source .venv/bin/activate && python manage.py check --deploy
```

### 2. Frontend Build
```bash
cd /Users/s_avelova/Documents/projects/formulas/frontend
npm run build
echo "Build output:"
ls -lah dist/
du -sh dist/
```

### 3. Backend Preparation
```bash
cd /Users/s_avelova/Documents/projects/formulas/backend
source .venv/bin/activate
python manage.py collectstatic --noinput
python manage.py migrate --check
```

### 4. Report
- Build size and assets
- Any warnings from `--deploy` check
- Environment variables needed for $ARGUMENTS
- Deployment checklist (DJANGO_SECRET_KEY, DEBUG=0, ALLOWED_HOSTS, etc.)
