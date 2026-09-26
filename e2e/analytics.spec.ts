/**
 * Acceptance tests for the first-party analytics instrumentation.
 *
 * The real Plausible CDN script is blocked and replaced with a deterministic
 * local probe so event requests can be asserted at the network boundary.
 */

import { test, expect, type Page, type Route } from '@playwright/test';

const ANALYTICS_ENDPOINT = '**/api/event**';
const PLAUSIBLE_SCRIPT = '**/plausible.io/js/**';

type PlausibleEvent = { name: string; props?: Record<string, unknown> };

async function setupAnalyticsProbe(page: Page): Promise<PlausibleEvent[]> {
  const events: PlausibleEvent[] = [];

  await page.route(PLAUSIBLE_SCRIPT, (route: Route) => route.abort());
  await page.route(ANALYTICS_ENDPOINT, (route: Route) => {
    const body = route.request().postData();
    if (body) {
      try {
        events.push(JSON.parse(body) as PlausibleEvent);
      } catch {
        // Ignore non-JSON payloads from unrelated requests.
      }
    }
    return route.fulfill({ status: 204 });
  });

  await page.addInitScript(() => {
    (window as unknown as { plausible: unknown }).plausible = function (
      name: string,
      opts?: { props?: Record<string, unknown> },
    ) {
      void fetch('https://plausible.io/api/event', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          name,
          domain: location.hostname,
          props: opts?.props ?? {},
        }),
        keepalive: true,
      });
    };
  });

  return events;
}

async function enableDNT(page: Page): Promise<void> {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'doNotTrack', {
      configurable: true,
      get: () => '1',
    });
  });
}

test.describe('first-party analytics', () => {
  test('CTA click emits exactly one cta_click', async ({ page }) => {
    const events = await setupAnalyticsProbe(page);
    await page.route('**/console.usewraith.xyz/**', (route: Route) => route.abort());
    await page.goto('/');

    const ctaStrip = page.locator('section', { hasText: 'Start shipping private payments' });
    const cta = ctaStrip.getByRole('link', { name: /get api keys/i }).first();
    await cta.waitFor();
    await cta.click();
    await expect.poll(() => events.filter((event) => event.name === 'cta_click').length).toBe(1);

    const ctaEvents = events.filter((event) => event.name === 'cta_click');
    expect(ctaEvents[0]?.props?.source).toBe('ctastrip-console');
  });

  test('newsletter success emits exactly one newsletter_submit and no confirm', async ({
    page,
  }) => {
    const events = await setupAnalyticsProbe(page);
    await page.route('**/api/subscribe', (route: Route) =>
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      }),
    );
    await page.goto('/newsletter');

    await page.locator('#newsletter-email').fill('reader@example.com');
    const submit = page.getByRole('main').getByRole('button', { name: /subscribe/i });
    await submit.click();
    await expect
      .poll(() => events.filter((event) => event.name === 'newsletter_submit').length)
      .toBe(1);

    await expect(submit).toBeHidden();
    await page.waitForTimeout(100);

    expect(events.filter((event) => event.name === 'newsletter_submit')).toHaveLength(1);
    expect(events.filter((event) => event.name === 'newsletter_confirm')).toHaveLength(0);
  });

  test('blog_post_read fires once at/after 80% scroll', async ({ page }) => {
    const events = await setupAnalyticsProbe(page);
    await page.goto('/blog/wave-7-kickoff');
    await page.getByRole('heading', { level: 1 }).first().waitFor();

    await page.evaluate(() =>
      window.scrollTo({ top: document.documentElement.scrollHeight * 0.4, behavior: 'instant' }),
    );
    await page.waitForTimeout(100);
    expect(events.filter((event) => event.name === 'blog_post_read')).toHaveLength(0);

    await page.evaluate(() =>
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }),
    );
    await expect
      .poll(() => events.filter((event) => event.name === 'blog_post_read').length)
      .toBe(1);

    await page.evaluate(() =>
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }),
    );
    await page.waitForTimeout(100);
    expect(events.filter((event) => event.name === 'blog_post_read')).toHaveLength(1);
  });

  test('calculator share emits exactly one calculator_share after a successful copy', async ({
    page,
  }) => {
    const events = await setupAnalyticsProbe(page);
    await page.goto('/use-cases/calculator');

    await page.getByRole('button', { name: /copy scenario link/i }).click();
    await expect(page.getByText(/scenario link copied/i)).toBeVisible();
    await expect
      .poll(() => events.filter((event) => event.name === 'calculator_share').length)
      .toBe(1);

    const shares = events.filter((event) => event.name === 'calculator_share');
    expect(shares[0]?.props?.source).toBe('cost-calculator');
  });

  test('outbound click emits exactly one outbound_click with category', async ({ page }) => {
    const events = await setupAnalyticsProbe(page);
    await page.goto('/');

    const github = page.getByRole('link', { name: /github/i }).first();
    await github.click();
    await expect
      .poll(() => events.filter((event) => event.name === 'outbound_click').length)
      .toBe(1);

    const outbound = events.filter((event) => event.name === 'outbound_click');
    expect(outbound[0]?.props?.category).toBe('github');
  });

  test('DNT enabled => zero Plausible script and analytics requests', async ({ page }) => {
    await enableDNT(page);
    const analyticsRequests: string[] = [];
    const scriptRequests: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('plausible.io/js/')) scriptRequests.push(url);
      if (url.includes('/api/event')) analyticsRequests.push(url);
    });

    await page.goto('/');
    await page
      .getByRole('link', { name: /github/i })
      .first()
      .click()
      .catch(() => {});
    await page.goto('/newsletter');
    await page.locator('#newsletter-email').fill('reader@example.com');
    await page
      .getByRole('main')
      .getByRole('button', { name: /subscribe/i })
      .click()
      .catch(() => {});
    await page.goto('/use-cases/calculator');
    await page
      .getByRole('button', { name: /copy scenario link/i })
      .click()
      .catch(() => {});
    await page.waitForTimeout(200);

    expect(scriptRequests).toHaveLength(0);
    expect(analyticsRequests).toHaveLength(0);
  });
});
