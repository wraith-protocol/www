import { deflateSync } from 'node:zlib';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
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
  measureTranslatedLocales,
  resolveLongestTranslatedLocale,
  resolveVisualLocales,
} from './visual/route-inventory';
import {
  computeChangedRegionAttribution,
  decodePngRgba,
  formatVisualReportLine,
  type PageRegionBox,
} from './visual/region-diff';
import { buildVisualMarkdownSummary } from './visual/visual-reporter';

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
  it('covers every non-localized literal and parameterized Route pattern in src/App.tsx', () => {
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

    expect(buildLocalizedUrl('/', 'es', true)).toBe('/es');
    expect(buildLocalizedUrl('/stellar', 'es', true)).toBe('/es/stellar');
    expect(buildLocalizedUrl('/chains', 'es', false)).toBe('/chains');
    expect(buildBaselineFileName('home', 'es', 'light', 'mobile')).toBe('home-es-light-mobile.png');
  });
});

describe('changed-region attribution and visual reporting', () => {
  const regions: PageRegionBox[] = [
    { name: 'header', left: 0, top: 0, right: 80, bottom: 19 },
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

  it('identifies the exact overlapping DOM region when pixels change inside compare-table', () => {
    const baseline = encodeRgbaPng(80, 80, () => [14, 14, 14, 255]);
    const regressed = encodeRgbaPng(80, 80, (x, y) =>
      x >= 12 && x <= 28 && y >= 30 && y <= 44 ? [238, 125, 119, 255] : [14, 14, 14, 255],
    );

    const diff = computeChangedRegionAttribution(baseline, regressed, regions);
    expect(diff.changedRegion).toContain('compare-table');
    expect(diff.changedRegion).not.toContain('header');
    expect(diff.changedRegion).not.toContain('footer');
    expect(diff.diffPixelCount).toBe(17 * 15);
  });

  it('flags layout shift dimension mismatches and names affected regions in formatted reports', () => {
    const baseline = encodeRgbaPng(80, 80, () => [14, 14, 14, 255]);
    const taller = encodeRgbaPng(80, 96, () => [14, 14, 14, 255]);

    const diff = computeChangedRegionAttribution(baseline, taller, regions);
    expect(diff.dimensionMismatch).toBe(true);
    expect(diff.changedRegion).toContain('size 80x80 -> 80x96');

    const record = {
      route: '/es/stellar',
      routeId: 'stellar',
      layoutFamily: 'protocol-showcase',
      locale: 'es',
      theme: 'light' as const,
      viewport: 'mobile (390x844)' as const,
      status: 'failed' as const,
      changedRegion: diff.changedRegion,
      baselineFile: 'stellar__es__light__mobile.png',
      diffPixelCount: diff.diffPixelCount,
    };

    const line = formatVisualReportLine(record);
    expect(line).toContain('route=/es/stellar');
    expect(line).toContain('locale=es');
    expect(line).toContain('theme=light');
    expect(line).toContain('viewport=mobile (390x844)');
    expect(line).toContain('changedRegion=');

    const md = buildVisualMarkdownSummary([record]);
    expect(md).toContain('`/es/stellar`');
    expect(md).toContain('`es`');
    expect(md).toContain('`light`');
    expect(md).toContain('`mobile (390x844)`');
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
        resolve(REPO_ROOT, APPROVED_VISUAL_BASELINE_DIR, 'home__en__dark__desktop.png'),
      ),
    ).toBe(true);
    expect(
      isPathOutsideRepoOrInApprovedBaselineDir(join(tmpdir(), 'wraith-www-playwright-visual')),
    ).toBe(true);
  });
});
