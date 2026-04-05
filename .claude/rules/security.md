---
paths:
  - "**/*.{ts,tsx,py}"
---

# Security Rules

- Never hardcode secrets, API keys, or credentials — use environment variables
- Django SECRET_KEY must come from `DJANGO_SECRET_KEY` env var in production
- CORS origins: only allow known frontend origins
- CSRF protection: keep Django middleware enabled, add trusted origins explicitly
- No `eval()`, `dangerouslySetInnerHTML`, or dynamic script injection
- Sanitize user inputs before rendering in KaTeX (LaTeX injection)
- Keep DEBUG=False in production
- Never commit `.env` files
