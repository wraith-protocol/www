# Wraith Protocol — Landing Page

The landing page for [usewraith.xyz](https://usewraith.xyz). A minimal, dark, developer-focused single-page site that explains what Wraith Protocol is and links to docs, demo, and console.

## Stack

- Vite + React + TypeScript
- Tailwind CSS v4
- Deployed to Vercel

## Development

```bash
pnpm install
pnpm dev
```

## Build

```bash
pnpm build
```

The build pipeline performs the following steps:

1. Compiles TypeScript and builds the client production assets via Vite.
2. Runs the Open Graph image generator (`scripts/og.ts`) to pre-render cards for all routes and patches the output HTML files with page-specific titles, descriptions, and JSON-LD breadcrumb schemas.
3. Runs the sitemap generator (`scripts/gen-sitemap.mjs`) to generate a fresh `sitemap.xml` covering all static and dynamic routes.

## Serverless routes

`vite preview` only serves the static build, so the API routes (`/api/subscribe` in
`api/subscribe.ts` and `/api/og` in `src/api/og.tsx`) are unavailable locally and on
CI runners. `pnpm preview:functions` serves the same `dist/` output with those routes
mounted on port 4174:

```bash
pnpm build
pnpm preview:functions
```

## Smoke tests

```bash
pnpm test:smoke
```

Smoke tests run against `scripts/preview-server.ts` over HTTP: the subscribe proxy
(including invalid input, provider conflicts, outages and the unconfigured case) and
the OG image endpoint (rendering, query escaping, cache headers and the failure
response). Buttondown is stubbed, so no mail is sent and no test touches the network.
The suite runs on every pull request in CI.

## Production link checks

```bash
pnpm build
pnpm exec playwright install chromium
pnpm check:links
pnpm test:links
```

The pull request `Production Links` job runs the same checker against `dist/`.
It discovers all built HTML routes and sitemap URLs, then uses Chromium to crawl
rendered links and validate same-page and cross-page anchors (including MDX headings).
Production-origin URLs resolve against the local build. Missing files and rendered
not-found pages fail even when the preview server returns an SPA fallback with HTTP 200.
The checker parses the sitemap, checks built-route coverage, and validates the main
RSS feed, every generated tag feed, and feeds expected by sitemap tag archives.
RSS channel, item, permalink GUID, and self URLs are checked too.

External HTTP(S) destinations use GET with a ten-second timeout, at most two attempts,
and six concurrent requests. External fragments are not checked. `mailto:` and `tel:`
links are skipped. For an offline internal check, use `pnpm check:links --internal-only`;
CI always runs the full check. Failures include source and destination in the console
and `playwright-report/link-check.json`, uploaded as a CI artifact.

Intentional external failures must be recorded in `scripts/link-check-allowlist.json`
as exact normalized URLs (no fragment or wildcard), with a reason and the specific
allowed HTTP statuses or `"network"` for a known unavailable host. For example:

```json
[
  {
    "url": "https://example.org/protected",
    "reason": "Intentionally requires authentication",
    "failures": [401]
  }
]
```

The allowlist starts empty. It cannot suppress internal links, anchors, or XML failures.
Allowed failures remain visible in the report; unexpected failure statuses still fail CI.

## SEO & Metadata

- **`robots.txt`**: Located in `public/robots.txt` and copied to the build root. It allows search engine crawling while excluding staging, preview, admin, and 404 routes, and points crawlers to the sitemap location.
- **`sitemap.xml`**: Dynamically compiled during build time into `dist/sitemap.xml` and `public/sitemap.xml`.
- **JSON-LD**: Embedded in the site's `<head>`:
  - Global `Organization` schema representing Wraith Protocol.
  - Global `SoftwareApplication` schema representing the Wraith SDK.
  - Page-specific `BreadcrumbList` schema dynamically injected for each static route slug (e.g. `/stellar`, `/faq`, etc.) at build time.

## Format

```bash
pnpm format        # write
pnpm format:check  # check only
```
