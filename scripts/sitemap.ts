import { writeFileSync, readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

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

try {
  const csRoutes = getCaseStudyRoutes();
  const distRoutes = existsSync(distDir) ? getRoutes(distDir) : [];
  const allRoutes = Array.from(new Set([...knownRoutes, ...csRoutes, ...distRoutes])).filter(
    (r) => r && r !== '/404' && !r.includes('/staging') && !r.includes('/preview'),
  );

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
