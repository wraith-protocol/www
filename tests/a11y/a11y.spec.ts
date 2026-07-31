import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const pages = [
  { path: '/', name: 'homepage' },
  { path: '/faq', name: 'FAQ' },
  { path: '/roadmap', name: 'roadmap' },
  { path: '/privacy', name: 'privacy policy' },
  { path: '/use-cases', name: 'use cases' },
  { path: '/stellar', name: 'Stellar page' },
  { path: '/case-studies', name: 'case studies list' },
  { path: '/case-studies/payroll-processor', name: 'case study detail' },
  { path: '/nonexistent-page', name: '404 not found' },
];

for (const { path, name } of pages) {
  test(`has zero critical/serious axe violations on ${name}`, async ({ page }) => {
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
  const pagesWithSkipLink = ['/', '/use-cases', '/roadmap'];

  for (const path of pagesWithSkipLink) {
    await page.goto(path);
    const skipLink = page.locator('.skip-link');
    await expect(skipLink).toBeVisible();
  }
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
