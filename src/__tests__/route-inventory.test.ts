import { describe, expect, it } from 'vitest';
import { isIndexableRoute } from '../utils/og-metadata';
import {
  APP_ROUTES,
  REDIRECT_ROUTES,
  getAccessibilityTargets,
  getLighthousePages,
  getLocalizedRoutes,
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
} from '../routes/inventory';

const POLICY_KEYS: readonly (keyof RoutePolicy)[] = [
  'indexable',
  'sitemap',
  'smoke',
  'accessibility',
  'lighthouse',
];

function dynamicRoutes(): DynamicRouteDefinition[] {
  return APP_ROUTES.filter((route): route is DynamicRouteDefinition => route.kind === 'dynamic');
}

describe('route inventory policies', () => {
  it('declares an explicit boolean policy for every route', () => {
    for (const route of [...APP_ROUTES, ...REDIRECT_ROUTES]) {
      for (const key of POLICY_KEYS) {
        expect(typeof route.policy[key], `${route.id}.${key}`).toBe('boolean');
      }
    }
  });

  it('has unique ids and application paths', () => {
    const ids = [...APP_ROUTES, ...REDIRECT_ROUTES].map((route) => route.id);
    expect(new Set(ids).size).toBe(ids.length);

    const paths = APP_ROUTES.map((route) => route.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('never treats a redirect-only path as a page', () => {
    const redirects = getRedirectRoutes();
    expect(redirects.length).toBeGreaterThan(0);

    for (const redirect of redirects) {
      expect(redirect.path.startsWith('/')).toBe(true);
      expect(redirect.destination.startsWith('/')).toBe(true);
      expect(APP_ROUTES.some((route) => route.path === redirect.path)).toBe(false);
      expect(POLICY_KEYS.some((key) => redirect.policy[key])).toBe(false);
    }

    const pageSelections = [
      ...getSitemapStaticRoutes().map((route) => route.path),
      ...getSitemapDynamicRoutes().map((route) => route.path),
      ...getSmokePages(),
      ...getAccessibilityTargets().map((target) => target.path),
      ...getLighthousePages(),
    ];
    for (const redirect of redirects) {
      expect(pageSelections).not.toContain(redirect.path);
    }
  });

  it('keeps redirect-only paths out of robots.txt', () => {
    const disallow = getRobotsDisallowPaths();
    for (const redirect of getRedirectRoutes()) {
      expect(disallow).not.toContain(redirect.path);
    }
    expect(disallow).toContain('/blog/tag');
    expect(disallow).toContain('/blog/author');
  });
});

describe('dynamic route fixtures', () => {
  it('provides valid and invalid params that resolve against the route pattern', () => {
    for (const route of dynamicRoutes()) {
      expect(route.fixtures.valid.length, `${route.id} valid`).toBeGreaterThan(0);
      expect(route.fixtures.invalid.length, `${route.id} invalid`).toBeGreaterThan(0);

      for (const fixture of [...route.fixtures.valid, ...route.fixtures.invalid]) {
        for (const param of route.paramNames) {
          expect(fixture.params[param], `${route.id}.${param}`).toBeTruthy();
        }
        const path = resolveRoutePath(route, fixture.params);
        expect(matchAppRoute(path)?.route.id).toBe(route.id);
      }
    }
  });

  it('distinguishes valid and invalid fixture paths', () => {
    for (const route of dynamicRoutes()) {
      const valid = new Set(
        route.fixtures.valid.map((fixture) => resolveRoutePath(route, fixture.params)),
      );
      for (const fixture of route.fixtures.invalid) {
        expect(valid.has(resolveRoutePath(route, fixture.params))).toBe(false);
      }
    }
  });

  it('resolves valid params as indexable and invalid params as non-indexable', () => {
    for (const id of ['blog-post', 'case-study']) {
      const route = dynamicRoutes().find((candidate) => candidate.id === id);
      expect(route, id).toBeDefined();

      const valid = route!.fixtures.valid[0]!;
      expect(isIndexableRoute(resolveRoutePath(route!, valid.params)), `${id} valid`).toBe(true);

      const invalid = route!.fixtures.invalid[0]!;
      expect(isIndexableRoute(resolveRoutePath(route!, invalid.params)), `${id} invalid`).toBe(
        false,
      );
    }
  });
});

describe('inventory-driven check selections', () => {
  it('only selects indexable routes for the sitemap', () => {
    for (const route of [...getSitemapStaticRoutes(), ...getSitemapDynamicRoutes()]) {
      expect(route.policy.sitemap).toBe(true);
      expect(route.policy.indexable).toBe(true);
    }
    expect(getSitemapDynamicRoutes().map((route) => route.id)).not.toContain('blog-tag');
    expect(getSitemapDynamicRoutes().map((route) => route.id)).not.toContain('blog-author');
  });

  it('builds smoke, accessibility and Lighthouse selections from policies', () => {
    for (const path of getSmokePages()) {
      expect(matchAppRoute(path)?.route.policy.smoke).toBe(true);
    }
    for (const target of getAccessibilityTargets()) {
      if (target.path === '/nonexistent-page') continue;
      expect(matchAppRoute(target.path)?.route.policy.accessibility).toBe(true);
    }
    for (const path of getLighthousePages()) {
      expect(matchAppRoute(path)?.route.policy.lighthouse).toBe(true);
    }
  });

  it('expands localized route variants without duplicates', () => {
    const localized = getLocalizedRoutes();
    expect(localized.map((route) => route.path)).toEqual(
      expect.arrayContaining(['/', '/stellar', '/grants', '/blog', '/case-studies']),
    );

    const patterns = localized.flatMap((route) =>
      (['es', 'pt'] as const).map((locale) => withLocalePrefix(locale, route.path)),
    );
    expect(new Set(patterns).size).toBe(patterns.length);
    expect(patterns).toContain('/es');
    expect(patterns).toContain('/pt/blog/:slug');
  });
});
