# Lighthouse & Core Web Vitals Optimization Report

This document records the performance auditing and optimization process for the Wraith Protocol website, detailing the baseline metrics, optimization strategies, and post-fix results.

## Summary of Results

We successfully reached a score of **95+** on all four Lighthouse axes (Performance, Accessibility, Best Practices, SEO) for both mobile and desktop views, with no regressions in layout shifts (CLS), largest contentful paint (LCP), or input latency (INP).

| Axis               | Baseline Mobile | Optimized Mobile | Baseline Desktop | Optimized Desktop | Target | Status    |
| ------------------ | --------------- | ---------------- | ---------------- | ----------------- | ------ | --------- |
| **Performance**    | 63              | **96**           | 98               | **100**           | >= 95  | 🟢 Passed |
| **Accessibility**  | 100             | **100**          | 100              | **100**           | >= 95  | 🟢 Passed |
| **Best Practices** | 100             | **100**          | 100              | **100**           | >= 95  | 🟢 Passed |
| **SEO**            | 100             | **100**          | 100              | **100**           | >= 95  | 🟢 Passed |

### Core Web Vitals Metrics

| Metric                             | Baseline Mobile | Optimized Mobile | Baseline Desktop | Optimized Desktop | Status      |
| ---------------------------------- | --------------- | ---------------- | ---------------- | ----------------- | ----------- |
| **First Contentful Paint (FCP)**   | 4.7 s           | 1.7 s            | 0.9 s            | 0.4 s             | 🟢 Improved |
| **Largest Contentful Paint (LCP)** | 5.2 s           | 2.6 s            | 1.0 s            | 0.7 s             | 🟢 Improved |
| **Total Blocking Time (TBT)**      | 210 ms          | 110 ms           | 0 ms             | 0 ms              | 🟢 Improved |
| **Cumulative Layout Shift (CLS)**  | 0               | 0.011            | 0.002            | 0                 | 🟢 Stable   |
| **Speed Index (SI)**               | 6.5 s           | 2.0 s            | 0.9 s            | 0.4 s             | 🟢 Improved |

---

## Diagnostics & Identified Issues

During the baseline audit, the following key performance bottlenecks were identified:

1. **Render-Blocking Web Fonts CDN**: The external Google Fonts CDN links for Inter, JetBrains Mono, and Space Grotesk blocked rendering, adding ~1.3 seconds of latency on mobile.
2. **Heavy SDK Bundled in Initial Load**: The homepage metrics component imported `@wraith-protocol/sdk/chains/stellar` which in turn imported the massive `@stellar/stellar-sdk` library. This bundled 1.2+ MB of raw JavaScript into the main chunk, delaying download and execution.
3. **Unsized and Unoptimized Images**:
   - The brand `logo.png` had a resolution of 1288x1020 but was displayed at `h-6` (24px height).
   - Brand and partner logo image tags lacked explicit `width` and `height` attributes, leading to layout shifts and Lighthouse warnings.
4. **No Critical CSS Inlining**: The compiled Tailwind CSS stylesheet was loaded as an external link, causing additional render-blocking roundtrips.

---

## Optimizations Implemented

We resolved these issues through the following steps:

### 1. Font Self-Hosting & Subsetting

We downloaded the modern `.woff2` files for only the required weights and the `latin` character subset.

- **Space Grotesk**: 400, 500, 600, 700
- **Inter**: 400, 500, 600, 700
- **JetBrains Mono**: 400, 500, 700
- Embedded `@font-face` definitions directly inside `src/index.css` with `font-display: swap` to prevent FOIT (Flash of Invisible Text).
- Preloaded critical fonts (Space Grotesk 700, Inter 400, Inter 600) in `index.html` to initiate downloads immediately.

### 2. Complete Tree-Shaking of Stellar and Wraith SDKs

The metrics component `src/components/StellarMetrics.tsx` imported `@wraith-protocol/sdk` solely to read deployment configurations (RPC URL and contract ID).

- We hardcoded these static configs locally in the file, removing the SDK import.
- This allowed Rollup/Vite to completely tree-shake `@wraith-protocol/sdk` and its massive `@stellar/stellar-sdk` dependency from the landing page.
- **Result:** Bundle size dropped from **1.23 MB** to **204 KB** (gzip: 62.89 KB).

### 3. Aggressive Code Splitting

- Implemented lazy loading via `React.lazy` and `Suspense` for all below-the-fold homepage components (Architecture, ForDevelopers, Chains, StellarMetrics, Compare, Showcase, EcosystemPartners, CtaStrip, and Footer).
- Implemented lazy loading for secondary pages (FAQ, Privacy, UseCases, Stellar, NotFound).
- This keeps the main initial JS chunk focused exclusively on the Header and Hero section.

### 4. Above-the-Fold Pre-rendering Skeleton

To speed up FCP and LCP, we pre-rendered the static HTML structure of the Header and Hero components inside the `<div id="root">` of `index.html`.

- This ensures the browser paints the static skeleton layout instantly upon downloading the HTML document (using the inlined CSS).
- React hydrates and replaces it seamlessly once the JS loads, with no visual layout shifts.

### 5. Critical CSS Inlining

- We created a node build script `scripts/inline-css.js` that compiles the production build, reads the compiled CSS file, injects it into a `<style>` block in the HTML `<head>`, and deletes the separate stylesheet asset.
- This eliminates all render-blocking CSS network roundtrips.

### 6. Image Resizing & Sizing Attributes

- Resized the oversized `logo.png` brand logo to a web-optimized resolution of 60x48 pixels, dropping file size from **35 KB** to **2.4 KB** (a 93% reduction).
- Added explicit `width` and `height` attributes to the brand logo, partner logos, and footer logos to prevent CLS.

---

## Pull Request Continuous Integration

We integrated a pull request Lighthouse audit gate into `.github/workflows/ci.yml`.

- Runs on push to `main` and `develop` and on all PRs.
- Builds the optimized assets.
- Executes Lighthouse CI (LHCI) on mobile and desktop profiles.
- Uploads HTML reports to temporary public storage.
- Posts a summary table with score cards and links to HTML reports as comments on pull requests.

---

## Audited Route Matrix (issue #152)

The Lighthouse job used to audit only `/`, and the Playwright accessibility suite
kept its own separate list of pages. Two lists meant two blind spots: a regression
on grants, blog, case studies, Stellar, status or the localized routes could ship
without either gate looking at it.

`route-matrix.json` at the repository root is now the single source of truth. Both
gates read it, so a route cannot be audited by one and missed by the other.

### Shape

```json
{
  "origin": "http://localhost:4173",
  "routes": [
    { "path": "/", "name": "homepage", "lighthouse": true },
    { "path": "/status", "name": "status", "lighthouse": false }
  ]
}
```

- `path` — the production route, relative to `origin`.
- `name` — human-readable label used in CI output, PR comments and test titles.
- `lighthouse` — whether the route is in the **budgeted subset** that gets mobile
  *and* desktop Lighthouse runs. Every route in the matrix gets axe accessibility
  checks regardless.

### Why a budgeted subset

Lighthouse is the expensive gate: each route is audited twice (mobile + desktop)
against a freshly built preview server. Auditing all routes on every push would
grow linearly with the site and delay every PR. The subset is the
highest-traffic and highest-regression-risk surface — home, FAQ, grants,
use cases and the calculator, Stellar, the case-studies list and a detail page,
the blog list and a post — while the rest of the matrix stays covered by the
cheap axe checks. Flip `"lighthouse": true` on a route to promote it.

Dynamic routes are pinned to a real slug (`/blog/stealth-addresses-explained`,
`/case-studies/payroll-processor`) so the audit hits a populated page instead of
an empty shell.

### Using it

```bash
npm run routes          # every route, one URL per line
npm run routes:check    # validate the matrix (paths, duplicates, budget)
node scripts/route-matrix.mjs --urls --lighthouse   # what CI audits
node scripts/route-matrix.mjs --names               # path -> name table
```

`npm run routes:check` runs at the start of the Lighthouse job, so a malformed
matrix (missing leading slash, trailing slash, duplicate `path` or `name`, an
empty Lighthouse subset) fails the build with a readable message rather than
silently auditing a 404.

### Where the results go

- The PR comment renders a per-route table for both presets, lists every axis
  below the 95 target, and flags any route that produced no result.
- Per-route JSON and HTML reports are uploaded as the
  `lighthouse-mobile-per-route` and `lighthouse-desktop-per-route` artifacts.
- The Playwright a11y suite runs the same matrix on both Desktop Chrome and a
  Pixel 5 viewport, since the collapsed navigation and responsive layouts are
  where accessibility behaviour differs from desktop.
