# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/analytics.spec.ts >> first-party analytics >> blog_post_read fires once at/after 80% scroll
- Location: e2e/analytics.spec.ts:115:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.waitFor: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('heading', { level: 1 }).first() to be visible

```

# Test source

```ts
  22  | 
  23  |   // Block the real CDN script so it can't overwrite our probe.
  24  |   await page.route(PLAUSIBLE_SCRIPT, (route: Route) => route.abort());
  25  | 
  26  |   // Capture every analytics request at the network boundary.
  27  |   await page.route(ANALYTICS_ENDPOINT, (route: Route) => {
  28  |     const body = route.request().postData();
  29  |     if (body) {
  30  |       try {
  31  |         events.push(JSON.parse(body) as PlausibleEvent);
  32  |       } catch {
  33  |         // ignore non-JSON payloads
  34  |       }
  35  |     }
  36  |     return route.fulfill({ status: 204 });
  37  |   });
  38  | 
  39  |   // Install a probe that mirrors the Plausible call shape.
  40  |   await page.addInitScript(() => {
  41  |     (window as unknown as { plausible: unknown }).plausible = function (
  42  |       name: string,
  43  |       opts?: { props?: Record<string, unknown> },
  44  |     ) {
  45  |       const payload = JSON.stringify({
  46  |         name,
  47  |         domain: location.hostname,
  48  |         props: opts?.props ?? {},
  49  |       });
  50  |       fetch('https://plausible.io/api/event', {
  51  |         method: 'POST',
  52  |         headers: { 'Content-Type': 'text/plain' },
  53  |         body: payload,
  54  |         keepalive: true,
  55  |       }).catch(() => {});
  56  |     };
  57  |   });
  58  | 
  59  |   return events;
  60  | }
  61  | 
  62  | async function enableDNT(page: Page): Promise<void> {
  63  |   await page.addInitScript(() => {
  64  |     Object.defineProperty(navigator, 'doNotTrack', {
  65  |       configurable: true,
  66  |       get: () => '1',
  67  |     });
  68  |   });
  69  | }
  70  | 
  71  | test.describe('first-party analytics', () => {
  72  |   test('CTA click emits exactly one cta_click', async ({ page }) => {
  73  |     const events = await setupAnalyticsProbe(page);
  74  |     // Keep the click on-page (no external navigation) so the event is captured.
  75  |     await page.route('**/console.usewraith.xyz/**', (route: Route) => route.abort());
  76  |     await page.goto('/');
  77  | 
  78  |     // Scope to the CtaStrip section so we hit the CTA (not the header nav link,
  79  |     // which is instrumented as outbound_click).
  80  |     const ctaStrip = page.locator('section', { hasText: 'Start shipping private payments' });
  81  |     const cta = ctaStrip.getByRole('link', { name: /get api keys/i }).first();
  82  |     await cta.waitFor();
  83  |     await cta.click();
  84  |     await page.waitForTimeout(200);
  85  | 
  86  |     const ctaEvents = events.filter((e) => e.name === 'cta_click');
  87  |     expect(ctaEvents).toHaveLength(1);
  88  |     expect(ctaEvents[0]?.props?.source).toBe('ctastrip-console');
  89  |   });
  90  | 
  91  |   test('newsletter success emits exactly one newsletter_submit (no confirm)', async ({
  92  |     page,
  93  |   }) => {
  94  |     const events = await setupAnalyticsProbe(page);
  95  |     // Simulate a successful backend response.
  96  |     await page.route('**/api/subscribe', (route: Route) =>
  97  |       route.fulfill({
  98  |         status: 201,
  99  |         contentType: 'application/json',
  100 |         body: JSON.stringify({ ok: true }),
  101 |       }),
  102 |     );
  103 |     await page.goto('/newsletter');
  104 | 
  105 |     await page.locator('#newsletter-email').fill('reader@example.com');
  106 |     await page.getByRole('main').getByRole('button', { name: /subscribe/i }).click();
  107 |     await page.waitForTimeout(300);
  108 | 
  109 |     const submits = events.filter((e) => e.name === 'newsletter_submit');
  110 |     const confirms = events.filter((e) => e.name === 'newsletter_confirm');
  111 |     expect(submits).toHaveLength(1);
  112 |     expect(confirms).toHaveLength(0);
  113 |   });
  114 | 
  115 |   test('blog_post_read fires once at/after 80% scroll', async ({ page }) => {
  116 |     const events = await setupAnalyticsProbe(page);
  117 |     await page.goto('/blog/wave-7-kickoff');
  118 |     await page.waitForTimeout(500);
  119 |     console.log('DEBUG blog title:', await page.title());
  120 |     console.log('DEBUG blog h1 count:', await page.locator('h1').count());
  121 |     console.log('DEBUG blog body:', (await page.locator('body').innerText()).slice(0, 300));
> 122 |     await page.getByRole('heading', { level: 1 }).first().waitFor();
      |                                                           ^ Error: locator.waitFor: Test timeout of 30000ms exceeded.
  123 | 
  124 |     // Scroll to 40% first (instant, bypassing smooth-scroll) — must not have fired yet.
  125 |     await page.evaluate(() =>
  126 |       window.scrollTo({ top: document.body.scrollHeight * 0.4, behavior: 'instant' }),
  127 |     );
  128 |     await page.waitForTimeout(150);
  129 |     expect(events.filter((e) => e.name === 'blog_post_read')).toHaveLength(0);
  130 | 
  131 |     // Scroll to the bottom — must fire exactly once.
  132 |     await page.evaluate(() =>
  133 |       window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }),
  134 |     );
  135 |     await page.waitForTimeout(250);
  136 |     expect(events.filter((e) => e.name === 'blog_post_read')).toHaveLength(1);
  137 | 
  138 |     // Scroll further — still exactly one.
  139 |     await page.evaluate(() =>
  140 |       window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }),
  141 |     );
  142 |     await page.waitForTimeout(250);
  143 |     expect(events.filter((e) => e.name === 'blog_post_read')).toHaveLength(1);
  144 |   });
  145 | 
  146 |   test('outbound click emits exactly one outbound_click with category', async ({ page }) => {
  147 |     const events = await setupAnalyticsProbe(page);
  148 |     await page.goto('/');
  149 | 
  150 |     const github = page.getByRole('link', { name: /github/i }).first();
  151 |     await github.click();
  152 |     await page.waitForTimeout(200);
  153 | 
  154 |     const outbound = events.filter((e) => e.name === 'outbound_click');
  155 |     expect(outbound).toHaveLength(1);
  156 |     expect(outbound[0]?.props?.category).toBe('github');
  157 |   });
  158 | 
  159 |   test('DNT enabled => zero analytics network requests', async ({ page }) => {
  160 |     await enableDNT(page);
  161 |     const requests: string[] = [];
  162 |     await page.route(PLAUSIBLE_SCRIPT, (route: Route) => route.abort());
  163 |     await page.route(ANALYTICS_ENDPOINT, (route: Route) => {
  164 |       requests.push(route.request().url());
  165 |       return route.fulfill({ status: 204 });
  166 |     });
  167 |     await page.addInitScript(() => {
  168 |       (window as unknown as { plausible: unknown }).plausible = function (
  169 |         name: string,
  170 |         opts?: { props?: Record<string, unknown> },
  171 |       ) {
  172 |         fetch('https://plausible.io/api/event', {
  173 |           method: 'POST',
  174 |           headers: { 'Content-Type': 'text/plain' },
  175 |           body: JSON.stringify({ name, domain: location.hostname, props: opts?.props ?? {} }),
  176 |           keepalive: true,
  177 |         }).catch(() => {});
  178 |       };
  179 |     });
  180 | 
  181 |     await page.goto('/');
  182 |     await page.getByRole('link', { name: /github/i }).first().click().catch(() => {});
  183 |     await page.goto('/newsletter');
  184 |     await page.locator('#newsletter-email').fill('reader@example.com');
  185 |     await page.getByRole('main').getByRole('button', { name: /subscribe/i }).click().catch(() => {});
  186 |     await page.waitForTimeout(300);
  187 | 
  188 |     expect(requests).toHaveLength(0);
  189 |   });
  190 | });
  191 | 
```