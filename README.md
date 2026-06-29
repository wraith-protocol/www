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
3. Runs the sitemap generator (`scripts/sitemap.ts`) to scan the build output directory and automatically generate a fresh `sitemap.xml` for all static routes.

## SEO & Metadata

- **`robots.txt`**: Located in `public/robots.txt` and copied to the build root. It allows indexing on all paths and points crawlers to the sitemap location.
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
