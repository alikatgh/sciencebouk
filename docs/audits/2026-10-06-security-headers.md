# Production response headers, 2026-10-06

The static frontend previously lacked Content-Security-Policy and framing protection. `deploy/sciencebouk.Caddyfile` records the Sciencebouk host blocks in the shared Hetzner configuration.

The frontend policy permits same-origin scripts, API requests, Google Identity Services and Google Fonts, while denying plugin objects, foreign base URLs, foreign form destinations, and framing. Inline styles remain allowed for the existing UI. The strict script policy is scoped to static frontend documents so Django admin keeps its own policy.

Applied to `/etc/caddy/Caddyfile` after `caddy validate`, guarded by the original SHA-256 and a reload rollback. The original is retained at `/etc/caddy/Caddyfile.pre-sciencebouk-security-20261006`. Do not replace the whole shared configuration with this application's host-block file.

Verified: homepage 200 with the new headers; anonymous auth endpoints remain 401; homepage, sign-in form and Pythagoras lesson render with no browser warnings/errors. Google sign-in is not enabled in the observed live form, so the configured allowlist has not been exercised by a completed Google login. Shared wallmarkets, Atlas and BenchmarkWatcher sites remain 200.

Google allowlist reference: https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid

## Cloudflare migration and client IPs

EuroDNS order 21787522 completed at zero cost. All 23 DNS records were compared between the old and new authoritative nameservers before delegation. Cloudflare now serves sciencebo.uk, www, api, and llms using the Free plan and Full (strict) TLS. Mail and unrelated subdomains remain DNS-only. AI training bots are blocked, AI Labyrinth is enabled, and Bot Fight Mode remains off for API compatibility.

The recorded Caddy configuration now includes the Atlas hostname. It accepts CF-Connecting-IP only when the socket peer belongs to a published Cloudflare range, then replaces the complete X-Forwarded-For and X-Real-IP headers. Direct requests retain Caddy's normal forwarding behavior during DNS propagation. The original before this forwarding preparation is retained at `/etc/caddy/Caddyfile.pre-cf-client-ip-20261006`.

Cloudflare's default Browser Integrity Check returned error 1010 for Python clients. An approved configuration rule disables only that check for api.sciencebo.uk and /api/ paths on sciencebo.uk, www.sciencebo.uk, and llms.sciencebo.uk. WAF and DDoS protection remain enabled. After deployment, Python requests returned JSON 401 from both auth/me endpoints and JSON 200 from Atlas /api/models. The homepage returned 200 through Cloudflare with its CSP.

Direct-origin restrictions remain pending: allow cached DNS answers to expire before rejecting non-Cloudflare peers. Do not apply a global port 80/443 firewall restriction while other domains on this shared server still require direct access. Verify public HTTPS, API JSON behavior, and real-client-IP handling before enabling per-host origin restrictions.
