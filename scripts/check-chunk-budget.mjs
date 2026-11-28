/**
 * check-chunk-budget.mjs
 *
 * Reads Vite build output (dist/.vite/manifest.json, optional
 * dist/.vite/chunk-modules.json, HTML documents, and static assets) and
 * enforces:
 *
 *   - Legacy per-chunk JS size limit (CHUNK_BUDGET_KB, with named exceptions
 *     in CHUNK_ALLOWLIST) and per-entry static transitive JS closure limit
 *     (ROUTE_TRANSITIVE_KB).
 *   - Shared-shell vs route-specific transfer budgets for JavaScript, CSS
 *     (external or inlined by inline-css.js), content/data JSON (bundled and
 *     external), fonts, images, and total transfer bytes across route families.
 *   - Fail-closed route import-boundary guards ensuring no route (or the
 *     shared SPA shell) eagerly imports an unused chain SDK or content
 *     collection.
 *
 * Usage (run after `vite build` or `pnpm build`):
 *   node scripts/check-chunk-budget.mjs
 *   node scripts/check-chunk-budget.mjs --json
 *   node scripts/check-chunk-budget.mjs --report route-budget-report.json
 *
 * Exit codes:
 *   0 — all budgets and import-boundary checks satisfied
 *   1 — one or more budgets or import-boundary checks violated
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/** Maximum uncompressed size (kB) for any single JS chunk. */
export const CHUNK_BUDGET_KB = 500;

/**
 * Maximum total uncompressed size (kB) for all JS chunks statically reachable
 * from a single entry point (static imports only, not dynamic imports).
 */
export const ROUTE_TRANSITIVE_KB = 1_500;

/**
 * Named allowlist for chunks that are known to exceed CHUNK_BUDGET_KB due to
 * third-party bundle size outside our control. Each entry requires a reason
 * and an explicit size ceiling so regressions still fail the gate.
 */
export const CHUNK_ALLOWLIST = {
  'vendor-stellar-sdk': {
    maxKB: 950,
    reason:
      '@stellar/stellar-sdk ships a large pre-built bundle. It is isolated ' +
      'in its own chunk and only loaded by StellarMetrics (home page, lazy). ' +
      'The /stellar route no longer preloads it.',
  },
};

export const SHARED_SHELL_BUDGET_KB = {
  jsKB: 520,
  cssKB: 75,
  dataKB: 115,
  fontKB: 420,
  preloadedFontKB: 150,
  imageKB: 15,
  totalKB: 1_050,
};

export const ROUTE_FAMILY_BUDGETS = {
  home: {
    routeSpecific: { jsKB: 30, cssKB: 10, dataKB: 10, fontKB: 10, imageKB: 25, totalKB: 60 },
    total: { jsKB: 520, cssKB: 75, dataKB: 120, fontKB: 420, imageKB: 40, totalKB: 1_075 },
  },
  localized: {
    routeSpecific: { jsKB: 120, cssKB: 15, dataKB: 60, fontKB: 10, imageKB: 40, totalKB: 180 },
    total: { jsKB: 600, cssKB: 80, dataKB: 165, fontKB: 420, imageKB: 55, totalKB: 1_150 },
  },
  'chain-sdk': {
    routeSpecific: { jsKB: 60, cssKB: 10, dataKB: 15, fontKB: 10, imageKB: 15, totalKB: 90 },
    total: { jsKB: 560, cssKB: 75, dataKB: 125, fontKB: 420, imageKB: 30, totalKB: 1_100 },
  },
  'blog-index': {
    routeSpecific: { jsKB: 120, cssKB: 15, dataKB: 60, fontKB: 10, imageKB: 40, totalKB: 180 },
    total: { jsKB: 600, cssKB: 80, dataKB: 165, fontKB: 420, imageKB: 55, totalKB: 1_150 },
  },
  'blog-post': {
    routeSpecific: { jsKB: 120, cssKB: 15, dataKB: 60, fontKB: 10, imageKB: 40, totalKB: 180 },
    total: { jsKB: 600, cssKB: 80, dataKB: 165, fontKB: 420, imageKB: 55, totalKB: 1_150 },
  },
  'case-studies': {
    routeSpecific: { jsKB: 60, cssKB: 10, dataKB: 25, fontKB: 10, imageKB: 25, totalKB: 100 },
    total: { jsKB: 560, cssKB: 75, dataKB: 135, fontKB: 420, imageKB: 40, totalKB: 1_100 },
  },
  'data-heavy': {
    routeSpecific: { jsKB: 75, cssKB: 10, dataKB: 40, fontKB: 10, imageKB: 15, totalKB: 105 },
    total: { jsKB: 580, cssKB: 75, dataKB: 150, fontKB: 420, imageKB: 30, totalKB: 1_120 },
  },
  ecosystem: {
    routeSpecific: { jsKB: 50, cssKB: 10, dataKB: 15, fontKB: 10, imageKB: 30, totalKB: 90 },
    total: { jsKB: 550, cssKB: 75, dataKB: 125, fontKB: 420, imageKB: 45, totalKB: 1_100 },
  },
  press: {
    routeSpecific: { jsKB: 50, cssKB: 10, dataKB: 15, fontKB: 10, imageKB: 30, totalKB: 90 },
    total: { jsKB: 550, cssKB: 75, dataKB: 125, fontKB: 420, imageKB: 45, totalKB: 1_100 },
  },
  vitals: {
    routeSpecific: { jsKB: 65, cssKB: 10, dataKB: 25, fontKB: 10, imageKB: 15, totalKB: 95 },
    total: { jsKB: 570, cssKB: 75, dataKB: 135, fontKB: 420, imageKB: 30, totalKB: 1_110 },
  },
  content: {
    routeSpecific: { jsKB: 60, cssKB: 10, dataKB: 20, fontKB: 10, imageKB: 20, totalKB: 90 },
    total: { jsKB: 560, cssKB: 75, dataKB: 130, fontKB: 420, imageKB: 35, totalKB: 1_100 },
  },
};

export const ALLOWED_SHELL_COLLECTIONS = ['ecosystem', 'i18n', 'trust'];
export const ALLOWED_SHELL_SDKS = [];

/**
 * Canonical route specifications mapping URL paths and route families to
 * their Vite manifest entry, prerendered HTML path, and allowed collections
 * and chain SDKs.
 */
export const ROUTE_SPECS = [
  {
    route: '/',
    family: 'home',
    entryKey: 'index.html',
    htmlPath: 'index.html',
    allowedCollections: ['ecosystem', 'i18n', 'trust'],
    allowedSdks: [],
    usesEcosystemImages: true,
    deferredComponentPrefix: 'src/components/',
  },
  {
    route: '/es',
    family: 'localized',
    entryKey: 'index.html',
    htmlPath: 'index.html',
    allowedCollections: ['ecosystem', 'i18n', 'trust'],
    allowedSdks: [],
    usesEcosystemImages: true,
    deferredComponentPrefix: 'src/components/',
  },
  {
    route: '/pt',
    family: 'localized',
    entryKey: 'index.html',
    htmlPath: 'index.html',
    allowedCollections: ['ecosystem', 'i18n', 'trust'],
    allowedSdks: [],
    usesEcosystemImages: true,
    deferredComponentPrefix: 'src/components/',
  },
  {
    route: '/stellar',
    family: 'chain-sdk',
    entryKey: 'src/pages/Stellar.tsx',
    htmlPath: 'stellar/index.html',
    allowedCollections: ['i18n'],
    allowedSdks: [],
    forbiddenDynamicSdks: ['stellar-sdk', 'wraith-sdk', 'evm-sdk', 'solana-sdk', 'ckb-sdk'],
  },
  {
    route: '/es/stellar',
    family: 'localized',
    entryKey: 'src/pages/Stellar.tsx',
    htmlPath: 'index.html',
    allowedCollections: ['i18n'],
    allowedSdks: [],
    forbiddenDynamicSdks: ['stellar-sdk', 'wraith-sdk', 'evm-sdk', 'solana-sdk', 'ckb-sdk'],
  },
  {
    route: '/blog',
    family: 'blog-index',
    entryKey: 'src/pages/Blog.tsx',
    htmlPath: 'blog/index.html',
    allowedCollections: ['blog', 'blog-manifest', 'i18n'],
    allowedSdks: [],
  },
  {
    route: '/blog/wave-7-kickoff',
    family: 'blog-post',
    entryKey: 'src/pages/Blog.tsx',
    htmlPath: 'blog/wave-7-kickoff/index.html',
    allowedCollections: ['blog', 'blog-manifest', 'i18n'],
    allowedSdks: [],
  },
  {
    route: '/es/blog',
    family: 'localized',
    entryKey: 'src/pages/Blog.tsx',
    htmlPath: 'index.html',
    allowedCollections: ['blog', 'blog-manifest', 'i18n'],
    allowedSdks: [],
  },
  {
    route: '/case-studies',
    family: 'case-studies',
    entryKey: 'src/pages/CaseStudies.tsx',
    htmlPath: 'case-studies/index.html',
    allowedCollections: ['case-studies', 'i18n'],
    allowedSdks: [],
  },
  {
    route: '/case-studies/payroll-processor',
    family: 'case-studies',
    entryKey: 'src/pages/CaseStudies.tsx',
    htmlPath: 'case-studies/payroll-processor/index.html',
    allowedCollections: ['case-studies', 'i18n'],
    allowedSdks: [],
  },
  {
    route: '/es/case-studies',
    family: 'localized',
    entryKey: 'src/pages/CaseStudies.tsx',
    htmlPath: 'index.html',
    allowedCollections: ['case-studies', 'i18n'],
    allowedSdks: [],
  },
  {
    route: '/grants',
    family: 'content',
    entryKey: 'src/pages/Grants.tsx',
    htmlPath: 'grants/index.html',
    allowedCollections: ['i18n', 'wave'],
    allowedSdks: [],
  },
  {
    route: '/pt/grants',
    family: 'localized',
    entryKey: 'src/pages/Grants.tsx',
    htmlPath: 'index.html',
    allowedCollections: ['i18n', 'wave'],
    allowedSdks: [],
  },
  {
    route: '/faq',
    family: 'data-heavy',
    entryKey: 'src/pages/Faq.tsx',
    htmlPath: 'faq/index.html',
    allowedCollections: ['faq', 'i18n'],
    allowedSdks: [],
  },
  {
    route: '/threat-model',
    family: 'data-heavy',
    entryKey: 'src/pages/ThreatModel.tsx',
    htmlPath: 'threat-model/index.html',
    allowedCollections: ['i18n', 'threat-model'],
    allowedSdks: [],
  },
  {
    route: '/security',
    family: 'content',
    entryKey: 'src/pages/Security.tsx',
    htmlPath: 'security/index.html',
    allowedCollections: ['i18n', 'security'],
    allowedSdks: [],
  },
  {
    route: '/chains',
    family: 'content',
    entryKey: 'src/pages/Chains.tsx',
    htmlPath: 'chains/index.html',
    allowedCollections: ['chains', 'i18n'],
    allowedSdks: [],
  },
  {
    route: '/ecosystem',
    family: 'ecosystem',
    entryKey: 'src/pages/Ecosystem.tsx',
    htmlPath: 'ecosystem/index.html',
    allowedCollections: ['ecosystem', 'i18n'],
    allowedSdks: [],
    usesEcosystemImages: true,
  },
  {
    route: '/use-cases',
    family: 'content',
    entryKey: 'src/pages/UseCases.tsx',
    htmlPath: 'use-cases/index.html',
    allowedCollections: ['calculator-chains', 'i18n'],
    allowedSdks: [],
  },
  {
    route: '/use-cases/calculator',
    family: 'content',
    entryKey: 'src/pages/CostCalculatorPage.tsx',
    htmlPath: 'use-cases/calculator/index.html',
    allowedCollections: ['calculator-chains', 'i18n'],
    allowedSdks: [],
  },
  {
    route: '/roadmap',
    family: 'content',
    entryKey: 'src/pages/Roadmap.tsx',
    htmlPath: 'roadmap/index.html',
    allowedCollections: ['i18n', 'roadmap'],
    allowedSdks: [],
  },
  {
    route: '/about',
    family: 'content',
    entryKey: 'src/pages/About.tsx',
    htmlPath: 'about/index.html',
    allowedCollections: ['i18n', 'team'],
    allowedSdks: [],
  },
  {
    route: '/governance',
    family: 'content',
    entryKey: 'src/pages/Governance.tsx',
    htmlPath: 'governance/index.html',
    allowedCollections: ['contributors-optout', 'i18n', 'team'],
    allowedSdks: [],
  },
  {
    route: '/contributors',
    family: 'content',
    entryKey: 'src/pages/Contributors.tsx',
    htmlPath: 'contributors/index.html',
    allowedCollections: ['contributors', 'i18n'],
    allowedSdks: [],
  },
  {
    route: '/vitals',
    family: 'vitals',
    entryKey: 'src/pages/Vitals.tsx',
    htmlPath: 'vitals/index.html',
    allowedCollections: ['i18n', 'vitals'],
    allowedSdks: [],
  },
  {
    route: '/status',
    family: 'content',
    entryKey: 'src/pages/Status.tsx',
    htmlPath: 'status/index.html',
    allowedCollections: ['i18n', 'incidents'],
    allowedSdks: [],
  },
  {
    route: '/press',
    family: 'press',
    entryKey: 'src/pages/Press.tsx',
    htmlPath: 'press/index.html',
    allowedCollections: ['i18n'],
    allowedSdks: [],
  },
  {
    route: '/privacy',
    family: 'content',
    entryKey: 'src/pages/Privacy.tsx',
    htmlPath: 'privacy/index.html',
    allowedCollections: ['i18n'],
    allowedSdks: [],
  },
  {
    route: '/terms',
    family: 'content',
    entryKey: 'src/pages/Terms.tsx',
    htmlPath: 'terms/index.html',
    allowedCollections: ['i18n'],
    allowedSdks: [],
  },
  {
    route: '/newsletter',
    family: 'content',
    entryKey: 'src/pages/Newsletter.tsx',
    htmlPath: 'newsletter/index.html',
    allowedCollections: ['i18n'],
    allowedSdks: [],
  },
  {
    route: '/404',
    family: 'content',
    entryKey: 'src/pages/NotFound.tsx',
    htmlPath: 'index.html',
    allowedCollections: ['i18n'],
    allowedSdks: [],
  },
];

export const CHAIN_SDK_PATTERNS = [
  { id: 'stellar-sdk', pattern: /(?:^|\/)@stellar\/stellar-sdk(?:\/|$)|^vendor-stellar-sdk$/ },
  { id: 'wraith-sdk', pattern: /(?:^|\/)@wraith-protocol\/sdk(?:\/|$)|^vendor-wraith-sdk$/ },
  { id: 'solana-sdk', pattern: /(?:^|\/)@solana\/web3\.js(?:\/|$)|^vendor-solana-sdk$/ },
  {
    id: 'evm-sdk',
    pattern: /(?:^|\/)(?:ethers|viem|@wagmi\/)(?:\/|$)|^vendor-(?:evm|ethers|viem)-sdk$/,
  },
  {
    id: 'ckb-sdk',
    pattern: /(?:^|\/)(?:@ckb-lumos|@nervosnetwork)(?:\/|$)|^vendor-ckb-sdk$/,
  },
];

const DATA_FILE_COLLECTION_MAP = {
  'authors.json': 'blog',
  'authors-optout.json': 'blog',
  'blog-manifest.json': 'blog-manifest',
  'blog-posts.json': 'blog-manifest',
  'calculatorChains.ts': 'calculator-chains',
  'case-studies.json': 'case-studies',
  'chains.json': 'chains',
  'contributors-optout.json': 'contributors-optout',
  'contributors.json': 'contributors',
  'ecosystem.json': 'ecosystem',
  'faq.json': 'faq',
  'incidents.json': 'incidents',
  'roadmap.json': 'roadmap',
  'security.json': 'security',
  'showcase.json': 'showcase',
  'stellarDeployment.ts': 'stellar-deployment',
  'team.json': 'team',
  'threat-model.json': 'threat-model',
  'trust.json': 'trust',
  'vitalsData.ts': 'vitals',
  'vitalsFixtures.ts': 'vitals',
  'wave.json': 'wave',
};

const KNOWN_COLLECTION_CHUNK_PREFIXES = new Set([
  'authors',
  'blog-manifest',
  'blog-posts',
  'calculator-chains',
  'case-studies',
  'chains',
  'contributors',
  'contributors-optout',
  'ecosystem',
  'faq',
  'i18n',
  'incidents',
  'roadmap',
  'security',
  'showcase',
  'stellar-deployment',
  'team',
  'threat-model',
  'trust',
  'vitals',
  'wave',
]);

const FONT_EXTENSIONS = new Set(['.woff2', '.woff', '.ttf', '.otf', '.eot']);
const IMAGE_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.avif',
  '.gif',
  '.svg',
  '.ico',
]);
const DATA_ASSET_EXTENSIONS = new Set(['.json', '.webmanifest']);

function stripQueryAndHash(rawPath) {
  return rawPath.split('?')[0].split('#')[0];
}

function normalizeRelPath(rawPath) {
  return stripQueryAndHash(rawPath).replace(/\\/g, '/').replace(/^\/+/, '');
}

function isExternalUrl(rawPath) {
  return /^(?:https?:)?\/\//i.test(rawPath) || /^data:|^blob:|^mailto:|^tel:/i.test(rawPath);
}

function toKB(bytes) {
  return bytes / 1024;
}

function readJsonOptional(absPath) {
  if (!existsSync(absPath)) return null;
  return JSON.parse(readFileSync(absPath, 'utf8'));
}

function walkFiles(dir, baseDir) {
  const results = [];
  if (!existsSync(dir)) return results;
  for (const name of readdirSync(dir).sort()) {
    const abs = join(dir, name);
    const st = statSync(abs);
    if (st.isDirectory()) {
      results.push(...walkFiles(abs, baseDir));
    } else {
      const rel = abs.slice(baseDir.length + 1).replace(/\\/g, '/');
      results.push({ rel, size: st.size });
    }
  }
  return results;
}

function parseAttributes(tag) {
  const attrs = {};
  const attrRe = /([A-Za-z_:][A-Za-z0-9_.:-]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match;
  while ((match = attrRe.exec(tag)) !== null) {
    const key = match[1].toLowerCase();
    const val = match[2] ?? match[3] ?? match[4] ?? '';
    attrs[key] = val;
  }
  return attrs;
}

function extractHtmlSignals(html) {
  const styleBlocks = [];
  const styleRe = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let styleMatch;
  while ((styleMatch = styleRe.exec(html)) !== null) {
    styleBlocks.push(styleMatch[1]);
  }

  const stylesheets = [];
  const externalStylesheets = [];
  const preloadFonts = [];
  const externalFontLinks = [];
  const manifestLinks = [];
  const fetchPreloads = [];

  const linkRe = /<link\b[^>]*>/gi;
  let linkMatch;
  while ((linkMatch = linkRe.exec(html)) !== null) {
    const attrs = parseAttributes(linkMatch[0]);
    const rel = (attrs.rel ?? '').toLowerCase().split(/\s+/).filter(Boolean);
    const href = attrs.href ?? '';
    if (!href) continue;

    if (rel.includes('stylesheet')) {
      if (isExternalUrl(href)) {
        externalStylesheets.push(href);
      } else {
        stylesheets.push(normalizeRelPath(href));
      }
    } else if (rel.includes('preload') && (attrs.as ?? '').toLowerCase() === 'font') {
      if (isExternalUrl(href)) {
        externalFontLinks.push(href);
      } else {
        preloadFonts.push(normalizeRelPath(href));
      }
    } else if (rel.includes('manifest')) {
      if (!isExternalUrl(href)) {
        manifestLinks.push(normalizeRelPath(href));
      }
    } else if (rel.includes('preload') && (attrs.as ?? '').toLowerCase() === 'fetch') {
      if (!isExternalUrl(href)) {
        fetchPreloads.push(normalizeRelPath(href));
      }
    }
  }

  const images = [];
  const imgRe = /<img\b[^>]*>/gi;
  let imgMatch;
  while ((imgMatch = imgRe.exec(html)) !== null) {
    const attrs = parseAttributes(imgMatch[0]);
    const src = attrs.src ?? '';
    if (!src || isExternalUrl(src)) continue;
    const rel = normalizeRelPath(src);
    if (!rel.startsWith('og/')) {
      images.push(rel);
    }
  }

  return {
    styleBlocks,
    stylesheets: [...new Set(stylesheets)].sort(),
    externalStylesheets: [...new Set(externalStylesheets)].sort(),
    preloadFonts: [...new Set(preloadFonts)].sort(),
    externalFontLinks: [...new Set(externalFontLinks)].sort(),
    manifestLinks: [...new Set(manifestLinks)].sort(),
    fetchPreloads: [...new Set(fetchPreloads)].sort(),
    images: [...new Set(images)].sort(),
  };
}

function extractCssAssetUrls(cssText) {
  const fonts = new Set();
  const externalFonts = new Set();
  const images = new Set();

  const urlRe = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)\s]+))\s*\)/gi;
  let match;
  while ((match = urlRe.exec(cssText)) !== null) {
    const raw = (match[1] ?? match[2] ?? match[3] ?? '').trim();
    if (!raw || raw.startsWith('#') || /^data:|^blob:/i.test(raw)) continue;

    if (isExternalUrl(raw)) {
      const ext = extname(stripQueryAndHash(raw)).toLowerCase();
      if (FONT_EXTENSIONS.has(ext) || /fonts\.gstatic\.com|fonts\.googleapis\.com/i.test(raw)) {
        externalFonts.add(raw);
      }
      continue;
    }

    const rel = normalizeRelPath(raw);
    const ext = extname(rel).toLowerCase();
    if (FONT_EXTENSIONS.has(ext)) {
      fonts.add(rel);
    } else if (IMAGE_EXTENSIONS.has(ext) && !rel.startsWith('og/')) {
      images.add(rel);
    }
  }

  return {
    fonts: [...fonts].sort(),
    externalFonts: [...externalFonts].sort(),
    images: [...images].sort(),
  };
}

/**
 * Strip the Vite/Rolldown content-hash suffix from a chunk filename.
 * Matches alphanumeric 8+ char suffixes after a hyphen separator.
 */
export function chunkPrefixName(relativeFile) {
  const name = basename(relativeFile, extname(relativeFile));
  return name.replace(/-[A-Za-z0-9]{8,}$/, '');
}

/** Return the allowlist entry for a chunk file, or null if not allowlisted. */
export function getAllowlistEntry(relativeFile) {
  const prefix = chunkPrefixName(relativeFile);
  return CHUNK_ALLOWLIST[prefix] ?? null;
}

/** Map a normalized module or manifest key to a content collection ID, or null. */
export function classifyCollection(rawModuleId) {
  const cleanId = stripQueryAndHash(rawModuleId).replace(/\\/g, '/');

  if (/^src\/i18n\/.+\.json$/i.test(cleanId)) {
    return 'i18n';
  }
  if (/^src\/content\/blog\/.+\.mdx?$/i.test(cleanId)) {
    return 'blog';
  }
  const contentMatch = cleanId.match(/^src\/content\/([^/]+)\//);
  if (contentMatch) {
    return `content:${contentMatch[1]}`;
  }
  const dataMatch = cleanId.match(/^src\/data\/(.+)$/);
  if (dataMatch) {
    const file = dataMatch[1];
    if (/\.test\./i.test(file) || file === 'README.md') return null;
    if (DATA_FILE_COLLECTION_MAP[file]) {
      return DATA_FILE_COLLECTION_MAP[file];
    }
    return `data:${basename(file, extname(file))}`;
  }

  return null;
}

/** Map a module ID or chunk prefix to a chain SDK identifier, or null. */
export function classifyChainSdk(rawId) {
  const cleanId = stripQueryAndHash(rawId).replace(/\\/g, '/');
  for (const { id, pattern } of CHAIN_SDK_PATTERNS) {
    if (pattern.test(cleanId)) {
      if (id === 'wraith-sdk') {
        const chainMatch = cleanId.match(/@wraith-protocol\/sdk\/(?:dist\/)?chains\/([^/]+)/);
        if (chainMatch && chainMatch[1] && chainMatch[1] !== 'stellar') {
          return `wraith-sdk:${chainMatch[1]}`;
        }
      }
      return id;
    }
  }
  return null;
}

function classifyChunkPrefixCollection(chunkKey, entry) {
  if (chunkKey.startsWith('src/pages/') || chunkKey.startsWith('src/components/')) {
    return null;
  }
  const fromKey = classifyCollection(chunkKey);
  if (fromKey) return fromKey;

  if (!entry?.file) return null;
  const ext = extname(entry.file).toLowerCase();
  const prefix = chunkPrefixName(entry.file);

  if (DATA_ASSET_EXTENSIONS.has(ext)) {
    const cleanBase = prefix.replace(/^data-/, '');
    if (KNOWN_COLLECTION_CHUNK_PREFIXES.has(cleanBase)) {
      return cleanBase === 'authors' ? 'blog' : cleanBase;
    }
    return `data:${cleanBase}`;
  }

  if (KNOWN_COLLECTION_CHUNK_PREFIXES.has(prefix)) {
    return prefix === 'authors' ? 'blog' : prefix;
  }

  return null;
}

function subtractMultiset(targetItems, baseItems) {
  const remaining = [...baseItems];
  const diff = [];
  for (const item of targetItems) {
    const idx = remaining.indexOf(item);
    if (idx !== -1) {
      remaining.splice(idx, 1);
    } else {
      diff.push(item);
    }
  }
  return diff;
}

function isEcosystemOnlyChunk(chunkFile, chunkModulesMap, manifestEntry) {
  const meta = chunkModulesMap?.[chunkFile];
  const modules = meta?.modules ?? manifestEntry?.modules ?? [];
  if (modules.length > 0) {
    return modules.every((m) => {
      const id = typeof m === 'string' ? m : m.id;
      return stripQueryAndHash(id) === 'src/data/ecosystem.json';
    });
  }
  return chunkPrefixName(chunkFile) === 'ecosystem';
}

function scanChunkPublicReferences(code, distImagesSet, distImagesByDir, distDataSet) {
  const images = new Set();
  const dataFiles = new Set();

  const literalRe = /["'`](\/(?!og\/)[^"'`\s\\$]+)["'`]/g;
  let match;
  while ((match = literalRe.exec(code)) !== null) {
    const rel = normalizeRelPath(match[1]);
    if (distImagesSet.has(rel)) {
      images.add(rel);
    } else if (distDataSet.has(rel)) {
      dataFiles.add(rel);
    }
  }

  for (const [dirPrefix, filesInDir] of distImagesByDir.entries()) {
    if (!code.includes(`/${dirPrefix}/`)) continue;
    for (const fileInfo of filesInDir) {
      if (
        code.includes(`"${fileInfo.name}"`) ||
        code.includes(`'${fileInfo.name}'`) ||
        code.includes(`\`${fileInfo.name}\``)
      ) {
        images.add(fileInfo.rel);
      }
    }
  }

  return {
    images: [...images].sort(),
    dataFiles: [...dataFiles].sort(),
  };
}

function toRoundedMetric(bytes) {
  return Math.round(bytes);
}

function kebabFromPageKey(entryKey) {
  const base = basename(entryKey, extname(entryKey));
  return `/${base
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase()}`;
}

function checkBudgetLimits(scopeLabel, metrics, limits, isRouteSpecific, violations) {
  const suffix = isRouteSpecific ? 'route-specific ' : '';
  const checks = [
    ['jsKB', metrics.jsBytes, `${suffix}JS`],
    ['cssKB', metrics.cssBytes, `${suffix}CSS`],
    ['dataKB', metrics.dataBytes, `${suffix}data`],
    ['fontKB', metrics.fontBytes, `${suffix}font`],
    ['imageKB', metrics.imageBytes, `${suffix}image`],
    ['totalKB', metrics.totalBytes, `${suffix}total transfer`],
  ];

  for (const [limitKey, bytes, label] of checks) {
    const limitKB = limits[limitKey];
    if (limitKB === undefined) continue;
    const actualKB = toKB(bytes);
    if (actualKB > limitKB) {
      violations.push({
        scope: scopeLabel,
        kind: 'budget',
        metric: limitKey,
        actualKB: Number(actualKB.toFixed(1)),
        limitKB,
        message: `${scopeLabel} ${label} ${actualKB.toFixed(1)} kB exceeds budget ${limitKB} kB`,
      });
    }
  }

  if (!isRouteSpecific && limits.preloadedFontKB !== undefined) {
    const preloadedKB = toKB(metrics.preloadedFontBytes ?? 0);
    if (preloadedKB > limits.preloadedFontKB) {
      violations.push({
        scope: scopeLabel,
        kind: 'budget',
        metric: 'preloadedFontKB',
        actualKB: Number(preloadedKB.toFixed(1)),
        limitKB: limits.preloadedFontKB,
        message: `${scopeLabel} preloaded fonts ${preloadedKB.toFixed(1)} kB exceed budget ${limits.preloadedFontKB} kB`,
      });
    }
  }
}

/**
 * Analyze a built `dist/` directory under `rootDir` and return a deterministic
 * chunk, shared-shell, per-route transfer, and import-boundary audit report.
 */
export function analyzeDist(rootDir = process.cwd(), options = {}) {
  const distDir = join(rootDir, 'dist');
  const manifestPath = join(distDir, '.vite', 'manifest.json');
  const chunkModulesPath = join(distDir, '.vite', 'chunk-modules.json');

  const manifest = readJsonOptional(manifestPath);
  if (!manifest) {
    return {
      schemaVersion: 1,
      passed: false,
      manifestMissing: true,
      manifestPath,
      legacy: { checkedChunks: 0, chunks: [], entryClosures: [] },
      sharedShell: null,
      routes: [],
      violations: [
        {
          scope: 'manifest',
          kind: 'missing-manifest',
          message: `Cannot read ${manifestPath} — run \`pnpm build\` before this check.`,
        },
      ],
    };
  }

  const chunkModules = options.chunkModules ?? readJsonOptional(chunkModulesPath) ?? {};
  const sharedShellBudgets = options.sharedShellBudgets ?? SHARED_SHELL_BUDGET_KB;
  const routeFamilyBudgets = options.routeFamilyBudgets ?? ROUTE_FAMILY_BUDGETS;

  const byFileKey = new Map();
  for (const [key, entry] of Object.entries(manifest)) {
    if (entry && typeof entry.file === 'string') {
      byFileKey.set(entry.file, key);
    }
  }

  const sizeCache = new Map();
  const fileSizeBytes = (relativeFile) => {
    const norm = normalizeRelPath(relativeFile);
    if (sizeCache.has(norm)) return sizeCache.get(norm);
    const absPath = join(distDir, norm);
    try {
      const bytes = statSync(absPath).size;
      sizeCache.set(norm, bytes);
      return bytes;
    } catch {
      sizeCache.set(norm, 0);
      return 0;
    }
  };

  const fileExists = (relativeFile) => existsSync(join(distDir, normalizeRelPath(relativeFile)));

  const codeCache = new Map();
  const readDistText = (relativeFile) => {
    const norm = normalizeRelPath(relativeFile);
    if (codeCache.has(norm)) return codeCache.get(norm);
    const absPath = join(distDir, norm);
    if (!existsSync(absPath)) {
      codeCache.set(norm, '');
      return '';
    }
    const text = readFileSync(absPath, 'utf8');
    codeCache.set(norm, text);
    return text;
  };

  const distFiles = walkFiles(distDir, distDir);
  const distImagesSet = new Set();
  const distImagesByDir = new Map();
  const distDataSet = new Set();

  for (const { rel } of distFiles) {
    if (rel.startsWith('.vite/') || rel.startsWith('og/') || rel.startsWith('feed/')) continue;
    const ext = extname(rel).toLowerCase();
    if (IMAGE_EXTENSIONS.has(ext)) {
      distImagesSet.add(rel);
      const dir = dirname(rel);
      if (dir !== '.') {
        const list = distImagesByDir.get(dir) ?? [];
        list.push({ name: basename(rel), rel });
        distImagesByDir.set(dir, list);
      }
    } else if (DATA_ASSET_EXTENSIONS.has(ext)) {
      distDataSet.add(rel);
    }
  }

  const resolveStaticClosureKeys = (startKey) => {
    const visited = new Set();
    const stack = [startKey];
    while (stack.length > 0) {
      const currentKey = stack.pop();
      if (!currentKey || visited.has(currentKey)) continue;
      const entry = manifest[currentKey];
      if (!entry) continue;
      visited.add(currentKey);
      for (const dep of entry.imports ?? []) {
        const depKey = manifest[dep] ? dep : byFileKey.get(dep);
        if (depKey && !visited.has(depKey)) {
          stack.push(depKey);
        }
      }
    }
    return [...visited].sort();
  };

  const resolveStaticJsFiles = (startKey) => {
    const keys = resolveStaticClosureKeys(startKey);
    const files = [];
    for (const key of keys) {
      const entry = manifest[key];
      if (entry?.file && extname(entry.file) === '.js') {
        files.push(entry.file);
      }
    }
    return [...new Set(files)].sort();
  };

  const violations = [];
  const legacyChunks = [];

  for (const key of Object.keys(manifest).sort()) {
    const entry = manifest[key];
    if (!entry?.file || extname(entry.file) !== '.js') continue;
    const bytes = fileSizeBytes(entry.file);
    if (bytes === 0) continue;

    const kb = toKB(bytes);
    const label = entry.file.replace(/^assets\//, '');
    const allowed = getAllowlistEntry(entry.file);

    if (allowed) {
      if (kb > allowed.maxKB) {
        violations.push({
          scope: label,
          kind: 'chunk-budget',
          actualKB: Number(kb.toFixed(1)),
          limitKB: allowed.maxKB,
          message: `Chunk ${label} (${kb.toFixed(1)} kB) exceeds allowlist ceiling ${allowed.maxKB} kB — ${allowed.reason}`,
        });
        legacyChunks.push({
          key,
          file: entry.file,
          label,
          bytes,
          kb: Number(kb.toFixed(1)),
          status: 'fail',
          allowlisted: true,
          limitKB: allowed.maxKB,
          reason: allowed.reason,
        });
      } else {
        legacyChunks.push({
          key,
          file: entry.file,
          label,
          bytes,
          kb: Number(kb.toFixed(1)),
          status: 'allow',
          allowlisted: true,
          limitKB: allowed.maxKB,
          reason: allowed.reason,
        });
      }
    } else if (kb > CHUNK_BUDGET_KB) {
      violations.push({
        scope: label,
        kind: 'chunk-budget',
        actualKB: Number(kb.toFixed(1)),
        limitKB: CHUNK_BUDGET_KB,
        message: `Chunk ${label} (${kb.toFixed(1)} kB) exceeds chunk budget ${CHUNK_BUDGET_KB} kB`,
      });
      legacyChunks.push({
        key,
        file: entry.file,
        label,
        bytes,
        kb: Number(kb.toFixed(1)),
        status: 'fail',
        allowlisted: false,
        limitKB: CHUNK_BUDGET_KB,
      });
    } else {
      legacyChunks.push({
        key,
        file: entry.file,
        label,
        bytes,
        kb: Number(kb.toFixed(1)),
        status: 'ok',
        allowlisted: false,
        limitKB: CHUNK_BUDGET_KB,
      });
    }
  }

  if (legacyChunks.length === 0) {
    return {
      schemaVersion: 1,
      passed: false,
      manifestMissing: false,
      manifestPath,
      legacy: { checkedChunks: 0, chunks: [], entryClosures: [] },
      sharedShell: null,
      routes: [],
      violations: [
        {
          scope: 'manifest',
          kind: 'empty-manifest',
          message: 'No JS chunks found in manifest — did the build succeed?',
        },
      ],
    };
  }

  const entryKeys = Object.keys(manifest)
    .filter((k) => manifest[k]?.isEntry && manifest[k]?.file && extname(manifest[k].file) === '.js')
    .sort();

  const legacyEntryClosures = [];
  for (const entryKey of entryKeys) {
    const files = resolveStaticJsFiles(entryKey);
    const totalBytes = files.reduce((sum, f) => sum + fileSizeBytes(f), 0);
    const totalKB = toKB(totalBytes);
    const label = manifest[entryKey].file.replace(/^assets\//, '');
    const passed = totalKB <= ROUTE_TRANSITIVE_KB;
    if (!passed) {
      violations.push({
        scope: label,
        kind: 'route-transitive',
        actualKB: Number(totalKB.toFixed(1)),
        limitKB: ROUTE_TRANSITIVE_KB,
        message: `Entry ${label} static transitive JS ${totalKB.toFixed(1)} kB exceeds ${ROUTE_TRANSITIVE_KB} kB`,
      });
    }
    legacyEntryClosures.push({
      entryKey,
      label,
      chunkCount: files.length,
      chunks: files,
      bytes: totalBytes,
      kb: Number(totalKB.toFixed(1)),
      passed,
    });
  }

  const inspectClosureAssets = (closureKeys, optionsForInspect = {}) => {
    const { includeEcosystemImages = true } = optionsForInspect;
    const jsFiles = [];
    const cssManifestFiles = [];
    const manifestAssetFonts = [];
    const manifestAssetImages = [];
    const manifestAssetData = [];
    const chunkPublicImages = [];
    const chunkPublicData = [];
    const ecosystemImages = [];
    const bundledDataDetails = [];
    let bundledDataBytes = 0;
    const collections = new Set();
    const sdks = new Set();

    for (const key of closureKeys) {
      const entry = manifest[key];
      if (!entry) continue;

      const sdkFromKey = classifyChainSdk(key);
      if (sdkFromKey) sdks.add(sdkFromKey);

      const collFromKey = classifyChunkPrefixCollection(key, entry);
      if (collFromKey) collections.add(collFromKey);

      if (entry.file) {
        const ext = extname(entry.file).toLowerCase();
        if (ext === '.js') {
          jsFiles.push(entry.file);
          const sdkFromPrefix = classifyChainSdk(chunkPrefixName(entry.file));
          if (sdkFromPrefix) sdks.add(sdkFromPrefix);

          const chunkSize = fileSizeBytes(entry.file);
          const meta = chunkModules[entry.file];
          const mods = meta?.modules ?? entry.modules ?? [];
          if (mods.length > 0) {
            const totalRendered = mods.reduce(
              (sum, m) => sum + (typeof m === 'string' ? 1 : (m.renderedLength ?? 0)),
              0,
            );
            for (const mod of mods) {
              const modId = typeof mod === 'string' ? mod : mod.id;
              const modSdk = classifyChainSdk(modId);
              if (modSdk) sdks.add(modSdk);

              const modCollection = classifyCollection(modId);
              if (modCollection) {
                collections.add(modCollection);
                let estBytes = 0;
                if (typeof mod !== 'string' && typeof mod.bytes === 'number') {
                  estBytes = mod.bytes;
                } else if (typeof mod !== 'string' && totalRendered > 0) {
                  estBytes = Math.round(chunkSize * ((mod.renderedLength ?? 0) / totalRendered));
                }
                bundledDataBytes += estBytes;
                bundledDataDetails.push({
                  module: stripQueryAndHash(modId),
                  collection: modCollection,
                  bytes: estBytes,
                });
              }
            }
          } else if (collFromKey && !key.startsWith('src/pages/')) {
            bundledDataBytes += chunkSize;
            bundledDataDetails.push({
              module: entry.file,
              collection: collFromKey,
              bytes: chunkSize,
            });
          }

          if (typeof entry.dataBytes === 'number') {
            bundledDataBytes += entry.dataBytes;
          }

          const code = readDistText(entry.file);
          if (code) {
            const scanned = scanChunkPublicReferences(
              code,
              distImagesSet,
              distImagesByDir,
              distDataSet,
            );
            if (isEcosystemOnlyChunk(entry.file, chunkModules, entry)) {
              for (const img of scanned.images) ecosystemImages.push(img);
              if (includeEcosystemImages) {
                for (const img of scanned.images) chunkPublicImages.push(img);
              }
            } else {
              for (const img of scanned.images) chunkPublicImages.push(img);
            }
            for (const df of scanned.dataFiles) chunkPublicData.push(df);
          }
        } else if (ext === '.css') {
          cssManifestFiles.push(entry.file);
        } else if (DATA_ASSET_EXTENSIONS.has(ext)) {
          manifestAssetData.push(entry.file);
        } else if (FONT_EXTENSIONS.has(ext)) {
          manifestAssetFonts.push(entry.file);
        } else if (IMAGE_EXTENSIONS.has(ext)) {
          manifestAssetImages.push(entry.file);
        }
      }

      for (const cssFile of entry.css ?? []) {
        cssManifestFiles.push(normalizeRelPath(cssFile));
      }
      for (const assetFile of entry.assets ?? []) {
        const normAsset = normalizeRelPath(assetFile);
        const ext = extname(normAsset).toLowerCase();
        if (FONT_EXTENSIONS.has(ext)) {
          manifestAssetFonts.push(normAsset);
        } else if (IMAGE_EXTENSIONS.has(ext)) {
          manifestAssetImages.push(normAsset);
        } else if (DATA_ASSET_EXTENSIONS.has(ext)) {
          manifestAssetData.push(normAsset);
        } else if (ext === '.css') {
          cssManifestFiles.push(normAsset);
        }
      }
    }

    return {
      jsFiles: [...new Set(jsFiles)].sort(),
      cssManifestFiles: [...new Set(cssManifestFiles)].sort(),
      manifestAssetFonts: [...new Set(manifestAssetFonts)].sort(),
      manifestAssetImages: [...new Set(manifestAssetImages)].sort(),
      manifestAssetData: [...new Set(manifestAssetData)].sort(),
      chunkPublicImages: [...new Set(chunkPublicImages)].sort(),
      chunkPublicData: [...new Set(chunkPublicData)].sort(),
      ecosystemImages: [...new Set(ecosystemImages)].sort(),
      bundledDataBytes,
      bundledDataDetails: bundledDataDetails.sort((a, b) => a.module.localeCompare(b.module)),
      collections: [...collections].sort(),
      sdks: [...sdks].sort(),
    };
  };

  const hasSpaShell = Boolean(manifest['index.html']);
  const shellEntryKey = hasSpaShell ? 'index.html' : (entryKeys[0] ?? null);

  const shellStaticKeys = shellEntryKey ? resolveStaticClosureKeys(shellEntryKey) : [];
  const shellStaticSet = new Set(shellStaticKeys);

  const indexHtmlText = readDistText('index.html');
  const indexSignals = indexHtmlText
    ? extractHtmlSignals(indexHtmlText)
    : {
        styleBlocks: [],
        stylesheets: [],
        externalStylesheets: [],
        preloadFonts: [],
        externalFontLinks: [],
        manifestLinks: [],
        fetchPreloads: [],
        images: [],
      };

  const shellAssets = inspectClosureAssets(shellStaticKeys, {
    includeEcosystemImages: !hasSpaShell,
  });

  const shellCssFilesOnDisk = new Set();
  let shellCssBytes = 0;
  const shellCssSources = [];
  const shellCssTextParts = [];

  for (const cssFile of shellAssets.cssManifestFiles) {
    if (fileExists(cssFile)) {
      shellCssFilesOnDisk.add(cssFile);
      const bytes = fileSizeBytes(cssFile);
      shellCssBytes += bytes;
      shellCssSources.push(cssFile);
      shellCssTextParts.push(readDistText(cssFile));
    }
  }
  for (const cssFile of indexSignals.stylesheets) {
    if (!shellCssFilesOnDisk.has(cssFile) && fileExists(cssFile)) {
      shellCssFilesOnDisk.add(cssFile);
      const bytes = fileSizeBytes(cssFile);
      shellCssBytes += bytes;
      shellCssSources.push(cssFile);
      shellCssTextParts.push(readDistText(cssFile));
    }
  }
  for (const styleBlock of indexSignals.styleBlocks) {
    const bytes = Buffer.byteLength(styleBlock, 'utf8');
    if (bytes > 0) {
      shellCssBytes += bytes;
      shellCssSources.push('index.html<style>');
      shellCssTextParts.push(styleBlock);
    }
  }

  const shellCssAssetScan = extractCssAssetUrls(shellCssTextParts.join('\n'));

  const shellFontSet = new Set([
    ...indexSignals.preloadFonts,
    ...shellCssAssetScan.fonts,
    ...shellAssets.manifestAssetFonts,
  ]);
  const shellPreloadedFonts = [...new Set(indexSignals.preloadFonts)].sort();
  const shellPreloadedFontBytes = shellPreloadedFonts.reduce((sum, f) => sum + fileSizeBytes(f), 0);
  const shellFontSources = [...shellFontSet].sort();
  const shellFontBytes = shellFontSources.reduce((sum, f) => sum + fileSizeBytes(f), 0);

  const shellImageSet = new Set([
    ...indexSignals.images,
    ...shellCssAssetScan.images,
    ...shellAssets.manifestAssetImages,
    ...shellAssets.chunkPublicImages,
  ]);
  const shellImageSources = [...shellImageSet].sort();
  const shellImageBytes = shellImageSources.reduce((sum, img) => sum + fileSizeBytes(img), 0);

  const shellExternalDataSet = new Set([
    ...indexSignals.manifestLinks,
    ...indexSignals.fetchPreloads,
    ...shellAssets.manifestAssetData,
    ...shellAssets.chunkPublicData,
  ]);
  const shellExternalDataSources = [...shellExternalDataSet].sort();
  const shellExternalDataBytes = shellExternalDataSources.reduce(
    (sum, d) => sum + fileSizeBytes(d),
    0,
  );
  const shellBundledDataBytes = shellAssets.bundledDataBytes;
  const shellDataBytes = shellBundledDataBytes + shellExternalDataBytes;

  const shellJsBytes = shellAssets.jsFiles.reduce((sum, f) => sum + fileSizeBytes(f), 0);
  const shellTotalBytes =
    shellJsBytes + shellCssBytes + shellExternalDataBytes + shellFontBytes + shellImageBytes;

  const sharedShell = {
    entryKey: shellEntryKey,
    jsBytes: toRoundedMetric(shellJsBytes),
    cssBytes: toRoundedMetric(shellCssBytes),
    dataBytes: toRoundedMetric(shellDataBytes),
    bundledDataBytes: toRoundedMetric(shellBundledDataBytes),
    externalDataBytes: toRoundedMetric(shellExternalDataBytes),
    fontBytes: toRoundedMetric(shellFontBytes),
    preloadedFontBytes: toRoundedMetric(shellPreloadedFontBytes),
    imageBytes: toRoundedMetric(shellImageBytes),
    totalBytes: toRoundedMetric(shellTotalBytes),
    jsChunks: shellAssets.jsFiles,
    cssSources: [...new Set(shellCssSources)].sort(),
    dataSources: [
      ...shellAssets.bundledDataDetails.map((d) => d.module),
      ...shellExternalDataSources,
    ].sort(),
    fontSources: shellFontSources,
    preloadedFontSources: shellPreloadedFonts,
    imageSources: shellImageSources,
    collections: shellAssets.collections,
    sdks: shellAssets.sdks,
    budgetsKB: sharedShellBudgets,
  };

  for (const extStylesheet of indexSignals.externalStylesheets) {
    if (/fonts\.googleapis\.com/i.test(extStylesheet)) {
      violations.push({
        scope: 'shared-shell',
        kind: 'external-font-cdn',
        message: `shared-shell loads external font stylesheet ${extStylesheet}`,
      });
    }
  }
  for (const extFont of [...indexSignals.externalFontLinks, ...shellCssAssetScan.externalFonts]) {
    violations.push({
      scope: 'shared-shell',
      kind: 'external-font-cdn',
      message: `shared-shell loads external font asset ${extFont}`,
    });
  }

  if (hasSpaShell) {
    checkBudgetLimits('shared-shell', sharedShell, sharedShellBudgets, false, violations);

    for (const sdk of sharedShell.sdks) {
      if (!ALLOWED_SHELL_SDKS.includes(sdk)) {
        violations.push({
          scope: 'shared-shell',
          kind: 'unused-sdk',
          sdk,
          message: `shared-shell eagerly imports unused chain SDK "${sdk}"`,
        });
      }
    }
    for (const col of sharedShell.collections) {
      if (!ALLOWED_SHELL_COLLECTIONS.includes(col)) {
        violations.push({
          scope: 'shared-shell',
          kind: 'unused-collection',
          collection: col,
          message: `shared-shell eagerly imports unused content collection "${col}"`,
        });
      }
    }
  } else {
    checkBudgetLimits(
      'shared-shell',
      sharedShell,
      {
        cssKB: sharedShellBudgets.cssKB,
        dataKB: sharedShellBudgets.dataKB,
        fontKB: sharedShellBudgets.fontKB,
        preloadedFontKB: sharedShellBudgets.preloadedFontKB,
        imageKB: sharedShellBudgets.imageKB,
      },
      false,
      violations,
    );
  }

  const activeRouteSpecs = [];
  const coveredPageEntryKeys = new Set();

  for (const spec of ROUTE_SPECS) {
    if (!manifest[spec.entryKey]) continue;
    if (spec.family === 'localized' && !hasSpaShell) continue;
    activeRouteSpecs.push(spec);
    coveredPageEntryKeys.add(spec.entryKey);
  }

  for (const key of Object.keys(manifest).sort()) {
    if (!key.startsWith('src/pages/') || coveredPageEntryKeys.has(key)) continue;
    if (!manifest[key]?.file?.endsWith('.js')) continue;
    const routePath = kebabFromPageKey(key);
    activeRouteSpecs.push({
      route: routePath,
      family: 'content',
      entryKey: key,
      htmlPath: `${routePath.slice(1)}/index.html`,
      allowedCollections: ['i18n'],
      allowedSdks: [],
    });
  }

  const routes = [];

  for (const spec of activeRouteSpecs) {
    const isShellEntry = spec.entryKey === shellEntryKey;
    const routeStaticKeys = resolveStaticClosureKeys(spec.entryKey);
    const routeOnlyKeys = isShellEntry ? [] : routeStaticKeys.filter((k) => !shellStaticSet.has(k));

    const routeFullAssets = inspectClosureAssets(routeStaticKeys, {
      includeEcosystemImages: Boolean(spec.usesEcosystemImages),
    });
    const routeOnlyAssets = inspectClosureAssets(routeOnlyKeys, {
      includeEcosystemImages: Boolean(spec.usesEcosystemImages),
    });

    const routeHtmlPath =
      spec.htmlPath && spec.htmlPath !== 'index.html' && fileExists(spec.htmlPath)
        ? spec.htmlPath
        : null;
    const routeHtmlText = routeHtmlPath ? readDistText(routeHtmlPath) : '';
    const routeSignals = routeHtmlText ? extractHtmlSignals(routeHtmlText) : null;

    let routeSpecificCssBytes = 0;
    const routeSpecificCssSources = [];
    const routeSpecificCssTexts = [];

    for (const cssFile of routeOnlyAssets.cssManifestFiles) {
      if (!shellCssFilesOnDisk.has(cssFile) && fileExists(cssFile)) {
        const bytes = fileSizeBytes(cssFile);
        routeSpecificCssBytes += bytes;
        routeSpecificCssSources.push(cssFile);
        routeSpecificCssTexts.push(readDistText(cssFile));
      }
    }

    if (routeSignals) {
      for (const cssFile of routeSignals.stylesheets) {
        if (!shellCssFilesOnDisk.has(cssFile) && fileExists(cssFile)) {
          const bytes = fileSizeBytes(cssFile);
          routeSpecificCssBytes += bytes;
          routeSpecificCssSources.push(cssFile);
          routeSpecificCssTexts.push(readDistText(cssFile));
        }
      }
      const extraStyles = subtractMultiset(routeSignals.styleBlocks, indexSignals.styleBlocks);
      for (const extraStyle of extraStyles) {
        const bytes = Buffer.byteLength(extraStyle, 'utf8');
        if (bytes > 0) {
          routeSpecificCssBytes += bytes;
          routeSpecificCssSources.push(`${routeHtmlPath}<style>`);
          routeSpecificCssTexts.push(extraStyle);
        }
      }
    }

    const routeCssAssetScan = extractCssAssetUrls(routeSpecificCssTexts.join('\n'));

    const routeSpecificFontSet = new Set([
      ...(routeSignals ? routeSignals.preloadFonts.filter((f) => !shellFontSet.has(f)) : []),
      ...routeCssAssetScan.fonts.filter((f) => !shellFontSet.has(f)),
      ...routeOnlyAssets.manifestAssetFonts.filter((f) => !shellFontSet.has(f)),
    ]);
    const routeSpecificFontSources = [...routeSpecificFontSet].sort();
    const routeSpecificFontBytes = routeSpecificFontSources.reduce(
      (sum, f) => sum + fileSizeBytes(f),
      0,
    );

    const routeSpecificImageSet = new Set([
      ...(routeSignals ? routeSignals.images.filter((img) => !shellImageSet.has(img)) : []),
      ...routeCssAssetScan.images.filter((img) => !shellImageSet.has(img)),
      ...routeOnlyAssets.manifestAssetImages.filter((img) => !shellImageSet.has(img)),
      ...routeOnlyAssets.chunkPublicImages.filter((img) => !shellImageSet.has(img)),
    ]);
    if (spec.usesEcosystemImages) {
      for (const img of routeFullAssets.ecosystemImages) {
        if (!shellImageSet.has(img)) {
          routeSpecificImageSet.add(img);
        }
      }
    }
    const routeSpecificImageSources = [...routeSpecificImageSet].sort();
    const routeSpecificImageBytes = routeSpecificImageSources.reduce(
      (sum, img) => sum + fileSizeBytes(img),
      0,
    );

    const routeSpecificExternalDataSet = new Set([
      ...(routeSignals
        ? [...routeSignals.manifestLinks, ...routeSignals.fetchPreloads].filter(
            (d) => !shellExternalDataSet.has(d),
          )
        : []),
      ...routeOnlyAssets.manifestAssetData.filter((d) => !shellExternalDataSet.has(d)),
      ...routeOnlyAssets.chunkPublicData.filter((d) => !shellExternalDataSet.has(d)),
    ]);
    const routeSpecificExternalDataSources = [...routeSpecificExternalDataSet].sort();
    const routeSpecificExternalDataBytes = routeSpecificExternalDataSources.reduce(
      (sum, d) => sum + fileSizeBytes(d),
      0,
    );

    const routeSpecificJsBytes = routeOnlyAssets.jsFiles.reduce(
      (sum, f) => sum + fileSizeBytes(f),
      0,
    );
    const routeSpecificBundledDataBytes = routeOnlyAssets.bundledDataBytes;
    const routeSpecificDataBytes = routeSpecificBundledDataBytes + routeSpecificExternalDataBytes;
    const routeSpecificTotalBytes =
      routeSpecificJsBytes +
      routeSpecificCssBytes +
      routeSpecificExternalDataBytes +
      routeSpecificFontBytes +
      routeSpecificImageBytes;

    const totalJsBytes = sharedShell.jsBytes + routeSpecificJsBytes;
    const totalCssBytes = sharedShell.cssBytes + routeSpecificCssBytes;
    const totalExternalDataBytes = sharedShell.externalDataBytes + routeSpecificExternalDataBytes;
    const totalBundledDataBytes = sharedShell.bundledDataBytes + routeSpecificBundledDataBytes;
    const totalDataBytes = totalBundledDataBytes + totalExternalDataBytes;
    const totalFontBytes = sharedShell.fontBytes + routeSpecificFontBytes;
    const totalImageBytes = sharedShell.imageBytes + routeSpecificImageBytes;
    const totalTransferBytes =
      totalJsBytes + totalCssBytes + totalExternalDataBytes + totalFontBytes + totalImageBytes;

    const entryManifest = manifest[spec.entryKey];
    const deferredKeys = new Set();
    for (const dyn of entryManifest?.dynamicImports ?? []) {
      const dynKey = manifest[dyn] ? dyn : byFileKey.get(dyn);
      if (!dynKey) continue;
      if (spec.deferredComponentPrefix && !dynKey.startsWith(spec.deferredComponentPrefix)) {
        continue;
      }
      for (const k of resolveStaticClosureKeys(dynKey)) {
        if (!shellStaticSet.has(k) && !routeStaticKeys.includes(k)) {
          deferredKeys.add(k);
        }
      }
    }
    const deferredAssets = inspectClosureAssets([...deferredKeys].sort(), {
      includeEcosystemImages: false,
    });
    const deferredJsBytes = deferredAssets.jsFiles.reduce((sum, f) => sum + fileSizeBytes(f), 0);
    const deferredImageBytes = deferredAssets.chunkPublicImages
      .filter((img) => !shellImageSet.has(img) && !routeSpecificImageSet.has(img))
      .reduce((sum, img) => sum + fileSizeBytes(img), 0);

    const routeViolationStart = violations.length;

    const familyBudget = routeFamilyBudgets[spec.family] ?? routeFamilyBudgets.content;
    if (hasSpaShell) {
      checkBudgetLimits(
        `${spec.route} (route-specific)`,
        {
          jsBytes: routeSpecificJsBytes,
          cssBytes: routeSpecificCssBytes,
          dataBytes: routeSpecificDataBytes,
          fontBytes: routeSpecificFontBytes,
          imageBytes: routeSpecificImageBytes,
          totalBytes: routeSpecificTotalBytes,
        },
        familyBudget.routeSpecific,
        true,
        violations,
      );
      checkBudgetLimits(
        spec.route,
        {
          jsBytes: totalJsBytes,
          cssBytes: totalCssBytes,
          dataBytes: totalDataBytes,
          fontBytes: totalFontBytes,
          imageBytes: totalImageBytes,
          totalBytes: totalTransferBytes,
          preloadedFontBytes: sharedShell.preloadedFontBytes,
        },
        familyBudget.total,
        false,
        violations,
      );
    } else {
      checkBudgetLimits(
        spec.route,
        {
          jsBytes: totalJsBytes,
          cssBytes: totalCssBytes,
          dataBytes: totalDataBytes,
          fontBytes: totalFontBytes,
          imageBytes: totalImageBytes,
          totalBytes: totalTransferBytes,
          preloadedFontBytes: sharedShell.preloadedFontBytes,
        },
        {
          cssKB: familyBudget.total.cssKB,
          dataKB: familyBudget.total.dataKB,
          fontKB: familyBudget.total.fontKB,
          imageKB: familyBudget.total.imageKB,
        },
        false,
        violations,
      );
    }

    const allowedSdks = new Set(spec.allowedSdks ?? []);
    const hasChunkModulesData = Object.keys(chunkModules).length > 0;
    for (const sdk of routeFullAssets.sdks) {
      if (
        !hasChunkModulesData &&
        spec.entryKey === 'src/pages/Stellar.tsx' &&
        sdk === 'wraith-sdk' &&
        !routeFullAssets.sdks.includes('stellar-sdk')
      ) {
        continue;
      }
      if (!allowedSdks.has(sdk)) {
        violations.push({
          scope: spec.route,
          kind: 'unused-sdk',
          sdk,
          message: `${spec.route} (${spec.entryKey}) eagerly imports unused chain SDK "${sdk}"`,
        });
      }
    }

    for (const forbiddenDynSdk of spec.forbiddenDynamicSdks ?? []) {
      if (deferredAssets.sdks.includes(forbiddenDynSdk)) {
        violations.push({
          scope: spec.route,
          kind: 'unused-sdk',
          sdk: forbiddenDynSdk,
          message: `${spec.route} (${spec.entryKey}) lazily imports forbidden chain SDK "${forbiddenDynSdk}"`,
        });
      }
    }

    const allowedCollections = new Set(spec.allowedCollections ?? []);
    for (const col of routeFullAssets.collections) {
      if (!allowedCollections.has(col)) {
        violations.push({
          scope: spec.route,
          kind: 'unused-collection',
          collection: col,
          message: `${spec.route} (${spec.entryKey}) eagerly imports unused content collection "${col}"`,
        });
      }
    }

    if (routeSignals) {
      for (const extStylesheet of routeSignals.externalStylesheets) {
        if (/fonts\.googleapis\.com/i.test(extStylesheet)) {
          violations.push({
            scope: spec.route,
            kind: 'external-font-cdn',
            message: `${spec.route} loads external font stylesheet ${extStylesheet}`,
          });
        }
      }
      for (const extFont of [
        ...routeSignals.externalFontLinks,
        ...routeCssAssetScan.externalFonts,
      ]) {
        violations.push({
          scope: spec.route,
          kind: 'external-font-cdn',
          message: `${spec.route} loads external font asset ${extFont}`,
        });
      }
    }

    routes.push({
      route: spec.route,
      family: spec.family,
      entryKey: spec.entryKey,
      passed: violations.length === routeViolationStart,
      sharedShell: {
        jsBytes: sharedShell.jsBytes,
        cssBytes: sharedShell.cssBytes,
        dataBytes: sharedShell.dataBytes,
        fontBytes: sharedShell.fontBytes,
        imageBytes: sharedShell.imageBytes,
        totalBytes: sharedShell.totalBytes,
      },
      routeSpecific: {
        jsBytes: toRoundedMetric(routeSpecificJsBytes),
        cssBytes: toRoundedMetric(routeSpecificCssBytes),
        dataBytes: toRoundedMetric(routeSpecificDataBytes),
        bundledDataBytes: toRoundedMetric(routeSpecificBundledDataBytes),
        externalDataBytes: toRoundedMetric(routeSpecificExternalDataBytes),
        fontBytes: toRoundedMetric(routeSpecificFontBytes),
        imageBytes: toRoundedMetric(routeSpecificImageBytes),
        totalBytes: toRoundedMetric(routeSpecificTotalBytes),
        jsChunks: routeOnlyAssets.jsFiles,
        cssSources: [...new Set(routeSpecificCssSources)].sort(),
        dataSources: [
          ...routeOnlyAssets.bundledDataDetails.map((d) => d.module),
          ...routeSpecificExternalDataSources,
        ].sort(),
        fontSources: routeSpecificFontSources,
        imageSources: routeSpecificImageSources,
      },
      total: {
        jsBytes: toRoundedMetric(totalJsBytes),
        cssBytes: toRoundedMetric(totalCssBytes),
        dataBytes: toRoundedMetric(totalDataBytes),
        bundledDataBytes: toRoundedMetric(totalBundledDataBytes),
        externalDataBytes: toRoundedMetric(totalExternalDataBytes),
        fontBytes: toRoundedMetric(totalFontBytes),
        imageBytes: toRoundedMetric(totalImageBytes),
        totalBytes: toRoundedMetric(totalTransferBytes),
      },
      deferred: {
        jsBytes: toRoundedMetric(deferredJsBytes),
        imageBytes: toRoundedMetric(deferredImageBytes),
        jsChunks: deferredAssets.jsFiles,
        sdks: deferredAssets.sdks,
        collections: deferredAssets.collections,
      },
      sdks: routeFullAssets.sdks,
      collections: routeFullAssets.collections,
      budgets: familyBudget,
    });
  }

  return {
    schemaVersion: 1,
    passed: violations.length === 0,
    manifestMissing: false,
    manifestPath,
    legacy: {
      checkedChunks: legacyChunks.length,
      chunks: legacyChunks,
      entryClosures: legacyEntryClosures,
    },
    sharedShell,
    routes,
    violations,
  };
}

function fmtKB(bytes) {
  return `${toKB(bytes).toFixed(1)} kB`;
}

/** Format a human-readable deterministic report from `analyzeDist()`. */
export function formatBudgetReport(report) {
  const stdoutLines = [];
  const stderrLines = [];

  if (report.manifestMissing) {
    stderrLines.push(`[chunk-budget] ${report.violations[0]?.message ?? 'Manifest missing'}`);
    return { stdout: '', stderr: stderrLines.join('\n') };
  }

  stdoutLines.push('');
  stdoutLines.push('[chunk-budget] ── Per-chunk size check ──────────────────────────────');

  for (const chunk of report.legacy.chunks) {
    if (chunk.status === 'fail') {
      if (chunk.allowlisted) {
        stderrLines.push(
          `[chunk-budget] FAIL  ${chunk.label}  ${chunk.kb.toFixed(1)} kB  ` +
            `(allowlist ceiling: ${chunk.limitKB} kB — ${chunk.reason})`,
        );
      } else {
        stderrLines.push(
          `[chunk-budget] FAIL  ${chunk.label}  ${chunk.kb.toFixed(1)} kB  (budget: ${chunk.limitKB} kB)`,
        );
      }
    } else if (chunk.status === 'allow') {
      stdoutLines.push(
        `[chunk-budget] allow ${chunk.label}  ${chunk.kb.toFixed(1)} kB  (allowlisted: ${chunk.reason.slice(0, 60)}…)`,
      );
    } else {
      stdoutLines.push(`[chunk-budget] ok    ${chunk.label}  ${chunk.kb.toFixed(1)} kB`);
    }
  }

  stdoutLines.push('');
  stdoutLines.push('[chunk-budget] ── Per-route transitive check (static imports) ───────');

  for (const closure of report.legacy.entryClosures) {
    if (!closure.passed) {
      stderrLines.push(
        `[chunk-budget] FAIL  ${closure.label}  static transitive: ${closure.kb.toFixed(1)} kB  (budget: ${ROUTE_TRANSITIVE_KB} kB)`,
      );
      stderrLines.push(
        `[chunk-budget]       chunks: ${closure.chunks.map((f) => f.replace(/^assets\//, '')).join(', ')}`,
      );
    } else {
      stdoutLines.push(
        `[chunk-budget] ok    ${closure.label}  static transitive: ${closure.kb.toFixed(1)} kB  (${closure.chunkCount} chunks)`,
      );
    }
  }

  if (report.sharedShell) {
    const shell = report.sharedShell;
    stdoutLines.push('');
    stdoutLines.push('[chunk-budget] ── Shared shell transfer breakdown ───────────────────');
    stdoutLines.push(
      `[chunk-budget] shell  JS: ${fmtKB(shell.jsBytes)} (<= ${shell.budgetsKB.jsKB} kB)` +
        `  CSS: ${fmtKB(shell.cssBytes)} (<= ${shell.budgetsKB.cssKB} kB)` +
        `  Data: ${fmtKB(shell.dataBytes)} [bundled ${fmtKB(shell.bundledDataBytes)} + ext ${fmtKB(shell.externalDataBytes)}] (<= ${shell.budgetsKB.dataKB} kB)` +
        `  Fonts: ${fmtKB(shell.fontBytes)} [preload ${fmtKB(shell.preloadedFontBytes)}] (<= ${shell.budgetsKB.fontKB} kB)` +
        `  Images: ${fmtKB(shell.imageBytes)} (<= ${shell.budgetsKB.imageKB} kB)` +
        `  Total: ${fmtKB(shell.totalBytes)} (<= ${shell.budgetsKB.totalKB} kB)`,
    );
  }

  if (report.routes.length > 0) {
    stdoutLines.push('');
    stdoutLines.push('[chunk-budget] ── Per-route transfer budgets (shell + route-specific) ──');
    for (const r of report.routes) {
      const tag = r.passed ? 'ok  ' : 'FAIL';
      const deferredParts = [];
      if (r.deferred.jsBytes > 0) deferredParts.push(`${fmtKB(r.deferred.jsBytes)} JS`);
      if (r.deferred.imageBytes > 0) deferredParts.push(`${fmtKB(r.deferred.imageBytes)} img`);
      const deferredLabel =
        deferredParts.length > 0 ? `  [deferred: ${deferredParts.join(', ')}]` : '';
      const line =
        `[chunk-budget] ${tag}  ${r.route.padEnd(32)} ` +
        `[${r.family}] ` +
        `JS: ${fmtKB(r.total.jsBytes)} (+${fmtKB(r.routeSpecific.jsBytes)})  ` +
        `CSS: ${fmtKB(r.total.cssBytes)} (+${fmtKB(r.routeSpecific.cssBytes)})  ` +
        `Data: ${fmtKB(r.total.dataBytes)} (+${fmtKB(r.routeSpecific.dataBytes)})  ` +
        `Fonts: ${fmtKB(r.total.fontBytes)} (+${fmtKB(r.routeSpecific.fontBytes)})  ` +
        `Images: ${fmtKB(r.total.imageBytes)} (+${fmtKB(r.routeSpecific.imageBytes)})  ` +
        `Total: ${fmtKB(r.total.totalBytes)} (+${fmtKB(r.routeSpecific.totalBytes)})` +
        deferredLabel;
      if (r.passed) {
        stdoutLines.push(line);
      } else {
        stderrLines.push(line);
      }
    }

    stdoutLines.push('');
    stdoutLines.push('[chunk-budget] ── Route import-boundary checks ──────────────────────');
    if (report.sharedShell) {
      const sdkLabel =
        report.sharedShell.sdks.length > 0 ? report.sharedShell.sdks.join(', ') : 'none';
      const colLabel =
        report.sharedShell.collections.length > 0
          ? report.sharedShell.collections.join(', ')
          : 'none';
      stdoutLines.push(`[chunk-budget] shell  SDKs: ${sdkLabel}  collections: ${colLabel}`);
    }
    for (const r of report.routes) {
      const sdkLabel = r.sdks.length > 0 ? r.sdks.join(', ') : 'none';
      const colLabel = r.collections.length > 0 ? r.collections.join(', ') : 'none';
      stdoutLines.push(
        `[chunk-budget] route  ${r.route.padEnd(32)} SDKs: ${sdkLabel}  collections: ${colLabel}`,
      );
    }
  }

  const extraViolations = report.violations.filter(
    (v) => v.kind !== 'chunk-budget' && v.kind !== 'route-transitive',
  );
  for (const violation of extraViolations) {
    stderrLines.push(`[chunk-budget] FAIL  ${violation.message}`);
  }

  if (!report.passed) {
    stderrLines.push(
      `\n[chunk-budget] Budget violated (${report.violations.length} failure(s)). Lazy-load heavy dependencies, trim assets, or split vendor chunks.`,
    );
    stderrLines.push(
      `[chunk-budget] Run \`pnpm build\` then inspect dist/.vite/manifest.json and dist/.vite/chunk-modules.json for the import graph.`,
    );
  } else {
    stdoutLines.push(
      `\n[chunk-budget] All ${report.legacy.checkedChunks} chunks, ${report.legacy.entryClosures.length} entry closures, and ${report.routes.length} routes are within transfer & import-boundary budgets.`,
    );
  }

  return {
    stdout: stdoutLines.join('\n'),
    stderr: stderrLines.join('\n'),
  };
}

/** Run the budget check CLI against `cwd` and return `{ exitCode, report, stdout, stderr }`. */
export function runCli(argv = process.argv.slice(2), cwd = process.cwd()) {
  const rootFlagIndex = argv.indexOf('--root');
  const rootDir =
    rootFlagIndex !== -1 && argv[rootFlagIndex + 1] ? resolve(cwd, argv[rootFlagIndex + 1]) : cwd;

  const reportFlagIndex = argv.indexOf('--report');
  const reportFile =
    reportFlagIndex !== -1 && argv[reportFlagIndex + 1]
      ? resolve(cwd, argv[reportFlagIndex + 1])
      : null;

  const jsonMode = argv.includes('--json');
  const report = analyzeDist(rootDir);

  if (reportFile) {
    mkdirSync(dirname(reportFile), { recursive: true });
    writeFileSync(reportFile, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }

  const formatted = formatBudgetReport(report);
  const stdout = jsonMode ? `${JSON.stringify(report, null, 2)}\n` : formatted.stdout;
  const stderr = formatted.stderr;

  return {
    exitCode: report.passed ? 0 : 1,
    report,
    stdout,
    stderr,
  };
}

const isMain =
  Boolean(process.argv[1]) &&
  (import.meta.url === pathToFileURL(process.argv[1]).href ||
    fileURLToPath(import.meta.url) === resolve(process.argv[1]));

if (isMain) {
  const result = runCli(process.argv.slice(2), process.cwd());
  if (result.stdout) console.log(result.stdout);
  if (result.stderr) console.error(result.stderr);
  process.exit(result.exitCode);
}
