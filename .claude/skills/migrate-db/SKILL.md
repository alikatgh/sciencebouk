---
name: migrate-db
description: Create and apply Django database migrations
user-invocable: true
allowed-tools: Bash, Read
---

Manage Django database migrations for the Formulas backend.

**Usage**: `/migrate-db [app_name]` or just `/migrate-db` for all apps.

## Steps

1. Show current migration status:
```bash
cd /Users/s_avelova/Documents/projects/formulas/backend
source .venv/bin/activate
python manage.py showmigrations $ARGUMENTS
```

2. Create new migrations if models changed:
```bash
python manage.py makemigrations $ARGUMENTS
```

3. Apply migrations:
```bash
python manage.py migrate $ARGUMENTS
```

4. Report what was created/applied and any issues.

If there are migration conflicts, explain the options (merge vs. rebase) before proceeding.
