# Security Policy

sciencebouk handles authentication (JWT, Google OAuth, invite codes) and
payments (Stripe), so we take security reports seriously.

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Report privately via GitHub's **[Report a vulnerability](https://github.com/alikatgh/sciencebouk/security/advisories/new)**
(the repository's *Security → Advisories* tab). If that is unavailable, contact
the maintainers through the support address listed on the live site.

Please include:

- a description of the issue and its impact,
- steps to reproduce (a proof-of-concept if possible),
- affected component (frontend, `accounts`, `payments`, `courses`) and version/commit.

We aim to acknowledge a report within a few days and to keep you updated as we
investigate and fix it. We'll credit reporters who wish to be named once a fix
has shipped.

## Scope

In scope: this repository's application code (Django backend, React frontend).
Out of scope: third-party services (Stripe, Google), denial-of-service testing,
and social-engineering attacks.

## Good to know

The codebase is security-conscious by design — ORM-only queries, signature-verified
Stripe webhooks (with idempotency), SHA-256-hashed invite codes, per-IP auth
throttling, a Content-Security-Policy, and env-based secrets with production
startup guards. Verified review notes live in [`docs/audits/`](docs/audits/).
