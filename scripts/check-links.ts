/**
 * Link checker for the built site or for production.
 *
 * Starting from the sitemap, it renders every public route in Chromium and checks:
 *
 *   - routes: each page loads with HTTP 200 and does not render the 404 page;
 *   - internal links: every link to the site resolves to a route that renders,
 *     a file that exists, and an element id when it has a #fragment;
 *   - canonical URLs: one per page, absolute, on https://usewraith.xyz, and a
 *     route that renders; hreflang alternates must render too;
 *   - feeds: every RSS feed the pages advertise (plus /feed.xml) is served as
 *     XML, and the posts it links to render;
 *   - external links: hosts must be listed in scripts/link-check/external-links.json,
 *     and approved links must answer 2xx (or a documented acceptStatus). A host may
 *     also accept documented error codes, which report the link as unverifiable
 *     rather than broken.
 *
 * External links are requested through safe-request.ts: only public addresses,
 * DNS pinned per hop, redirects re-validated. The browser itself is locked to the
 * checked origin, so content cannot make it load anything else. Requests run
 * with bounded concurrency and retry transient failures.
 *
 * Usage
 *   pnpm build && pnpm check:links                  # serve dist/ via scripts/preview-server.ts
 *   pnpm check:links --base https://usewraith.xyz   # check production
 *
 * Options
 *   --base <url>            site to check instead of a local preview of dist/
 *   --no-external           skip external links
 *   --report <file>         also write the results as JSON
 *   --concurrency <n>       pages rendered at once (default 4)
 *   --external-concurrency <n>  external requests at once (default 6)
 *   --max-pages <n>         stop crawling after n pages (default 400)
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Browser, type BrowserContext } from '@playwright/test';
import {
  checkExternalLink,
  findApprovedHost,
  validateApprovedHosts,
  type ExternalLinkResult,
} from './link-check/external.ts';
import { mapLimit } from './link-check/pool.ts';
import {
  SITE_ORIGIN,
  classifyLink,
  isAssetPath,
  normalizeRoute,
  parseRssFeed,
  parseSitemap,
} from './link-check/site.ts';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const allowlistFile = join(rootDir, 'scripts', 'link-check', 'external-links.json');

interface Options {
  base?: string;
  external: boolean;
  report?: string;
  concurrency: number;
  externalConcurrency: number;
  maxPages: number;
}

interface PageResult {
  path: string;
  status?: number;
  notFound: boolean;
  error?: string;
  canonicals: string[];
  ids: Set<string>;
}

type Failure = { category: string; source: string; target: string; message: string };

function parseArgs(argv: string[]): Options {
  const value = (flag: string) => {
    const index = argv.indexOf(flag);
    return index === -1 ? undefined : argv[index + 1];
  };
  const number = (flag: string, fallback: number) => {
    const raw = value(flag);
    const parsed = raw === undefined ? fallback : Number(raw);
    if (!Number.isInteger(parsed) || parsed < 1)
      throw new Error(`${flag} needs a positive integer`);
    return parsed;
  };
  return {
    base: value('--base')?.replace(/\/+$/, ''),
    external: !argv.includes('--no-external'),
    report: value('--report'),
    concurrency: number('--concurrency', 4),
    externalConcurrency: number('--external-concurrency', 6),
    maxPages: number('--max-pages', 400),
  };
}

/** Serves dist/ with the Vercel rewrites, like the smoke tests do. */
function startPreview(): Promise<{ baseUrl: string; child: ChildProcess }> {
  const child = spawn(
    process.execPath,
    ['--import', 'tsx', 'scripts/preview-server.ts', '--port', '0'],
    { cwd: rootDir, env: { ...process.env }, stdio: ['ignore', 'pipe', 'inherit'] },
  );
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('preview-server did not start within 60 s (run `pnpm build` first)'));
    }, 60_000);
    let output = '';
    child.stdout?.setEncoding('utf8');
    child.stdout?.on('data', (chunk: string) => {
      output += chunk;
      const baseUrl = /listening on (http:\/\/127\.0\.0\.1:\d+)/.exec(output)?.[1];
      if (baseUrl) {
        clearTimeout(timer);
        resolve({ baseUrl, child });
      }
    });
    child.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`preview-server exited with code ${code}`));
    });
  });
}

async function fetchText(url: string): Promise<{ status: number; type: string; body: string }> {
  const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(30_000) });
  return {
    status: response.status,
    type: response.headers.get('content-type') ?? '',
    body: await response.text(),
  };
}

async function newLockedContext(browser: Browser, baseOrigin: string): Promise<BrowserContext> {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  // The browser may only talk to the site under test. Third-party scripts,
  // images and API calls are aborted, so page content cannot make CI reach
  // arbitrary hosts; external links are checked by safe-request.ts instead.
  await context.route('**/*', (route) => {
    const url = route.request().url();
    const sameOrigin = url.startsWith(`${baseOrigin}/`) || url === baseOrigin;
    return sameOrigin ? route.continue() : route.abort('blockedbyclient');
  });
  return context;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const allowlist = JSON.parse(await readFile(allowlistFile, 'utf8')) as { approvedHosts: unknown };
  const approvedHosts = validateApprovedHosts(allowlist.approvedHosts);

  const preview = options.base ? undefined : await startPreview();
  const base = options.base ?? (preview?.baseUrl as string);
  const baseOrigin = new URL(base).origin;
  const failures: Failure[] = [];
  const fail = (category: string, source: string, target: string, message: string) =>
    failures.push({ category, source, target, message });

  const pages = new Map<string, PageResult>();
  const queued = new Set<string>();
  const queue: string[] = [];
  const assets = new Map<string, Set<string>>();
  const feeds = new Map<string, Set<string>>();
  const fragments: Array<{ source: string; path: string; fragment: string }> = [];
  const externalLinks = new Map<string, Set<string>>();
  const routeReferrers = new Map<string, Set<string>>();

  const remember = (map: Map<string, Set<string>>, key: string, source: string) => {
    const sources = map.get(key) ?? new Set<string>();
    sources.add(source);
    map.set(key, sources);
  };
  const enqueueRoute = (path: string, source: string) => {
    const route = normalizeRoute(path);
    remember(routeReferrers, route, source);
    if (queued.has(route)) return;
    if (queued.size >= options.maxPages) {
      fail('crawl', source, route, `skipped: --max-pages ${options.maxPages} reached`);
      return;
    }
    queued.add(route);
    queue.push(route);
  };
  const handleTarget = (href: string, pageUrl: string, source: string) => {
    const target = classifyLink(href, pageUrl, baseOrigin);
    if (target.kind === 'invalid') fail('internal', source, href, target.reason);
    if (target.kind === 'external') remember(externalLinks, target.url, source);
    if (target.kind !== 'internal') return;
    if (isAssetPath(target.path)) {
      if (target.path.endsWith('.xml') && target.path.includes('feed')) {
        remember(feeds, target.path, source);
      } else {
        remember(assets, target.path, source);
      }
      return;
    }
    enqueueRoute(target.path, source);
    if (target.fragment) {
      fragments.push({ source, path: normalizeRoute(target.path), fragment: target.fragment });
    }
  };

  try {
    // ── Seeds: the sitemap and the main feed ─────────────────────────────────
    const sitemap = await fetchText(`${base}/sitemap.xml`);
    if (sitemap.status !== 200) {
      fail('sitemap', '/sitemap.xml', '/sitemap.xml', `HTTP ${sitemap.status}`);
    } else {
      for (const loc of parseSitemap(sitemap.body)) {
        const url = new URL(loc);
        if (url.origin !== SITE_ORIGIN) {
          fail('sitemap', '/sitemap.xml', loc, `sitemap URL is not on ${SITE_ORIGIN}`);
          continue;
        }
        enqueueRoute(url.pathname, '/sitemap.xml');
      }
    }
    enqueueRoute('/', 'seed');
    remember(feeds, '/feed.xml', 'seed');

    // ── Routes, rendered in Chromium ─────────────────────────────────────────
    const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
    const context = await newLockedContext(browser, baseOrigin);

    const renderRoute = async (path: string): Promise<void> => {
      const page = await context.newPage();
      const result: PageResult = { path, notFound: false, canonicals: [], ids: new Set() };
      pages.set(path, result);
      try {
        const response = await page.goto(`${base}${path}`, {
          waitUntil: 'domcontentloaded',
          timeout: 30_000,
        });
        result.status = response?.status();
        await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
        await page
          .waitForFunction(() => (document.getElementById('root')?.childElementCount ?? 0) > 0, {
            timeout: 15_000,
          })
          .catch(() => undefined);
        // Lazily rendered sections (React.lazy, intersection observers) load on scroll
        await page
          .evaluate(() => window.scrollTo(0, document.body.scrollHeight))
          .catch(() => undefined);
        await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => undefined);

        const data = await page.evaluate(() => ({
          url: location.href,
          notFound: document.querySelector('[data-page="not-found"]') !== null,
          anchors: [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')!),
          canonicals: [...document.querySelectorAll('link[rel="canonical"]')].map(
            (link) => (link as HTMLLinkElement).href,
          ),
          alternates: [...document.querySelectorAll('link[rel="alternate"]')].map((link) => ({
            href: (link as HTMLLinkElement).href,
            type: (link as HTMLLinkElement).type,
          })),
          ids: [...document.querySelectorAll('[id], a[name]')].map(
            (element) => element.id || element.getAttribute('name') || '',
          ),
        }));

        result.notFound = data.notFound;
        result.canonicals = [...new Set(data.canonicals)];
        result.ids = new Set(data.ids.filter(Boolean));
        for (const href of data.anchors) handleTarget(href, data.url, path);
        for (const canonical of result.canonicals) {
          const url = new URL(canonical);
          if (url.origin !== SITE_ORIGIN) {
            fail('canonical', path, canonical, `canonical URL must be on ${SITE_ORIGIN}`);
          } else {
            enqueueRoute(url.pathname, `${path} (canonical)`);
          }
        }
        for (const alternate of data.alternates) {
          if (/rss|atom/.test(alternate.type)) {
            const target = classifyLink(alternate.href, data.url, baseOrigin);
            if (target.kind === 'internal') remember(feeds, target.path, path);
            else fail('feed', path, alternate.href, 'feed alternate is not on the site');
          } else {
            const url = new URL(alternate.href);
            if (url.origin !== SITE_ORIGIN) {
              fail('canonical', path, alternate.href, `hreflang URL must be on ${SITE_ORIGIN}`);
            } else {
              enqueueRoute(url.pathname, `${path} (hreflang)`);
            }
          }
        }
      } catch (error) {
        result.error = (error as Error).message.split('\n')[0];
      } finally {
        await page.close();
      }
    };

    while (queue.length > 0) {
      const batch = queue.splice(0, queue.length);
      await mapLimit(batch, options.concurrency, renderRoute);
    }

    // ── Feeds ────────────────────────────────────────────────────────────────
    for (const [path, sources] of feeds) {
      const source = [...sources][0] as string;
      const response = await fetchText(`${base}${path}`);
      if (response.status !== 200 || !/xml/.test(response.type)) {
        fail(
          'feed',
          source,
          path,
          `expected an XML feed, got HTTP ${response.status} ${response.type}`,
        );
        continue;
      }
      try {
        const feed = parseRssFeed(response.body);
        for (const link of [feed.channelLink, ...feed.itemLinks]) {
          if (link) handleTarget(link, `${SITE_ORIGIN}${path}`, path);
        }
      } catch (error) {
        fail('feed', source, path, (error as Error).message);
      }
    }
    // Posts linked from feeds may not have been rendered yet
    while (queue.length > 0) {
      const batch = queue.splice(0, queue.length);
      await mapLimit(batch, options.concurrency, renderRoute);
    }

    // Before reporting a missing #fragment, render its page once more with a
    // longer settle time, in case the section rendered late.
    const missingFragment = (path: string, fragment: string) => {
      const target = pages.get(path);
      return target !== undefined && !target.error && !target.notFound && !target.ids.has(fragment);
    };
    const recheck = [
      ...new Set(fragments.filter((f) => missingFragment(f.path, f.fragment)).map((f) => f.path)),
    ];
    await mapLimit(recheck, options.concurrency, async (path) => {
      const page = await context.newPage();
      try {
        await page.goto(`${base}${path}`, { waitUntil: 'networkidle', timeout: 30_000 });
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(3_000);
        const ids = await page.evaluate(() =>
          [...document.querySelectorAll('[id], a[name]')].map(
            (element) => element.id || element.getAttribute('name') || '',
          ),
        );
        for (const id of ids) if (id) pages.get(path)?.ids.add(id);
      } catch {
        // Keep the first render's result
      } finally {
        await page.close();
      }
    });
    await browser.close();

    // ── Route results ────────────────────────────────────────────────────────
    for (const result of pages.values()) {
      const source = [...(routeReferrers.get(result.path) ?? new Set(['seed']))].join(', ');
      if (result.error) fail('route', source, result.path, result.error);
      else if (result.status !== 200) fail('route', source, result.path, `HTTP ${result.status}`);
      else if (result.notFound) fail('route', source, result.path, 'renders the 404 page');
      else if (result.canonicals.length === 0) {
        fail('canonical', result.path, result.path, 'no canonical URL');
      } else if (result.canonicals.length > 1) {
        fail('canonical', result.path, result.canonicals.join(' '), 'more than one canonical URL');
      } else {
        const canonicalPath = normalizeRoute(new URL(result.canonicals[0] as string).pathname);
        if (canonicalPath !== result.path) {
          fail(
            'canonical',
            result.path,
            result.canonicals[0] as string,
            'canonical URL is not this page',
          );
        }
      }
    }
    for (const { source, path, fragment } of fragments) {
      if (missingFragment(path, fragment)) {
        fail('internal', source, `${path}#${fragment}`, `no element with id "${fragment}"`);
      }
    }

    // ── Files ────────────────────────────────────────────────────────────────
    await mapLimit([...assets], options.concurrency, async ([path, sources]) => {
      const response = await fetch(`${base}${path}`, { method: 'HEAD' });
      const type = response.headers.get('content-type') ?? '';
      // The SPA fallback answers unknown paths with index.html and HTTP 200.
      if (response.status !== 200 || type.startsWith('text/html')) {
        fail(
          'internal',
          [...sources].join(', '),
          path,
          `file not found (HTTP ${response.status} ${type})`,
        );
      }
    });

    // ── External links ───────────────────────────────────────────────────────
    let externalResults: ExternalLinkResult[] = [];
    let skippedExternal = 0;
    if (options.external) {
      const approvedLinks: Array<[string, NonNullable<ReturnType<typeof findApprovedHost>>]> = [];
      for (const [url, sources] of externalLinks) {
        const approved = findApprovedHost(new URL(url).hostname, approvedHosts);
        if (approved?.skipRequest) skippedExternal += 1;
        else if (approved) approvedLinks.push([url, approved]);
        else {
          fail(
            'external',
            [...sources].join(', '),
            url,
            'host is not approved in scripts/link-check/external-links.json',
          );
        }
      }
      externalResults = await mapLimit(
        approvedLinks,
        options.externalConcurrency,
        ([url, approved]) =>
          checkExternalLink(url, approved, { retries: 2, baseDelayMs: 1_000, maxDelayMs: 10_000 }),
      );
      for (const result of externalResults) {
        if (!result.ok) {
          const sources = [...(externalLinks.get(result.url) ?? [])].join(', ');
          const detail = result.error ?? `HTTP ${result.status}`;
          fail('external', sources, result.url, `${detail} after ${result.attempts} attempt(s)`);
        }
      }
    }

    const unverifiedExternal = externalResults.filter((result) => result.unverified).length;

    // ── Report ───────────────────────────────────────────────────────────────
    const summary = {
      base,
      routes: pages.size,
      files: assets.size,
      feeds: feeds.size,
      fragments: fragments.length,
      externalLinks: externalLinks.size,
      externalChecked: externalResults.length,
      externalUnverified: unverifiedExternal,
      failures: failures.length,
    };
    if (options.report) {
      const external = [...externalLinks].map(([url, sources]) => ({ url, sources: [...sources] }));
      await writeFile(
        options.report,
        `${JSON.stringify({ summary, failures, externalResults, external }, null, 2)}\n`,
      );
    }

    console.log(
      [
        `Checked ${base}`,
        `  routes rendered:      ${summary.routes}`,
        `  files:                ${summary.files}`,
        `  feeds:                ${summary.feeds}`,
        `  fragments:            ${summary.fragments}`,
        `  external links:       ${summary.externalLinks}` +
          (options.external
            ? ` (${summary.externalChecked} requested, ${skippedExternal} approved without a request` +
              (unverifiedExternal > 0 ? `, ${unverifiedExternal} unverifiable)` : ')')
            : ' (skipped)'),
      ].join('\n'),
    );
    if (failures.length > 0) {
      console.error(`\n${failures.length} link problem(s):`);
      for (const failure of failures.sort((a, b) => a.category.localeCompare(b.category))) {
        console.error(
          `  [${failure.category}] ${failure.target}\n      ${failure.message}\n      linked from ${failure.source}`,
        );
      }
      process.exitCode = 1;
    } else {
      console.log('\nAll links are healthy.');
    }
  } finally {
    preview?.child.kill('SIGTERM');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
