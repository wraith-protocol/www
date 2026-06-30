/**
 * Post-build script: reads dist/index.html and emits per-locale variants with
 * locale-specific <title>, meta description, og:locale, og:title, og:description,
 * twitter:title, and twitter:description tags.
 *
 * Usage: node scripts/generate-og.mjs
 * Run after: pnpm build
 *
 * Output:
 *   dist/en/index.html
 *   dist/es/index.html
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import en from '../src/i18n/en.json' assert { type: 'json' };
import es from '../src/i18n/es.json' assert { type: 'json' };

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, '..', 'dist');
const srcHtml = join(distDir, 'index.html');

const locales = [
  { code: 'en', strings: en, ogLocale: 'en_US' },
  { code: 'es', strings: es, ogLocale: 'es_ES' },
];

let html;
try {
  html = readFileSync(srcHtml, 'utf8');
} catch {
  console.error('dist/index.html not found. Run `pnpm build` first.');
  process.exit(1);
}

for (const { code, strings, ogLocale } of locales) {
  const og = strings.og;

  let out = html;

  // <title>
  out = out.replace(/<title>[^<]*<\/title>/, `<title>${og.siteTitle}</title>`);

  // meta description
  out = out.replace(
    /(<meta\s+name="description"\s+content=")[^"]*(")/,
    `$1${og.metaDescription}$2`,
  );

  // og:locale
  out = out.replace(/(<meta\s+property="og:locale"\s+content=")[^"]*(")/, `$1${ogLocale}$2`);

  // og:title
  out = out.replace(/(<meta\s+property="og:title"\s+content=")[^"]*(")/, `$1${og.ogTitle}$2`);

  // og:description
  out = out.replace(
    /(<meta\s+property="og:description"\s+content=")[^"]*(")/,
    `$1${og.ogDescription}$2`,
  );

  // twitter:title
  out = out.replace(/(<meta\s+name="twitter:title"\s+content=")[^"]*(")/, `$1${og.ogTitle}$2`);

  // twitter:description
  out = out.replace(
    /(<meta\s+name="twitter:description"\s+content=")[^"]*(")/,
    `$1${og.ogDescription}$2`,
  );

  // html lang attribute
  out = out.replace(/(<html\s[^>]*lang=")[^"]*(")/i, `$1${code}$2`);

  const outDir = join(distDir, code);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'index.html'), out, 'utf8');
  console.log(`generate:og — wrote dist/${code}/index.html`);
}

console.log('generate:og — done.');
