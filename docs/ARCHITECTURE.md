# Architecture

A Django REST API (`backend/`) serving a React SPA (`frontend/`). The SPA is the
only first-party client; the API is JWT-authenticated.

## Backend apps

| App | Responsibility |
|-----|----------------|
| `courses` | Equations, lessons/courses, user progress, learning analytics, search |
| `accounts` | Registration, login, Google OAuth, profile, invites, user settings, JWT auth class |
| `payments` | Stripe checkout/portal sessions, webhook, subscription → tier sync |

Routes are mounted in `formulas_backend/urls.py`: `accounts.urls` under
`/api/auth/`, `courses.urls` under `/api/`, `payments.urls` under
`/api/payments/`. The full route table lives in the top-level
[`README.md`](../README.md#api-endpoints).

## Authentication

JWT via **SimpleJWT** (`accounts.authentication.ProfileJWTAuthentication`, a
subclass that `select_related`s the profile to avoid an N+1). Access + refresh
tokens, with `ROTATE_REFRESH_TOKENS` + `BLACKLIST_AFTER_ROTATION` on (the
`token_blacklist` app is installed).

Three sign-in paths, all under `/api/auth/`:

- **Register** (`register/`) — email + password; **invite-gated** when
  `DJANGO_INVITES_REQUIRED=1`. Account creation + invite redemption run in one
  `transaction.atomic()`.
- **Login** (`login/`) — returns an access/refresh pair.
- **Google OAuth** (`google/`) — verifies a Google **ID token** (GIS flow); the
  client only needs `GOOGLE_OAUTH_CLIENT_ID`.

The frontend stores tokens and refreshes transparently on a 401 (see
`frontend/src/api/client.ts` + `auth/tokenStorage.ts`).

## Authorization tiers

- **Anonymous** — may record progress against a **server-issued `user_id`**
  (UUID) via `PATCH /api/equations/{id}/progress/`; a throttle caps volume.
- **Authenticated** — owns its progress (`/api/progress/...`), profile, avatar.
- **Pro** — `Profile.tier == "pro"` (`Profile.is_pro`). Gates the learning
  dashboard, event logging, the billing portal, and user settings.

## Invites

`InviteCode` stores only a **hash** of the code (`code_hash`), with
`max_uses` / `used_count` / expiry / revocation. Redemption enforces the cap
**atomically** (`UPDATE ... SET used_count = used_count + 1 WHERE id=? AND
used_count < max_uses` + `rowcount`) so concurrent redeems can't overshoot.
The redeemer's IP (from the rightmost trusted `X-Forwarded-For` hop) and
user-agent are recorded for audit.

## Billing

Stripe, enabled by `DJANGO_BILLING_ENABLED=1`. `stripe.api_version` is pinned.

- `POST /api/payments/checkout/` → a Checkout session (monthly/yearly price).
- `POST /api/payments/portal/` → the Stripe billing portal (Pro only).
- `POST /api/payments/webhook/` → signature-verified events. Each event is
  deduplicated via a `ProcessedStripeEvent` row (idempotency), then the
  subscription state is reconciled into `Profile.tier`. Downgrades key on the
  stable `stripe_customer_id`, not the blank-able subscription id.

The frontend reads Pro status from the user profile (`Profile.tier`), not a
dedicated polling endpoint.

## Content model

- **17 core equations** ("Equations That Changed the World") — each has a
  bespoke D3 scene (`frontend/src/components/scenes/`), keyed by `sort_order`
  in `sceneRegistry.ts`, plus a lesson markdown under `content/lessons/`.
- **Subject equations** (ids 18–81) — data-driven: one `ConfigurableEquationScene`
  renders sliders + a response curve + a learn-more panel from the equation's
  JSON (`data/equations.json`, seeded by `seed_subjects`).
- **Localization** — `?locale=` (query) overrides `Accept-Language`; translated
  lesson copy lives under `content/lessons/<locale>/`, equation strings in
  `EquationTranslation`.

## Caching

`GET /api/equations/` is `cache_page`'d (5 min) and `Vary`s on
`Accept-Language`; the cache key includes the full path (so `?locale=` is keyed
correctly). The backend defaults to `LocMemCache` (override with
`DJANGO_CACHE_BACKEND`, e.g. Redis for multi-worker); tests force `DummyCache`
so cached responses can't leak between tests.

## Frontend structure

- `components/scenes/` — per-equation visualizations (bespoke + the configurable
  fallback); shared chart primitives in `components/charts/simpleChart.ts`.
- `components/teaching/` — lesson rendering (`LessonMarkdown`, `richText`),
  glossary/term linking.
- `components/math/` — KaTeX rendering (`InlineMathRenderer`, `AutoFitDeferredInlineMath`).
- `api/` — the fetch client + React Query hooks.
- `auth/` — token storage + the `AuthProvider`.

See [`CONTRIBUTING.md`](../CONTRIBUTING.md) for setup and the "Adding a New
Equation" workflow.
