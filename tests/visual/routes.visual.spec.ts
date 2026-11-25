import { test } from '@playwright/test';
import { buildVisualMatrix } from './route-inventory';
import {
  assertRouteVisualBaseline,
  assertZeroBrokenImagesAndOverflow,
  prepareRouteForVisualSnapshot,
} from './stabilize';

const scenarios = buildVisualMatrix({
  fullInventory: process.env.VISUAL_FULL_INVENTORY === '1',
});

test.describe('route-level visual regression across locales, themes, and viewports', () => {
  for (const scenario of scenarios) {
    const title = `${scenario.route.id} | route=${scenario.urlPath} | locale=${scenario.locale} | theme=${scenario.theme} | viewport=${scenario.viewport.name}`;

    test(title, async ({ page }, testInfo) => {
      await prepareRouteForVisualSnapshot(page, scenario);
      await assertZeroBrokenImagesAndOverflow(page, testInfo, scenario);
      await assertRouteVisualBaseline(page, testInfo, scenario);
    });
  }
});
