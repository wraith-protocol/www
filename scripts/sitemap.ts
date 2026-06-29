import { writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const distDir = join(rootDir, 'dist');
const publicDir = join(rootDir, 'public');
const siteUrl = 'https://usewraith.xyz';

function getRoutes(dir: string, base = ''): string[] {
  const routes: string[] = [];
  if (!existsSync(dir)) {
    return routes;
  }
  const files = readdirSync(dir);
  if (files.includes('index.html')) {
    routes.push(base || '/');
  }
  for (const file of files) {
    const path = join(dir, file);
    if (statSync(path).isDirectory() && file !== 'og') {
      routes.push(...getRoutes(path, `${base}/${file}`));
    }
  }
  return routes;
}

try {
  if (!existsSync(distDir)) {
    console.error('dist/ directory not found. Please run `pnpm build` first.');
    process.exit(1);
  }

  const routes = getRoutes(distDir);
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map(
    (r) => `  <url>
    <loc>${siteUrl}${r === '/' ? '' : r}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>${r === '/' ? '1.0' : '0.8'}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>`;

  writeFileSync(join(distDir, 'sitemap.xml'), sitemap, 'utf8');
  writeFileSync(join(publicDir, 'sitemap.xml'), sitemap, 'utf8');
  console.log(`sitemap.xml generated successfully: ${routes.length} routes found.`);
} catch (error) {
  console.error('Failed to generate sitemap.xml:', error);
  process.exit(1);
}
