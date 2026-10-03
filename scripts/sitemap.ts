import { writeFileSync, readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { slugifyTag } from './feed-utils.mjs';
import { getPosts, isAllowedPost, type RssPost } from './gen-rss.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const distDir = join(rootDir, 'dist');
const publicDir = join(rootDir, 'public');
export const siteUrl = 'https://usewraith.xyz';

export interface SitemapRouteEntry {
  route: string;
  lastmod?: string;
  changefreq?: 'daily' | 'weekly' | 'monthly';
  priority?: string;
}

export const staticRoutes = [
  '/',
  '/about',
  '/blog',
  '/careers',
  '/case-studies',
  '/chains',
  '/contributors',
  '/ecosystem',
  '/faq',
  '/governance',
  '/grants',
  '/newsletter',
  '/press',
  '/privacy',
  '/roadmap',
  '/security',
  '/status',
  '/stellar',
  '/threat-model',
  '/use-cases',
  '/use-cases/calculator',
  '/vitals',
];

export function isValidRoute(route: string): boolean {
  if (!route || typeof route !== 'string') return false;
  if (!route.startsWith('/')) return false;
  if (route.includes('//')) return false;
  if (route === '/404' || route.startsWith('/404/')) return false;

  const lower = route.toLowerCase();
  if (
    lower.includes('preview') ||
    lower.includes('staging') ||
    lower.includes('draft') ||
    lower.includes('admin')
  ) {
    return false;
  }

  if (route.includes('?') || route.includes('#')) return false;
  if (/\s/.test(route)) return false;

  return true;
}

export function getCaseStudyRoutes(): SitemapRouteEntry[] {
  const entries: SitemapRouteEntry[] = [];
  const csPath = join(rootDir, 'src', 'data', 'case-studies.json');
  if (existsSync(csPath)) {
    try {
      const data = JSON.parse(readFileSync(csPath, 'utf8'));
      if (Array.isArray(data.entries)) {
        for (const entry of data.entries) {
          if (entry.slug) {
            const route = `/case-studies/${entry.slug}`;
            if (isValidRoute(route)) {
              entries.push({
                route,
                lastmod: entry.integrationDate,
                priority: '0.7',
                changefreq: 'weekly',
              });
            }
          }
        }
      }
    } catch {
      // ignore
    }
  }
  return entries;
}

export function getAuthorRoutes(): SitemapRouteEntry[] {
  const routes: SitemapRouteEntry[] = [];
  const authorsPath = join(rootDir, 'src', 'data', 'authors.json');
  const optOutPath = join(rootDir, 'src', 'data', 'authors-optout.json');
  if (!existsSync(authorsPath)) return routes;
  try {
    const authors = JSON.parse(readFileSync(authorsPath, 'utf8'));
    const optOut = existsSync(optOutPath) ? JSON.parse(readFileSync(optOutPath, 'utf8')) : [];
    const posts: RssPost[] = getPosts();
    for (const [id, author] of Object.entries(authors)) {
      if (optOut.includes(id)) continue;
      if ((author as { optIn?: boolean }).optIn) {
        const authorRoute = `/blog/author/${id}`;
        if (!isValidRoute(authorRoute)) continue;
        const authorPosts = posts.filter(
          (p) => p.author === (author as { name?: string }).name || p.author === id,
        );
        const latestDate =
          authorPosts.length > 0 ? (authorPosts[0].publishedAt || '').split('T')[0] : undefined;
        routes.push({
          route: authorRoute,
          lastmod: latestDate,
          priority: '0.8',
          changefreq: 'weekly',
        });
      }
    }
  } catch {
    // ignore
  }
  return routes;
}

export function getBlogPostRoutes(): SitemapRouteEntry[] {
  const posts: RssPost[] = getPosts();
  const entries: SitemapRouteEntry[] = [];
  for (const post of posts) {
    if (!isAllowedPost(post)) continue;
    const route = `/blog/${post.slug}`;
    if (!isValidRoute(route)) continue;
    const dateStr = (post.publishedAt || '').split('T')[0];
    entries.push({
      route,
      lastmod: dateStr,
      priority: '0.8',
      changefreq: 'weekly',
    });
  }
  return entries;
}

export function getBlogTagRoutes(): SitemapRouteEntry[] {
  const routes: SitemapRouteEntry[] = [];
  const tagLatestDate = new Map<string, string>();
  const posts: RssPost[] = getPosts();

  for (const post of posts) {
    if (!isAllowedPost(post)) continue;
    const dateStr = (post.publishedAt || '').split('T')[0];
    for (const tag of post.tags || []) {
      const slug = slugifyTag(tag);
      const existing = tagLatestDate.get(slug);
      if (!existing || (dateStr && dateStr > existing)) {
        tagLatestDate.set(slug, dateStr);
      }
    }
  }

  for (const [tagSlug, latestDate] of tagLatestDate.entries()) {
    const route = `/blog/tag/${tagSlug}`;
    if (isValidRoute(route)) {
      routes.push({
        route,
        lastmod: latestDate,
        priority: '0.8',
        changefreq: 'weekly',
      });
    }
  }

  return routes;
}

export function getDistRoutes(dir = distDir, base = ''): string[] {
  const routes: string[] = [];
  if (!existsSync(dir)) return routes;

  const files = readdirSync(dir);
  if (files.includes('index.html') && base) {
    if (isValidRoute(base)) {
      routes.push(base);
    }
  }
  for (const file of files) {
    if (file === 'og' || file === '404' || file.startsWith('.')) continue;
    const path = join(dir, file);
    if (statSync(path).isDirectory()) {
      routes.push(...getDistRoutes(path, `${base}/${file}`));
    }
  }
  return routes;
}

export function getSitemapEntries(): SitemapRouteEntry[] {
  const entryMap = new Map<string, SitemapRouteEntry>();
  const baselineDate = '2026-09-25';

  for (const route of staticRoutes) {
    if (isValidRoute(route)) {
      entryMap.set(route, {
        route,
        lastmod: baselineDate,
        priority: route === '/' ? '1.0' : '0.8',
        changefreq: route === '/' ? 'daily' : 'weekly',
      });
    }
  }

  for (const cs of getCaseStudyRoutes()) {
    if (isValidRoute(cs.route)) {
      entryMap.set(cs.route, cs);
    }
  }

  for (const post of getBlogPostRoutes()) {
    if (isValidRoute(post.route)) {
      entryMap.set(post.route, post);
    }
  }

  for (const tag of getBlogTagRoutes()) {
    if (isValidRoute(tag.route)) {
      entryMap.set(tag.route, tag);
    }
  }

  for (const author of getAuthorRoutes()) {
    if (isValidRoute(author.route)) {
      entryMap.set(author.route, author);
    }
  }

  if (existsSync(distDir)) {
    const distRoutes = getDistRoutes(distDir);
    for (const r of distRoutes) {
      if (isValidRoute(r) && !entryMap.has(r)) {
        entryMap.set(r, {
          route: r,
          lastmod: baselineDate,
          priority: '0.8',
          changefreq: 'weekly',
        });
      }
    }
  }

  return Array.from(entryMap.values()).sort((a, b) => {
    if (a.route === '/') return -1;
    if (b.route === '/') return 1;
    return a.route.localeCompare(b.route);
  });
}

export function buildSitemapXml(entries: SitemapRouteEntry[], baseUrl = siteUrl): string {
  const today = new Date().toISOString().split('T')[0];
  const sorted = [...entries].sort((a, b) => {
    if (a.route === '/') return -1;
    if (b.route === '/') return 1;
    return a.route.localeCompare(b.route);
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sorted
  .map((entry) => {
    const r = entry.route;
    const loc = `${baseUrl}${r === '/' ? '' : r}`;
    const lastmod = entry.lastmod || today;
    const changefreq = entry.changefreq || (r === '/' ? 'daily' : 'weekly');
    const priority =
      entry.priority || (r === '/' ? '1.0' : r.startsWith('/case-studies/') ? '0.7' : '0.8');
    return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  })
  .join('\n')}
</urlset>
`;
}

export function generateSitemap(targetDirs = [publicDir, distDir]) {
  const entries = getSitemapEntries();
  const xml = buildSitemapXml(entries, siteUrl);
  for (const dir of targetDirs) {
    if (existsSync(dir)) {
      writeFileSync(join(dir, 'sitemap.xml'), xml, 'utf8');
    }
  }
  return { xml, entries };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { entries } = generateSitemap();
    console.log(`sitemap.xml generated successfully: ${entries.length} routes found.`);
  } catch (error) {
    console.error('Failed to generate sitemap.xml:', error);
    process.exit(1);
  }
}
