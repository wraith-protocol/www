/**
 * Production route inventory — single source of truth for every URL the site
 * serves and the quality-check policies that apply to each one.
 *
 * Every route that exists in App.tsx MUST have an entry here. The build step
 * runs `assertAllAppRoutesHavePolicy()` and fails the build when a route is
 * missing a policy, so new routes can never silently skip quality checks.
 *
 * Consumers
 * ---------
 *   scripts/sitemap.ts           — derives knownRoutes
 *   scripts/gen-sitemap.mjs      — reads the JSON snapshot at scripts/routes-snapshot.json
 *   tests/a11y/a11y.spec.ts      — reads a11yRoutes()
 *   src/__tests__/a11y.test.tsx  — reads a11yRoutes()
 *   tests/smoke/serverless.smoke.test.ts — reads smokeRoutes()
 *   .github/workflows/ci.yml     — reads lighthouseRoutes() via scripts/routes-snapshot.json
 */

// ---------------------------------------------------------------------------
// Policy shape
// ---------------------------------------------------------------------------

/**
 * Quality-check policy for a route.
 *
 * smoke      — included in the serverless smoke test "still serves built site" check.
 * a11y       — included in both the Vitest axe suite and the Playwright axe suite.
 * lighthouse — included in the Lighthouse CI audit.
 */
export interface RoutePolicy {
  smoke: boolean;
  a11y: boolean;
  lighthouse: boolean;
}

// ---------------------------------------------------------------------------
// Static routes
// ---------------------------------------------------------------------------

/**
 * A static route: a fixed URL path + its quality-check policy.
 *
 * `localized` marks routes that have locale-prefixed variants (/es/*, /pt/*).
 * This replaces the LOCALIZED_BASE_PATHS set in localizedRoutes.ts and the
 * PAGE_PATHS record in seo.ts.
 */
export interface StaticRoute {
  /** Absolute path, e.g. "/stellar". */
  path: string;
  /** Human-readable label used in test names. */
  label: string;
  /** Whether this route has /es/* and /pt/* counterparts in App.tsx. */
  localized: boolean;
  policy: RoutePolicy;
}

/**
 * All static routes served by the application.
 *
 * Rules for setting policies:
 *   smoke:      true for any page that must be served as HTML by the preview server.
 *               Keep this list representative rather than exhaustive.
 *   a11y:       true for every distinct page layout. Parameterised dynamic routes
 *               (e.g. /case-studies/:slug) are tested via DYNAMIC_ROUTE_SAMPLES.
 *   lighthouse: true for the most business-critical pages; auditing every route
 *               on every PR is expensive. Expand as budget allows.
 */
export const STATIC_ROUTES: StaticRoute[] = [
  {
    path: '/',
    label: 'homepage',
    localized: true,
    policy: { smoke: true, a11y: true, lighthouse: true },
  },
  {
    path: '/faq',
    label: 'FAQ',
    localized: false,
    policy: { smoke: true, a11y: true, lighthouse: false },
  },
  {
    path: '/privacy',
    label: 'privacy policy',
    localized: false,
    policy: { smoke: false, a11y: true, lighthouse: false },
  },
  {
    path: '/terms',
    label: 'terms of service',
    localized: false,
    policy: { smoke: false, a11y: true, lighthouse: false },
  },
  {
    path: '/press',
    label: 'press',
    localized: false,
    policy: { smoke: false, a11y: true, lighthouse: false },
  },
  {
    path: '/newsletter',
    label: 'newsletter',
    localized: false,
    policy: { smoke: false, a11y: true, lighthouse: false },
  },
  {
    path: '/use-cases',
    label: 'use cases',
    localized: false,
    policy: { smoke: true, a11y: true, lighthouse: false },
  },
  {
    path: '/use-cases/calculator',
    label: 'payment cost calculator',
    localized: false,
    policy: { smoke: false, a11y: true, lighthouse: false },
  },
  {
    path: '/roadmap',
    label: 'roadmap',
    localized: false,
    policy: { smoke: false, a11y: true, lighthouse: false },
  },
  {
    path: '/case-studies',
    label: 'case studies list',
    localized: true,
    policy: { smoke: false, a11y: true, lighthouse: false },
  },
  {
    path: '/stellar',
    label: 'Stellar page',
    localized: true,
    policy: { smoke: true, a11y: true, lighthouse: true },
  },
  {
    path: '/careers',
    label: 'careers',
    localized: false,
    policy: { smoke: false, a11y: true, lighthouse: false },
  },
  {
    path: '/grants',
    label: 'grants',
    localized: true,
    policy: { smoke: false, a11y: true, lighthouse: false },
  },
  {
    path: '/about',
    label: 'about',
    localized: false,
    policy: { smoke: false, a11y: true, lighthouse: false },
  },
  {
    path: '/governance',
    label: 'governance',
    localized: false,
    policy: { smoke: false, a11y: true, lighthouse: false },
  },
  {
    path: '/contributors',
    label: 'contributors',
    localized: false,
    policy: { smoke: false, a11y: true, lighthouse: false },
  },
  {
    path: '/blog',
    label: 'blog listing',
    localized: true,
    policy: { smoke: false, a11y: true, lighthouse: false },
  },
  {
    path: '/chains',
    label: 'chains',
    localized: false,
    policy: { smoke: false, a11y: true, lighthouse: false },
  },
  {
    path: '/ecosystem',
    label: 'ecosystem',
    localized: false,
    policy: { smoke: false, a11y: true, lighthouse: false },
  },
  {
    path: '/security',
    label: 'security',
    localized: false,
    policy: { smoke: false, a11y: true, lighthouse: false },
  },
  {
    path: '/threat-model',
    label: 'threat model',
    localized: false,
    policy: { smoke: false, a11y: true, lighthouse: false },
  },
  {
    path: '/vitals',
    label: 'vitals',
    localized: false,
    policy: { smoke: false, a11y: true, lighthouse: false },
  },
  {
    path: '/status',
    label: 'status',
    localized: false,
    policy: { smoke: false, a11y: true, lighthouse: false },
  },
];

// ---------------------------------------------------------------------------
// Dynamic route families
// ---------------------------------------------------------------------------

/**
 * A dynamic route family covers path patterns like `/blog/:slug`.
 *
 * `pattern`  — the React Router path pattern string, for documentation and
 *              for the policy-coverage assertion.
 * `samples`  — concrete paths used by quality-check suites. Keep at least one
 *              sample per family so every layout is exercised.
 * `localized` — whether the family has /es/* and /pt/* variants.
 */
export interface DynamicRouteFamily {
  pattern: string;
  label: string;
  localized: boolean;
  policy: RoutePolicy;
  /** Representative concrete paths exercised by quality checks. */
  samples: Array<{ path: string; label: string }>;
}

export const DYNAMIC_ROUTE_FAMILIES: DynamicRouteFamily[] = [
  {
    pattern: '/blog/:slug',
    label: 'blog post',
    localized: true,
    policy: { smoke: false, a11y: true, lighthouse: false },
    samples: [{ path: '/blog/stealth-addresses-explained', label: 'blog post detail' }],
  },
  {
    pattern: '/blog/tag/:tagSlug',
    label: 'blog tag archive',
    localized: true,
    policy: { smoke: false, a11y: false, lighthouse: false },
    samples: [],
  },
  {
    pattern: '/blog/author/:authorId',
    label: 'blog author archive',
    localized: true,
    policy: { smoke: false, a11y: false, lighthouse: false },
    samples: [],
  },
  {
    pattern: '/case-studies/:slug',
    label: 'case study detail',
    localized: true,
    policy: { smoke: false, a11y: true, lighthouse: false },
    samples: [{ path: '/case-studies/payroll-processor', label: 'case study detail' }],
  },
];

// ---------------------------------------------------------------------------
// Special routes (error pages, SPA fallback)
// ---------------------------------------------------------------------------

/**
 * Non-content routes that exist in App.tsx but are deliberately excluded from
 * sitemap, OG generation, and most quality checks.
 *
 * Listing them here satisfies the policy-coverage assertion without enrolling
 * them in checks they cannot meaningfully pass (e.g. Lighthouse on a 404 page).
 */
export const SPECIAL_ROUTES: Array<{
  pattern: string;
  label: string;
  policy: RoutePolicy;
}> = [
  {
    // React Router catch-all — renders NotFound
    pattern: '*',
    label: '404 not found',
    policy: { smoke: false, a11y: true, lighthouse: false },
  },
];

// ---------------------------------------------------------------------------
// Derived views
// ---------------------------------------------------------------------------

/** Paths that have /es/* and /pt/* variants. */
export function localizedBasePaths(): Set<string> {
  const paths = new Set<string>();
  for (const route of STATIC_ROUTES) {
    if (route.localized) paths.add(route.path);
  }
  for (const family of DYNAMIC_ROUTE_FAMILIES) {
    if (family.localized) {
      // Add the base segment, e.g. "/blog" from "/blog/:slug"
      const base = '/' + family.pattern.split('/')[1];
      paths.add(base);
    }
  }
  return paths;
}

/** Static paths included in the smoke "still serves built site" check. */
export function smokeRoutes(): Array<{ path: string; label: string }> {
  return STATIC_ROUTES.filter((r) => r.policy.smoke).map((r) => ({
    path: r.path,
    label: r.label,
  }));
}

/**
 * All paths that should be accessibility-checked.
 * Includes static routes flagged for a11y plus one representative sample per
 * dynamic family that has a11y: true.
 */
export function a11yRoutes(): Array<{ path: string; label: string }> {
  const routes: Array<{ path: string; label: string }> = [];

  for (const route of STATIC_ROUTES) {
    if (route.policy.a11y) {
      routes.push({ path: route.path, label: route.label });
    }
  }

  for (const family of DYNAMIC_ROUTE_FAMILIES) {
    if (family.policy.a11y) {
      routes.push(...family.samples);
    }
  }

  // The 404 page uses a concrete non-existent path so axe can actually render it.
  const notFound = SPECIAL_ROUTES.find((r) => r.pattern === '*');
  if (notFound?.policy.a11y) {
    routes.push({ path: '/nonexistent-page', label: notFound.label });
  }

  return routes;
}

/** Paths included in the Lighthouse audit. */
export function lighthouseRoutes(): Array<{ path: string; label: string }> {
  return STATIC_ROUTES.filter((r) => r.policy.lighthouse).map((r) => ({
    path: r.path,
    label: r.label,
  }));
}

/**
 * All static paths — used by the sitemap generator and OG pipeline.
 * Does not include dynamic route samples (those are expanded by their
 * respective generators from source data).
 */
export function allStaticPaths(): string[] {
  return STATIC_ROUTES.map((r) => r.path);
}
