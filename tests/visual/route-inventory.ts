import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hasLocalizedRoute } from '../../src/utils/localizedRoutes';

const currentDir = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(currentDir, '..', '..');
export const APPROVED_VISUAL_BASELINE_DIR = 'tests/visual/__screenshots__';
export const APPROVED_VISUAL_BASELINE_ABS_DIR = resolve(REPO_ROOT, APPROVED_VISUAL_BASELINE_DIR);

export type VisualTheme = 'dark' | 'light';
export type VisualViewportName = 'desktop' | 'mobile';

export interface VisualViewport {
  readonly name: VisualViewportName;
  readonly width: number;
  readonly height: number;
}

export const VISUAL_THEMES: readonly VisualTheme[] = ['dark', 'light'] as const;

export const VISUAL_VIEWPORTS: readonly VisualViewport[] = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile', width: 390, height: 844 },
] as const;

export type LayoutFamily =
  | 'landing-home'
  | 'protocol-showcase'
  | 'program-accordion'
  | 'editorial-index'
  | 'editorial-detail'
  | 'editorial-archive'
  | 'author-profile'
  | 'card-catalog'
  | 'case-study-detail'
  | 'interactive-tool'
  | 'responsive-table'
  | 'responsive-matrix-table'
  | 'telemetry-dashboard'
  | 'status-telemetry'
  | 'standalone-form'
  | 'team-governance'
  | 'leaderboard-grid'
  | 'minimal-standalone'
  | 'standard-layout-page'
  | 'error-fallback';

export interface NarrowMaskRule {
  readonly description: string;
  readonly selector: string;
}

export interface NamedRegionHint {
  readonly name: string;
  readonly selector: string;
}

export interface RouteVisualEntry {
  readonly id: string;
  readonly appRoutePattern: string;
  readonly samplePath: string;
  readonly layoutFamily: LayoutFamily;
  readonly baseline: boolean;
  readonly baselineRepresentativeId?: string;
  readonly localized: boolean;
  readonly narrowMasks: readonly NarrowMaskRule[];
  readonly regionHints: readonly NamedRegionHint[];
}

const METADATA_ONLY_TOP_KEYS = new Set(['og', 'ogRoutes', 'ogContent', 'pageSeo']);

function collectLeafLengths(node: unknown, topKey = ''): { uiChars: number; totalChars: number } {
  if (typeof node === 'string') {
    const len = node.length;
    return {
      uiChars: METADATA_ONLY_TOP_KEYS.has(topKey) ? 0 : len,
      totalChars: len,
    };
  }
  if (Array.isArray(node)) {
    return node.reduce(
      (acc, item) => {
        const child = collectLeafLengths(item, topKey);
        return {
          uiChars: acc.uiChars + child.uiChars,
          totalChars: acc.totalChars + child.totalChars,
        };
      },
      { uiChars: 0, totalChars: 0 },
    );
  }
  if (node && typeof node === 'object') {
    return Object.entries(node as Record<string, unknown>).reduce(
      (acc, [key, value]) => {
        const effectiveTop = topKey || key;
        const child = collectLeafLengths(value, effectiveTop);
        return {
          uiChars: acc.uiChars + child.uiChars,
          totalChars: acc.totalChars + child.totalChars,
        };
      },
      { uiChars: 0, totalChars: 0 },
    );
  }
  return { uiChars: 0, totalChars: 0 };
}

export interface TranslatedLocaleLength {
  readonly locale: string;
  readonly uiChars: number;
  readonly totalChars: number;
}

export function measureTranslatedLocales(
  i18nDir = join(REPO_ROOT, 'src', 'i18n'),
): TranslatedLocaleLength[] {
  const files = readdirSync(i18nDir)
    .filter((file) => file.endsWith('.json') && file !== 'en.json' && file !== 'package.json')
    .sort();

  const stats = files.map((file) => {
    const locale = file.replace(/\.json$/, '');
    const parsed: unknown = JSON.parse(readFileSync(join(i18nDir, file), 'utf8'));
    const { uiChars, totalChars } = collectLeafLengths(parsed);
    return { locale, uiChars, totalChars };
  });

  stats.sort(
    (a, b) =>
      b.uiChars - a.uiChars || b.totalChars - a.totalChars || a.locale.localeCompare(b.locale),
  );
  return stats;
}

export function resolveLongestTranslatedLocale(i18nDir?: string): string {
  const ranked = measureTranslatedLocales(i18nDir);
  const longest = ranked[0];
  if (!longest) {
    throw new Error('No translated locale JSON files found in src/i18n');
  }
  return longest.locale;
}

export function resolveVisualLocales(i18nDir?: string): readonly [string, string] {
  return ['en', resolveLongestTranslatedLocale(i18nDir)] as const;
}

export const APP_ROUTE_INVENTORY: readonly RouteVisualEntry[] = [
  {
    id: 'home',
    appRoutePattern: '/',
    samplePath: '/',
    layoutFamily: 'landing-home',
    baseline: true,
    localized: hasLocalizedRoute('/'),
    narrowMasks: [
      {
        description: 'Live Soroban testnet payment counters in StellarMetrics',
        selector:
          'section:has(h2:has-text("Stellar testnet activity.")) span.font-heading.text-\\[32px\\]',
      },
      {
        description: 'Live uptime percentage value in TrustStrip',
        selector:
          'section[aria-label="Trust and reliability signals"] a[aria-label*="uptime"] span.font-heading.text-\\[24px\\]',
      },
    ],
    regionHints: [
      { name: 'header', selector: 'header' },
      { name: 'hero', selector: 'main > section:nth-of-type(1)' },
      { name: 'trust-strip', selector: 'section[aria-label="Trust and reliability signals"]' },
      {
        name: 'stealth-animation',
        selector: 'section[aria-label="Interactive stealth address explainer"]',
      },
      {
        name: 'stellar-metrics',
        selector: 'section:has(h2:has-text("Stellar testnet activity."))',
      },
      { name: 'compare-table', selector: 'section#compare' },
      { name: 'footer', selector: 'footer' },
    ],
  },
  {
    id: 'stellar',
    appRoutePattern: '/stellar',
    samplePath: '/stellar',
    layoutFamily: 'protocol-showcase',
    baseline: true,
    localized: hasLocalizedRoute('/stellar'),
    narrowMasks: [],
    regionHints: [
      { name: 'header', selector: 'header' },
      { name: 'stellar-hero', selector: 'main > section:nth-of-type(1)' },
      { name: 'stellar-protocol-steps', selector: 'main > section:nth-of-type(2)' },
      { name: 'stellar-deployment-table', selector: 'section:has(table)' },
      { name: 'footer', selector: 'footer' },
    ],
  },
  {
    id: 'grants',
    appRoutePattern: '/grants',
    samplePath: '/grants',
    layoutFamily: 'program-accordion',
    baseline: true,
    localized: hasLocalizedRoute('/grants'),
    narrowMasks: [],
    regionHints: [
      { name: 'header', selector: 'header' },
      { name: 'grants-hero', selector: 'main section:nth-of-type(1)' },
      { name: 'grants-current-wave', selector: 'main section:nth-of-type(2)' },
      { name: 'footer', selector: 'footer' },
    ],
  },
  {
    id: 'blog-index',
    appRoutePattern: '/blog',
    samplePath: '/blog',
    layoutFamily: 'editorial-index',
    baseline: true,
    localized: hasLocalizedRoute('/blog'),
    narrowMasks: [],
    regionHints: [
      { name: 'header', selector: 'header' },
      { name: 'blog-post-list', selector: 'main' },
      { name: 'footer', selector: 'footer' },
    ],
  },
  {
    id: 'blog-post',
    appRoutePattern: '/blog/:slug',
    samplePath: '/blog/stealth-addresses-explained',
    layoutFamily: 'editorial-detail',
    baseline: true,
    localized: hasLocalizedRoute('/blog/stealth-addresses-explained'),
    narrowMasks: [],
    regionHints: [
      { name: 'header', selector: 'header' },
      { name: 'blog-article', selector: 'main article' },
      { name: 'footer', selector: 'footer' },
    ],
  },
  {
    id: 'blog-tag',
    appRoutePattern: '/blog/tag/:tagSlug',
    samplePath: '/blog/tag/privacy',
    layoutFamily: 'editorial-archive',
    baseline: true,
    localized: hasLocalizedRoute('/blog/tag/privacy'),
    narrowMasks: [],
    regionHints: [
      { name: 'header', selector: 'header' },
      { name: 'blog-tag-archive', selector: 'main' },
      { name: 'footer', selector: 'footer' },
    ],
  },
  {
    id: 'blog-author',
    appRoutePattern: '/blog/author/:authorId',
    samplePath: '/blog/author/lena-vogt',
    layoutFamily: 'author-profile',
    baseline: true,
    localized: hasLocalizedRoute('/blog/author/lena-vogt'),
    narrowMasks: [],
    regionHints: [
      { name: 'header', selector: 'header' },
      { name: 'blog-author-profile', selector: 'main' },
      { name: 'footer', selector: 'footer' },
    ],
  },
  {
    id: 'case-studies',
    appRoutePattern: '/case-studies',
    samplePath: '/case-studies',
    layoutFamily: 'card-catalog',
    baseline: true,
    localized: hasLocalizedRoute('/case-studies'),
    narrowMasks: [],
    regionHints: [
      { name: 'header', selector: 'header' },
      { name: 'case-studies-catalog', selector: 'main' },
      { name: 'footer', selector: 'footer' },
    ],
  },
  {
    id: 'case-study-detail',
    appRoutePattern: '/case-studies/:slug',
    samplePath: '/case-studies/payroll-processor',
    layoutFamily: 'case-study-detail',
    baseline: true,
    localized: hasLocalizedRoute('/case-studies/payroll-processor'),
    narrowMasks: [],
    regionHints: [
      { name: 'header', selector: 'header' },
      { name: 'case-study-content', selector: 'main' },
      { name: 'footer', selector: 'footer' },
    ],
  },
  {
    id: 'calculator',
    appRoutePattern: '/use-cases/calculator',
    samplePath: '/use-cases/calculator',
    layoutFamily: 'interactive-tool',
    baseline: true,
    localized: hasLocalizedRoute('/use-cases/calculator'),
    narrowMasks: [],
    regionHints: [
      { name: 'header', selector: 'header' },
      { name: 'calculator-intro', selector: 'main > section:nth-of-type(1)' },
      { name: 'cost-calculator', selector: 'main > section:nth-of-type(2)' },
      { name: 'footer', selector: 'footer' },
    ],
  },
  {
    id: 'chains',
    appRoutePattern: '/chains',
    samplePath: '/chains',
    layoutFamily: 'responsive-table',
    baseline: true,
    localized: hasLocalizedRoute('/chains'),
    narrowMasks: [],
    regionHints: [
      { name: 'header', selector: 'header' },
      { name: 'chains-comparison-table', selector: 'main table' },
      { name: 'footer', selector: 'footer' },
    ],
  },
  {
    id: 'threat-model',
    appRoutePattern: '/threat-model',
    samplePath: '/threat-model',
    layoutFamily: 'responsive-matrix-table',
    baseline: true,
    localized: hasLocalizedRoute('/threat-model'),
    narrowMasks: [],
    regionHints: [
      { name: 'header', selector: 'header' },
      { name: 'threat-model-matrix', selector: 'table[aria-label="Threat model matrix"]' },
      { name: 'footer', selector: 'footer' },
    ],
  },
  {
    id: 'vitals',
    appRoutePattern: '/vitals',
    samplePath: '/vitals',
    layoutFamily: 'telemetry-dashboard',
    baseline: true,
    localized: hasLocalizedRoute('/vitals'),
    narrowMasks: [
      {
        description: 'Rolling 30-day axis date labels derived from current clock',
        selector:
          'main svg[aria-label*="trend chart"] + div > span, main div:has(> svg[aria-label*="trend chart"]) + div > span',
      },
    ],
    regionHints: [
      { name: 'header', selector: 'header' },
      { name: 'vitals-overview-cards', selector: 'main div.grid.md\\:grid-cols-3' },
      { name: 'vitals-rolling-chart', selector: 'svg[aria-label*="trend chart"]' },
      {
        name: 'vitals-conversion-events',
        selector: '[aria-label="Conversion events (trailing 30 days)"]',
      },
      { name: 'vitals-incidents', selector: '[aria-label="Incidents in the last 30 days"]' },
      { name: 'footer', selector: 'footer' },
    ],
  },
  {
    id: 'status',
    appRoutePattern: '/status',
    samplePath: '/status',
    layoutFamily: 'status-telemetry',
    baseline: true,
    localized: hasLocalizedRoute('/status'),
    narrowMasks: [
      {
        description: 'Live status poll timestamp and component latency counters',
        selector: 'main span:has-text("Updated "), main span:has-text("Latency:")',
      },
    ],
    regionHints: [
      { name: 'header', selector: 'header' },
      { name: 'status-overview', selector: 'main' },
      { name: 'footer', selector: 'footer' },
    ],
  },
  {
    id: 'newsletter',
    appRoutePattern: '/newsletter',
    samplePath: '/newsletter',
    layoutFamily: 'standalone-form',
    baseline: true,
    localized: hasLocalizedRoute('/newsletter'),
    narrowMasks: [],
    regionHints: [
      { name: 'header', selector: 'header' },
      { name: 'newsletter-signup-form', selector: 'main' },
      { name: 'footer', selector: 'footer' },
    ],
  },
  {
    id: 'governance',
    appRoutePattern: '/governance',
    samplePath: '/governance',
    layoutFamily: 'team-governance',
    baseline: true,
    localized: hasLocalizedRoute('/governance'),
    narrowMasks: [],
    regionHints: [
      { name: 'header', selector: 'header' },
      { name: 'governance-maintainers', selector: 'main section:nth-of-type(2)' },
      { name: 'footer', selector: 'footer' },
    ],
  },
  {
    id: 'contributors',
    appRoutePattern: '/contributors',
    samplePath: '/contributors',
    layoutFamily: 'leaderboard-grid',
    baseline: true,
    localized: hasLocalizedRoute('/contributors'),
    narrowMasks: [],
    regionHints: [
      { name: 'header', selector: 'header' },
      { name: 'contributors-leaderboard', selector: 'main' },
      { name: 'footer', selector: 'footer' },
    ],
  },
  {
    id: 'faq',
    appRoutePattern: '/faq',
    samplePath: '/faq',
    layoutFamily: 'minimal-standalone',
    baseline: true,
    localized: hasLocalizedRoute('/faq'),
    narrowMasks: [],
    regionHints: [
      { name: 'header', selector: 'header' },
      { name: 'faq-accordion', selector: 'main' },
      { name: 'footer', selector: 'footer' },
    ],
  },
  {
    id: 'not-found',
    appRoutePattern: '*',
    samplePath: '/404-visual-check',
    layoutFamily: 'error-fallback',
    baseline: true,
    localized: false,
    narrowMasks: [],
    regionHints: [
      { name: 'header', selector: 'header' },
      { name: 'not-found-suggestions', selector: 'section[aria-label="Suggested pages"]' },
      { name: 'footer', selector: 'footer' },
    ],
  },
  {
    id: 'privacy',
    appRoutePattern: '/privacy',
    samplePath: '/privacy',
    layoutFamily: 'minimal-standalone',
    baseline: false,
    baselineRepresentativeId: 'faq',
    localized: false,
    narrowMasks: [],
    regionHints: [],
  },
  {
    id: 'terms',
    appRoutePattern: '/terms',
    samplePath: '/terms',
    layoutFamily: 'minimal-standalone',
    baseline: false,
    baselineRepresentativeId: 'faq',
    localized: false,
    narrowMasks: [],
    regionHints: [],
  },
  {
    id: 'press',
    appRoutePattern: '/press',
    samplePath: '/press',
    layoutFamily: 'minimal-standalone',
    baseline: false,
    baselineRepresentativeId: 'faq',
    localized: false,
    narrowMasks: [],
    regionHints: [],
  },
  {
    id: 'use-cases',
    appRoutePattern: '/use-cases',
    samplePath: '/use-cases',
    layoutFamily: 'minimal-standalone',
    baseline: false,
    baselineRepresentativeId: 'calculator',
    localized: false,
    narrowMasks: [],
    regionHints: [],
  },
  {
    id: 'roadmap',
    appRoutePattern: '/roadmap',
    samplePath: '/roadmap',
    layoutFamily: 'minimal-standalone',
    baseline: false,
    baselineRepresentativeId: 'faq',
    localized: false,
    narrowMasks: [],
    regionHints: [],
  },
  {
    id: 'ecosystem',
    appRoutePattern: '/ecosystem',
    samplePath: '/ecosystem',
    layoutFamily: 'standard-layout-page',
    baseline: false,
    baselineRepresentativeId: 'stellar',
    localized: false,
    narrowMasks: [],
    regionHints: [],
  },
  {
    id: 'security',
    appRoutePattern: '/security',
    samplePath: '/security',
    layoutFamily: 'standard-layout-page',
    baseline: false,
    baselineRepresentativeId: 'governance',
    localized: false,
    narrowMasks: [],
    regionHints: [],
  },
  {
    id: 'careers',
    appRoutePattern: '/careers',
    samplePath: '/careers',
    layoutFamily: 'standard-layout-page',
    baseline: false,
    baselineRepresentativeId: 'governance',
    localized: false,
    narrowMasks: [],
    regionHints: [],
  },
  {
    id: 'about',
    appRoutePattern: '/about',
    samplePath: '/about',
    layoutFamily: 'standard-layout-page',
    baseline: false,
    baselineRepresentativeId: 'governance',
    localized: false,
    narrowMasks: [],
    regionHints: [],
  },
] as const;

export interface VisualScenario {
  readonly route: RouteVisualEntry;
  readonly locale: string;
  readonly urlPath: string;
  readonly theme: VisualTheme;
  readonly viewport: VisualViewport;
  readonly baselineFileName: string;
}

export function buildLocalizedUrl(samplePath: string, locale: string, localized: boolean): string {
  if (locale === 'en' || !localized) {
    return samplePath;
  }
  return samplePath === '/' ? `/${locale}` : `/${locale}${samplePath}`;
}

export function buildBaselineFileName(
  routeId: string,
  locale: string,
  theme: VisualTheme,
  viewportName: VisualViewportName,
): string {
  return `${routeId}-${locale}-${theme}-${viewportName}.png`;
}

export function buildVisualMatrix(options?: {
  fullInventory?: boolean;
  i18nDir?: string;
}): VisualScenario[] {
  const [englishLocale, longestTranslated] = resolveVisualLocales(options?.i18nDir);
  const selectedRoutes = options?.fullInventory
    ? APP_ROUTE_INVENTORY
    : APP_ROUTE_INVENTORY.filter((entry) => entry.baseline);

  const scenarios: VisualScenario[] = [];

  for (const route of selectedRoutes) {
    const locales = route.localized ? [englishLocale, longestTranslated] : [englishLocale];
    for (const locale of locales) {
      const urlPath = buildLocalizedUrl(route.samplePath, locale, route.localized);
      for (const theme of VISUAL_THEMES) {
        for (const viewport of VISUAL_VIEWPORTS) {
          scenarios.push({
            route,
            locale,
            urlPath,
            theme,
            viewport,
            baselineFileName: buildBaselineFileName(route.id, locale, theme, viewport.name),
          });
        }
      }
    }
  }

  return scenarios;
}

export function isPathOutsideRepoOrInApprovedBaselineDir(
  candidatePath: string,
  repoRoot = REPO_ROOT,
): boolean {
  const resolvedCandidate = resolve(candidatePath);
  const resolvedRoot = resolve(repoRoot);
  const approvedAbs = resolve(resolvedRoot, APPROVED_VISUAL_BASELINE_DIR);

  const relToRoot = relative(resolvedRoot, resolvedCandidate);
  const isInsideRepo =
    relToRoot !== '' && !relToRoot.startsWith('..') && !relToRoot.includes(`..${sep}`);

  if (!isInsideRepo && resolvedCandidate !== resolvedRoot) {
    return true;
  }

  const relToApproved = relative(approvedAbs, resolvedCandidate);
  return (
    resolvedCandidate === approvedAbs ||
    (relToApproved !== '' && !relToApproved.startsWith('..') && !relToApproved.includes(`..${sep}`))
  );
}
