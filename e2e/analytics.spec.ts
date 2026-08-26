/**
 * e2e/analytics.spec.ts
 *
 * Acceptance tests for the first-party analytics instrumentation. We intercept
 * the real Plausible event endpoint at the network boundary (not just spy on
 * `track()`) so the DNT test can verify that ZERO analytics requests are made.
 *
 * The real Plausible CDN script is blocked and replaced by a local probe that
 * forwards `window.plausible()` calls to the same event endpoint, so requests
 * are deterministic and interceptable in CI.
 */

import { test, expect, type Page, type Route } from '@playwright/test';

const ANALYTICS_ENDPOINT = '**/api/event**';
const PLAUSIBLE_SCRIPT = '**/plausible.io/js/**';

type PlausibleEvent = { name: string; props?: Record<string, unknown> };

async function setupAnalyticsProbe(page: Page): Promise<PlausibleEvent[]> {
  const events: PlausibleEvent[] = [];

  // Block the real CDN script so it can't overwrite our probe.
  await page.route(PLAUSIBLE_SCRIPT, (route: Route) => route.abort());

  // Capture every analytics request at the network boundary.
  await page.route(ANALYTICS_ENDPOINT, (route: Route) => {
    const body = route.request().postData();
    if (body) {
      try {
        events.push(JSON.parse(body) as PlausibleEvent);
      } catch {
        // ignore non-JSON payloads
      }
    }
    return route.fulfill({ status: 204 });
  });

  // Install a probe that mirrors the Plausible call shape.
  await page.addInitScript(() => {
    (window as unknown as { plausible: unknown }).plausible = function (
      name: string,
      opts?: { props?: Record<string, unknown> },
    ) {
      const payload = JSON.stringify({
        name,
        domain: location.hostname,
        props: opts?.props ?? {},
      });
      fetch('https://plausible.io/api/event', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: payload,
        keepalive: true,
      }).catch(() => {});
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
    // Keep the click on-page (no external navigation) so the event is captured.
    await page.route('**/console.usewraith.xyz/**', (route: Route) => route.abort());
    await page.goto('/');

    // Scope to the CtaStrip section so we hit the CTA (not the header nav link,
    // which is instrumented as outbound_click).
    const ctaStrip = page.locator('section', { hasText: 'Start shipping private payments' });
    const cta = ctaStrip.getByRole('link', { name: /get api keys/i }).first();
    await cta.waitFor();
    await cta.click();
    await page.waitForTimeout(200);

    const ctaEvents = events.filter((e) => e.name === 'cta_click');
    expect(ctaEvents).toHaveLength(1);
    expect(ctaEvents[0]?.props?.source).toBe('ctastrip-console');
  });

  test('newsletter success emits exactly one newsletter_submit (no confirm)', async ({
    page,
  }) => {
    const events = await setupAnalyticsProbe(page);
    // Simulate a successful backend response.
    await page.route('**/api/subscribe', (route: Route) =>
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      }),
    );
    await page.goto('/newsletter');

    await page.locator('#newsletter-email').fill('reader@example.com');
    await page.getByRole('main').getByRole('button', { name: /subscribe/i }).click();
    await page.waitForTimeout(300);

    const submits = events.filter((e) => e.name === 'newsletter_submit');
    const confirms = events.filter((e) => e.name === 'newsletter_confirm');
    expect(submits).toHaveLength(1);
    expect(confirms).toHaveLength(0);
  });

  test('blog_post_read fires once at/after 80% scroll', async ({ page }) => {
    const events = await setupAnalyticsProbe(page);
    await page.goto('/blog/wave-7-kickoff');
    await page.waitForTimeout(500);
    console.log('DEBUG blog title:', await page.title());
    console.log('DEBUG blog h1 count:', await page.locator('h1').count());
    console.log('DEBUG blog body:', (await page.locator('body').innerText()).slice(0, 300));
    await page.getByRole('heading', { level: 1 }).first().waitFor();

    // Scroll to 40% first (instant, bypassing smooth-scroll) — must not have fired yet.
    await page.evaluate(() =>
      window.scrollTo({ top: document.body.scrollHeight * 0.4, behavior: 'instant' }),
    );
    await page.waitForTimeout(150);
    expect(events.filter((e) => e.name === 'blog_post_read')).toHaveLength(0);

    // Scroll to the bottom — must fire exactly once.
    await page.evaluate(() =>
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }),
    );
    await page.waitForTimeout(250);
    expect(events.filter((e) => e.name === 'blog_post_read')).toHaveLength(1);

    // Scroll further — still exactly one.
    await page.evaluate(() =>
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }),
    );
    await page.waitForTimeout(250);
    expect(events.filter((e) => e.name === 'blog_post_read')).toHaveLength(1);
  });

  test('outbound click emits exactly one outbound_click with category', async ({ page }) => {
    const events = await setupAnalyticsProbe(page);
    await page.goto('/');

    const github = page.getByRole('link', { name: /github/i }).first();
    await github.click();
    await page.waitForTimeout(200);

    const outbound = events.filter((e) => e.name === 'outbound_click');
    expect(outbound).toHaveLength(1);
    expect(outbound[0]?.props?.category).toBe('github');
  });

  test('DNT enabled => zero analytics network requests', async ({ page }) => {
    await enableDNT(page);
    const requests: string[] = [];
    await page.route(PLAUSIBLE_SCRIPT, (route: Route) => route.abort());
    await page.route(ANALYTICS_ENDPOINT, (route: Route) => {
      requests.push(route.request().url());
      return route.fulfill({ status: 204 });
    });
    await page.addInitScript(() => {
      (window as unknown as { plausible: unknown }).plausible = function (
        name: string,
        opts?: { props?: Record<string, unknown> },
      ) {
        fetch('https://plausible.io/api/event', {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ name, domain: location.hostname, props: opts?.props ?? {} }),
          keepalive: true,
        }).catch(() => {});
      };
    });

    await page.goto('/');
    await page.getByRole('link', { name: /github/i }).first().click().catch(() => {});
    await page.goto('/newsletter');
    await page.locator('#newsletter-email').fill('reader@example.com');
    await page.getByRole('main').getByRole('button', { name: /subscribe/i }).click().catch(() => {});
    await page.waitForTimeout(300);

    expect(requests).toHaveLength(0);
  });
});
