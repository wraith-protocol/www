/**
 * Tests for scripts/sitemap.ts
 *
 * Verifies:
 * • Command injection prevention when gitLastModified processes repository paths.
 * • Explicit input/output types with shared route and blog manifests.
 * • Static, localized, dynamic, redirected, draft, unknown, and non-indexable routes.
 * • Strict URL validation rejecting duplicate, malformed, noncanonical, and preview URLs.
 * • Deterministic XML output matching public/sitemap.xml byte-for-byte.
 */

import { existsSync, unlinkSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  gitLastModified,
  toDateString,
  normalizeRoute,
  isCanonicalRoutePath,
  isIndexableRoute,
  isKnownRoute,
  validateSiteOrigin,
  validateSitemapUrl,
  collectRoutes,
  buildSitemap,
  generateSitemapArtifact,
  getCaseStudyRoutes,
  getAuthorRoutes,
  getBlogRoutes,
  getBlogTagRoutes,
  type RouteEntry,
  type ChangeFrequency,
  type RoutePriority,
} from '../scripts/sitemap.ts';
import {
  CANONICAL_SITE_ORIGIN,
  parseAuthorsManifest,
  parseBlogManifest,
  parseBlogPostsJson,
  parseCaseStudyManifest,
} from '../src/utils/manifests.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('sitemap command injection prevention (regression test)', () => {
  it('does not execute shell commands when repository-controlled paths contain quotes and metacharacters', () => {
    const canary = join(
      tmpdir(),
      `sitemap-canary-${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`,
    );

    if (existsSync(canary)) {
      unlinkSync(canary);
    }

    try {
      const injectionPayloads = [
        `src/content/blog/"; touch "${canary}"; #.md`,
        `src/content/blog/test'; touch "${canary}"; '.md`,
        `src/content/blog/$(touch "${canary}").md`,
        `src/content/blog/\`touch "${canary}"\`.md`,
        `src/content/blog/post.md; touch "${canary}"`,
        `src/content/blog/post.md && touch "${canary}"`,
        `src/content/blog/post.md | touch "${canary}"`,
        `src/content/blog/post.md > "${canary}"`,
      ];

      for (const payload of injectionPayloads) {
        const result = gitLastModified(payload);
        expect(result).toBeUndefined();
        expect(existsSync(canary)).toBe(false);
      }
    } finally {
      if (existsSync(canary)) {
        unlinkSync(canary);
      }
    }
  });

  it('handles multiple paths where one contains shell metacharacters without command execution', () => {
    const canary = join(
      tmpdir(),
      `sitemap-multi-canary-${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`,
    );

    if (existsSync(canary)) {
      unlinkSync(canary);
    }

    try {
      const maliciousPath = `src/content/blog/"; touch "${canary}"; #.md`;
      const result = gitLastModified('package.json', maliciousPath);
      expect(existsSync(canary)).toBe(false);
      if (result) {
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    } finally {
      if (existsSync(canary)) {
        unlinkSync(canary);
      }
    }
  });
});

describe('Sitemap strict types, manifests, and URL validation', () => {
  describe('normalizeRoute and isCanonicalRoutePath', () => {
    it('normalizes bare paths and preserves leading slash', () => {
      expect(normalizeRoute('faq')).toBe('/faq');
      expect(normalizeRoute('/faq')).toBe('/faq');
      expect(normalizeRoute('/')).toBe('/');
    });

    it('strips trailing slashes from subpaths while preserving root /', () => {
      expect(normalizeRoute('/faq/')).toBe('/faq');
      expect(normalizeRoute('/use-cases/calculator/')).toBe('/use-cases/calculator');
      expect(normalizeRoute('/')).toBe('/');
    });

    it('strips query strings and hash fragments during normalization', () => {
      expect(normalizeRoute('/faq?category=general')).toBe('/faq');
      expect(normalizeRoute('/blog/post#heading')).toBe('/blog/post');
      expect(normalizeRoute('/terms?ref=footer#privacy')).toBe('/terms');
    });

    it('distinguishes strictly canonical paths from noncanonical variants', () => {
      expect(isCanonicalRoutePath('/')).toBe(true);
      expect(isCanonicalRoutePath('/faq')).toBe(true);
      expect(isCanonicalRoutePath('/faq/')).toBe(false);
      expect(isCanonicalRoutePath('faq')).toBe(false);
      expect(isCanonicalRoutePath('/faq?utm_source=x')).toBe(false);
      expect(isCanonicalRoutePath('/faq#top')).toBe(false);
    });

    it('rejects double slashes, path traversal, malformed characters, and protocols', () => {
      expect(normalizeRoute('//faq')).toBeNull();
      expect(normalizeRoute('/use-cases//calculator')).toBeNull();
      expect(normalizeRoute('//')).toBeNull();
      expect(normalizeRoute('/blog/../admin')).toBeNull();
      expect(normalizeRoute('/./faq')).toBeNull();
      expect(normalizeRoute('/bad <tag>')).toBeNull();
      expect(normalizeRoute('/path with space')).toBeNull();
      expect(normalizeRoute('/path\\backslash')).toBeNull();
      expect(normalizeRoute('https://evil.com/page')).toBeNull();
      expect(normalizeRoute('javascript:alert(1)')).toBeNull();
      expect(normalizeRoute('')).toBeNull();
      expect(normalizeRoute('   ')).toBeNull();
    });
  });

  describe('isIndexableRoute', () => {
    it('approves canonical public routes', () => {
      expect(isIndexableRoute('/')).toBe(true);
      expect(isIndexableRoute('/faq')).toBe(true);
      expect(isIndexableRoute('/stellar')).toBe(true);
      expect(isIndexableRoute('/blog')).toBe(true);
      expect(isIndexableRoute('/blog/privacy-by-default')).toBe(true);
      expect(isIndexableRoute('/case-studies/payroll-processor')).toBe(true);
      expect(isIndexableRoute('/es/stellar')).toBe(true);
      expect(isIndexableRoute('/pt/grants')).toBe(true);
    });

    it('rejects 404, preview, staging, _staging, admin, settings, dashboard, and api routes', () => {
      expect(isIndexableRoute('/404')).toBe(false);
      expect(isIndexableRoute('/404/')).toBe(false);
      expect(isIndexableRoute('/preview')).toBe(false);
      expect(isIndexableRoute('/preview/feature')).toBe(false);
      expect(isIndexableRoute('/staging')).toBe(false);
      expect(isIndexableRoute('/staging/release')).toBe(false);
      expect(isIndexableRoute('/_staging')).toBe(false);
      expect(isIndexableRoute('/_staging/internal')).toBe(false);
      expect(isIndexableRoute('/admin')).toBe(false);
      expect(isIndexableRoute('/settings')).toBe(false);
      expect(isIndexableRoute('/dashboard')).toBe(false);
      expect(isIndexableRoute('/api/subscribe')).toBe(false);
    });
  });

  describe('validateSiteOrigin and validateSitemapUrl', () => {
    it('accepts canonical production origin and URLs', () => {
      expect(validateSiteOrigin(CANONICAL_SITE_ORIGIN).valid).toBe(true);
      expect(validateSitemapUrl('https://usewraith.xyz').valid).toBe(true);
      expect(validateSitemapUrl('https://usewraith.xyz/stellar').valid).toBe(true);
      expect(validateSitemapUrl('https://usewraith.xyz/es/grants').valid).toBe(true);
    });

    it('rejects unintended preview, staging, localhost, and non-HTTPS origins', () => {
      expect(validateSiteOrigin('https://wraith-www-git-feat.vercel.app').valid).toBe(false);
      expect(validateSiteOrigin('https://wraith.netlify.app').valid).toBe(false);
      expect(validateSiteOrigin('https://wraith.pages.dev').valid).toBe(false);
      expect(validateSiteOrigin('https://preview.usewraith.xyz').valid).toBe(false);
      expect(validateSiteOrigin('https://staging.usewraith.xyz').valid).toBe(false);
      expect(validateSiteOrigin('https://localhost:4173').valid).toBe(false);
      expect(validateSiteOrigin('http://usewraith.xyz').valid).toBe(false);
      expect(validateSiteOrigin('https://usewraith.xyz/').valid).toBe(false);
      expect(validateSiteOrigin('https://evil.example.com').valid).toBe(false);
    });

    it('rejects noncanonical, malformed, or preview URLs in validateSitemapUrl', () => {
      expect(validateSitemapUrl('https://usewraith.xyz/').valid).toBe(false);
      expect(validateSitemapUrl('https://usewraith.xyz/faq/').valid).toBe(false);
      expect(validateSitemapUrl('https://usewraith.xyz//faq').valid).toBe(false);
      expect(validateSitemapUrl('https://usewraith.xyz/faq?utm=1').valid).toBe(false);
      expect(validateSitemapUrl('https://usewraith.xyz/faq#section').valid).toBe(false);
      expect(validateSitemapUrl('https://usewraith.xyz/preview/card').valid).toBe(false);
      expect(validateSitemapUrl('https://wraith-preview.vercel.app/faq').valid).toBe(false);
    });
  });

  describe('Static, localized, and dynamic route collection', () => {
    it('collects valid routes with strict ChangeFrequency and RoutePriority unions', () => {
      const routes = collectRoutes();
      const validFrequencies: ChangeFrequency[] = [
        'always',
        'hourly',
        'daily',
        'weekly',
        'monthly',
        'yearly',
        'never',
      ];
      const validPriorities: RoutePriority[] = ['1.0', '0.8', '0.7', '0.6', '0.5'];

      for (const route of routes) {
        expect(validFrequencies).toContain(route.changefreq);
        expect(validPriorities).toContain(route.priority);
        expect(isCanonicalRoutePath(route.route)).toBe(true);
      }
    });

    it('includes all expected static canonical pages and localized routes', () => {
      const routes = collectRoutes();
      const paths = routes.map((r) => r.route);

      for (const expected of [
        '/',
        '/faq',
        '/privacy',
        '/use-cases',
        '/use-cases/calculator',
        '/roadmap',
        '/case-studies',
        '/stellar',
        '/careers',
        '/press',
        '/terms',
        '/about',
        '/blog',
        '/chains',
        '/contributors',
        '/ecosystem',
        '/governance',
        '/grants',
        '/newsletter',
        '/security',
        '/status',
        '/threat-model',
        '/vitals',
        '/es',
        '/es/stellar',
        '/es/grants',
        '/es/blog',
        '/es/case-studies',
        '/pt',
        '/pt/stellar',
        '/pt/grants',
        '/pt/blog',
        '/pt/case-studies',
      ]) {
        expect(paths).toContain(expected);
      }

      const esRoot = routes.find((r) => r.route === '/es');
      const esStellar = routes.find((r) => r.route === '/es/stellar');
      expect(esRoot?.priority).toBe('1.0');
      expect(esRoot?.changefreq).toBe('daily');
      expect(esStellar?.priority).toBe('0.8');
      expect(esStellar?.changefreq).toBe('weekly');
    });

    it('collects dynamic case studies, opted-in authors, blog posts, and blog tags', () => {
      const csRoutes = getCaseStudyRoutes();
      const payroll = csRoutes.find((r) => r.route === '/case-studies/payroll-processor');
      expect(payroll).toBeDefined();
      expect(payroll?.priority).toBe('0.7');
      expect(payroll?.lastmod).toBe('2026-06-15');

      const authorPaths = getAuthorRoutes().map((r) => r.route);
      expect(authorPaths).toContain('/blog/author/lena-vogt');
      expect(authorPaths).not.toContain('/blog/author/wraith-team');

      const blogPaths = getBlogRoutes().map((r) => r.route);
      expect(blogPaths).toContain('/blog/privacy-by-default');
      expect(blogPaths).toContain('/blog/stealth-addresses-explained');
      expect(blogPaths).toContain('/blog/wave-7-kickoff');

      const tagPaths = getBlogTagRoutes().map((r) => r.route);
      expect(tagPaths).toContain('/blog/tag/privacy');
      expect(tagPaths).toContain('/blog/tag/cryptography');
    });
  });

  describe('Draft, redirected, unknown, and non-indexable route exclusion', () => {
    it('excludes draft static routes, draft blog posts, draft case studies, and draft-only tags', () => {
      const routes = collectRoutes({
        staticRoutes: [
          { route: '/', sources: [], changefreq: 'daily', priority: '1.0' },
          { route: '/blog', sources: [], changefreq: 'weekly', priority: '0.8' },
          { route: '/unreleased', sources: [], changefreq: 'weekly', priority: '0.8', draft: true },
        ],
        localizedPages: ['/'],
        localePrefixes: ['/es'],
        caseStudies: [
          { slug: 'live-study', integrationDate: '2026-06-15' },
          { slug: 'draft-study', integrationDate: '2026-07-01', draft: true },
        ],
        authors: [{ id: 'alice', optIn: true }],
        authorsOptOut: [],
        blogMdxEntries: [
          { slug: 'published-post', date: '2026-08-01', tags: ['public-tag'] },
          { slug: 'secret-draft', date: '2026-08-02', draft: true, tags: ['secret-tag'] },
        ],
        blogManifestEntries: [
          {
            slug: 'secret-draft',
            title: 'Draft',
            excerpt: 'Should stay excluded',
            date: '2026-08-02',
          },
          { slug: 'manifest-draft', title: 'Draft 2', excerpt: 'Draft', draft: true },
        ],
        blogPostsJsonEntries: [{ slug: 'json-draft', draft: true, tags: ['json-draft-tag'] }],
        distDiscoveredRoutes: [],
        resolveLastModified: () => '2026-09-01',
      });

      const paths = routes.map((r) => r.route);
      expect(paths).toContain('/');
      expect(paths).toContain('/es');
      expect(paths).toContain('/case-studies/live-study');
      expect(paths).toContain('/blog/published-post');
      expect(paths).toContain('/blog/tag/public-tag');

      expect(paths).not.toContain('/unreleased');
      expect(paths).not.toContain('/case-studies/draft-study');
      expect(paths).not.toContain('/blog/secret-draft');
      expect(paths).not.toContain('/blog/manifest-draft');
      expect(paths).not.toContain('/blog/json-draft');
      expect(paths).not.toContain('/blog/tag/secret-tag');
      expect(paths).not.toContain('/blog/tag/json-draft-tag');
    });

    it('excludes redirected routes across static, dynamic, and redirectedRoutes configuration', () => {
      const routes = collectRoutes({
        staticRoutes: [
          { route: '/', sources: [], changefreq: 'daily', priority: '1.0' },
          {
            route: '/legacy-docs',
            sources: [],
            changefreq: 'weekly',
            priority: '0.8',
            redirectTo: '/faq',
          },
          { route: '/old-roadmap', sources: [], changefreq: 'weekly', priority: '0.8' },
        ],
        localizedPages: ['/', '/old-roadmap'],
        localePrefixes: ['/es'],
        caseStudies: [{ slug: 'renamed-study', redirectTo: '/case-studies/payroll-processor' }],
        authors: [{ id: 'moved-author', optIn: true, redirectTo: '/blog/author/lena-vogt' }],
        authorsOptOut: [],
        blogMdxEntries: [
          { slug: 'old-slug', date: '2026-05-01', redirectTo: '/blog/new-slug', tags: ['old-tag'] },
          { slug: 'new-slug', date: '2026-05-02', tags: ['live-tag'] },
        ],
        blogManifestEntries: [{ slug: 'old-slug', title: 'Old', excerpt: 'Redirected' }],
        blogPostsJsonEntries: [],
        distDiscoveredRoutes: [],
        redirectedRoutes: new Set(['/old-roadmap']),
        resolveLastModified: () => '2026-09-01',
      });

      const paths = routes.map((r) => r.route);
      expect(paths).toContain('/');
      expect(paths).toContain('/es');
      expect(paths).toContain('/blog/new-slug');
      expect(paths).toContain('/blog/tag/live-tag');

      expect(paths).not.toContain('/legacy-docs');
      expect(paths).not.toContain('/old-roadmap');
      expect(paths).not.toContain('/es/old-roadmap');
      expect(paths).not.toContain('/case-studies/renamed-study');
      expect(paths).not.toContain('/blog/author/moved-author');
      expect(paths).not.toContain('/blog/old-slug');
      expect(paths).not.toContain('/blog/tag/old-tag');
    });

    it('excludes unknown routes discovered in dist/ (orphan pages, unsupported locales, unlocalized pages)', () => {
      const known = new Set(['/', '/stellar', '/faq', '/blog', '/blog/privacy-by-default']);
      const localizedBases = new Set(['/', '/stellar', '/blog']);
      const prefixes = ['/es', '/pt'];

      expect(isKnownRoute('/stellar', known, localizedBases, prefixes)).toBe(true);
      expect(isKnownRoute('/es/stellar', known, localizedBases, prefixes)).toBe(true);
      expect(isKnownRoute('/pt/blog/privacy-by-default', known, localizedBases, prefixes)).toBe(
        true,
      );

      expect(isKnownRoute('/unknown-orphan', known, localizedBases, prefixes)).toBe(false);
      expect(isKnownRoute('/de/stellar', known, localizedBases, prefixes)).toBe(false);
      expect(isKnownRoute('/es/faq', known, localizedBases, prefixes)).toBe(false);
      expect(isKnownRoute('/blog/unknown-slug', known, localizedBases, prefixes)).toBe(false);

      const routes = collectRoutes({
        staticRoutes: [
          { route: '/', sources: [], changefreq: 'daily', priority: '1.0' },
          { route: '/faq', sources: [], changefreq: 'weekly', priority: '0.8' },
          { route: '/blog', sources: [], changefreq: 'weekly', priority: '0.8' },
        ],
        localizedPages: ['/', '/blog'],
        localePrefixes: ['/es'],
        caseStudies: [],
        authors: [],
        authorsOptOut: [],
        blogMdxEntries: [{ slug: 'known-post', date: '2026-08-01' }],
        blogManifestEntries: [],
        blogPostsJsonEntries: [],
        distDiscoveredRoutes: [
          { route: '/unknown-page', lastmod: undefined, changefreq: 'weekly', priority: '0.8' },
          { route: '/fr/blog', lastmod: undefined, changefreq: 'weekly', priority: '0.8' },
          { route: '/es/faq', lastmod: undefined, changefreq: 'weekly', priority: '0.8' },
          { route: '/preview/secret', lastmod: undefined, changefreq: 'weekly', priority: '0.8' },
          {
            route: '/es/blog/known-post',
            lastmod: undefined,
            changefreq: 'weekly',
            priority: '0.8',
          },
        ],
        resolveLastModified: () => '2026-09-01',
      });

      const paths = routes.map((r) => r.route);
      expect(paths).toContain('/es/blog/known-post');
      expect(paths).not.toContain('/unknown-page');
      expect(paths).not.toContain('/fr/blog');
      expect(paths).not.toContain('/es/faq');
      expect(paths).not.toContain('/preview/secret');
    });
  });

  describe('buildSitemap strict rejection of invalid inputs', () => {
    it('rejects duplicate routes', () => {
      const duplicateRoutes: RouteEntry[] = [
        { route: '/faq', lastmod: '2026-10-01', changefreq: 'weekly', priority: '0.8' },
        { route: '/faq', lastmod: '2026-10-01', changefreq: 'weekly', priority: '0.8' },
      ];
      expect(() => buildSitemap(duplicateRoutes)).toThrow(/Duplicate sitemap URL/);
    });

    it('rejects noncanonical trailing-slash, query, or relative routes', () => {
      expect(() =>
        buildSitemap([
          { route: '/faq/', lastmod: '2026-10-01', changefreq: 'weekly', priority: '0.8' },
        ]),
      ).toThrow(/Noncanonical or malformed route/);

      expect(() =>
        buildSitemap([
          { route: 'faq', lastmod: '2026-10-01', changefreq: 'weekly', priority: '0.8' },
        ]),
      ).toThrow(/Noncanonical or malformed route/);

      expect(() =>
        buildSitemap([
          { route: '/faq?ref=nav', lastmod: '2026-10-01', changefreq: 'weekly', priority: '0.8' },
        ]),
      ).toThrow(/Noncanonical or malformed route/);
    });

    it('rejects malformed, non-indexable, draft, redirected, and invalid-date entries', () => {
      expect(() =>
        buildSitemap([
          { route: '//broken', lastmod: undefined, changefreq: 'weekly', priority: '0.8' },
        ]),
      ).toThrow(/Noncanonical or malformed route/);

      expect(() =>
        buildSitemap([
          { route: '/preview/test', lastmod: undefined, changefreq: 'weekly', priority: '0.8' },
        ]),
      ).toThrow(/Non-indexable route/);

      expect(() =>
        buildSitemap([
          {
            route: '/faq',
            lastmod: '2026-10-01',
            changefreq: 'weekly',
            priority: '0.8',
            draft: true,
          },
        ]),
      ).toThrow(/Draft route/);

      expect(() =>
        buildSitemap([
          {
            route: '/old',
            lastmod: '2026-10-01',
            changefreq: 'weekly',
            priority: '0.8',
            redirectTo: '/faq',
          },
        ]),
      ).toThrow(/Redirected route/);

      expect(() =>
        buildSitemap([
          { route: '/faq', lastmod: 'not-a-date', changefreq: 'weekly', priority: '0.8' },
        ]),
      ).toThrow(/Invalid lastmod date/);
    });

    it('rejects unintended preview or insecure site origins', () => {
      const validRoutes: RouteEntry[] = [
        { route: '/', lastmod: '2026-10-01', changefreq: 'daily', priority: '1.0' },
      ];
      expect(() => buildSitemap(validRoutes, 'https://wraith-git-branch.vercel.app')).toThrow(
        /Invalid sitemap origin/,
      );
      expect(() => buildSitemap(validRoutes, 'http://usewraith.xyz')).toThrow(
        /Invalid sitemap origin/,
      );
    });
  });

  describe('Manifest runtime type-narrowing parsers', () => {
    it('safely handles malformed or unexpected JSON payloads without throwing', () => {
      expect(parseCaseStudyManifest(null)).toEqual([]);
      expect(parseCaseStudyManifest({ entries: 'invalid' })).toEqual([]);
      expect(parseAuthorsManifest(null)).toEqual([]);
      expect(parseAuthorsManifest(['not-an-object'])).toEqual([]);
      expect(parseBlogManifest('not-an-array')).toEqual([]);
      expect(parseBlogPostsJson(123)).toEqual([]);
    });
  });

  describe('Deduplication and determinism', () => {
    it('deduplicates normalized routes in collectRoutes', () => {
      const routes = collectRoutes({
        staticRoutes: [
          { route: '/faq', sources: [], changefreq: 'weekly', priority: '0.8' },
          { route: '/faq/', sources: [], changefreq: 'monthly', priority: '0.5' },
        ],
        localizedPages: [],
        localePrefixes: [],
        caseStudies: [],
        authors: [],
        authorsOptOut: [],
        blogMdxEntries: [],
        blogManifestEntries: [],
        blogPostsJsonEntries: [],
        distDiscoveredRoutes: [
          { route: '/faq', lastmod: undefined, changefreq: 'weekly', priority: '0.8' },
        ],
        resolveLastModified: () => '2026-10-01',
      });

      expect(routes).toHaveLength(1);
      expect(routes[0]?.route).toBe('/faq');
      expect(routes[0]?.changefreq).toBe('weekly');
    });

    it('produces byte-identical sitemap across multiple runs and matches public/sitemap.xml', () => {
      const run1 = generateSitemapArtifact();
      const run2 = generateSitemapArtifact();
      expect(run1.xml).toBe(run2.xml);

      const sitemapPath = join(__dirname, '../public/sitemap.xml');
      const expectedXml = readFileSync(sitemapPath, 'utf8');
      expect(run1.xml).toBe(expectedXml);
    });

    it('formats root URL without trailing slash and omits undefined lastmod', () => {
      const routes: RouteEntry[] = [
        { route: '/', lastmod: '2026-10-01', changefreq: 'daily', priority: '1.0' },
        { route: '/blog/tag/test', lastmod: undefined, changefreq: 'weekly', priority: '0.8' },
      ];
      const xml = buildSitemap(routes);
      expect(xml).toContain('<loc>https://usewraith.xyz</loc>');
      expect(xml).not.toContain('<loc>https://usewraith.xyz/</loc>');
      expect(xml.match(/<lastmod>/g)).toHaveLength(1);
      expect(toDateString('2026-10-01')).toBe('2026-10-01');
    });
  });
});
