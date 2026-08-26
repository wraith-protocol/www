import { writeFileSync, readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const distDir = join(rootDir, 'dist');
const publicDir = join(rootDir, 'public');
const siteUrl = 'https://usewraith.xyz';

/**
 * Known static application routes
 */
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

/**
 * Dynamically extract routes from case studies data
 */
function getCaseStudyRoutes() {
  const routes = [];
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
    } catch (err) {
      console.warn('Could not read case-studies.json:', err.message);
    }
  }
  return routes;
}

/**
 * Discover html routes from dist build directory if available
 */
function getDistRoutes(dir, base = '') {
  const routes = [];
  if (!existsSync(dir)) return routes;

  const files = readdirSync(dir);
  if (files.includes('index.html') && base) {
    routes.push(base);
  }

  for (const file of files) {
    if (file === 'og' || file === '404' || file.startsWith('.')) continue;
    const fullPath = join(dir, file);
    if (statSync(fullPath).isDirectory()) {
      routes.push(...getDistRoutes(fullPath, `${base}/${file}`));
    }
  }

  return routes;
}

function generateSitemap() {
  try {
    const csRoutes = getCaseStudyRoutes();
    const distRoutes = existsSync(distDir) ? getDistRoutes(distDir) : [];

    const allRoutes = Array.from(new Set([...knownRoutes, ...csRoutes, ...distRoutes])).filter(
      (r) => r && r !== '/404' && !r.includes('/staging') && !r.includes('/preview'),
    );

    const today = new Date().toISOString().split('T')[0];

    const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allRoutes
  .map((r) => {
    const loc = `${siteUrl}${r === '/' ? '' : r}`;
    const priority = r === '/' ? '1.0' : r.startsWith('/case-studies/') ? '0.7' : '0.8';
    const changefreq = r === '/' ? 'daily' : 'weekly';
    return `  <url>
    <loc>${loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  })
  .join('\n')}
</urlset>
`;

    if (existsSync(distDir)) {
      writeFileSync(join(distDir, 'sitemap.xml'), sitemapXml, 'utf8');
    }
    writeFileSync(join(publicDir, 'sitemap.xml'), sitemapXml, 'utf8');
    console.log(`sitemap.xml generated successfully: ${allRoutes.length} routes found.`);
  } catch (error) {
    console.error('Failed to generate sitemap.xml:', error);
    process.exit(1);
  }
}

generateSitemap();
