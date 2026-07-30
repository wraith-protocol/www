# Data files

All data driving page content lives in `src/data/*.json`. Files are imported directly by components.

---

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
