import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..', '..');

/**
 * Load the a11y route list from the pre-generated routes snapshot.
 * The snapshot is written by `scripts/gen-routes-snapshot.ts` as part of
 * `pnpm build`, so it is always present when Playwright runs against a build.
 */
function loadA11yRoutes(): Array<{ path: string; label: string }> {
  const snapshotPath = join(rootDir, 'scripts', 'routes-snapshot.json');
  try {
    const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8'));
    if (Array.isArray(snapshot.a11yRoutes)) {
      return snapshot.a11yRoutes;
    }
  } catch {
    // fall through to inline fallback
  }
  // Inline fallback so the suite can still run without a build
  return [
    { path: '/', label: 'homepage' },
    { path: '/faq', label: 'FAQ' },
    { path: '/stellar', label: 'Stellar page' },
    { path: '/nonexistent-page', label: '404 not found' },
  ];
}

const pages = loadA11yRoutes();

for (const { path, name } of pages.map((p) => ({ path: p.path, name: p.label }))) {
  test(`has zero critical/serious axe violations on ${name}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState('domcontentloaded');
    // Wait for the page <title> to be populated by Helmet before running axe,
    // so document-title violations are not triggered by lazy-load timing.
    await page.waitForFunction(() => document.title.length > 0, { timeout: 5_000 }).catch(() => {});

    const results = await new AxeBuilder({ page }).analyze();
    const critical = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );

    expect(critical).toEqual([]);
  });
}

test('keyboard navigation works on homepage', async ({ page }) => {
  // Set mobile viewport so the hamburger menu button is visible
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');

  // Use aria-controls which is stable regardless of open/closed state
  const menuButton = page.locator('button[aria-controls="mobile-menu"]');
  await expect(menuButton).toBeVisible();
  await expect(menuButton).toHaveAttribute('aria-expanded', 'false');

  await menuButton.click();
  await expect(menuButton).toHaveAttribute('aria-expanded', 'true');

  await page.keyboard.press('Escape');
  await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
  await expect(menuButton).toBeFocused();
});

test('skip link is present on pages that use it', async ({ page }) => {
  const pagesWithSkipLink = ['/', '/use-cases', '/use-cases/calculator', '/roadmap'];

  for (const path of pagesWithSkipLink) {
    await page.goto(path);
    const skipLink = page.locator('.skip-link');
    await expect(skipLink).toBeVisible();
  }
});

test('cost calculator is fully keyboard operable', async ({ page }) => {
  await page.goto('/use-cases/calculator?chain=stellar&payments=1000&avg=100');

  const chain = page.getByLabel('Chain');
  await chain.focus();
  await expect(chain).toBeFocused();

  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Payments per month')).toBeFocused();

  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Average payment value (USD)')).toBeFocused();

  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Copy scenario link' })).toBeFocused();

  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Reset' })).toBeFocused();
});

test('reduced-motion preference is respected', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  const revealElements = page.locator('[data-reveal]');
  const count = await revealElements.count();

  for (let i = 0; i < count; i++) {
    const el = revealElements.nth(i);
    const opacity = await el.evaluate((node) => {
      const style = window.getComputedStyle(node);
      return style.opacity;
    });
    expect(opacity).toBe('1');
  }
});
