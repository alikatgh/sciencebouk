---
paths:
  - "backend/**/*.py"
---

# Backend Development Rules

## Django
- Views return `JsonResponse` — no template rendering for API endpoints
- URL patterns in app-level `urls.py`, included from project `urls.py`
- Settings via environment variables with sensible defaults
- CORS headers configured via django-cors-headers

## API Design
- RESTful endpoints under `/api/`
- Response format: structured JSON with clear field names
- Health check at `/api/health/`
- Use descriptive URL slugs: `/api/courses/equation-atlas/`

## Code Style
- PEP 8 with 4-space indentation
- Imports: stdlib → Django → third-party → local (isort order)
- Docstrings for views explaining the endpoint purpose
- Type hints on function signatures where helpful

## Database
- Currently SQLite for development
- When adding models: create migrations immediately (`makemigrations`)
- Never commit `db.sqlite3`

## Query Performance
- Never query inside a loop — prefetch or aggregate first
- Use `select_related` for ForeignKey, `prefetch_related` for reverse/M2M
- Use `.values_list()` or `.only()` when you don't need full model instances
- Cache static/rarely-changing endpoints with `cache_page`

## Security
- All mutating endpoints require authentication (`@permission_classes([IsAuthenticated])`)
- Validate and sanitize all user input through serializers — never trust `request.data` directly
- Use `get_object_or_404` instead of try/except DoesNotExist where appropriate
