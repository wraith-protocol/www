import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { readdir, readFile } from 'node:fs/promises';
import { join, posix } from 'node:path';
import { JSDOM } from 'jsdom';

export const SITE_URL = 'https://usewraith.xyz';
function isPrivateOrLocalIp(address) {
  const version = isIP(address);

  if (version === 4) {
    const parts = address.split('.').map(Number);
    const [a, b] = parts;

    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    );
  }

  if (version === 6) {
    const normalized = address.toLowerCase();

    return (
      normalized === '::' ||
      normalized === '::1' ||
      normalized.startsWith('fc') ||
      normalized.startsWith('fd') ||
      /^fe[89ab]/.test(normalized)
    );
  }

  return false;
}

async function assertSafeExternalDestination(url, resolveHost = lookup) {
  const parsed = new URL(url);

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`Unsafe external protocol: ${parsed.protocol}`);
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, '');

  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    throw new Error(`Blocked private or link-local destination: ${hostname}`);
  }

  if (isIP(hostname)) {
    if (isPrivateOrLocalIp(hostname)) {
      throw new Error(`Blocked private or link-local destination: ${hostname}`);
    }
    return;
  }

  const addresses = await resolveHost(hostname, { all: true, verbatim: true });

  if (!addresses.length || addresses.some(({ address }) => isPrivateOrLocalIp(address))) {
    throw new Error(`Blocked private or link-local destination: ${hostname}`);
  }
}
export async function listFiles(directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const name = posix.join(prefix, entry.name);
      return entry.isDirectory() ? listFiles(join(directory, entry.name), name) : [name];
    }),
  );
  return files.flat().sort();
}

export function routePath(pathname) {
  return pathname.replace(/\/index\.html$/, '/').replace(/\/$/, '') || '/';
}

export function validateAllowlist(entries, siteUrl = SITE_URL) {
  if (!Array.isArray(entries)) throw new Error('External allowlist must be an array');
  const seen = new Set();
  for (const entry of entries) {
    const url = new URL(entry.url);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.origin === new URL(siteUrl).origin ||
      url.hash ||
      entry.url.includes('*') ||
      url.href !== entry.url ||
      seen.has(entry.url) ||
      typeof entry.reason !== 'string' ||
      !entry.reason.trim() ||
      !Array.isArray(entry.failures) ||
      !entry.failures.length ||
      entry.failures.some(
        (value) => value !== 'network' && (!Number.isInteger(value) || value < 400 || value > 599),
      )
    ) {
      throw new Error(`Invalid external allowlist entry: ${entry.url}`);
    }
    seen.add(entry.url);
  }
  return entries;
}

// GET avoids false failures from sites that reject HEAD. Retry transient failures once.
export async function checkExternal(url, fetchUrl = fetch, resolveHost = lookup) {
  const maxRedirects = 5;

  for (let attempt = 0; attempt < 2; attempt++) {
    let currentUrl = url;

    try {
      for (let redirects = 0; redirects <= maxRedirects; redirects++) {
        await assertSafeExternalDestination(currentUrl, resolveHost);

        const response = await fetchUrl(currentUrl, {
          redirect: 'manual',
          signal: AbortSignal.timeout(10_000),
          headers: { 'User-Agent': 'Wraith-Link-Checker/1.0' },
        });

        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get('location');
          await response.body?.cancel();

          if (!location) {
            return { status: response.status, ok: false };
          }

          if (redirects === maxRedirects) {
            throw new Error('Too many redirects');
          }

          currentUrl = new URL(location, currentUrl).href;

          // Validate the redirect destination before the next request.
          await assertSafeExternalDestination(currentUrl, resolveHost);
          continue;
        }

        const result = { status: response.status, ok: response.ok };
        await response.body?.cancel();

        if (result.ok || (result.status !== 429 && result.status < 500)) {
          return result;
        }

        break;
      }
    } catch (error) {
      if (
        error.message.startsWith('Blocked private or link-local destination:') ||
        error.message.startsWith('Unsafe external protocol:')
      ) {
        return {
          status: 'network',
          ok: false,
          detail: error.message,
        };
      }

      if (attempt === 1) {
        return {
          status: 'network',
          ok: false,
          detail: error.message,
        };
      }
    }
  }

  return { status: 'network', ok: false };
}

export async function checkBuild({
  distDir,
  renderPage,
  externalCheck = checkExternal,
  allowlist = [],
  internalOnly = false,
  siteUrl = SITE_URL,
  progress = () => {},
}) {
  validateAllowlist(allowlist, siteUrl);
  const files = new Set(await listFiles(distDir));
  if (!files.has('index.html')) throw new Error('dist/index.html missing; run pnpm build first');
  const errors = [];
  const allowed = [];
  const links = new Map();
  const pages = new Map();
  const routes = new Set();
  const feeds = new Set(['feed.xml']);
  const fail = (source, target, message) => errors.push({ source, target, message });
  const addLink = (raw, source, absolute = false) => {
    try {
      const url = absolute ? new URL(raw) : new URL(raw, new URL(source, siteUrl));
      if (!absolute && ['mailto:', 'tel:'].includes(url.protocol)) return;
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Unsupported link protocol');
      if (!links.has(url.href)) links.set(url.href, new Set());
      links.get(url.href).add(source);
      return url;
    } catch (error) {
      fail(source, raw, `Invalid URL: ${error.message}`);
    }
  };
  const readXml = async (file, root) => {
    try {
      const dom = new JSDOM(await readFile(join(distDir, file), 'utf8'), {
        contentType: 'text/xml',
      });
      if (dom.window.document.documentElement.localName !== root) {
        dom.window.close();
        throw new Error(`Expected <${root}>`);
      }
      return dom;
    } catch (error) {
      fail(file, file, `Invalid or missing XML: ${error.message}`);
    }
  };

  for (const file of files) {
    if (file.endsWith('.html') && file !== '404.html' && !file.startsWith('404/')) {
      routes.add(routePath(`/${file}`));
    }
    if (file === 'feed.xml' || (file.startsWith('feed/') && file.endsWith('.xml'))) feeds.add(file);
  }
  const sitemap = await readXml('sitemap.xml', 'urlset');
  const sitemapRoutes = new Set();
  if (sitemap) {
    const entries = [...sitemap.window.document.querySelectorAll('urlset > url')];
    if (!entries.length) fail('sitemap.xml', '', 'Sitemap has no URLs');
    for (const entry of entries) {
      const raw = entry.querySelector('loc')?.textContent.trim() || '';
      const url = addLink(raw, 'sitemap.xml', true);
      if (!url) continue;
      if (url.origin !== new URL(siteUrl).origin || url.search || url.hash) {
        fail('sitemap.xml', raw, 'Sitemap URL must be a canonical production URL');
        continue;
      }
      const route = routePath(url.pathname);
      if (sitemapRoutes.has(route)) fail('sitemap.xml', raw, 'Duplicate sitemap route');
      sitemapRoutes.add(route);
      routes.add(route);
      if (route.startsWith('/blog/tag/'))
        feeds.add(`feed/tag/${route.slice('/blog/tag/'.length)}.xml`);
    }
    sitemap.window.close();
    for (const route of routes) {
      if (!sitemapRoutes.has(route)) fail('sitemap.xml', route, 'Built route missing from sitemap');
    }
  }

  for (const file of feeds) {
    const dom = await readXml(file, 'rss');
    if (!dom) continue;
    const document = dom.window.document;
    const channel = document.querySelector('rss > channel');
    if (!channel) fail(file, file, 'RSS channel missing');
    const self = [...document.getElementsByTagNameNS('http://www.w3.org/2005/Atom', 'link')]
      .find((node) => node.getAttribute('rel') === 'self')
      ?.getAttribute('href');
    if (self !== new URL(`/${file}`, siteUrl).href)
      fail(file, self, 'RSS self URL does not match feed file');
    if (self) addLink(self, file, true);
    for (const entry of document.querySelectorAll('channel, item')) {
      const link = entry.querySelector(':scope > link')?.textContent.trim() || '';
      addLink(link, file, true);
      if (!entry.querySelector(':scope > title')?.textContent.trim())
        fail(file, link, 'RSS title missing');
    }
    for (const guid of document.querySelectorAll('guid')) {
      if (guid.getAttribute('isPermaLink') !== 'false')
        addLink(guid.textContent.trim(), file, true);
    }
    dom.window.close();
  }

  // Seed every built/sitemap route, including routes with no incoming links.
  for (const route of routes) addLink(route, 'route matrix');
  const external = new Map();
  for (const [href, sources] of links) {
    const url = new URL(href);
    const source = [...sources].join(', ');
    if (url.origin !== new URL(siteUrl).origin) {
      url.hash = '';
      if (!external.has(url.href)) external.set(url.href, new Set());
      for (const item of sources) external.get(url.href).add(item);
      continue;
    }
    let pathname;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      fail(source, href, 'Malformed URL encoding');
      continue;
    }
    const file = pathname.slice(1);
    const isHtml = pathname.endsWith('.html');
    if (files.has(file) && !isHtml) continue;
    if (posix.extname(pathname) && !isHtml) {
      fail(source, href, 'Missing built file (SPA fallback is not a file)');
      continue;
    }
    // Preserve the requested path: /blog/index.html can render differently from
    // /blog in a client router, and trailing slashes affect relative links.
    const key = url.pathname + url.search;
    if (!pages.has(key)) {
      progress(`Crawling ${key}`);
      try {
        const page = await renderPage(key);
        if (page.status >= 400) throw new Error(`HTTP ${page.status}`);
        if (!page.heading || /not found|too stealth for us/i.test(page.heading))
          throw new Error('Rendered page is missing or not found');
        pages.set(key, page);
        for (const link of page.links) addLink(link, key);
      } catch (error) {
        pages.set(key, null);
        fail(source, href, `Page failed: ${error.message}`);
      }
    }
    const page = pages.get(key);
    if (page && url.hash) {
      try {
        const anchor = decodeURIComponent(url.hash.slice(1)).split(':~:text=')[0];
        if (anchor && !page.anchors.includes(anchor) && anchor.toLowerCase() !== 'top') {
          fail(source, href, `Missing anchor #${anchor}`);
        }
      } catch {
        fail(source, href, 'Malformed anchor encoding');
      }
    }
  }

  if (!internalOnly) {
    const queue = [...external];
    await Promise.all(
      Array.from({ length: Math.min(6, queue.length) }, async () => {
        while (queue.length) {
          const [url, sources] = queue.shift();
          progress(`Checking ${url}`);
          const result = await externalCheck(url);
          if (result.ok) continue;
          const exception = allowlist.find(
            (entry) => entry.url === url && entry.failures.includes(result.status),
          );
          const finding = {
            source: [...sources].join(', '),
            target: url,
            message: `External ${result.status}${result.detail ? `: ${result.detail}` : ''}`,
          };
          if (exception) allowed.push({ ...finding, reason: exception.reason });
          else errors.push(finding);
        }
      }),
    );
  }
  return {
    routes: routes.size,
    pages: pages.size,
    feeds: feeds.size,
    links: links.size,
    external: external.size,
    internalOnly,
    allowed,
    errors,
  };
}
