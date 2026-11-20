import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, type Locator, type Page, type Route, type TestInfo } from '@playwright/test';
import {
  APPROVED_VISUAL_BASELINE_ABS_DIR,
  type NarrowMaskRule,
  type VisualScenario,
} from './route-inventory';
import {
  capturePageRegions,
  computeChangedRegionAttribution,
  type VisualCheckReportRecord,
} from './region-diff';

export const FIXED_VISUAL_ISO_TIME = '2026-01-15T12:00:00.000Z';
export const MAX_SINGLE_MASK_VIEWPORT_RATIO = 0.08;
export const VISUAL_ANNOTATION_TYPE = 'visual-check';

const DETERMINISTIC_AVATAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="#141414"/>
  <rect x="2" y="2" width="60" height="60" fill="none" stroke="#5e5e5e" stroke-width="2"/>
  <circle cx="32" cy="26" r="10" fill="#c6c6c7"/>
  <path d="M16 54c2-10 10-15 16-15s14 5 16 15" fill="#c6c6c7"/>
</svg>`;

const ANIMATION_STABILIZATION_CSS = `
*, *::before, *::after {
  animation-duration: 0s !important;
  animation-delay: 0s !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0s !important;
  transition-delay: 0s !important;
  caret-color: transparent !important;
  scroll-behavior: auto !important;
}
html {
  scroll-behavior: auto !important;
}
[data-reveal] {
  opacity: 1 !important;
  transform: none !important;
  transition: none !important;
}
.animate-scroll,
.animate-pulse,
.animate-spin,
.animate-ping,
.animate-bounce {
  animation: none !important;
}
`;

function buildSorobanEvents(count: number): Array<{
  type: string;
  ledger: number;
  id: string;
  pagingToken: string;
  topic: string[];
  value: string;
}> {
  return Array.from({ length: count }, (_, idx) => ({
    type: 'contract',
    ledger: 1_499_900 + idx,
    id: `evt-${idx + 1}`,
    pagingToken: `cursor-${idx + 1}`,
    topic: ['announce', 'scheme', `recipient-${idx + 1}`],
    value: '0x00',
  }));
}

export async function installVisualDeterminism(
  page: Page,
  scenario: VisualScenario,
): Promise<void> {
  await page.setViewportSize({
    width: scenario.viewport.width,
    height: scenario.viewport.height,
  });

  await page.clock.setFixedTime(new Date(FIXED_VISUAL_ISO_TIME));

  await page.emulateMedia({
    colorScheme: scenario.theme,
    reducedMotion: 'reduce',
  });

  await page.addInitScript(
    ({ theme, locale }) => {
      class DeterministicPerformanceObserver {
        observe(): void {}
        disconnect(): void {}
        takeRecords(): PerformanceEntryList {
          return [];
        }
      }
      Object.defineProperty(window, 'PerformanceObserver', {
        configurable: true,
        writable: true,
        value: DeterministicPerformanceObserver,
      });

      try {
        window.localStorage.setItem('wraith-theme', theme);
        window.localStorage.setItem('wraith-locale', locale);
      } catch {
        // Storage unavailable in restricted contexts.
      }
      if (document.documentElement) {
        document.documentElement.dataset.theme = theme;
        document.documentElement.style.colorScheme = theme;
      }
    },
    { theme: scenario.theme, locale: scenario.locale },
  );

  await page.route('**/*', async (route: Route) => {
    const requestUrl = route.request().url();
    if (!requestUrl.startsWith('http://') && !requestUrl.startsWith('https://')) {
      await route.continue();
      return;
    }

    let parsed: URL;
    try {
      parsed = new URL(requestUrl);
    } catch {
      await route.abort();
      return;
    }

    const isLocalOrigin = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';

    if (isLocalOrigin) {
      if (parsed.pathname === '/api/subscribe') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true }),
        });
        return;
      }
      await route.continue();
      return;
    }

    if (parsed.hostname.includes('plausible.io')) {
      if (parsed.pathname.endsWith('.js')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/javascript',
          body: 'window.plausible = window.plausible || function() {};',
        });
      } else {
        await route.fulfill({ status: 204, body: '' });
      }
      return;
    }

    if (
      parsed.hostname.includes('soroban') ||
      parsed.hostname.includes('stellar.org') ||
      route.request().method() === 'POST'
    ) {
      const postBody = route.request().postData() ?? '';
      try {
        const rpc = JSON.parse(postBody) as {
          id?: number | string;
          method?: string;
          params?: { startLedger?: number };
        };
        if (rpc.method === 'getHealth') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: rpc.id ?? 1,
              result: {
                status: 'healthy',
                latestLedger: 1_500_000,
                oldestLedger: 1_350_000,
                ledgerRetentionWindow: 150_000,
              },
            }),
          });
          return;
        }
        if (rpc.method === 'getEvents') {
          const startLedger = rpc.params?.startLedger ?? 1_350_000;
          const eventCount = startLedger >= 1_480_000 ? 42 : startLedger >= 1_375_000 ? 184 : 420;
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: rpc.id ?? 2,
              result: {
                latestLedger: 1_500_000,
                cursor: 'deterministic-cursor',
                events: buildSorobanEvents(eventCount),
              },
            }),
          });
          return;
        }
      } catch {
        // Fall through to generic external stub.
      }
    }

    if (
      parsed.hostname === 'github.com' ||
      parsed.hostname.endsWith('.githubusercontent.com') ||
      /\.(png|jpe?g|webp|gif|svg|avif)$/i.test(parsed.pathname)
    ) {
      await route.fulfill({
        status: 200,
        contentType: 'image/svg+xml',
        body: DETERMINISTIC_AVATAR_SVG,
      });
      return;
    }

    if (parsed.hostname.includes('status.usewraith.xyz')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          label: 'All systems normal',
          tone: 'green',
          components: [
            {
              id: 'stellar-soroban',
              name: 'Stellar Soroban Gateway',
              status: 'operational',
              uptime90Days: Array.from({ length: 90 }, () => 1),
              latencyMs: 38,
            },
          ],
        }),
      });
      return;
    }

    await route.fulfill({ status: 204, body: '' });
  });
}

export async function prepareRouteForVisualSnapshot(
  page: Page,
  scenario: VisualScenario,
): Promise<void> {
  await installVisualDeterminism(page, scenario);

  const response = await page.goto(scenario.urlPath, { waitUntil: 'networkidle' });
  expect(response?.status() ?? 200).toBeLessThan(500);

  await page.addStyleTag({ content: ANIMATION_STABILIZATION_CSS });

  await page.evaluate(async (theme) => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;

    const step = Math.max(320, Math.floor(window.innerHeight * 0.75));
    const maxSteps = 40;
    for (let i = 0; i < maxSteps; i += 1) {
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const nextY = Math.min(maxScroll, (i + 1) * step);
      window.scrollTo(0, nextY);
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      if (nextY >= maxScroll) break;
    }
    window.scrollTo(0, 0);
  }, scenario.theme);

  await page.waitForLoadState('networkidle');

  await page.evaluate(async () => {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
    const images = Array.from(document.querySelectorAll('img'));
    await Promise.all(
      images.map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise<void>((resolve) => {
          img.addEventListener('load', () => resolve(), { once: true });
          img.addEventListener('error', () => resolve(), { once: true });
        });
      }),
    );
    document.querySelectorAll('svg').forEach((svg) => {
      if ('pauseAnimations' in svg && typeof svg.pauseAnimations === 'function') {
        svg.pauseAnimations();
      }
    });
    window.scrollTo(0, 0);
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  });
}

export async function resolveAndValidateNarrowMasks(
  page: Page,
  rules: readonly NarrowMaskRule[],
  viewportArea: number,
): Promise<Locator[]> {
  const masks: Locator[] = [];

  for (const rule of rules) {
    const locator = page.locator(rule.selector);
    const count = await locator.count();
    if (!rule.optional) {
      expect(
        count,
        `Required narrow mask "${rule.description}" (${rule.selector}) matched 0 elements; update selector or mark optional if environment-gated.`,
      ).toBeGreaterThan(0);
    }
    for (let i = 0; i < count; i += 1) {
      const item = locator.nth(i);
      const box = await item.boundingBox();
      if (!box || box.width <= 0 || box.height <= 0) continue;
      const ratio = (box.width * box.height) / viewportArea;
      expect(
        ratio,
        `Mask "${rule.description}" (${rule.selector}) covers ${(ratio * 100).toFixed(1)}% of viewport; dynamic masks must stay narrow (<= ${MAX_SINGLE_MASK_VIEWPORT_RATIO * 100}%).`,
      ).toBeLessThanOrEqual(MAX_SINGLE_MASK_VIEWPORT_RATIO);
      masks.push(item);
    }
  }

  return masks;
}

export async function assertZeroBrokenImagesAndOverflow(
  page: Page,
  testInfo: TestInfo,
  scenario: VisualScenario,
): Promise<void> {
  const viewportLabel =
    `${scenario.viewport.name} (${scenario.viewport.width}x${scenario.viewport.height})` as const;

  const brokenImages = await page.evaluate(() =>
    Array.from(document.querySelectorAll('img'))
      .filter((img) => {
        const style = window.getComputedStyle(img);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        return !img.complete || img.naturalWidth === 0;
      })
      .map((img) => img.getAttribute('src') ?? '<missing-src>'),
  );

  if (brokenImages.length > 0) {
    const record: VisualCheckReportRecord = {
      route: scenario.urlPath,
      routeId: scenario.route.id,
      layoutFamily: scenario.route.layoutFamily,
      locale: scenario.locale,
      theme: scenario.theme,
      viewport: viewportLabel,
      status: 'failed',
      changedRegion: `missing-images(${brokenImages.join(', ')})`,
      baselineFile: scenario.baselineFileName,
    };
    testInfo.annotations.push({
      type: VISUAL_ANNOTATION_TYPE,
      description: JSON.stringify(record),
    });
  }

  expect(
    brokenImages,
    `Broken or missing images on route=${scenario.urlPath} locale=${scenario.locale} theme=${scenario.theme} viewport=${scenario.viewport.name}: ${brokenImages.join(', ')}`,
  ).toEqual([]);

  const overflowPx = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );

  if (overflowPx > 1) {
    const record: VisualCheckReportRecord = {
      route: scenario.urlPath,
      routeId: scenario.route.id,
      layoutFamily: scenario.route.layoutFamily,
      locale: scenario.locale,
      theme: scenario.theme,
      viewport: viewportLabel,
      status: 'failed',
      changedRegion: `horizontal-overflow(+${overflowPx}px)`,
      baselineFile: scenario.baselineFileName,
    };
    testInfo.annotations.push({
      type: VISUAL_ANNOTATION_TYPE,
      description: JSON.stringify(record),
    });
  }

  expect(
    overflowPx,
    `Horizontal document overflow (${overflowPx}px) on route=${scenario.urlPath} locale=${scenario.locale} theme=${scenario.theme} viewport=${scenario.viewport.name} (${scenario.viewport.width}x${scenario.viewport.height})`,
  ).toBeLessThanOrEqual(1);
}

export async function assertRouteVisualBaseline(
  page: Page,
  testInfo: TestInfo,
  scenario: VisualScenario,
): Promise<void> {
  const viewportLabel =
    `${scenario.viewport.name} (${scenario.viewport.width}x${scenario.viewport.height})` as const;
  const viewportArea = scenario.viewport.width * scenario.viewport.height;
  const masks = await resolveAndValidateNarrowMasks(page, scenario.route.narrowMasks, viewportArea);
  const regions = await capturePageRegions(page, scenario.route.regionHints);

  try {
    await expect(page).toHaveScreenshot(scenario.baselineFileName, {
      fullPage: true,
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
      mask: masks,
      maskColor: '#767575',
      threshold: 0.1,
      maxDiffPixels: 64,
    });

    const record: VisualCheckReportRecord = {
      route: scenario.urlPath,
      routeId: scenario.route.id,
      layoutFamily: scenario.route.layoutFamily,
      locale: scenario.locale,
      theme: scenario.theme,
      viewport: viewportLabel,
      status: 'passed',
      changedRegion: 'none',
      baselineFile: scenario.baselineFileName,
    };
    testInfo.annotations.push({
      type: VISUAL_ANNOTATION_TYPE,
      description: JSON.stringify(record),
    });
  } catch (error) {
    let changedRegion = 'missing-or-updated-baseline';
    let diffPixelCount: number | undefined;
    const baselinePath = join(APPROVED_VISUAL_BASELINE_ABS_DIR, scenario.baselineFileName);

    if (existsSync(baselinePath)) {
      try {
        const expectedBuffer = readFileSync(baselinePath);
        const actualBuffer = await page.screenshot({
          fullPage: true,
          animations: 'disabled',
          caret: 'hide',
          scale: 'css',
          mask: masks,
          maskColor: '#767575',
        });
        const attribution = computeChangedRegionAttribution(expectedBuffer, actualBuffer, regions);
        changedRegion = attribution.changedRegion;
        diffPixelCount = attribution.diffPixelCount;
      } catch {
        changedRegion = 'unclassified-diff-region';
      }
    }

    const record: VisualCheckReportRecord = {
      route: scenario.urlPath,
      routeId: scenario.route.id,
      layoutFamily: scenario.route.layoutFamily,
      locale: scenario.locale,
      theme: scenario.theme,
      viewport: viewportLabel,
      status: 'failed',
      changedRegion,
      baselineFile: scenario.baselineFileName,
      ...(diffPixelCount !== undefined ? { diffPixelCount } : {}),
    };

    testInfo.annotations.push({
      type: VISUAL_ANNOTATION_TYPE,
      description: JSON.stringify(record),
    });

    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Visual regression failed [route=${scenario.urlPath} | locale=${scenario.locale} | theme=${scenario.theme} | viewport=${viewportLabel} | changedRegion=${changedRegion}]\n${detail}`,
    );
  }
}
