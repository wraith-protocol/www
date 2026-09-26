import { writeFileSync, readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { slugifyTag, parseTags } from './feed-utils.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const distDir = join(rootDir, 'dist');
const publicDir = join(rootDir, 'public');
const siteUrl = 'https://usewraith.xyz';

const knownRoutes = [
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
];

function getCaseStudyRoutes(): string[] {
  const routes: string[] = [];
  const csPath = join(rootDir, 'src', 'data', 'case-studies.json');
  if (existsSync(csPath)) {
    try {
      const data = JSON.parse(readFileSync(csPath, 'utf8'));
      if (Array.isArray(data.entries)) {
        for (const entry of data.entries) {
          if (entry.slug) {
            routes.push(`/case-studies/${entry.slug}`);
          }
        }
      }
    } catch {
      // ignore
    }
  }
  return routes;
}

function getAuthorRoutes(): string[] {
  const routes: string[] = [];
  const authorsPath = join(rootDir, 'src', 'data', 'authors.json');
  const optOutPath = join(rootDir, 'src', 'data', 'authors-optout.json');
  if (!existsSync(authorsPath)) return routes;
  try {
    const authors = JSON.parse(readFileSync(authorsPath, 'utf8'));
    const optOut = existsSync(optOutPath) ? JSON.parse(readFileSync(optOutPath, 'utf8')) : [];
    for (const [id, author] of Object.entries(authors)) {
      if (optOut.includes(id)) continue;
      if ((author as { optIn?: boolean }).optIn) {
        routes.push(`/blog/author/${id}`);
      }
    }
  } catch {
    // ignore
  }
  return routes;
}

function getRoutes(dir: string, base = ''): string[] {
  const routes: string[] = [];
  if (!existsSync(dir)) {
    return routes;
  }
  const files = readdirSync(dir);
  if (files.includes('index.html') && base) {
    routes.push(base);
  }
  for (const file of files) {
    if (file === 'og' || file === '404' || file.startsWith('.')) continue;
    const path = join(dir, file);
    if (statSync(path).isDirectory()) {
      routes.push(...getRoutes(path, `${base}/${file}`));
    }
  }
  return routes;
}

function getBlogTagRoutes(): string[] {
  const routes: string[] = [];
  const tags = new Set<string>();

  const blogDir = join(rootDir, 'src', 'content', 'blog');
  if (existsSync(blogDir)) {
    for (const file of readdirSync(blogDir).filter((f) => /\.mdx?$/.test(f))) {
      const raw = readFileSync(join(blogDir, file), 'utf8');
      const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (match) {
        const tagsLine = match[1].split('\n').find((line) => line.trim().startsWith('tags:'));
        if (tagsLine) {
          const value = tagsLine.slice(tagsLine.indexOf(':') + 1).trim();
          parseTags(value).forEach((tag) => tags.add(tag));
        }
      }
    }
  }

  const manifestPath = join(rootDir, 'src', 'data', 'blog-posts.json');
  if (existsSync(manifestPath)) {
    try {
      const data = JSON.parse(readFileSync(manifestPath, 'utf8'));
      if (Array.isArray(data)) {
        for (const post of data) {
          if (Array.isArray(post.tags)) {
            post.tags.forEach((tag: string) => tags.add(tag));
          }
        }
      }
    } catch {
      // ignore
    }
  }

  for (const tag of tags) {
    routes.push(`/blog/tag/${slugifyTag(tag)}`);
  }

  return routes;
}

try {
  const csRoutes = getCaseStudyRoutes();
  const authorRoutes = getAuthorRoutes();
  const distRoutes = existsSync(distDir) ? getRoutes(distDir) : [];
  const tagRoutes = getBlogTagRoutes();
  const allRoutes = Array.from(
    new Set([...knownRoutes, ...csRoutes, ...authorRoutes, ...tagRoutes, ...distRoutes]),
  ).filter((r) => r && r !== '/404' && !r.includes('/staging') && !r.includes('/preview'));

  const today = new Date().toISOString().split('T')[0];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allRoutes
  .map(
    (r) => `  <url>
    <loc>${siteUrl}${r === '/' ? '' : r}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${r === '/' ? 'daily' : 'weekly'}</changefreq>
    <priority>${r === '/' ? '1.0' : r.startsWith('/case-studies/') ? '0.7' : '0.8'}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>
`;

  if (existsSync(distDir)) {
    writeFileSync(join(distDir, 'sitemap.xml'), sitemap, 'utf8');
  }
  writeFileSync(join(publicDir, 'sitemap.xml'), sitemap, 'utf8');
  console.log(`sitemap.xml generated successfully: ${allRoutes.length} routes found.`);
} catch (error) {
  console.error('Failed to generate sitemap.xml:', error);
  process.exit(1);
}
