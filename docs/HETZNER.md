# Shared Hetzner launch — 2026-09-13

Production: https://sciencebo.uk (www redirects here); API also https://api.sciencebo.uk. EuroDNS records target the existing shared CX23 at 89.167.29.166. No additional paid infrastructure.

- Frontend: `/var/www/sciencebouk`; Vite build with `VITE_API_URL=/api VITE_BILLING_ENABLED=0`.
- Caddy proxies `/api/*`, `/admin/*`, `/static/*` to 127.0.0.1:8015 and serves the SPA otherwise.
- Backend: `/home/sciencebouk/app/backend`, venv `/home/sciencebouk/venv`.
- `deploy/sciencebouk.service`: one Gunicorn worker/two threads, 512 MiB memory ceiling, 50% CPU. Shared outbound cap: 50 Mbit/s.
- Separate PostgreSQL role/database `sciencebouk`, local Unix-socket peer authentication. DATABASE_URL is `postgresql:///sciencebouk?host=/var/run/postgresql`.
- Private environment `/home/sciencebouk/state/production.env`, owner sciencebouk, mode 0600. DEBUG off; BILLING_ENABLED=0; own domains only in CORS/CSRF/allowed hosts. Do not print or commit the generated secret.

Initial code: Formulas commit 791f80e plus migration fix 9920f2d. Fresh 81-equation seeded database; local users and old hosting data were not imported. Fix 0007 prevents a PostgreSQL duplicate pattern-index error on fresh migrations without changing the final unique slug field.

## Updates and validation

Preserve state and other projects. Test first, take a database backup, upload reviewed code/build only, run migrations and collectstatic as sciencebouk, then restart only sciencebouk.service. Validate Caddy before any reload. Builds on this small shared host must run with CPU/memory limits; do not run simultaneous heavy builds.

281 backend tests passed (1 skipped). Fresh migrations passed on PostgreSQL; dedicated slug-migration regression passed on SQLite and PostgreSQL. Frontend suite: 163 passed initially; four client tests inherited the deployment VITE_API_URL and failed expected-localhost assertions. All six tests in that file passed after removing deployment build variables. Production build and Django deploy checks passed. HTTPS health and 81 equations verified at the new host. Local public DNS still cached former hosting during initial acceptance.

Next: audit the first lesson and sign-up/progress flow before broad marketing; pick three polished interactive demos. Do not present the entire catalog as equally complete or claim paid billing/email flows are configured.

## Local backups

Daily 03:40 UTC `shared-project-backup.timer` creates seven rotating private archives in `/var/backups/science-atlas`. Installed script `/usr/local/sbin/shared-project-backup` is tracked with the shared-host configuration in the Mappster repository. The first archive passed PostgreSQL archive validation and SQLite integrity check. Backups remain on the same server; full restore and offsite disaster recovery are not established.

Browser preview verified Pythagoras drag: side a changed from 3 to 6.5 and hypotenuse from 5 to 7.63. A minor pre-existing rounding mismatch is visible between the SVG squared value and the rounded equation panel (58.2/58.3); include it in the next lesson-quality pass.
