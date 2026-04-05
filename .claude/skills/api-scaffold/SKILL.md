---
name: api-scaffold
description: Scaffold a new Django API endpoint with URL routing and tests
user-invocable: true
allowed-tools: Write, Read, Edit, Bash, Glob, Grep
---

Scaffold a new Django REST API endpoint.

**Usage**: `/api-scaffold endpoint-name` (e.g., `/api-scaffold user-progress`)

## Steps

1. **Add view** in `backend/courses/views.py`:
   - Function-based view with `@require_http_methods`
   - Returns `JsonResponse` with structured payload
   - Proper error handling and status codes

2. **Add URL pattern** in `backend/courses/urls.py`:
   - RESTful path: `/api/courses/$ARGUMENTS/`
   - Named URL for reverse lookups

3. **Create test** in `backend/courses/test_views.py`:
   - Test successful response (200)
   - Test response body structure
   - Test error cases (404, 400)
   - Test CORS headers

4. **Verify**:
```bash
cd /Users/s_avelova/Documents/projects/formulas/backend
source .venv/bin/activate
python manage.py check
python manage.py test courses -v2
```

5. Report the new endpoint URL and how to consume it from the frontend.
