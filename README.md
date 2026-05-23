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

The build runs TypeScript, Vite, and `scripts/generate-sitemap.mjs`. The sitemap script emits `dist/sitemap.xml` from the route list and `public/robots.txt` is copied by Vite into the build output. After deployment, maintainers should verify the `usewraith.xyz` property in Google Search Console and Bing Webmaster Tools, then submit `https://usewraith.xyz/sitemap.xml`.

## Format

```bash
pnpm format        # write
pnpm format:check  # check only
```
