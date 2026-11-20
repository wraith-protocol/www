import { execFileSync } from 'node:child_process';
import { deflateSync } from 'node:zlib';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { TestCase, TestResult } from '@playwright/test/reporter';
import { describe, expect, it } from 'vitest';
import {
  APPROVED_VISUAL_BASELINE_DIR,
  APP_ROUTE_INVENTORY,
  REPO_ROOT,
  VISUAL_THEMES,
  VISUAL_VIEWPORTS,
  buildBaselineFileName,
  buildLocalizedUrl,
  buildVisualMatrix,
  isPathOutsideRepoOrInApprovedBaselineDir,
  isVisualCliInvocation,
  measureTranslatedLocales,
  resolveLongestTranslatedLocale,
  resolveVisualLocales,
} from './visual/route-inventory';
import {
  computeChangedRegionAttribution,
  decodePngRgba,
  formatVisualReportLine,
  type PageRegionBox,
  type VisualCheckReportRecord,
} from './visual/region-diff';
import { VISUAL_ANNOTATION_TYPE } from './visual/stabilize';
import VisualRegressionReporter, { buildVisualMarkdownSummary } from './visual/visual-reporter';

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    c ^= bytes[i] ?? 0;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length, false);
  for (let i = 0; i < 4; i += 1) {
    out[4 + i] = type.charCodeAt(i);
  }
  out.set(data, 8);
  const crc = crc32(out.subarray(4, 8 + data.length));
  view.setUint32(8 + data.length, crc, false);
  return out;
}

function encodeRgbaPng(
  width: number,
  height: number,
  fillPixel: (x: number, y: number) => [number, number, number, number],
): Uint8Array {
  const ihdr = new Uint8Array(13);
  const ihdrView = new DataView(ihdr.buffer);
  ihdrView.setUint32(0, width, false);
  ihdrView.setUint32(4, height, false);
  ihdr[8] = 8;
  ihdr[9] = 6;

  const stride = width * 4;
  const raw = new Uint8Array(height * (stride + 1));
  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * (stride + 1);
    raw[rowOffset] = 0;
    for (let x = 0; x < width; x += 1) {
      const [r, g, b, a] = fillPixel(x, y);
      const px = rowOffset + 1 + x * 4;
      raw[px] = r;
      raw[px + 1] = g;
      raw[px + 2] = b;
      raw[px + 3] = a;
    }
  }

  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const cIhdr = pngChunk('IHDR', ihdr);
  const cIdat = pngChunk('IDAT', deflateSync(raw));
  const cIend = pngChunk('IEND', new Uint8Array(0));

  const out = new Uint8Array(signature.length + cIhdr.length + cIdat.length + cIend.length);
  let pos = 0;
  for (const part of [signature, cIhdr, cIdat, cIend]) {
    out.set(part, pos);
    pos += part.length;
  }
  return out;
}

describe('visual route inventory and locale selection', () => {
  it('covers every non-localized literal and parameterized Route pattern in src/App.tsx with reviewed baselines', () => {
    const appSource = readFileSync(join(REPO_ROOT, 'src', 'App.tsx'), 'utf8');
    const literalRouteMatches = [...appSource.matchAll(/path="([^"]+)"/g)]
      .map((match) => match[1] ?? '')
      .filter(Boolean);

    const inventoryPatterns = new Set(APP_ROUTE_INVENTORY.map((entry) => entry.appRoutePattern));
    for (const pattern of literalRouteMatches) {
      expect(
        inventoryPatterns.has(pattern),
        `src/App.tsx route "${pattern}" is missing from APP_ROUTE_INVENTORY`,
      ).toBe(true);
    }
    expect(APP_ROUTE_INVENTORY.every((entry) => entry.baseline)).toBe(true);
  });

  it('ensures every route either has its own baseline or maps to a valid baselined layout-family representative', () => {
    const byId = new Map(APP_ROUTE_INVENTORY.map((entry) => [entry.id, entry]));

    for (const entry of APP_ROUTE_INVENTORY) {
      if (entry.baseline) continue;
      expect(entry.baselineRepresentativeId).toBeTruthy();
      const representative = byId.get(entry.baselineRepresentativeId ?? '');
      expect(
        representative?.baseline,
        `Route "${entry.id}" points to invalid representative "${entry.baselineRepresentativeId}"`,
      ).toBe(true);
    }
  });

  it('resolves Spanish (es) as the longest translated locale from src/i18n and handles custom locale fixtures', () => {
    const ranked = measureTranslatedLocales();
    expect(ranked.length).toBeGreaterThanOrEqual(2);
    expect(resolveLongestTranslatedLocale()).toBe('es');
    expect(resolveVisualLocales()).toEqual(['en', 'es']);

    const tempI18n = mkdtempSync(join(tmpdir(), 'wraith-visual-i18n-'));
    try {
      writeFileSync(
        join(tempI18n, 'en.json'),
        JSON.stringify({ hero: { title: 'Short English' }, og: { siteTitle: 'Very'.repeat(200) } }),
        'utf8',
      );
      writeFileSync(
        join(tempI18n, 'es.json'),
        JSON.stringify({ hero: { title: 'Corto' }, og: { siteTitle: 'Largo'.repeat(200) } }),
        'utf8',
      );
      writeFileSync(
        join(tempI18n, 'de.json'),
        JSON.stringify({
          hero: { title: 'Ausfuehrliche deutsche Uebersetzung fuer den Hauptbereich' },
          og: { siteTitle: 'Kurz' },
        }),
        'utf8',
      );

      expect(resolveLongestTranslatedLocale(tempI18n)).toBe('de');
    } finally {
      rmSync(tempI18n, { recursive: true, force: true });
    }
  });

  it('builds deterministic matrix scenarios across desktop/mobile widths, dark/light themes, and en + es', () => {
    const matrix = buildVisualMatrix();
    const baselinedRoutes = APP_ROUTE_INVENTORY.filter((r) => r.baseline);
    const localizedCount = baselinedRoutes.filter((r) => r.localized).length;
    const unlocalizedCount = baselinedRoutes.length - localizedCount;

    const expectedTotal =
      (localizedCount * 2 + unlocalizedCount * 1) * VISUAL_THEMES.length * VISUAL_VIEWPORTS.length;
    expect(matrix).toHaveLength(expectedTotal);
    expect(matrix).toHaveLength(148);

    expect(buildLocalizedUrl('/', 'es', true)).toBe('/es');
    expect(buildLocalizedUrl('/stellar', 'es', true)).toBe('/es/stellar');
    expect(buildLocalizedUrl('/chains', 'es', false)).toBe('/chains');
    expect(buildBaselineFileName('home', 'es', 'light', 'mobile')).toBe('home-es-light-mobile.png');
  });

  it('detects visual-only Playwright CLI invocations without being fooled by workspace path names', () => {
    expect(isVisualCliInvocation(['test'])).toBe(false);
    expect(isVisualCliInvocation(['test', 'tests/a11y'])).toBe(false);
    expect(isVisualCliInvocation(['test', 'e2e'])).toBe(false);
    expect(isVisualCliInvocation(['test', '--project=a11y-chromium'])).toBe(false);
    expect(isVisualCliInvocation(['test', 'tests/visual', 'tests/a11y'])).toBe(false);

    expect(isVisualCliInvocation(['test', 'tests/visual'])).toBe(true);
    expect(isVisualCliInvocation(['test', 'tests/visual/routes.visual.spec.ts'])).toBe(true);
    expect(isVisualCliInvocation(['test', '--project=visual-chromium'])).toBe(true);
    expect(isVisualCliInvocation(['test', '--config=playwright.visual.config.ts'])).toBe(true);
  });
});

describe('changed-region attribution and visual reporting', () => {
  const regions: PageRegionBox[] = [
    { name: 'header', left: 0, top: 0, right: 80, bottom: 19 },
    { name: 'page-main', left: 0, top: 20, right: 80, bottom: 79 },
    { name: 'compare-table', left: 0, top: 20, right: 80, bottom: 59 },
    { name: 'footer', left: 0, top: 60, right: 80, bottom: 79 },
  ];

  it('returns changedRegion="none" for byte-identical screenshots', () => {
    const img = encodeRgbaPng(80, 80, () => [14, 14, 14, 255]);
    const decoded = decodePngRgba(img);
    expect(decoded.width).toBe(80);
    expect(decoded.height).toBe(80);

    const diff = computeChangedRegionAttribution(img, img, regions);
    expect(diff.changedRegion).toBe('none');
    expect(diff.diffPixelCount).toBe(0);
    expect(diff.boundingBox).toBeNull();
  });

  it('identifies the exact overlapping DOM region when pixels change inside compare-table and prunes broad wrappers', () => {
    const baseline = encodeRgbaPng(80, 80, () => [14, 14, 14, 255]);
    const regressed = encodeRgbaPng(80, 80, (x, y) =>
      x >= 12 && x <= 28 && y >= 30 && y <= 44 ? [238, 125, 119, 255] : [14, 14, 14, 255],
    );

    const diff = computeChangedRegionAttribution(baseline, regressed, regions);
    expect(diff.changedRegion).toContain('compare-table');
    expect(diff.changedRegion).not.toContain('page-main');
    expect(diff.changedRegion).not.toContain('header');
    expect(diff.changedRegion).not.toContain('footer');
    expect(diff.diffPixelCount).toBe(17 * 15);
  });

  it('attributes vertical layout shift to the origin region rather than blaming shifted downstream sections', () => {
    const baseline = encodeRgbaPng(80, 80, (_x, y) =>
      y >= 62 && y <= 66 ? [200, 200, 200, 255] : [14, 14, 14, 255],
    );
    // A cell inside compare-table (y=34..39) grows by +8px, pushing the footer band (y=62..66 -> y=70..74) down.
    const shifted = encodeRgbaPng(80, 88, (_x, y) => {
      if (y >= 34 && y <= 39) return [238, 125, 119, 255];
      if (y >= 70 && y <= 74) return [200, 200, 200, 255];
      return [14, 14, 14, 255];
    });

    const diff = computeChangedRegionAttribution(baseline, shifted, regions);
    expect(diff.dimensionMismatch).toBe(true);
    expect(diff.changedRegion).toContain('compare-table');
    expect(diff.changedRegion).not.toContain('footer');
    expect(diff.changedRegion).not.toContain('page-main');
    expect(diff.changedRegion).toContain('size 80x80 -> 80x88');

    const record: VisualCheckReportRecord = {
      route: '/es/stellar',
      routeId: 'stellar',
      layoutFamily: 'protocol-showcase',
      locale: 'es',
      theme: 'light',
      viewport: 'mobile (390x844)',
      status: 'failed',
      changedRegion: diff.changedRegion,
      baselineFile: 'stellar-es-light-mobile.png',
      diffPixelCount: diff.diffPixelCount,
    };

    const line = formatVisualReportLine(record);
    expect(line).toContain('route=/es/stellar');
    expect(line).toContain('locale=es');
    expect(line).toContain('theme=light');
    expect(line).toContain('viewport=mobile (390x844)');
    expect(line).toContain('changedRegion=compare-table');

    const md = buildVisualMarkdownSummary([record]);
    expect(md).toContain('`/es/stellar`');
    expect(md).toContain('`es`');
    expect(md).toContain('`light`');
    expect(md).toContain('`mobile (390x844)`');
  });

  it('deduplicates retried test attempts in VisualRegressionReporter so CI retries are never double-counted', () => {
    const reporter = new VisualRegressionReporter();
    const fakeTest = {
      id: 'scenario-home-es-dark-mobile',
      title: 'home | route=/es | locale=es | theme=dark | viewport=mobile',
      retries: 1,
      titlePath: () => ['visual', 'home'],
    } as unknown as TestCase;

    const failedAttempt: VisualCheckReportRecord = {
      route: '/es',
      routeId: 'home',
      layoutFamily: 'landing-home',
      locale: 'es',
      theme: 'dark',
      viewport: 'mobile (390x844)',
      status: 'failed',
      changedRegion: 'compare-table (x=10..90, y=400..440)',
      baselineFile: 'home-es-dark-mobile.png',
    };
    const passedRetry: VisualCheckReportRecord = {
      ...failedAttempt,
      status: 'passed',
      changedRegion: 'none',
    };

    reporter.onTestEnd(fakeTest, {
      retry: 0,
      status: 'failed',
      annotations: [{ type: VISUAL_ANNOTATION_TYPE, description: JSON.stringify(failedAttempt) }],
    } as unknown as TestResult);
    reporter.onTestEnd(fakeTest, {
      retry: 1,
      status: 'passed',
      annotations: [{ type: VISUAL_ANNOTATION_TYPE, description: JSON.stringify(passedRetry) }],
    } as unknown as TestResult);

    const records = reporter.getRecords();
    expect(records).toHaveLength(1);
    expect(records[0]?.status).toBe('passed');
    expect(records[0]?.changedRegion).toBe('none');
  });

  it('rejects malformed PNG buffers cleanly', () => {
    expect(() => decodePngRgba(new Uint8Array([1, 2, 3]))).toThrow(/Invalid PNG/);
  });
});

describe('runtime report boundary guard', () => {
  it('blocks Playwright runtime directories inside the repository while allowing OS temp and approved baselines', () => {
    expect(isPathOutsideRepoOrInApprovedBaselineDir(join(REPO_ROOT, 'playwright-report'))).toBe(
      false,
    );
    expect(
      isPathOutsideRepoOrInApprovedBaselineDir(join(REPO_ROOT, 'test-results', '.last-run.json')),
    ).toBe(false);
    expect(isPathOutsideRepoOrInApprovedBaselineDir(join(REPO_ROOT, 'visual-report.json'))).toBe(
      false,
    );
    expect(
      isPathOutsideRepoOrInApprovedBaselineDir(
        resolve(REPO_ROOT, APPROVED_VISUAL_BASELINE_DIR, 'home-en-dark-desktop.png'),
      ),
    ).toBe(true);
    expect(
      isPathOutsideRepoOrInApprovedBaselineDir(join(tmpdir(), 'wraith-www-playwright-visual')),
    ).toBe(true);
  });

  it('detects tracked runtime reports and unapproved screenshot directories via git pathspecs', () => {
    const tempRepo = mkdtempSync(join(tmpdir(), 'wraith-visual-git-gate-'));
    try {
      execFileSync('git', ['init', '-q'], { cwd: tempRepo });
      mkdirSync(join(tempRepo, 'tests', 'visual', '__screenshots__'), { recursive: true });
      mkdirSync(join(tempRepo, 'sub', 'playwright-report'), { recursive: true });
      mkdirSync(join(tempRepo, 'e2e', '__screenshots__'), { recursive: true });
      writeFileSync(join(tempRepo, 'tests', 'visual', '__screenshots__', 'ok.png'), 'ok');
      writeFileSync(join(tempRepo, 'sub', 'playwright-report', 'index.html'), 'bad');
      writeFileSync(join(tempRepo, 'e2e', '__screenshots__', 'leak.png'), 'bad');
      execFileSync('git', ['add', '-f', '.'], { cwd: tempRepo });

      const trackedReports = execFileSync(
        'git',
        [
          'ls-files',
          ':(glob)**/playwright-report/**',
          ':(glob)**/test-results/**',
          ':(glob)**/blob-report/**',
        ],
        { cwd: tempRepo, encoding: 'utf8' },
      ).trim();
      expect(trackedReports).toBe('sub/playwright-report/index.html');

      const snapshots = execFileSync(
        'git',
        ['ls-files', ':(glob)**/__screenshots__/**', ':(glob)**/*-snapshots/**'],
        { cwd: tempRepo, encoding: 'utf8' },
      )
        .trim()
        .split('\n')
        .filter((line) => line && !line.startsWith('tests/visual/__screenshots__/'));
      expect(snapshots).toEqual(['e2e/__screenshots__/leak.png']);
    } finally {
      rmSync(tempRepo, { recursive: true, force: true });
    }
  });
});
