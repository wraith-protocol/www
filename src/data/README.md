# Data files

All data driving page content lives in `src/data/*.json`. Files are imported directly by components.

---

## `blog-manifest.json`

The single, generated blog artifact. `scripts/gen-blog-manifest.mjs` parses each
MDX file's frontmatter once with the structured parser in
`scripts/blog-manifest-lib.mjs`, validates it, and writes this file.

Do not edit it by hand — edit the MDX frontmatter in `src/content/blog/` and run
`pnpm gen:blog-manifest`. The app (`src/utils/blog.ts`), RSS
(`scripts/gen-rss.mjs`), sitemap (`scripts/sitemap.ts`), related posts and OG
generation (`src/utils/og-metadata.ts`) all read this one file.

### Schema

```typescript
interface BlogManifestEntry {
  /** Filename-derived slug (unique, lowercase kebab-case) */
  slug: string;
  title: string;
  excerpt: string;
  /** Raw MDX body, used for word counts, TOC and feed descriptions */
  content: string;
  /** Normalized ISO date (YYYY-MM-DD) */
  date: string;
  /** Raw frontmatter author id or label */
  author: string;
  /** Display name after applying author opt-in/opt-out rules */
  authorName: string;
  /** Public author page id, or null when the author has no page */
  authorId: string | null;
  tags: string[];
  /** One of en | es | pt */
  locale: string;
  /** Drafts never render, index, or publish to feeds */
  draft: boolean;
  url: string;
  /** Repo-relative MDX source, used for sitemap git-date fallbacks */
  sourceFile: string;
}
```

### Frontmatter

```yaml
---
title: 'Privacy by default' # required, non-empty
date: '2026-07-20' # required, valid ISO date
author: 'wraith-team' # required, authors.json id or label
excerpt: 'One sentence summary.' # optional, derived from the body if omitted
tags: ['privacy', 'stealth-payments'] # required, array of non-empty strings
locale: 'en' # optional, en | es | pt, defaults to en
draft: false # optional boolean, defaults to false
---
```

Frontmatter is parsed as YAML: flow arrays (`tags: ['a', 'b']`), block
sequences, single/double-quoted values, literal (`|`) and folded (`>`) block
scalars, comments, escapes and Unicode are all supported. Malformed or invalid
frontmatter fails the build with the file and the specific problem.

## `ecosystem.json`

Powers the PartnerStrip component (homepage marquee) and the /ecosystem page.

### Schema

```typescript
interface EcosystemData {
  /** List of partner categories displayed as section groups on /ecosystem */
  categories: Array<{
    /** URL-safe identifier used for grouping partners */
    id: string;
    /** Human-readable category name (e.g. "Wallets", "DEXes") */
    label: string;
    /** Short description shown in the category section header */
    description: string;
  }>;

  /** List of ecosystem partners */
  partners: Array<{
    /** Display name */
    name: string;
    /** Short name used in the marquee strip items */
    shortName: string;
    /** One-sentence description of the partner and their integration */
    description: string;
    /** Must match a category id from categories[] above */
    category: string;
    /** External URL to the partner's site or docs */
    link: string;
    /** Path to SVG logo in /public/logos/ecosystem/ */
    logo: string;
    /** Image width in pixels (height is fixed at 28px) */
    width: number;
  }>;
}
```

## `trust.json`

Drives the TrustStrip component on the homepage.

### Schema

See `TrustStrip.tsx` — the type is defined inline. Keys include `audits`, `integrations`, and `uptime` with sub-items for labels, statuses, links, and counts.

## `case-studies.json`

Powers the /case-studies page and CaseStudiesStrip component.

### Schema

Canonical reference: `case-studies.json` entries contain `id`, `slug`, `org`, `logo`, `industry`, `useCase`, `integrationDate`, `status`, `quote`, `quotee`, `summary`, `challenge`, `solution`, `results`, `chains`, `testimonial`, and `technical`.

## `faq.json`

Drives the /faq page with search, category filtering, and accordion expansion.

### Schema

Each `entry` has `id`, `category`, `question`, `answer`, and optional `tags` for search indexing.

## `roadmap.json`

Powers the /roadmap timeline page.

### Schema

Entries are grouped by milestone phase with `phase`, `label`, `items` (each having `title`, `description`, and `status`).

## `showcase.json`

Drives the Showcase component on the homepage.

### Schema

Contains `items` with `title`, `description`, and optional `link` and `tags`.

## `authors.json`

Powers blog author bylines and the `/blog/author/:id` author pages.

MDX posts reference an author by `id` in their frontmatter (`author: 'lena-vogt'`). The id maps to an entry in this file.

### Schema

```typescript
interface AuthorsData {
  [id: string]: {
    /** Display name shown in the byline and on the author page */
    name: string;
    /** Short biography shown on the author page */
    bio: string;
    /** Optional avatar URL; if omitted, initials are rendered */
    avatar?: string;
    /** Optional profile links rendered on the author page */
    links?: {
      website?: string;
      github?: string;
      twitter?: string;
      email?: string;
    };
    /** When false the author collapses to "Wraith Team" and has no public page */
    optIn: boolean;
  };
}
```

Opted-out authors (those in `authors-optout.json` or with `optIn: false`) collapse to the "Wraith Team" label in post bylines and never generate a page. Unknown author ids fall back gracefully to the raw string with no link.

## `authors-optout.json`

A flat array of author ids that should never get a public author page and collapse to "Wraith Team" in bylines.

## `chains.json`

Powers the /chains comparison matrix page.

### Schema

```typescript
interface ChainsData {
  /** Page heading */
  title: string;
  /** Introductory paragraph */
  description: string;
  /** Column definitions for the matrix table */
  columns: Array<{
    /** Internal key matching chain object properties */
    key: string;
    /** Display header label */
    label: string;
    /** Whether the column is sortable (numeric values) */
    sortable: boolean;
    /** Optional unit suffix displayed after the value */
    unit?: string;
  }>;
  /** Chain entries displayed as matrix rows */
  chains: Array<{
    /** URL-safe identifier */
    id: string;
    /** Display name */
    name: string;
    /** Average block time in seconds */
    blockTime: number;
    /** Median transaction fee in USD */
    medianFee: number;
    /** Finality description (e.g. consensus mechanism) */
    finality: string;
    /** Supported wallet names */
    wallets: string;
    /** Integration status: live | testnet | devnet | planned */
    status: string;
    /** Audit information */
    audit: string;
    /** Link to chain-specific Wraith docs */
    docs: string;
    /** Expanded description shown in row detail */
    description: string;
  }>;
}
```

Each chain entry must include a documented `description` explaining the chain's role in the Wraith ecosystem and a `docs` link pointing to the relevant integration guide.
