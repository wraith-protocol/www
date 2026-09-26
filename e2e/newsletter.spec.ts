/**
 * e2e/newsletter.spec.ts
 *
 * Acceptance criterion: zero *newsletter-specific* third-party network requests
 * on /newsletter.
 *
 * The test intercepts every request made while the page loads and asserts that
 * none of them target a cross-origin host *other than* the site's own analytics
 * (Plausible), which is loaded on every page and was already present before this
 * feature.  The criterion is that the newsletter signup itself introduces no
 * additional third-party scripts or resources.
 *
 * Allowed origins in preview mode:
 *   - localhost / 127.0.0.1 (Vite preview server)
 *   - plausible.io          (site-wide cookieless analytics, pre-existing)
 *
 * data:, blob:, and other non-HTTP schemes are ignored.
 */

import { test, expect } from '@playwright/test';

// Origins that are allowed on every page (pre-existing, not added by newsletter feature).
const SITE_WIDE_ALLOWED = new Set(['plausible.io']);

test.describe('/newsletter — zero cross-origin requests', () => {
  test('loads the /newsletter page without any newsletter-specific third-party network requests', async ({
    page,
    baseURL,
  }) => {
    const crossOriginRequests: string[] = [];

    const allowedHostnames = new Set(['localhost', '127.0.0.1', ...SITE_WIDE_ALLOWED]);

    // Extract the hostname from the base URL so the test is portable.
    if (baseURL) {
      try {
        allowedHostnames.add(new URL(baseURL).hostname);
      } catch {
        // ignore malformed baseURL
      }
    }

    // Listen to every request the page fires.
    page.on('request', (request) => {
      const url = request.url();

      // Ignore non-HTTP schemes (data:, blob:, about:, chrome-extension:, etc.)
      if (!url.startsWith('http://') && !url.startsWith('https://')) return;

      try {
        const { hostname } = new URL(url);
        if (!allowedHostnames.has(hostname)) {
          crossOriginRequests.push(url);
        }
      } catch {
        // Ignore unparseable URLs
      }
    });

    await page.goto('/newsletter', { waitUntil: 'networkidle' });

    // Assert no unexpected cross-origin requests were fired.
    expect(
      crossOriginRequests,
      `Unexpected cross-origin requests detected on /newsletter:\n${crossOriginRequests.join('\n')}`,
    ).toHaveLength(0);
  });

  test('renders the newsletter signup form with correct elements', async ({ page }) => {
    await page.goto('/newsletter');

    // Page heading is present
    await expect(page.getByRole('heading', { name: /newsletter/i, level: 1 })).toBeVisible();

    // Main page email input (not the footer widget) — identified by its id
    await expect(page.locator('#newsletter-email')).toBeVisible();

    // Submit button in the main form — scope to the section
    await expect(page.getByRole('main').getByRole('button', { name: /subscribe/i })).toBeVisible();

    // Privacy note links to /privacy
    const privacyLink = page.getByRole('main').getByRole('link', { name: /privacy policy/i });
    await expect(privacyLink).toBeVisible();
    await expect(privacyLink).toHaveAttribute('href', '/privacy');
  });

  test('shows inline validation error for an invalid email', async ({ page }) => {
    await page.goto('/newsletter');

    // Fill the main newsletter form input (not the footer widget)
    await page.locator('#newsletter-email').fill('not-an-email');
    await page
      .getByRole('main')
      .getByRole('button', { name: /subscribe/i })
      .click();

    await expect(page.getByRole('alert').first()).toBeVisible();
  });
});
