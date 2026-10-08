import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import { preview } from 'vite';
import { checkBuild } from './link-checker.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const internalOnly = process.argv.includes('--internal-only');
if (process.argv.slice(2).some((arg) => arg !== '--internal-only')) {
  throw new Error('Usage: pnpm check:links [--internal-only]');
}
let server;
let browser;
try {
  const allowlist = JSON.parse(
    await readFile(join(root, 'scripts/link-check-allowlist.json'), 'utf8'),
  );
  server = await preview({
    root,
    configFile: false,
    preview: { host: '127.0.0.1', port: 0, open: false },
  });
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  browser = await chromium.launch();
  const context = await browser.newContext({ locale: 'en-US', serviceWorkers: 'block' });
  // Only page content comes from the local production build. External destinations
  // are checked separately, with bounded retries, rather than loading third-party JS.
  await context.route('**/*', (route) =>
    new URL(route.request().url()).origin === origin ? route.continue() : route.abort(),
  );
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  let pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('requestfailed', (request) => {
    if (request.url().startsWith(origin + '/') && request.resourceType() === 'script') {
      pageErrors.push(`Script failed: ${request.url()}`);
    }
  });
  page.on('response', (response) => {
    if (
      response.url().startsWith(origin + '/') &&
      response.status() >= 400 &&
      response.request().resourceType() === 'script'
    ) {
      pageErrors.push(`Script HTTP ${response.status()}: ${response.url()}`);
    }
  });
  const report = await checkBuild({
    distDir: join(root, 'dist'),
    allowlist,
    internalOnly,
    progress: console.log,
    renderPage: async (path) => {
      pageErrors = [];
      const response = await page.goto(origin + path, { waitUntil: 'networkidle' });
      await page.locator('h1').first().waitFor({ state: 'attached' });
      if (pageErrors.length) throw new Error(pageErrors.join('; '));
      const snapshot = await page.evaluate(() => ({
        heading: document.querySelector('h1')?.textContent.trim(),
        links: [
          ...document.querySelectorAll('a[href], area[href], link[rel="alternate"][href]'),
        ].map((node) => node.getAttribute('href')),
        anchors: [...document.querySelectorAll('[id], a[name]')].flatMap((node) =>
          [node.id, node.getAttribute('name')].filter(Boolean),
        ),
      }));
      return { ...snapshot, status: response.status() };
    },
  });
  await mkdir(join(root, 'playwright-report'), { recursive: true });
  await writeFile(
    join(root, 'playwright-report/link-check.json'),
    JSON.stringify(report, null, 2) + '\n',
  );
  for (const finding of report.errors)
    console.error(`${finding.source} -> ${finding.target}: ${finding.message}`);
  for (const finding of report.allowed)
    console.log(`Allowed: ${finding.target}: ${finding.reason}`);
  console.log(
    `Checked ${report.pages} pages, ${report.feeds} feeds, ${report.links} links; ${report.errors.length} failures, ${report.allowed.length} allowed external failures.${internalOnly ? ' External checks skipped.' : ''}`,
  );
  if (report.errors.length) process.exitCode = 1;
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser?.close();
  if (server)
    await new Promise((resolve, reject) =>
      server.httpServer.close((error) => (error ? reject(error) : resolve())),
    );
}
