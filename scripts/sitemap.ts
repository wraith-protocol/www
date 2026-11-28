/**
 * Sitemap generator — single entrypoint for both `pnpm build` and
 * `pnpm generate:sitemap`.
 *
 * Design goals
 * ────────────
 * • Deterministic: byte-identical output for unchanged input.
 * • Meaningful dates: lastmod is derived from content frontmatter or the git
 *   commit that last touched the route's source file(s). It is omitted when
 *   no trustworthy value exists, rather than stamped with today's date.
 * • Strict type safety: explicit input/output interfaces, shared typed route
 *   and blog manifests, runtime type narrowing, and zero `any` or broad casts.
 * • URL & route validation: normalizes candidate routes, excludes draft,
 *   redirected, opted-out, unknown, and non-indexable routes, and rejects
 *   duplicate, malformed, noncanonical, or unintended preview URLs.
 * • Check mode: pass --check to fail (exit 1) when the on-disk
 *   public/sitemap.xml is stale.
 */

import { writeFileSync, readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { slugifyTag, parseTags } from './feed-utils.mjs';
import {
  CANONICAL_SITE_ORIGIN,
  LOCALE_PREFIXED_STATIC_PAGES,
  STATIC_ROUTE_MANIFEST,
  SUPPORTED_NON_DEFAULT_LOCALE_PREFIXES,
  parseAuthorsManifest,
  parseBlogManifest,
  parseBlogPostsJson,
  parseCaseStudyManifest,
  parseStringList,
  type AuthorManifestEntry,
  type BlogManifestEntry,
  type BlogPostJsonEntry,
  type CaseStudyManifestEntry,
  type ChangeFrequency,
  type RoutePriority,
  type StaticRouteManifestEntry,
} from '../src/utils/manifests.ts';

export type {
  AuthorManifestEntry,
  BlogManifestEntry,
  BlogPostJsonEntry,
  CaseStudyManifestEntry,
  ChangeFrequency,
  RoutePriority,
  StaticRouteManifestEntry,
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const distDir = join(rootDir, 'dist');
const publicDir = join(rootDir, 'public');

export interface RouteEntry {
  readonly route: string;
  readonly lastmod: string | undefined;
  readonly changefreq: ChangeFrequency;
  readonly priority: RoutePriority;
  readonly redirectTo?: string;
  readonly draft?: boolean;
}

export interface ParsedFrontmatter {
  readonly dates: Record<string, string>;
  readonly draft: boolean;
  readonly redirectTo: string | undefined;
  readonly tags: readonly string[];
}

export interface BlogMdxSourceEntry {
  readonly slug: string;
  readonly date?: string;
  readonly publishedAt?: string;
  readonly draft?: boolean;
  readonly redirectTo?: string;
  readonly tags?: readonly string[];
  readonly sourcePath?: string;
}

export interface SitemapCollectionOptions {
  readonly staticRoutes?: readonly StaticRouteManifestEntry[];
  readonly localizedPages?: readonly string[];
  readonly localePrefixes?: readonly string[];
  readonly caseStudies?: readonly CaseStudyManifestEntry[];
  readonly authors?: readonly AuthorManifestEntry[];
  readonly authorsOptOut?: readonly string[];
  readonly blogMdxEntries?: readonly BlogMdxSourceEntry[];
  readonly blogManifestEntries?: readonly BlogManifestEntry[];
  readonly blogPostsJsonEntries?: readonly BlogPostJsonEntry[];
  readonly distDiscoveredRoutes?: readonly RouteEntry[];
  readonly redirectedRoutes?: ReadonlySet<string>;
  readonly resolveLastModified?: (...repoPaths: string[]) => string | undefined;
}

export interface UrlValidationResult {
  readonly valid: boolean;
  readonly reason?: string;
}

export interface SitemapGenerationResult {
  readonly routes: readonly RouteEntry[];
  readonly xml: string;
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const NON_INDEXABLE_PREFIXES: readonly string[] = [
  '/404',
  '/preview',
  '/staging',
  '/_staging',
  '/admin',
  '/settings',
  '/dashboard',
  '/api',
];

const PREVIEW_HOST_PATTERNS: readonly RegExp[] = [
  /\.vercel\.app$/i,
  /\.netlify\.app$/i,
  /\.pages\.dev$/i,
  /^preview\./i,
  /^staging\./i,
  /^localhost$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
];

/**
 * Return the date part of the last git-commit that touched any of the given
 * repo-relative paths, or undefined when git is unavailable or the paths are
 * untracked.
 */
export function gitLastModified(...repoPaths: string[]): string | undefined {
  if (repoPaths.length === 0) return undefined;
  try {
    const result = execFileSync(
      'git',
      ['log', '-1', '--format=%cd', '--date=short', '--', ...repoPaths],
      { cwd: rootDir, stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8' },
    ).trim();
    return result || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Parse frontmatter block from a Markdown/MDX file into typed fields.
 */
export function parseFrontmatter(filePath: string): ParsedFrontmatter {
  try {
    const raw = readFileSync(filePath, 'utf8');
    const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match || !match[1]) {
      return { dates: {}, draft: false, redirectTo: undefined, tags: [] };
    }
    const dates: Record<string, string> = {};
    let draft = false;
    let redirectTo: string | undefined;
    let tags: string[] = [];

    for (const line of match[1].split('\n')) {
      const colon = line.indexOf(':');
      if (colon < 1) continue;
      const key = line.slice(0, colon).trim();
      const rawVal = line.slice(colon + 1).trim();
      const unquotedVal = rawVal.replace(/^['"]|['"]$/g, '');

      if (key === 'draft') {
        draft = unquotedVal.toLowerCase() === 'true';
      } else if (key === 'redirectTo' || key === 'redirect') {
        redirectTo = unquotedVal || undefined;
      } else if (key === 'tags') {
        tags = parseTags(rawVal);
      } else {
        dates[key] = unquotedVal;
      }
    }

    return { dates, draft, redirectTo, tags };
  } catch {
    return { dates: {}, draft: false, redirectTo: undefined, tags: [] };
  }
}

/**
 * Parse the first YAML frontmatter block from a Markdown/MDX file and return
 * a map of key → raw string value.
 */
export function parseFrontmatterDates(filePath: string): Record<string, string> {
  return parseFrontmatter(filePath).dates;
}

/** Format an ISO/date string as YYYY-MM-DD, or return undefined. */
export function toDateString(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return undefined;
    return d.toISOString().split('T')[0];
  } catch {
    return undefined;
  }
}

/**
 * Normalizes a candidate route path:
 * - Rejects empty, whitespace-only, protocol-qualified, or malformed strings
 * - Strips query strings and hash fragments
 * - Rejects double slashes (`//`) and path traversal (`..`)
 * - Ensures a single leading `/` and removes trailing slashes on non-root paths
 */
export function normalizeRoute(rawRoute: string): string | null {
  if (typeof rawRoute !== 'string') return null;
  const trimmed = rawRoute.trim();
  if (!trimmed) return null;

  if (/[\s\\<>"'`^{|}]/.test(trimmed)) return null;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return null;

  const clean = trimmed.split(/[?#]/)[0];
  if (!clean) return null;

  if (clean.includes('//')) return null;

  const withLeading = clean.startsWith('/') ? clean : `/${clean}`;
  const segments = withLeading.split('/').filter(Boolean);
  if (segments.some((seg) => seg === '.' || seg === '..')) {
    return null;
  }

  return withLeading.length > 1 && withLeading.endsWith('/')
    ? withLeading.slice(0, -1)
    : withLeading;
}

/**
 * Checks whether a route is canonical (already normalized, with no query,
 * fragment, missing leading slash, or trailing slash).
 */
export function isCanonicalRoutePath(route: string): boolean {
  if (typeof route !== 'string' || route.includes('?') || route.includes('#')) {
    return false;
  }
  const normalized = normalizeRoute(route);
  return normalized !== null && normalized === route;
}

/**
 * Checks whether a route is allowed to be indexed by search engines.
 */
export function isIndexableRoute(route: string): boolean {
  const normalized = normalizeRoute(route);
  if (!normalized) return false;

  for (const prefix of NON_INDEXABLE_PREFIXES) {
    if (normalized === prefix || normalized.startsWith(`${prefix}/`)) {
      return false;
    }
  }

  return true;
}

/**
 * Validates that a site origin is HTTPS and not an unintended preview,
 * staging, or local development origin.
 */
export function validateSiteOrigin(
  siteOrigin: string,
  expectedOrigin: string = CANONICAL_SITE_ORIGIN,
): UrlValidationResult {
  if (typeof siteOrigin !== 'string' || siteOrigin.trim() !== siteOrigin || !siteOrigin) {
    return { valid: false, reason: 'Site origin must be a non-empty trimmed string' };
  }

  if (siteOrigin.endsWith('/')) {
    return { valid: false, reason: 'Site origin must not have a trailing slash' };
  }

  let parsed: URL;
  try {
    parsed = new URL(siteOrigin);
  } catch {
    return { valid: false, reason: `Malformed site origin "${siteOrigin}"` };
  }

  if (parsed.protocol !== 'https:') {
    return { valid: false, reason: `Site origin must use https: (received "${parsed.protocol}")` };
  }

  if (parsed.username || parsed.password) {
    return { valid: false, reason: 'Site origin must not contain credentials' };
  }

  if (parsed.pathname !== '/' || parsed.search || parsed.hash) {
    return { valid: false, reason: 'Site origin must not include path, query, or hash components' };
  }

  for (const pattern of PREVIEW_HOST_PATTERNS) {
    if (pattern.test(parsed.hostname)) {
      return {
        valid: false,
        reason: `Unintended preview or non-production host "${parsed.hostname}" is not allowed`,
      };
    }
  }

  if (parsed.origin !== expectedOrigin) {
    return {
      valid: false,
      reason: `Noncanonical origin "${parsed.origin}" does not match "${expectedOrigin}"`,
    };
  }

  return { valid: true };
}

/**
 * Validates a fully materialized `<loc>` URL before emitting it to XML.
 */
export function validateSitemapUrl(
  loc: string,
  expectedOrigin: string = CANONICAL_SITE_ORIGIN,
): UrlValidationResult {
  if (typeof loc !== 'string' || !loc || /[\s<>"'&]/.test(loc)) {
    return { valid: false, reason: `Malformed or XML-unsafe URL "${loc}"` };
  }

  const originCheck = validateSiteOrigin(expectedOrigin, CANONICAL_SITE_ORIGIN);
  if (!originCheck.valid) {
    return originCheck;
  }

  if (!loc.startsWith(expectedOrigin)) {
    return {
      valid: false,
      reason: `URL "${loc}" does not start with canonical origin "${expectedOrigin}"`,
    };
  }

  const suffix = loc.slice(expectedOrigin.length);
  if (suffix === '/') {
    return {
      valid: false,
      reason: `Root URL "${loc}" must not end with a trailing slash`,
    };
  }

  const routePath = suffix === '' ? '/' : suffix;
  if (!isCanonicalRoutePath(routePath)) {
    return {
      valid: false,
      reason: `URL "${loc}" contains a noncanonical path "${routePath}"`,
    };
  }

  if (!isIndexableRoute(routePath)) {
    return {
      valid: false,
      reason: `URL "${loc}" points to non-indexable route "${routePath}"`,
    };
  }

  return { valid: true };
}

/**
 * Checks whether a candidate route belongs to the known typed application
 * route table (static routes, supported localized variants, or manifest-backed
 * dynamic routes). Unknown routes (such as unsupported locale prefixes or
 * orphan build directories) are excluded.
 */
export function isKnownRoute(
  route: string,
  knownRoutes: ReadonlySet<string>,
  localizedBasePaths: ReadonlySet<string> = new Set(LOCALE_PREFIXED_STATIC_PAGES),
  localePrefixes: readonly string[] = SUPPORTED_NON_DEFAULT_LOCALE_PREFIXES,
): boolean {
  const normalized = normalizeRoute(route);
  if (!normalized) return false;
  if (knownRoutes.has(normalized)) return true;

  for (const prefix of localePrefixes) {
    if (normalized === prefix) {
      return localizedBasePaths.has('/');
    }
    if (normalized.startsWith(`${prefix}/`)) {
      const stripped = normalized.slice(prefix.length);
      if (knownRoutes.has(stripped)) {
        const firstSegment = `/${stripped.split('/').filter(Boolean)[0] ?? ''}`;
        return localizedBasePaths.has(firstSegment);
      }
      return false;
    }
  }

  return false;
}

function readJsonFileUnknown(filePath: string): unknown {
  if (!existsSync(filePath)) return undefined;
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return undefined;
  }
}

export function getCaseStudyRoutes(
  entries?: readonly CaseStudyManifestEntry[],
  resolveLastModified: (...repoPaths: string[]) => string | undefined = gitLastModified,
): RouteEntry[] {
  const sourceEntries =
    entries ??
    parseCaseStudyManifest(readJsonFileUnknown(join(rootDir, 'src', 'data', 'case-studies.json')));

  const routes: RouteEntry[] = [];
  for (const entry of sourceEntries) {
    if (entry.draft === true) continue;
    if (entry.redirectTo) continue;

    const norm = normalizeRoute(`/case-studies/${entry.slug}`);
    if (!norm || !isIndexableRoute(norm)) continue;

    routes.push({
      route: norm,
      lastmod:
        toDateString(entry.integrationDate) ?? resolveLastModified('src/data/case-studies.json'),
      changefreq: 'weekly',
      priority: '0.7',
    });
  }
  return routes;
}

export function getAuthorRoutes(
  authors?: readonly AuthorManifestEntry[],
  optOutIds?: readonly string[],
): RouteEntry[] {
  const sourceAuthors =
    authors ??
    parseAuthorsManifest(readJsonFileUnknown(join(rootDir, 'src', 'data', 'authors.json')));
  const optOutSet = new Set(
    optOutIds ??
      parseStringList(readJsonFileUnknown(join(rootDir, 'src', 'data', 'authors-optout.json'))),
  );

  const routes: RouteEntry[] = [];
  for (const author of sourceAuthors) {
    if (optOutSet.has(author.id) || !author.optIn) continue;
    if (author.redirectTo) continue;

    const norm = normalizeRoute(`/blog/author/${author.id}`);
    if (!norm || !isIndexableRoute(norm)) continue;

    routes.push({
      route: norm,
      lastmod: undefined,
      changefreq: 'weekly',
      priority: '0.8',
    });
  }
  return routes;
}

function loadDiskBlogMdxEntries(): BlogMdxSourceEntry[] {
  const blogDir = join(rootDir, 'src', 'content', 'blog');
  if (!existsSync(blogDir)) return [];

  const entries: BlogMdxSourceEntry[] = [];
  const files = readdirSync(blogDir).filter((f: string) => /\.mdx?$/.test(f));
  for (const file of files) {
    const slug = file.replace(/\.mdx?$/, '');
    const fm = parseFrontmatter(join(blogDir, file));
    entries.push({
      slug,
      date: fm.dates.date,
      publishedAt: fm.dates.publishedAt,
      draft: fm.draft,
      redirectTo: fm.redirectTo,
      tags: fm.tags,
      sourcePath: `src/content/blog/${file}`,
    });
  }
  return entries;
}

export function getBlogRoutes(
  options?: Pick<
    SitemapCollectionOptions,
    'blogMdxEntries' | 'blogManifestEntries' | 'blogPostsJsonEntries' | 'resolveLastModified'
  >,
): RouteEntry[] {
  const resolveLastModified = options?.resolveLastModified ?? gitLastModified;
  const mdxEntries = options?.blogMdxEntries ?? loadDiskBlogMdxEntries();
  const manifestEntries =
    options?.blogManifestEntries ??
    parseBlogManifest(readJsonFileUnknown(join(rootDir, 'src', 'data', 'blog-manifest.json')));
  const jsonPostEntries =
    options?.blogPostsJsonEntries ??
    parseBlogPostsJson(readJsonFileUnknown(join(rootDir, 'src', 'data', 'blog-posts.json')));

  const entries: RouteEntry[] = [];
  const excludedOrSeenSlugs = new Set<string>();

  for (const mdx of mdxEntries) {
    const norm = normalizeRoute(`/blog/${mdx.slug}`);
    if (!norm || !isIndexableRoute(norm)) continue;

    if (mdx.draft === true || mdx.redirectTo) {
      excludedOrSeenSlugs.add(norm);
      continue;
    }

    const lastmod =
      toDateString(mdx.date ?? mdx.publishedAt) ??
      (mdx.sourcePath ? resolveLastModified(mdx.sourcePath) : undefined);
    entries.push({ route: norm, lastmod, changefreq: 'weekly', priority: '0.8' });
    excludedOrSeenSlugs.add(norm);
  }

  for (const post of manifestEntries) {
    const norm = normalizeRoute(`/blog/${post.slug}`);
    if (!norm || !isIndexableRoute(norm) || excludedOrSeenSlugs.has(norm)) continue;

    if (post.draft === true || post.redirectTo) {
      excludedOrSeenSlugs.add(norm);
      continue;
    }

    entries.push({
      route: norm,
      lastmod: toDateString(post.date) ?? resolveLastModified('src/data/blog-manifest.json'),
      changefreq: 'weekly',
      priority: '0.8',
    });
    excludedOrSeenSlugs.add(norm);
  }

  for (const post of jsonPostEntries) {
    const norm = normalizeRoute(`/blog/${post.slug}`);
    if (!norm || !isIndexableRoute(norm) || excludedOrSeenSlugs.has(norm)) continue;

    if (post.draft === true || post.redirectTo) {
      excludedOrSeenSlugs.add(norm);
      continue;
    }

    entries.push({
      route: norm,
      lastmod:
        toDateString(post.publishedAt ?? post.date) ??
        resolveLastModified('src/data/blog-posts.json'),
      changefreq: 'weekly',
      priority: '0.8',
    });
    excludedOrSeenSlugs.add(norm);
  }

  return entries;
}

export function getBlogTagRoutes(
  options?: Pick<SitemapCollectionOptions, 'blogMdxEntries' | 'blogPostsJsonEntries'>,
): RouteEntry[] {
  const mdxEntries = options?.blogMdxEntries ?? loadDiskBlogMdxEntries();
  const jsonPostEntries =
    options?.blogPostsJsonEntries ??
    parseBlogPostsJson(readJsonFileUnknown(join(rootDir, 'src', 'data', 'blog-posts.json')));

  const tags = new Set<string>();
  for (const mdx of mdxEntries) {
    if (mdx.draft === true || mdx.redirectTo) continue;
    for (const tag of mdx.tags ?? []) {
      if (tag) tags.add(tag);
    }
  }

  for (const post of jsonPostEntries) {
    if (post.draft === true || post.redirectTo) continue;
    for (const tag of post.tags) {
      if (tag) tags.add(tag);
    }
  }

  const routes: RouteEntry[] = [];
  for (const tag of tags) {
    const slug = slugifyTag(tag);
    if (!slug) continue;
    const norm = normalizeRoute(`/blog/tag/${slug}`);
    if (!norm || !isIndexableRoute(norm)) continue;
    routes.push({
      route: norm,
      lastmod: undefined,
      changefreq: 'weekly',
      priority: '0.8',
    });
  }
  return routes;
}

/**
 * Discover routes from the built dist/ directory that are not already known.
 */
export function getDistRoutes(dir: string, base = ''): RouteEntry[] {
  const entries: RouteEntry[] = [];
  if (!existsSync(dir)) return entries;
  const files = readdirSync(dir);
  if (files.includes('index.html') && base) {
    const norm = normalizeRoute(base);
    if (norm && isIndexableRoute(norm)) {
      entries.push({ route: norm, lastmod: undefined, changefreq: 'weekly', priority: '0.8' });
    }
  }
  for (const file of files) {
    if (file === 'og' || file === '404' || file.startsWith('.')) continue;
    const fullPath = join(dir, file);
    if (statSync(fullPath).isDirectory()) {
      entries.push(...getDistRoutes(fullPath, `${base}/${file}`));
    }
  }
  return entries;
}

/**
 * Builds deterministic XML from validated canonical RouteEntry records.
 * Rejects duplicate, malformed, noncanonical, redirected, draft, or unintended preview URLs.
 */
export function buildSitemap(
  routes: readonly RouteEntry[],
  siteOrigin: string = CANONICAL_SITE_ORIGIN,
): string {
  const originValidation = validateSiteOrigin(siteOrigin, CANONICAL_SITE_ORIGIN);
  if (!originValidation.valid) {
    throw new Error(`Invalid sitemap origin: ${originValidation.reason}`);
  }

  const seenUrls = new Set<string>();
  const urlBlocks: string[] = [];

  for (const entry of routes) {
    if (entry.draft === true) {
      throw new Error(`Draft route "${entry.route}" must not be emitted in sitemap`);
    }
    if (entry.redirectTo) {
      throw new Error(
        `Redirected route "${entry.route}" (-> "${entry.redirectTo}") must not be emitted in sitemap`,
      );
    }
    if (!isCanonicalRoutePath(entry.route)) {
      throw new Error(`Noncanonical or malformed route "${entry.route}" rejected by sitemap`);
    }
    if (!isIndexableRoute(entry.route)) {
      throw new Error(`Non-indexable route "${entry.route}" rejected by sitemap`);
    }
    if (entry.lastmod !== undefined && !ISO_DATE_PATTERN.test(entry.lastmod)) {
      throw new Error(
        `Invalid lastmod date "${entry.lastmod}" on route "${entry.route}" (expected YYYY-MM-DD)`,
      );
    }

    const loc = `${siteOrigin}${entry.route === '/' ? '' : entry.route}`;
    const urlValidation = validateSitemapUrl(loc, siteOrigin);
    if (!urlValidation.valid) {
      throw new Error(`Invalid sitemap URL "${loc}": ${urlValidation.reason}`);
    }

    if (seenUrls.has(loc)) {
      throw new Error(`Duplicate sitemap URL "${loc}" rejected`);
    }
    seenUrls.add(loc);

    const lastmodLine = entry.lastmod ? `\n    <lastmod>${entry.lastmod}</lastmod>` : '';
    urlBlocks.push(`  <url>
    <loc>${loc}</loc>${lastmodLine}
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlBlocks.join('\n')}
</urlset>
`;
}

/**
 * Collects, validates, normalizes, and deduplicates all indexable routes across
 * static pages, localized pages, case studies, opted-in authors, blog posts,
 * blog tags, and verified build output.
 */
export function collectRoutes(options?: SitemapCollectionOptions): RouteEntry[] {
  const resolveLastModified = options?.resolveLastModified ?? gitLastModified;
  const staticManifest = options?.staticRoutes ?? STATIC_ROUTE_MANIFEST;
  const localizedPages = options?.localizedPages ?? LOCALE_PREFIXED_STATIC_PAGES;
  const localePrefixes = options?.localePrefixes ?? SUPPORTED_NON_DEFAULT_LOCALE_PREFIXES;
  const redirectedSet = options?.redirectedRoutes ?? new Set<string>();

  const staticEntries: RouteEntry[] = [];
  for (const item of staticManifest) {
    if (item.draft === true || item.redirectTo) continue;
    const norm = normalizeRoute(item.route);
    if (!norm || !isIndexableRoute(norm) || redirectedSet.has(norm)) continue;
    staticEntries.push({
      route: norm,
      lastmod: resolveLastModified(...item.sources),
      changefreq: item.changefreq,
      priority: item.priority,
    });
  }

  const activeStaticByRoute = new Map<string, StaticRouteManifestEntry>();
  for (const item of staticManifest) {
    if (item.draft === true || item.redirectTo) continue;
    const norm = normalizeRoute(item.route);
    if (norm && !redirectedSet.has(norm)) {
      activeStaticByRoute.set(norm, item);
    }
  }

  const localeRoutes: RouteEntry[] = [];
  for (const prefix of localePrefixes) {
    const cleanPrefix = normalizeRoute(prefix);
    if (!cleanPrefix || cleanPrefix === '/') continue;

    for (const page of localizedPages) {
      const cleanPage = normalizeRoute(page);
      if (!cleanPage || !activeStaticByRoute.has(cleanPage)) continue;

      const candidate = cleanPage === '/' ? cleanPrefix : `${cleanPrefix}${cleanPage}`;
      const norm = normalizeRoute(candidate);
      if (!norm || !isIndexableRoute(norm) || redirectedSet.has(norm)) continue;

      const isLocaleRoot = norm === cleanPrefix;
      const backingStatic = activeStaticByRoute.get(cleanPage);
      localeRoutes.push({
        route: norm,
        lastmod: resolveLastModified(...(backingStatic?.sources ?? [])),
        changefreq: isLocaleRoot ? 'daily' : 'weekly',
        priority: isLocaleRoot ? '1.0' : '0.8',
      });
    }
  }

  const csRoutes = getCaseStudyRoutes(options?.caseStudies, resolveLastModified);
  const authorRoutes = getAuthorRoutes(options?.authors, options?.authorsOptOut);
  const blogRoutes = getBlogRoutes({
    blogMdxEntries: options?.blogMdxEntries,
    blogManifestEntries: options?.blogManifestEntries,
    blogPostsJsonEntries: options?.blogPostsJsonEntries,
    resolveLastModified,
  });
  const tagRoutes = getBlogTagRoutes({
    blogMdxEntries: options?.blogMdxEntries,
    blogPostsJsonEntries: options?.blogPostsJsonEntries,
  });

  const manifestBackedRoutes = [
    ...staticEntries,
    ...csRoutes,
    ...authorRoutes,
    ...blogRoutes,
    ...tagRoutes,
    ...localeRoutes,
  ];

  const knownRoutes = new Set<string>(manifestBackedRoutes.map((entry) => entry.route));
  const localizedBaseSet = new Set<string>(
    localizedPages
      .map((p) => normalizeRoute(p))
      .filter((p): p is string => p !== null && activeStaticByRoute.has(p)),
  );

  const rawDistRoutes =
    options?.distDiscoveredRoutes ?? (existsSync(distDir) ? getDistRoutes(distDir) : []);
  const verifiedDistRoutes = rawDistRoutes.filter((entry) => {
    if (entry.draft === true || entry.redirectTo) return false;
    const norm = normalizeRoute(entry.route);
    if (!norm || redirectedSet.has(norm)) return false;
    return isKnownRoute(norm, knownRoutes, localizedBaseSet, localePrefixes);
  });

  const seen = new Set<string>();
  const allRoutes: RouteEntry[] = [];
  for (const entry of [...manifestBackedRoutes, ...verifiedDistRoutes]) {
    if (entry.draft === true || entry.redirectTo) continue;
    const normalized = normalizeRoute(entry.route);
    if (!normalized || !isIndexableRoute(normalized) || redirectedSet.has(normalized)) {
      continue;
    }
    if (!seen.has(normalized)) {
      seen.add(normalized);
      allRoutes.push({
        route: normalized,
        lastmod: entry.lastmod,
        changefreq: entry.changefreq,
        priority: entry.priority,
      });
    }
  }

  return allRoutes;
}

export function generateSitemapArtifact(
  options?: SitemapCollectionOptions,
  siteOrigin: string = CANONICAL_SITE_ORIGIN,
): SitemapGenerationResult {
  const routes = collectRoutes(options);
  const xml = buildSitemap(routes, siteOrigin);
  return { routes, xml };
}

export function main(): void {
  const checkMode = process.argv.includes('--check');

  try {
    const { routes, xml } = generateSitemapArtifact();

    if (checkMode) {
      const tracked = join(publicDir, 'sitemap.xml');
      if (!existsSync(tracked)) {
        console.error('check: public/sitemap.xml does not exist — run pnpm generate:sitemap');
        process.exit(1);
      }
      const current = readFileSync(tracked, 'utf8');
      if (current !== xml) {
        console.error(
          'check: public/sitemap.xml is stale — run pnpm generate:sitemap and commit the result',
        );
        process.exit(1);
      }
      console.log(`sitemap.xml is up-to-date (${routes.length} routes).`);
    } else {
      if (existsSync(distDir)) {
        writeFileSync(join(distDir, 'sitemap.xml'), xml, 'utf8');
      }
      writeFileSync(join(publicDir, 'sitemap.xml'), xml, 'utf8');
      console.log(`sitemap.xml generated successfully: ${routes.length} routes.`);
    }
  } catch (err) {
    console.error('Failed to generate sitemap.xml:', err);
    process.exit(1);
  }
}

const argv1 = process.argv[1];
const isMain =
  typeof argv1 === 'string' &&
  (import.meta.url === pathToFileURL(argv1).href ||
    fileURLToPath(import.meta.url) === resolve(argv1));

if (isMain) {
  main();
}
