# Public search pages

`npm run seo:sync` refreshes the public English equation catalog from `https://api.sciencebo.uk/api/equations/`. Run before a production build when lessons change; failures preserve the existing snapshot. The initial snapshot was verified on 2026-09-17 with 81 equations.

`npm run build` generates public route HTML and a sitemap from this catalog and the existing lesson content. `npm run check:seo` checks every generated sitemap URL. Account routes are excluded and receive noindex through the route metadata component.

The static host must serve `/path/index.html` for `/path` before the SPA fallback. Serve robots.txt as text/plain and sitemap.xml as application/xml. Keep API proxy configuration and existing account routing intact. Verify the live homepage and an equation's raw HTML after publishing; a frontend build alone does not prove host routing.
