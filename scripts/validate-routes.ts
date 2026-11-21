/**
 * Route inventory validation gate.
 *
 * Fails CI when:
 *   • an application route lacks an explicit policy;
 *   • a dynamic route lacks valid/invalid parameter fixtures, or a fixture
 *     does not resolve against the route pattern;
 *   • a redirect-only path is treated as a page (renderable, sitemapped,
 *     indexed, audited or smoke-tested);
 *   • App.tsx declares a route literal instead of rendering the inventory;
 *   • vercel.json redirects disagree with the inventory.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  APP_ROUTES,
  REDIRECT_ROUTES,
  ROUTES,
  SUPPORTED_LOCALE_PREFIXES,
  getLighthousePages,
  getRedirectRoutes,
  getRobotsDisallowPaths,
  getSitemapDynamicRoutes,
  getSitemapStaticRoutes,
  getSmokePages,
  matchAppRoute,
  resolveRoutePath,
  withLocalePrefix,
  type DynamicRouteDefinition,
  type RoutePolicy,
} from '../src/routes/inventory';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

const POLICY_KEYS: readonly (keyof RoutePolicy)[] = [
  'indexable',
  'sitemap',
  'smoke',
  'accessibility',
  'lighthouse',
];

const errors: string[] = [];

function fail(message: string): void {
  errors.push(message);
}

function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(join(rootDir, relativePath), 'utf8')) as T;
}

// ─── Policy and identity ─────────────────────────────────────────────────────

const ids = new Set<string>();
const appPaths = new Set<string>();

for (const route of ROUTES) {
  if (ids.has(route.id)) fail(`duplicate route id "${route.id}"`);
  ids.add(route.id);

  for (const key of POLICY_KEYS) {
    if (typeof route.policy?.[key] !== 'boolean') {
      fail(`route "${route.id}" is missing an explicit policy.${key}`);
    }
  }

  if (route.kind === 'redirect') {
    if (!route.destination.startsWith('/')) {
      fail(`redirect "${route.id}" destination must be an internal path`);
    }
    if (POLICY_KEYS.some((key) => route.policy[key])) {
      fail(`redirect-only path "${route.path}" must not be treated as a page`);
    }
    continue;
  }

  if (appPaths.has(route.path)) fail(`duplicate application route path "${route.path}"`);
  appPaths.add(route.path);

  if (route.kind === 'static') {
    if (!route.path.startsWith('/') && route.path !== '*') {
      fail(`static route "${route.id}" must start with "/"`);
    }
    if (!route.component) fail(`static route "${route.id}" has no component`);
    if (!Array.isArray(route.sources)) fail(`static route "${route.id}" has no sources array`);
  }
}

for (const route of REDIRECT_ROUTES) {
  if (APP_ROUTES.some((appRoute) => appRoute.path === route.path)) {
    fail(`redirect-only path "${route.path}" is also a renderable application route`);
  }
}

// ─── Dynamic fixtures ────────────────────────────────────────────────────────

const blogSlugs = new Set<string>();
for (const post of readJson<Array<{ slug?: string }>>('src/data/blog-posts.json')) {
  if (post.slug) blogSlugs.add(post.slug);
}
for (const post of readJson<Array<{ slug?: string }>>('src/data/blog-manifest.json')) {
  if (post.slug) blogSlugs.add(post.slug);
}

const caseStudySlugs = new Set<string>(
  readJson<{ entries?: Array<{ slug?: string }> }>('src/data/case-studies.json')
    .entries?.map((entry) => entry.slug)
    .filter((slug): slug is string => Boolean(slug)) ?? [],
);

function validateDynamicFixture(
  route: DynamicRouteDefinition,
  kind: 'valid' | 'invalid',
  index: number,
): void {
  const fixtures = route.fixtures[kind];
  const fixture = fixtures[index];
  if (!fixture) return;

  const where = `dynamic route "${route.id}" ${kind} fixture "${fixture.label}"`;

  for (const param of route.paramNames) {
    if (!fixture.params[param]) fail(`${where} is missing param "${param}"`);
  }

  let path: string;
  try {
    path = fixture.path ?? resolveRoutePath(route, fixture.params);
  } catch (error) {
    fail(`${where} does not resolve: ${(error as Error).message}`);
    return;
  }

  const match = matchAppRoute(path);
  if (!match || match.route.id !== route.id) {
    fail(`${where} resolves to "${path}", which does not match ${route.path}`);
  }

  if (route.sitemapSource === 'blog-posts') {
    const slug = fixture.params.slug ?? '';
    if (kind === 'valid' && !blogSlugs.has(slug)) {
      fail(`${where} references unknown blog slug "${slug}"`);
    }
    if (kind === 'invalid' && blogSlugs.has(slug)) {
      fail(`${where} must not reference the real blog slug "${slug}"`);
    }
  }

  if (route.sitemapSource === 'case-studies') {
    const slug = fixture.params.slug ?? '';
    if (kind === 'valid' && !caseStudySlugs.has(slug)) {
      fail(`${where} references unknown case study slug "${slug}"`);
    }
    if (kind === 'invalid' && caseStudySlugs.has(slug)) {
      fail(`${where} must not reference the real case study slug "${slug}"`);
    }
  }
}

for (const route of APP_ROUTES) {
  if (route.kind !== 'dynamic') continue;

  if (route.fixtures.valid.length === 0) {
    fail(`dynamic route "${route.id}" has no valid parameter fixtures`);
  }
  if (route.fixtures.invalid.length === 0) {
    fail(`dynamic route "${route.id}" has no invalid parameter fixtures`);
  }

  route.fixtures.valid.forEach((_, index) => validateDynamicFixture(route, 'valid', index));
  route.fixtures.invalid.forEach((_, index) => validateDynamicFixture(route, 'invalid', index));

  const validPaths = new Set(
    route.fixtures.valid.map((fixture) => fixture.path ?? resolveRoutePath(route, fixture.params)),
  );
  for (const fixture of route.fixtures.invalid) {
    const path = fixture.path ?? resolveRoutePath(route, fixture.params);
    if (validPaths.has(path)) {
      fail(`dynamic route "${route.id}" marks "${path}" both valid and invalid`);
    }
  }
}

// ─── Selection gates ─────────────────────────────────────────────────────────

const redirectPaths = new Set(getRedirectRoutes().map((route) => route.path));

for (const route of [...getSitemapStaticRoutes(), ...getSitemapDynamicRoutes()]) {
  if (!route.policy.indexable) {
    fail(`sitemap includes non-indexable route "${route.id}"`);
  }
  if (redirectPaths.has(route.path)) {
    fail(`sitemap includes redirect-only path "${route.path}"`);
  }
}

for (const path of [...getSmokePages(), ...getLighthousePages()]) {
  const match = matchAppRoute(path);
  if (!match) fail(`audit selection includes "${path}", which is not an application route`);
  if (redirectPaths.has(path)) fail(`audit selection includes redirect-only path "${path}"`);
}

for (const path of getRobotsDisallowPaths()) {
  if (redirectPaths.has(path)) {
    fail(`robots.txt disallows redirect-only path "${path}"`);
  }
}

// ─── Locale expansion ───────────────────────────────────────────────────────

const localizedPatterns = new Set<string>();
for (const route of APP_ROUTES.filter((candidate) => candidate.localized)) {
  for (const locale of SUPPORTED_LOCALE_PREFIXES) {
    const localized = withLocalePrefix(locale, route.path);
    if (localizedPatterns.has(localized)) {
      fail(`duplicate localized route "${localized}"`);
    }
    localizedPatterns.add(localized);
  }
}

// ─── Router and deployment configuration ────────────────────────────────────

const appSource = readFileSync(join(rootDir, 'src', 'App.tsx'), 'utf8');

if (!appSource.includes('APP_ROUTES.map')) {
  fail('src/App.tsx must render the route inventory (APP_ROUTES.map)');
}
if (!appSource.includes('getLocalizedRoutes()')) {
  fail('src/App.tsx must render locale routes from the inventory (getLocalizedRoutes())');
}

const literalRoutePatterns = [/<Route\b[^>]*\spath="/, /<Route\b[^>]*\spath=\{['"`]/];
for (const pattern of literalRoutePatterns) {
  if (pattern.test(appSource)) {
    fail(
      'src/App.tsx declares a route path literal outside the inventory; add it to src/routes/inventory.ts instead',
    );
  }
}

interface VercelRedirect {
  source?: string;
  destination?: string;
  permanent?: boolean;
  statusCode?: number;
}

const vercelConfig = readJson<{ redirects?: VercelRedirect[] }>('vercel.json');

for (const redirect of REDIRECT_ROUTES) {
  const configured = (vercelConfig.redirects ?? []).find(
    (candidate) => candidate.source === redirect.path,
  );
  if (!configured) {
    fail(`vercel.json is missing the redirect for "${redirect.path}"`);
    continue;
  }
  if (configured.destination !== redirect.destination) {
    fail(
      `vercel.json redirect "${redirect.path}" must point at "${redirect.destination}", not "${configured.destination}"`,
    );
  }
  const status = configured.statusCode ?? (configured.permanent ? 301 : 308);
  if (status !== redirect.status) {
    fail(`vercel.json redirect "${redirect.path}" must use status ${redirect.status}`);
  }
}

// ─── Result ─────────────────────────────────────────────────────────────────

if (errors.length > 0) {
  console.error('Route inventory validation failed:\n');
  for (const error of errors) console.error(`  • ${error}`);
  console.error(
    `\n${errors.length} problem(s). Fix src/routes/inventory.ts (or the files it drives) and re-run.`,
  );
  process.exit(1);
}

console.log(
  `Route inventory OK: ${APP_ROUTES.length} application routes, ${REDIRECT_ROUTES.length} redirect-only paths.`,
);
