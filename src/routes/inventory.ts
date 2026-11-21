/**
 * Production route inventory.
 *
 * This is the single source of truth for every renderable application route
 * (static and dynamic) plus redirect-only paths. The router, sitemap, robots
 * generation, server-rendered metadata/canonical selection, smoke tests,
 * accessibility audits and Lighthouse all consume this file instead of
 * keeping their own route arrays.
 *
 * Every entry must declare an explicit policy. `scripts/validate-routes.ts`
 * fails CI when an application route is missing one, when a dynamic route
 * lacks valid/invalid parameter fixtures, when a redirect is treated as a
 * page, or when App.tsx declares a route that bypasses the inventory.
 */

export const SUPPORTED_LOCALE_PREFIXES = ['es', 'pt'] as const;
export type LocalePrefix = (typeof SUPPORTED_LOCALE_PREFIXES)[number];

/** What route-aware checks may do with a route. Every field is required. */
export interface RoutePolicy {
  /** Search engines may index the page. */
  readonly indexable: boolean;
  /** Include the route in sitemap.xml. */
  readonly sitemap: boolean;
  /** Request the route in the serverless smoke suite. */
  readonly smoke: boolean;
  /** Run the accessibility audit against the route. */
  readonly accessibility: boolean;
  /** Include the route in the Lighthouse audit. */
  readonly lighthouse: boolean;
}

export type RouteComponent =
  | 'home'
  | 'faq'
  | 'privacy'
  | 'terms'
  | 'press'
  | 'newsletter'
  | 'useCases'
  | 'costCalculator'
  | 'roadmap'
  | 'caseStudies'
  | 'ecosystem'
  | 'vitals'
  | 'security'
  | 'threatModel'
  | 'status'
  | 'stellar'
  | 'careers'
  | 'grants'
  | 'about'
  | 'governance'
  | 'contributors'
  | 'blog'
  | 'chains'
  | 'notFound';

/** `layout` pages are wrapped in the shared Header/Footer layout by the router. */
export type RouteShell = 'plain' | 'layout';

export interface RouteFixture {
  readonly label: string;
  readonly params: Readonly<Record<string, string>>;
  /** Optional concrete path, used for probes that do not resolve a pattern. */
  readonly path?: string;
}

interface RouteBase {
  readonly id: string;
  readonly path: string;
  readonly label: string;
  readonly localized: boolean;
  readonly changefreq: 'daily' | 'weekly';
  readonly priority: '1.0' | '0.8' | '0.7';
  readonly policy: RoutePolicy;
}

export interface StaticRouteDefinition extends RouteBase {
  readonly kind: 'static';
  readonly component: RouteComponent;
  readonly shell: RouteShell;
  /** OG image slug for bot metadata. Absent when no static card exists. */
  readonly ogSlug?: string;
  /** Source files used to derive sitemap lastmod values. */
  readonly sources: readonly string[];
}

export interface DynamicRouteDefinition extends RouteBase {
  readonly kind: 'dynamic';
  readonly component: RouteComponent;
  readonly shell: RouteShell;
  readonly paramNames: readonly string[];
  readonly fixtures: {
    readonly valid: readonly RouteFixture[];
    readonly invalid: readonly RouteFixture[];
  };
  /** Where the sitemap finds the concrete parameters for this route. */
  readonly sitemapSource: 'blog-posts' | 'blog-tags' | 'blog-authors' | 'case-studies';
}

/** A redirect-only path. It is never rendered as a page. */
export interface RedirectRouteDefinition {
  readonly kind: 'redirect';
  readonly id: string;
  readonly path: string;
  readonly label: string;
  readonly destination: string;
  readonly status: 301 | 302 | 307 | 308;
  readonly localized: false;
  readonly policy: RoutePolicy;
}

export type AppRouteDefinition = StaticRouteDefinition | DynamicRouteDefinition;
export type RouteDefinition = AppRouteDefinition | RedirectRouteDefinition;

const NO_POLICY: RoutePolicy = {
  indexable: false,
  sitemap: false,
  smoke: false,
  accessibility: false,
  lighthouse: false,
};

/**
 * Renderable routes. The router renders exactly this list; the `*` entry is
 * the not-found boundary and is matched last by React Router's ranking.
 */
export const APP_ROUTES: readonly AppRouteDefinition[] = [
  {
    kind: 'static',
    id: 'home',
    path: '/',
    label: 'homepage',
    component: 'home',
    shell: 'plain',
    localized: true,
    ogSlug: 'home',
    sources: ['src/pages', 'src/components/Hero.tsx'],
    changefreq: 'daily',
    priority: '1.0',
    policy: { indexable: true, sitemap: true, smoke: true, accessibility: true, lighthouse: true },
  },
  {
    kind: 'static',
    id: 'faq',
    path: '/faq',
    label: 'FAQ',
    component: 'faq',
    shell: 'plain',
    localized: false,
    ogSlug: 'faq',
    sources: ['src/data/faq.json', 'src/pages/Faq.tsx'],
    changefreq: 'weekly',
    priority: '0.8',
    policy: {
      indexable: true,
      sitemap: true,
      smoke: false,
      accessibility: true,
      lighthouse: false,
    },
  },
  {
    kind: 'static',
    id: 'privacy',
    path: '/privacy',
    label: 'privacy policy',
    component: 'privacy',
    shell: 'plain',
    localized: false,
    ogSlug: 'privacy',
    sources: ['src/pages/Privacy.tsx'],
    changefreq: 'weekly',
    priority: '0.8',
    policy: {
      indexable: true,
      sitemap: true,
      smoke: false,
      accessibility: true,
      lighthouse: false,
    },
  },
  {
    kind: 'static',
    id: 'terms',
    path: '/terms',
    label: 'terms of service',
    component: 'terms',
    shell: 'plain',
    localized: false,
    sources: ['src/pages/Terms.tsx'],
    changefreq: 'weekly',
    priority: '0.8',
    policy: {
      indexable: true,
      sitemap: true,
      smoke: false,
      accessibility: false,
      lighthouse: false,
    },
  },
  {
    kind: 'static',
    id: 'press',
    path: '/press',
    label: 'press kit',
    component: 'press',
    shell: 'plain',
    localized: false,
    sources: ['src/pages/Press.tsx'],
    changefreq: 'weekly',
    priority: '0.8',
    policy: {
      indexable: true,
      sitemap: true,
      smoke: false,
      accessibility: false,
      lighthouse: false,
    },
  },
  {
    kind: 'static',
    id: 'newsletter',
    path: '/newsletter',
    label: 'newsletter',
    component: 'newsletter',
    shell: 'plain',
    localized: false,
    ogSlug: 'newsletter',
    sources: ['src/pages/Newsletter.tsx'],
    changefreq: 'weekly',
    priority: '0.8',
    policy: {
      indexable: true,
      sitemap: true,
      smoke: false,
      accessibility: false,
      lighthouse: false,
    },
  },
  {
    kind: 'static',
    id: 'use-cases',
    path: '/use-cases',
    label: 'use cases',
    component: 'useCases',
    shell: 'plain',
    localized: false,
    ogSlug: 'use-cases',
    sources: ['src/pages/UseCases.tsx'],
    changefreq: 'weekly',
    priority: '0.8',
    policy: {
      indexable: true,
      sitemap: true,
      smoke: false,
      accessibility: true,
      lighthouse: false,
    },
  },
  {
    kind: 'static',
    id: 'use-cases-calculator',
    path: '/use-cases/calculator',
    label: 'payment cost calculator',
    component: 'costCalculator',
    shell: 'plain',
    localized: false,
    ogSlug: 'use-cases-calculator',
    sources: ['src/pages/CostCalculatorPage.tsx', 'src/components/CostCalculator.tsx'],
    changefreq: 'weekly',
    priority: '0.8',
    policy: {
      indexable: true,
      sitemap: true,
      smoke: false,
      accessibility: true,
      lighthouse: false,
    },
  },
  {
    kind: 'static',
    id: 'roadmap',
    path: '/roadmap',
    label: 'roadmap',
    component: 'roadmap',
    shell: 'plain',
    localized: false,
    ogSlug: 'roadmap',
    sources: ['src/data/roadmap.json', 'src/pages/Roadmap.tsx'],
    changefreq: 'weekly',
    priority: '0.8',
    policy: {
      indexable: true,
      sitemap: true,
      smoke: false,
      accessibility: true,
      lighthouse: false,
    },
  },
  {
    kind: 'static',
    id: 'case-studies',
    path: '/case-studies',
    label: 'case studies list',
    component: 'caseStudies',
    shell: 'plain',
    localized: true,
    ogSlug: 'case-studies',
    sources: ['src/data/case-studies.json', 'src/pages/CaseStudies.tsx'],
    changefreq: 'weekly',
    priority: '0.8',
    policy: {
      indexable: true,
      sitemap: true,
      smoke: false,
      accessibility: true,
      lighthouse: false,
    },
  },
  {
    kind: 'static',
    id: 'ecosystem',
    path: '/ecosystem',
    label: 'ecosystem',
    component: 'ecosystem',
    shell: 'layout',
    localized: false,
    ogSlug: 'ecosystem',
    sources: ['src/data/ecosystem.json', 'src/pages/Ecosystem.tsx'],
    changefreq: 'weekly',
    priority: '0.8',
    policy: {
      indexable: true,
      sitemap: true,
      smoke: false,
      accessibility: false,
      lighthouse: false,
    },
  },
  {
    kind: 'static',
    id: 'vitals',
    path: '/vitals',
    label: 'vitals',
    component: 'vitals',
    shell: 'plain',
    localized: false,
    ogSlug: 'vitals',
    sources: ['src/pages/Vitals.tsx'],
    changefreq: 'weekly',
    priority: '0.8',
    policy: {
      indexable: true,
      sitemap: true,
      smoke: false,
      accessibility: false,
      lighthouse: false,
    },
  },
  {
    kind: 'static',
    id: 'security',
    path: '/security',
    label: 'security',
    component: 'security',
    shell: 'layout',
    localized: false,
    ogSlug: 'security',
    sources: ['src/data/security.json', 'src/pages/Security.tsx'],
    changefreq: 'weekly',
    priority: '0.8',
    policy: {
      indexable: true,
      sitemap: true,
      smoke: false,
      accessibility: false,
      lighthouse: false,
    },
  },
  {
    kind: 'static',
    id: 'threat-model',
    path: '/threat-model',
    label: 'threat model',
    component: 'threatModel',
    shell: 'layout',
    localized: false,
    ogSlug: 'threat-model',
    sources: ['src/data/threat-model.json', 'src/pages/ThreatModel.tsx'],
    changefreq: 'weekly',
    priority: '0.8',
    policy: {
      indexable: true,
      sitemap: true,
      smoke: false,
      accessibility: false,
      lighthouse: false,
    },
  },
  {
    kind: 'static',
    id: 'status',
    path: '/status',
    label: 'status',
    component: 'status',
    shell: 'layout',
    localized: false,
    ogSlug: 'status',
    sources: ['src/pages/Status.tsx'],
    changefreq: 'weekly',
    priority: '0.8',
    policy: {
      indexable: true,
      sitemap: true,
      smoke: false,
      accessibility: false,
      lighthouse: false,
    },
  },
  {
    kind: 'static',
    id: 'stellar',
    path: '/stellar',
    label: 'Stellar page',
    component: 'stellar',
    shell: 'layout',
    localized: true,
    ogSlug: 'stellar',
    sources: ['src/pages/Stellar.tsx'],
    changefreq: 'weekly',
    priority: '0.8',
    policy: { indexable: true, sitemap: true, smoke: true, accessibility: true, lighthouse: false },
  },
  {
    kind: 'static',
    id: 'careers',
    path: '/careers',
    label: 'careers',
    component: 'careers',
    shell: 'layout',
    localized: false,
    ogSlug: 'careers',
    sources: ['src/pages/Careers.tsx'],
    changefreq: 'weekly',
    priority: '0.8',
    policy: {
      indexable: true,
      sitemap: true,
      smoke: false,
      accessibility: false,
      lighthouse: false,
    },
  },
  {
    kind: 'static',
    id: 'grants',
    path: '/grants',
    label: 'grants',
    component: 'grants',
    shell: 'layout',
    localized: true,
    ogSlug: 'grants',
    sources: ['src/pages/Grants.tsx'],
    changefreq: 'weekly',
    priority: '0.8',
    policy: {
      indexable: true,
      sitemap: true,
      smoke: false,
      accessibility: false,
      lighthouse: false,
    },
  },
  {
    kind: 'static',
    id: 'about',
    path: '/about',
    label: 'about',
    component: 'about',
    shell: 'layout',
    localized: false,
    ogSlug: 'about',
    sources: ['src/pages/About.tsx'],
    changefreq: 'weekly',
    priority: '0.8',
    policy: {
      indexable: true,
      sitemap: true,
      smoke: false,
      accessibility: false,
      lighthouse: false,
    },
  },
  {
    kind: 'static',
    id: 'governance',
    path: '/governance',
    label: 'governance',
    component: 'governance',
    shell: 'layout',
    localized: false,
    ogSlug: 'governance',
    sources: ['src/pages/Governance.tsx'],
    changefreq: 'weekly',
    priority: '0.8',
    policy: {
      indexable: true,
      sitemap: true,
      smoke: false,
      accessibility: false,
      lighthouse: false,
    },
  },
  {
    kind: 'static',
    id: 'contributors',
    path: '/contributors',
    label: 'contributors',
    component: 'contributors',
    shell: 'layout',
    localized: false,
    ogSlug: 'contributors',
    sources: ['src/pages/Contributors.tsx'],
    changefreq: 'weekly',
    priority: '0.8',
    policy: {
      indexable: true,
      sitemap: true,
      smoke: false,
      accessibility: false,
      lighthouse: false,
    },
  },
  {
    kind: 'static',
    id: 'blog',
    path: '/blog',
    label: 'blog',
    component: 'blog',
    shell: 'layout',
    localized: true,
    ogSlug: 'blog',
    sources: ['src/pages/Blog.tsx', 'src/content/blog'],
    changefreq: 'weekly',
    priority: '0.8',
    policy: {
      indexable: true,
      sitemap: true,
      smoke: false,
      accessibility: false,
      lighthouse: false,
    },
  },
  {
    kind: 'static',
    id: 'chains',
    path: '/chains',
    label: 'chains',
    component: 'chains',
    shell: 'layout',
    localized: false,
    ogSlug: 'chains',
    sources: ['src/data/chains.json', 'src/pages/Chains.tsx'],
    changefreq: 'weekly',
    priority: '0.8',
    policy: {
      indexable: true,
      sitemap: true,
      smoke: false,
      accessibility: false,
      lighthouse: false,
    },
  },
  {
    kind: 'static',
    id: 'not-found',
    path: '*',
    label: '404 not found',
    component: 'notFound',
    shell: 'plain',
    localized: false,
    sources: [],
    changefreq: 'weekly',
    priority: '0.8',
    policy: {
      indexable: false,
      sitemap: false,
      smoke: false,
      accessibility: false,
      lighthouse: false,
    },
  },
  {
    kind: 'dynamic',
    id: 'case-study',
    path: '/case-studies/:slug',
    label: 'case study detail',
    component: 'caseStudies',
    shell: 'plain',
    localized: true,
    paramNames: ['slug'],
    sitemapSource: 'case-studies',
    changefreq: 'weekly',
    priority: '0.7',
    fixtures: {
      valid: [{ label: 'payroll processor', params: { slug: 'payroll-processor' } }],
      invalid: [{ label: 'unknown case study', params: { slug: 'nonexistent-case-study' } }],
    },
    policy: {
      indexable: true,
      sitemap: true,
      smoke: false,
      accessibility: true,
      lighthouse: false,
    },
  },
  {
    kind: 'dynamic',
    id: 'blog-post',
    path: '/blog/:slug',
    label: 'blog post',
    component: 'blog',
    shell: 'layout',
    localized: true,
    paramNames: ['slug'],
    sitemapSource: 'blog-posts',
    changefreq: 'weekly',
    priority: '0.8',
    fixtures: {
      valid: [
        { label: 'wave 7 kickoff', params: { slug: 'wave-7-kickoff' } },
        { label: 'stealth addresses explained', params: { slug: 'stealth-addresses-explained' } },
      ],
      invalid: [{ label: 'unknown post', params: { slug: 'nonexistent-post' } }],
    },
    policy: {
      indexable: true,
      sitemap: true,
      smoke: true,
      accessibility: false,
      lighthouse: false,
    },
  },
  {
    kind: 'dynamic',
    id: 'blog-tag',
    path: '/blog/tag/:tagSlug',
    label: 'blog tag archive',
    component: 'blog',
    shell: 'layout',
    localized: true,
    paramNames: ['tagSlug'],
    sitemapSource: 'blog-tags',
    changefreq: 'weekly',
    priority: '0.8',
    fixtures: {
      valid: [{ label: 'stealth payments tag', params: { tagSlug: 'stealth-payments' } }],
      invalid: [{ label: 'unknown tag', params: { tagSlug: 'not-a-real-tag' } }],
    },
    policy: {
      indexable: false,
      sitemap: false,
      smoke: false,
      accessibility: false,
      lighthouse: false,
    },
  },
  {
    kind: 'dynamic',
    id: 'blog-author',
    path: '/blog/author/:authorId',
    label: 'blog author archive',
    component: 'blog',
    shell: 'layout',
    localized: true,
    paramNames: ['authorId'],
    sitemapSource: 'blog-authors',
    changefreq: 'weekly',
    priority: '0.8',
    fixtures: {
      valid: [{ label: 'known author', params: { authorId: 'lena-vogt' } }],
      invalid: [{ label: 'unknown author', params: { authorId: 'does-not-exist' } }],
    },
    policy: {
      indexable: false,
      sitemap: false,
      smoke: false,
      accessibility: false,
      lighthouse: false,
    },
  },
];

/**
 * Redirect-only paths. They are declared in vercel.json as permanent
 * redirects and must never be rendered, sitemapped, audited or indexed.
 */
export const REDIRECT_ROUTES: readonly RedirectRouteDefinition[] = [
  {
    kind: 'redirect',
    id: 'legacy-home',
    path: '/home',
    label: 'legacy home alias',
    destination: '/',
    status: 301,
    localized: false,
    policy: NO_POLICY,
  },
  {
    kind: 'redirect',
    id: 'legacy-index-html',
    path: '/index.html',
    label: 'legacy index.html alias',
    destination: '/',
    status: 301,
    localized: false,
    policy: NO_POLICY,
  },
];

export const ROUTES: readonly RouteDefinition[] = [...APP_ROUTES, ...REDIRECT_ROUTES];

/** A path used to exercise the SPA not-found boundary. */
export const NOT_FOUND_PROBE_PATH = '/nonexistent-page';
/** A path served by the SPA fallback rewrite with no dedicated page. */
export const SPA_FALLBACK_PROBE_PATH = '/spa-client-route';

const ROUTE_BY_ID = new Map<string, RouteDefinition>(ROUTES.map((route) => [route.id, route]));

export function getRouteById(id: string): RouteDefinition | undefined {
  return ROUTE_BY_ID.get(id);
}

export function isAppRoute(route: RouteDefinition): route is AppRouteDefinition {
  return route.kind !== 'redirect';
}

export function getLocalizedRoutes(): readonly AppRouteDefinition[] {
  return APP_ROUTES.filter((route) => route.localized);
}

export function getSitemapStaticRoutes(): readonly StaticRouteDefinition[] {
  return APP_ROUTES.filter(
    (route): route is StaticRouteDefinition =>
      route.kind === 'static' && route.policy.sitemap && route.path !== '*',
  );
}

export function getSitemapLocalizedStaticRoutes(): readonly StaticRouteDefinition[] {
  return getSitemapStaticRoutes().filter((route) => route.localized);
}

export function getSitemapDynamicRoutes(): readonly DynamicRouteDefinition[] {
  return APP_ROUTES.filter(
    (route): route is DynamicRouteDefinition => route.kind === 'dynamic' && route.policy.sitemap,
  );
}

export function getRedirectRoutes(): readonly RedirectRouteDefinition[] {
  return REDIRECT_ROUTES;
}

/** Non-indexable route prefixes that robots.txt should keep out of search. */
export function getRobotsDisallowPaths(): string[] {
  const paths = APP_ROUTES.filter((route) => !route.policy.indexable && route.path !== '*').map(
    (route) => (route.kind === 'dynamic' ? route.path.split('/:')[0]! : route.path),
  );
  return Array.from(new Set(paths)).sort();
}

/** Replace `:param` segments with fixture values. Missing params throw. */
export function resolveRoutePath(
  route: Pick<AppRouteDefinition, 'path'>,
  params: Readonly<Record<string, string>>,
): string {
  return route.path
    .split('/')
    .map((segment) => {
      if (!segment.startsWith(':')) return segment;
      const name = segment.slice(1);
      const value = params[name];
      if (!value) {
        throw new Error(`Missing param "${name}" for route ${route.path}`);
      }
      return value;
    })
    .join('/');
}

/** Prefix a route pattern with a locale (`/` becomes `/es`, `/blog` becomes `/es/blog`). */
export function withLocalePrefix(locale: LocalePrefix, path: string): string {
  if (path === '/') return `/${locale}`;
  return `/${locale}${path}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function patternToRegExp(pattern: string): RegExp {
  const source = pattern
    .split('/')
    .map((segment) => (segment.startsWith(':') ? '([^/]+)' : escapeRegExp(segment)))
    .join('/');
  return new RegExp(`^${source}$`);
}

const MATCHERS: Array<{ route: AppRouteDefinition; regex: RegExp }> = APP_ROUTES.filter(
  (route) => route.path !== '*',
).map((route) => ({ route, regex: patternToRegExp(route.path) }));

export interface RouteMatch {
  readonly route: AppRouteDefinition;
  readonly params: Readonly<Record<string, string>>;
}

/** Match a concrete pathname against the inventory. Static routes win over dynamic ones. */
export function matchAppRoute(pathname: string): RouteMatch | null {
  const normalized =
    pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;

  const staticMatch = MATCHERS.find(
    ({ route, regex }) => route.kind === 'static' && regex.test(normalized),
  );
  if (staticMatch) return { route: staticMatch.route, params: {} };

  for (const { route, regex } of MATCHERS) {
    if (route.kind !== 'dynamic') continue;
    const match = normalized.match(regex);
    if (!match) continue;
    const params: Record<string, string> = {};
    route.paramNames.forEach((name, index) => {
      params[name] = decodeURIComponent(match[index + 1] ?? '');
    });
    return { route, params };
  }

  return null;
}

function concretePath(route: AppRouteDefinition): string | null {
  if (route.kind === 'static') return route.path === '*' ? null : route.path;
  const fixture = route.fixtures.valid[0];
  return fixture ? (fixture.path ?? resolveRoutePath(route, fixture.params)) : null;
}

export function getSmokePages(): string[] {
  return APP_ROUTES.filter((route) => route.policy.smoke)
    .map(concretePath)
    .filter((path): path is string => path !== null);
}

export interface AuditTarget {
  readonly path: string;
  readonly name: string;
}

export function getAccessibilityTargets(): AuditTarget[] {
  const targets = APP_ROUTES.filter((route) => route.policy.accessibility)
    .map((route) => {
      const path = concretePath(route);
      return path === null ? null : { path, name: route.label };
    })
    .filter((target): target is AuditTarget => target !== null);

  if (APP_ROUTES.some((route) => route.id === 'not-found')) {
    targets.push({ path: NOT_FOUND_PROBE_PATH, name: '404 not found' });
  }

  return targets;
}

export function getLighthousePages(): string[] {
  return APP_ROUTES.filter((route) => route.policy.lighthouse)
    .map(concretePath)
    .filter((path): path is string => path !== null);
}
