import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { listOgImageJobs, type OgImageJob } from '../src/utils/og-metadata';
import { hasLocalizedRoute } from '../src/utils/localizedRoutes';
import { formatIssues, generateOgImages } from './og/generate';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const distDir = join(rootDir, 'dist');

function patchMetadata(html: string, config: OgImageJob): string {
  const imageUrl = `https://usewraith.xyz/og/${config.file}`;
  let patched = html
    .replace(/(<meta\s+property="og:image"\s+content=")[^"]*(")/g, `$1${imageUrl}$2`)
    .replace(/(<meta\s+name="twitter:image"\s+content=")[^"]*(")/g, `$1${imageUrl}$2`);

  const displayTitle =
    config.routePath === '/' ? config.title : `${config.title} — Wraith Protocol`;
  const desc = config.description;

  patched = patched
    .replace(/<title>[^<]*<\/title>/g, `<title>${escapeHtml(displayTitle)}</title>`)
    .replace(
      /(<meta\s+property="og:title"\s+content=")[^"]*(")/g,
      `$1${escapeHtml(displayTitle)}$2`,
    )
    .replace(
      /(<meta\s+name="twitter:title"\s+content=")[^"]*(")/g,
      `$1${escapeHtml(displayTitle)}$2`,
    );

  if (desc) {
    patched = patched
      .replace(/(<meta\s+name="description"\s+content=")[^"]*(")/g, `$1${escapeHtml(desc)}$2`)
      .replace(
        /(<meta\s+property="og:description"\s+content=")[^"]*(")/g,
        `$1${escapeHtml(desc)}$2`,
      )
      .replace(
        /(<meta\s+name="twitter:description"\s+content=")[^"]*(")/g,
        `$1${escapeHtml(desc)}$2`,
      );
  }

  // Canonical + hreflang alternates
  // Remove any previously injected canonical/hreflang links so we don't duplicate on re-runs.
  patched = patched.replace(/\s*<link\s+rel="canonical"[^>]*>\s*/g, '\n    ');
  patched = patched.replace(/\s*<link\s+rel="alternate"\s+hreflang=[^>]*>\s*/g, '\n    ');

  const SITE_URL = 'https://usewraith.xyz';
  const cleanPath = config.routePath === '/' ? '' : config.routePath;
  const enUrl = `${SITE_URL}${cleanPath}`;
  const esUrl = `${SITE_URL}/es${cleanPath}`;
  const ptUrl = `${SITE_URL}/pt${cleanPath}`;

  // Only routes registered under /es and /pt get locale alternates.
  const localized = hasLocalizedRoute(config.routePath);
  const hreflangLinks = [
    `<link rel="canonical" href="${enUrl}" />`,
    ...(localized
      ? [
          `<link rel="alternate" hreflang="en" href="${enUrl}" />`,
          `<link rel="alternate" hreflang="es" href="${esUrl}" />`,
          `<link rel="alternate" hreflang="pt-BR" href="${ptUrl}" />`,
          `<link rel="alternate" hreflang="x-default" href="${enUrl}" />`,
        ]
      : []),
  ].join('\n    ');

  // dist/index.html is also the SPA fallback for every route without its own
  // file. React 19 hoists each page's Helmet tags without removing static ones,
  // so a canonical in that shell would sit next to the page's own canonical on
  // every fallback route. The homepage gets its canonical from Helmet instead.
  if (config.routePath !== '/') {
    patched = patched.replace('</head>', `    ${hreflangLinks}\n  </head>`);
  }

  // Breadcrumb JSON-LD
  const breadcrumbListElement: any[] = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: SITE_URL,
    },
  ];

  if (config.routePath !== '/') {
    breadcrumbListElement.push({
      '@type': 'ListItem',
      position: 2,
      name: config.title,
      item: enUrl,
    });
  }

  const breadcrumbJson = JSON.stringify(
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbListElement,
    },
    null,
    2,
  );

  const breadcrumbScriptRegex =
    /<script\s+type="application\/ld\+json"\s+id="breadcrumb-jsonld">[\s\S]*?<\/script>/;
  const newBreadcrumbScript = `<script type="application/ld+json" id="breadcrumb-jsonld">\n${breadcrumbJson}\n    </script>`;
  patched = patched.replace(breadcrumbScriptRegex, newBreadcrumbScript);

  return patched;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getRouteOutputDir(routePath: string): string {
  if (routePath === '/') return distDir;
  const cleaned = routePath.slice(1);
  return join(distDir, cleaned);
}

async function main() {
  if (!existsSync(distDir)) {
    console.error('dist/ not found — run `npm run build` first');
    process.exit(1);
  }

  const ogDir = join(distDir, 'og');
  const baseHtml = readFileSync(join(distDir, 'index.html'), 'utf8');
  const allJobs = listOgImageJobs();

  const { files, issues } = await generateOgImages({ outDir: ogDir, jobs: allJobs });

  if (issues.length > 0) {
    console.error(`og: ${issues.length} validation issue(s):\n${formatIssues(issues)}`);
    process.exit(1);
  }

  const englishJobs = allJobs.filter((job) => job.locale === 'en');

  for (const job of englishJobs) {
    const html = patchMetadata(baseHtml, job);

    const routeDir = getRouteOutputDir(job.routePath);
    mkdirSync(routeDir, { recursive: true });
    writeFileSync(join(routeDir, 'index.html'), html, 'utf8');
  }

  console.log('og: all images generated and validated →', ogDir);
  console.log(`og: ${Object.keys(files).length} images across ${englishJobs.length} routes`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
