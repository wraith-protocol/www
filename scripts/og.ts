import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import React from 'react';
import { listOgImageJobs, type OgImageJob } from '../src/utils/og-metadata';

const h = React.createElement;

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const distDir = join(rootDir, 'dist');

const C = {
  surface: '#0e0e0e',
  primary: '#c6c6c7',
  onSurface: '#e6e1e5',
  onSurfaceVariant: '#c4c7c5',
  outline: '#767575',
  outlineVariant: '#444444',
} as const;

function ogCard({ title, subtitle, chainBadge }: OgImageJob) {
  const titleSize = title.length > 25 ? 60 : title.length > 18 ? 68 : 76;

  return h(
    'div',
    {
      style: {
        width: 1200,
        height: 630,
        display: 'flex',
        flexDirection: 'column',
        background: C.surface,
        padding: '64px 80px',
        fontFamily: 'Space Grotesk',
      },
    },
    h(
      'div',
      { style: { display: 'flex', alignItems: 'center', gap: 14 } },
      h(
        'div',
        {
          style: {
            width: 38,
            height: 38,
            background: C.primary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            fontWeight: 700,
            color: C.surface,
          },
        },
        'W',
      ),
      h(
        'span',
        {
          style: {
            color: C.primary,
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: '0.2em',
          },
        },
        'WRAITH PROTOCOL',
      ),
    ),
    h('div', { style: { flex: 1 } }),
    h(
      'div',
      { style: { display: 'flex', flexDirection: 'column', gap: 22 } },
      h(
        'div',
        {
          style: {
            fontSize: titleSize,
            fontWeight: 700,
            color: C.onSurface,
            lineHeight: 1.05,
            maxWidth: 920,
          },
        },
        title,
      ),
      h(
        'div',
        {
          style: {
            fontSize: 28,
            fontWeight: 400,
            color: C.onSurfaceVariant,
            maxWidth: 820,
          },
        },
        subtitle,
      ),
    ),
    h('div', { style: { height: 52 } }),
    h(
      'div',
      {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        },
      },
      h(
        'div',
        {
          style: {
            fontSize: 14,
            color: C.outline,
            letterSpacing: '0.06em',
          },
        },
        'usewraith.xyz',
      ),
      chainBadge != null
        ? h(
            'div',
            {
              style: {
                border: `1px solid ${C.outlineVariant}`,
                padding: '6px 18px',
                fontSize: 13,
                color: C.outline,
                letterSpacing: '0.1em',
              },
            },
            chainBadge,
          )
        : h('div', {}),
    ),
  );
}

function loadFont(filename: string): ArrayBuffer {
  const fontPath = join(rootDir, 'node_modules', '@fontsource', 'space-grotesk', 'files', filename);
  const buf = readFileSync(fontPath);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

type FontDef = { name: string; data: ArrayBuffer; weight: 400 | 700; style: 'normal' };

async function renderPng(config: OgImageJob, fonts: FontDef[]): Promise<Buffer> {
  const svg = await satori(ogCard(config), { width: 1200, height: 630, fonts });
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } });
  return Buffer.from(resvg.render().asPng());
}

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

  // Breadcrumb JSON-LD
  const breadcrumbListElement: any[] = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: 'https://usewraith.xyz',
    },
  ];

  if (config.routePath !== '/') {
    breadcrumbListElement.push({
      '@type': 'ListItem',
      position: 2,
      name: config.title,
      item: `https://usewraith.xyz${config.routePath}`,
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

  const fonts: FontDef[] = [
    {
      name: 'Space Grotesk',
      data: loadFont('space-grotesk-latin-400-normal.woff'),
      weight: 400,
      style: 'normal',
    },
    {
      name: 'Space Grotesk',
      data: loadFont('space-grotesk-latin-700-normal.woff'),
      weight: 700,
      style: 'normal',
    },
  ];

  const ogDir = join(distDir, 'og');
  mkdirSync(ogDir, { recursive: true });

  const baseHtml = readFileSync(join(distDir, 'index.html'), 'utf8');

  const allJobs = listOgImageJobs();

  for (const job of allJobs) {
    process.stdout.write(`og: ${job.file} ... `);
    const png = await renderPng(job, fonts);
    writeFileSync(join(ogDir, job.file), png);
    console.log('done');
  }

  const englishJobs = allJobs.filter((job) => job.locale === 'en');

  for (const job of englishJobs) {
    const html = patchMetadata(baseHtml, job);

    const routeDir = getRouteOutputDir(job.routePath);
    mkdirSync(routeDir, { recursive: true });
    writeFileSync(join(routeDir, 'index.html'), html, 'utf8');
  }

  console.log('og: all images generated →', ogDir);
  console.log(`og: ${allJobs.length} images across ${englishJobs.length} routes`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
