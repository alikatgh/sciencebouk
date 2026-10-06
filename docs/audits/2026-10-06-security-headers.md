# Production response headers, 2026-10-06

The static frontend previously lacked Content-Security-Policy and framing protection. `deploy/sciencebouk.Caddyfile` records the Sciencebouk host blocks in the shared Hetzner configuration.

The frontend policy permits same-origin scripts, API requests, Google Identity Services and Google Fonts, while denying plugin objects, foreign base URLs, foreign form destinations, and framing. Inline styles remain allowed for the existing UI. The strict script policy is scoped to static frontend documents so Django admin keeps its own policy.

Applied to `/etc/caddy/Caddyfile` after `caddy validate`, guarded by the original SHA-256 and a reload rollback. The original is retained at `/etc/caddy/Caddyfile.pre-sciencebouk-security-20261006`. Do not replace the whole shared configuration with this application's host-block file.

Verified: homepage 200 with the new headers; anonymous auth endpoints remain 401; homepage, sign-in form and Pythagoras lesson render with no browser warnings/errors. Google sign-in is not enabled in the observed live form, so the configured allowlist has not been exercised by a completed Google login. Shared wallmarkets, Atlas and BenchmarkWatcher sites remain 200.

Google allowlist reference: https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid

Origin access restrictions and DNS migration are separate work, not completed by this header change.
