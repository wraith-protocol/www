// @ts-nocheck
/**
 * Sitemap generator — single entrypoint for both `pnpm build` and
 * `pnpm generate:sitemap`.
 *
 * Design goals
 * ────────────
 * • Deterministic: byte-identical output for unchanged input.
 * • Meaningful dates: lastmod is derived from content frontmatter or the git
 *   commit that last touched the route's source file(s).  It is omitted when
 *   no trustworthy value exists, rather than stamped with today's date.
 * • One entrypoint: `scripts/gen-sitemap.mjs` is no longer used; all callers
 *   go through this file.
 * • Check mode: pass --check to fail (exit 1) when the on-disk
 *   public/sitemap.xml is stale.
 */

import { writeFileSync, readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { execFileSync } from 'child_process';
import { slugifyTag, parseTags } from './feed-utils.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const distDir = join(rootDir, 'dist');
const publicDir = join(rootDir, 'public');
const siteUrl = 'https://usewraith.xyz';

// ─── Date helpers ────────────────────────────────────────────────────────────

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
 * Parse the first YAML frontmatter block from a Markdown/MDX file and return
 * a map of key → raw string value.
 */
export function parseFrontmatterDates(filePath: string): Record<string, string> {
  try {
    const raw = readFileSync(filePath, 'utf8');
    const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) return {};
    const result: Record<string, string> = {};
    for (const line of match[1].split('\n')) {
      const colon = line.indexOf(':');
      if (colon < 1) continue;
      const key = line.slice(0, colon).trim();
      let val = line
        .slice(colon + 1)
        .trim()
        .replace(/^['"]|['"]$/g, '');
      result[key] = val;
    }
    return result;
  } catch {
    return {};
  }
}

/** Format an ISO/date string as YYYY-MM-DD, or return undefined. */
export function toDateString(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return undefined;
    return d.toISOString().split('T')[0];
  } catch {
    return undefined;
  }
}

// ─── Route collectors ────────────────────────────────────────────────────────

/**
 * Static routes whose lastmod is derived from the git history of the files
 * that back them.  The list of source files for each entry is used for the
 * git lookup and must stay up-to-date when new pages are added.
 */
const STATIC_ROUTES: Array<{
  route: string;
  sources: string[];
  changefreq: string;
  priority: string;
}> = [
  {
    route: '/',
    sources: ['src/pages', 'src/components/Hero.tsx'],
    changefreq: 'daily',
    priority: '1.0',
  },
  {
    route: '/faq',
    sources: ['src/data/faq.json', 'src/pages/Faq.tsx'],
    changefreq: 'weekly',
    priority: '0.8',
  },
  { route: '/privacy', sources: ['src/pages/Privacy.tsx'], changefreq: 'weekly', priority: '0.8' },
  {
    route: '/use-cases',
    sources: ['src/pages/UseCases.tsx'],
    changefreq: 'weekly',
    priority: '0.8',
  },
  {
    route: '/use-cases/calculator',
    sources: ['src/pages/CostCalculatorPage.tsx', 'src/components/CostCalculator.tsx'],
    changefreq: 'weekly',
    priority: '0.8',
  },
  {
    route: '/roadmap',
    sources: ['src/data/roadmap.json', 'src/pages/Roadmap.tsx'],
    changefreq: 'weekly',
    priority: '0.8',
  },
  {
    route: '/case-studies',
    sources: ['src/data/case-studies.json', 'src/pages/CaseStudies.tsx'],
    changefreq: 'weekly',
    priority: '0.8',
  },
  {
    route: '/stellar',
    sources: ['src/pages/Stellar.tsx'],
    changefreq: 'weekly',
    priority: '0.8',
  },
  { route: '/careers', sources: ['src/pages/Careers.tsx'], changefreq: 'weekly', priority: '0.8' },
  { route: '/press', sources: ['src/pages/Press.tsx'], changefreq: 'weekly', priority: '0.8' },
  { route: '/terms', sources: ['src/pages/Terms.tsx'], changefreq: 'weekly', priority: '0.8' },
  { route: '/about', sources: ['src/pages/About.tsx'], changefreq: 'weekly', priority: '0.8' },
  {
    route: '/blog',
    sources: ['src/pages/Blog.tsx', 'src/content/blog'],
    changefreq: 'weekly',
    priority: '0.8',
  },
  {
    route: '/chains',
    sources: ['src/data/chains.json', 'src/pages/Chains.tsx'],
    changefreq: 'weekly',
    priority: '0.8',
  },
  {
    route: '/contributors',
    sources: ['src/pages/Contributors.tsx'],
    changefreq: 'weekly',
    priority: '0.8',
  },
  {
    route: '/ecosystem',
    sources: ['src/data/ecosystem.json', 'src/pages/Ecosystem.tsx'],
    changefreq: 'weekly',
    priority: '0.8',
  },
  {
    route: '/governance',
    sources: ['src/pages/Governance.tsx'],
    changefreq: 'weekly',
    priority: '0.8',
  },
  { route: '/grants', sources: ['src/pages/Grants.tsx'], changefreq: 'weekly', priority: '0.8' },
  {
    route: '/newsletter',
    sources: ['src/pages/Newsletter.tsx'],
    changefreq: 'weekly',
    priority: '0.8',
  },
  {
    route: '/security',
    sources: ['src/data/security.json', 'src/pages/Security.tsx'],
    changefreq: 'weekly',
    priority: '0.8',
  },
  { route: '/status', sources: ['src/pages/Status.tsx'], changefreq: 'weekly', priority: '0.8' },
  {
    route: '/threat-model',
    sources: ['src/data/threat-model.json', 'src/pages/ThreatModel.tsx'],
    changefreq: 'weekly',
    priority: '0.8',
  },
  { route: '/vitals', sources: ['src/pages/Vitals.tsx'], changefreq: 'weekly', priority: '0.8' },
];

/**
 * Pages that have locale-prefixed alternates.
 * Must stay in sync with LOCALE_URL_PREFIX in src/utils/seo.ts and the
 * locale-prefixed <Route> entries in App.tsx.
 */
const LOCALE_PREFIXED_PAGES = ['/', '/stellar', '/grants', '/blog', '/case-studies'];
const SUPPORTED_LOCALE_PREFIXES = ['/es', '/pt'];

export interface RouteEntry {
  route: string;
  lastmod: string | undefined;
  changefreq: string;
  priority: string;
}

export function getCaseStudyRoutes(): RouteEntry[] {
  const csPath = join(rootDir, 'src', 'data', 'case-studies.json');
  if (!existsSync(csPath)) return [];
  try {
    const data = JSON.parse(readFileSync(csPath, 'utf8'));
    if (!Array.isArray(data.entries)) return [];
    return data.entries
      .filter((e: { slug?: string }) => e.slug)
      .map((e: { slug: string; integrationDate?: string }) => ({
        route: `/case-studies/${e.slug}`,
        // prefer the structured integrationDate field; fall back to the git
        // date of the data file itself
        lastmod: toDateString(e.integrationDate) ?? gitLastModified('src/data/case-studies.json'),
        changefreq: 'weekly',
        priority: '0.7',
      }));
  } catch {
    return [];
  }
}

function getAuthorRoutes(): RouteEntry[] {
  const authorsPath = join(rootDir, 'src', 'data', 'authors.json');
  const optOutPath = join(rootDir, 'src', 'data', 'authors-optout.json');
  if (!existsSync(authorsPath)) return [];
  try {
    const authors: Record<string, { optIn?: boolean }> = JSON.parse(
      readFileSync(authorsPath, 'utf8'),
    );
    const optOut: string[] = existsSync(optOutPath)
      ? JSON.parse(readFileSync(optOutPath, 'utf8'))
      : [];
    return Object.entries(authors)
      .filter(([id, author]) => !optOut.includes(id) && author.optIn)
      .map(([id]) => ({
        route: `/blog/author/${id}`,
        // no meaningful date for an author aggregate page
        lastmod: undefined,
        changefreq: 'weekly',
        priority: '0.8',
      }));
  } catch {
    return [];
  }
}

export function getBlogRoutes(): RouteEntry[] {
  const blogDir = join(rootDir, 'src', 'content', 'blog');
  const entries: RouteEntry[] = [];

  if (existsSync(blogDir)) {
    for (const file of readdirSync(blogDir).filter((f) => /\.mdx?$/.test(f))) {
      const slug = file.replace(/\.mdx?$/, '');
      const fm = parseFrontmatterDates(join(blogDir, file));
      // Prefer the frontmatter date field (content date), fall back to git
      const lastmod =
        toDateString(fm.date ?? fm.publishedAt) ?? gitLastModified(`src/content/blog/${file}`);
      entries.push({ route: `/blog/${slug}`, lastmod, changefreq: 'weekly', priority: '0.8' });
    }
  }

  // JSON-manifest posts (no MDX source on disk)
  const manifestPath = join(rootDir, 'src', 'data', 'blog-posts.json');
  if (existsSync(manifestPath)) {
    try {
      const posts: Array<{ slug?: string; publishedAt?: string; date?: string }> = JSON.parse(
        readFileSync(manifestPath, 'utf8'),
      );
      const existing = new Set(entries.map((e) => e.route));
      for (const post of posts) {
        if (!post.slug) continue;
        const route = `/blog/${post.slug}`;
        if (existing.has(route)) continue;
        entries.push({
          route,
          lastmod:
            toDateString(post.publishedAt ?? post.date) ??
            gitLastModified('src/data/blog-posts.json'),
          changefreq: 'weekly',
          priority: '0.8',
        });
      }
    } catch {
      // ignore
    }
  }

  return entries;
}

function getBlogTagRoutes(): RouteEntry[] {
  const tags = new Set<string>();
  const blogDir = join(rootDir, 'src', 'content', 'blog');

  if (existsSync(blogDir)) {
    for (const file of readdirSync(blogDir).filter((f) => /\.mdx?$/.test(f))) {
      const raw = readFileSync(join(blogDir, file), 'utf8');
      const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (match) {
        const tagsLine = match[1].split('\n').find((l) => l.trim().startsWith('tags:'));
        if (tagsLine) {
          parseTags(tagsLine.slice(tagsLine.indexOf(':') + 1).trim()).forEach((t: string) =>
            tags.add(t),
          );
        }
      }
    }
  }

  const manifestPath = join(rootDir, 'src', 'data', 'blog-posts.json');
  if (existsSync(manifestPath)) {
    try {
      const data: Array<{ tags?: string[] }> = JSON.parse(readFileSync(manifestPath, 'utf8'));
      for (const post of data) {
        if (Array.isArray(post.tags)) post.tags.forEach((t) => tags.add(t));
      }
    } catch {
      // ignore
    }
  }

  return Array.from(tags).map((tag) => ({
    route: `/blog/tag/${slugifyTag(tag)}`,
    // tag archive pages have no single meaningful date
    lastmod: undefined,
    changefreq: 'weekly',
    priority: '0.8',
  }));
}

/**
 * Discover routes from the built dist/ directory that are not already known.
 * These get no lastmod since we can't map them back to source.
 */
function getDistRoutes(dir: string, base = ''): RouteEntry[] {
  const entries: RouteEntry[] = [];
  if (!existsSync(dir)) return entries;
  const files = readdirSync(dir);
  if (files.includes('index.html') && base) {
    entries.push({ route: base, lastmod: undefined, changefreq: 'weekly', priority: '0.8' });
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

// ─── Sitemap builder ─────────────────────────────────────────────────────────

export function buildSitemap(routes: RouteEntry[]): string {
  const urlBlocks = routes.map(({ route, lastmod, changefreq, priority }) => {
    const loc = `${siteUrl}${route === '/' ? '' : route}`;
    const lastmodLine = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : '';
    return `  <url>
    <loc>${loc}</loc>${lastmodLine}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlBlocks.join('\n')}
</urlset>
`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function collectRoutes(): RouteEntry[] {
  const staticEntries: RouteEntry[] = STATIC_ROUTES.map(
    ({ route, sources, changefreq, priority }) => ({
      route,
      lastmod: gitLastModified(...sources),
      changefreq,
      priority,
    }),
  );

  const localeRoutes: RouteEntry[] = SUPPORTED_LOCALE_PREFIXES.flatMap((prefix) =>
    LOCALE_PREFIXED_PAGES.map((page) => {
      const route = page === '/' ? prefix : `${prefix}${page}`;
      const isRoot = route === prefix;
      return {
        route,
        lastmod: gitLastModified(...(STATIC_ROUTES.find((r) => r.route === page)?.sources ?? [])),
        changefreq: isRoot ? 'daily' : 'weekly',
        priority: isRoot ? '1.0' : '0.8',
      };
    }),
  );

  const csRoutes = getCaseStudyRoutes();
  const authorRoutes = getAuthorRoutes();
  const blogRoutes = getBlogRoutes();
  const tagRoutes = getBlogTagRoutes();
  const distRoutes = existsSync(distDir) ? getDistRoutes(distDir) : [];

  // Deduplicate by route, keeping the first occurrence (structured data wins
  // over dist discovery).
  const seen = new Set<string>();
  const allRoutes: RouteEntry[] = [];
  for (const entry of [
    ...staticEntries,
    ...csRoutes,
    ...authorRoutes,
    ...blogRoutes,
    ...tagRoutes,
    ...localeRoutes,
    ...distRoutes,
  ]) {
    if (
      !entry.route ||
      entry.route === '/404' ||
      entry.route.includes('/staging') ||
      entry.route.includes('/preview')
    ) {
      continue;
    }
    if (!seen.has(entry.route)) {
      seen.add(entry.route);
      allRoutes.push(entry);
    }
  }

  return allRoutes;
}

export function main(): void {
  const checkMode = process.argv.includes('--check');

  try {
    const routes = collectRoutes();
    const xml = buildSitemap(routes);

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

const isMain =
  Boolean(process.argv[1]) &&
  (import.meta.url === pathToFileURL(process.argv[1]).href ||
    fileURLToPath(import.meta.url) === resolve(process.argv[1]));

if (isMain) {
  main();
}
