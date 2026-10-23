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
3. Runs the sitemap generator (`scripts/sitemap.ts`) to generate a fresh `sitemap.xml` covering all static and dynamic routes.
4. Runs the RSS feed generator (`scripts/gen-rss.mjs`) to generate `feed.xml` and per-tag feeds under `public/feed/tag/`.

## Sitemap and RSS generation

Both generators are **deterministic**: running them twice on the same source produces byte-identical output.

**Sitemap** — `scripts/sitemap.ts` is the single entrypoint for both the build pipeline and manual generation:

```bash
pnpm generate:sitemap   # regenerate public/sitemap.xml
pnpm check:sitemap      # fail if public/sitemap.xml is stale (used in CI)
```

`lastmod` dates are derived from content metadata (blog `date` frontmatter, case-study `integrationDate`) or the git commit that last touched each route's source files. Routes with no trustworthy date (tag archives, author pages) omit `<lastmod>` entirely rather than stamping today's date.

`scripts/gen-sitemap.mjs` has been retired. All callers should use `scripts/sitemap.ts` via `tsx`.

**RSS** — `scripts/gen-rss.mjs` generates `public/feed.xml` and per-tag feeds. The `<lastBuildDate>` is set to the publication date of the most-recent post, not the wall-clock time, so repeated builds on unchanged content produce the same file.

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
(including validation, rate limiting, duplicate submissions, provider outages and the unconfigured case) and
the OG image endpoint (rendering, query escaping, cache headers and the failure
response). Buttondown is stubbed, so no mail is sent and no test touches the network.
The suite runs on every pull request in CI.

The subscribe endpoint accepts JSON bodies up to 2,048 bytes and the documented `newsletter`
(default) and `careers` tags. It allows five submissions per Vercel client IP per
15-minute window; the in-memory, HMAC-keyed limiter avoids retaining raw IP addresses
and is scoped to each warm serverless instance.

## Link checks

```bash
pnpm build && pnpm check:links                 # the build, served by scripts/preview-server.ts
pnpm check:links --base https://usewraith.xyz  # production
pnpm test:link-check                           # unit tests for the checker
```

`scripts/check-links.ts` starts from the sitemap and renders every public route in
Chromium. It fails on routes that answer with an error or the 404 page, internal links
to missing routes, files or `#fragments`, canonical and hreflang URLs that are missing,
duplicated, off-site or not the page itself, feeds that are not served as XML, and
external links. `--report <file>` writes the results as JSON and `--no-external` skips
external links.

External links must point at a host listed in `scripts/link-check/external-links.json`.
Add a host there when the site starts linking to it, and give a `reason` whenever an
entry needs `acceptStatus` or `skipRequest`. Approved links are requested through
`scripts/link-check/safe-request.ts`: only public addresses are allowed (loopback,
private, link-local, IPv4-mapped forms of those, and so on are refused), each hop
connects to the address its DNS lookup validated, and redirects are re-validated. The
browser that renders pages can only load the site under test.

CI runs the checker on every pull request against the build, and every day against
production.

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
