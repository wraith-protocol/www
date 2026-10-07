import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Production route matrix. This is the single source of truth for the
// Lighthouse + accessibility CI coverage. Every route listed here is
// exercised by the axe scans below and is expected to be covered by
// the Lighthouse matrix in the CI workflow.
const routeMatrix = [
  // Marketing / top-level
  { path: '/', name: 'homepage' },
  { path: '/faq', name: 'FAQ' },
  { path: '/roadmap', name: 'roadmap' },
  { path: '/privacy', name: 'privacy policy' },
  { path: '/terms', name: 'terms of service' },
  { path: '/status', name: 'status page' },

  // Use cases
  { path: '/use-cases', name: 'use cases' },
  { path: '/use-cases/calculator', name: 'payment cost calculator' },

  // Stellar
  { path: '/stellar', name: 'Stellar page' },

  // Grants
  { path: '/grants', name: 'grants list' },

  // Blog
  { path: '/blog', name: 'blog list' },

  // Case studies
  { path: '/case-studies', name: 'case studies list' },
  { path: '/case-studies/payroll-processor', name: 'case study detail' },

  // Localized routes
  { path: '/es', name: 'homepage (ES)' },

  // 404
  { path: '/nonexistent-page', name: '404 not found' },
] as const;

for (const { path, name } of routeMatrix) {
  test(`${name} (${path}) has zero critical/serious axe violations`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState('domcontentloaded');

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
