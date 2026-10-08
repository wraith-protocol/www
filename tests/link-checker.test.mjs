import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  checkBuild,
  checkExternal,
  SITE_URL,
  validateAllowlist,
} from '../scripts/link-checker.mjs';

const directories = [];
afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

function sitemap(routes = ['/', '/blog', '/blog/post', '/blog/tag/privacy']) {
  return `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.map((route) => `<url><loc>${SITE_URL}${route}</loc></url>`).join('')}</urlset>`;
}

function feed(path = '/feed.xml') {
  return `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>
    <title>Blog</title><link>${SITE_URL}/blog</link>
    <atom:link rel="self" href="${SITE_URL}${path}" />
    <item><title>Post</title><link>${SITE_URL}/blog/post</link><guid>${SITE_URL}/blog/post</guid></item>
  </channel></rss>`;
}

async function fixture(overrides = {}, snapshots = {}) {
  const distDir = await mkdtemp(join(tmpdir(), 'wraith-link-check-'));
  directories.push(distDir);
  const files = {
    'index.html': '<div id="root"></div>',
    'blog/index.html': '<div id="root"></div>',
    'blog/post/index.html': '<div id="root"></div>',
    'sitemap.xml': sitemap(),
    'feed.xml': feed(),
    'feed/tag/privacy.xml': feed('/feed/tag/privacy.xml'),
    'press-kit/brand.zip': 'download',
    ...overrides,
  };
  for (const [file, content] of Object.entries(files)) {
    if (content === null) continue;
    await mkdir(dirname(join(distDir, file)), { recursive: true });
    await writeFile(join(distDir, file), content);
  }
  const pages = {
    '/': {
      links: [
        '/blog/post#hello%20world',
        '/press-kit/brand.zip?download=1',
        'mailto:team@example.org',
        'tel:+1234',
      ],
    },
    '/blog': { links: ['/feed.xml', '/blog/tag/privacy'] },
    '/blog/post': { links: ['#hello%20world', './post?mode=print#hello%20world'] },
    '/blog/post?mode=print': { links: [] },
    '/blog/tag/privacy': { links: ['/feed/tag/privacy.xml'] },
    ...snapshots,
  };
  const renderPage = vi.fn(async (route) => {
    const page = pages[route];
    return {
      status: 200,
      heading: page ? 'Page' : 'This address is too stealth for us',
      anchors: ['hello world'],
      links: [],
      ...page,
    };
  });
  const externalCheck = vi.fn(async () => ({ ok: true, status: 200 }));
  return { distDir, renderPage, externalCheck };
}

describe('production link checker', () => {
  it('crawls built routes, archives, RSS and query links with decoded cross-page and same-page anchors', async () => {
    const options = await fixture();
    const result = await checkBuild(options);
    expect(result.errors).toEqual([]);
    expect(result.feeds).toBe(2);
    expect(options.renderPage).toHaveBeenCalledWith('/blog/tag/privacy');
    expect(options.renderPage).toHaveBeenCalledWith('/blog/post?mode=print');
    expect(options.externalCheck).not.toHaveBeenCalled();
  });

  it('finds unlinked built routes and missing sitemap coverage', async () => {
    const result = await checkBuild(
      await fixture({ 'orphan/index.html': '<html></html>' }, { '/orphan': {} }),
    );
    expect(result.errors).toContainEqual(
      expect.objectContaining({ target: '/orphan', message: 'Built route missing from sitemap' }),
    );
    expect(result.pages).toBe(6);
  });

  it('preserves trailing-slash and index.html destinations when rendering', async () => {
    const options = await fixture(
      {},
      {
        '/': { links: ['/blog/', '/blog/index.html'] },
        '/blog/': { links: ['post#hello%20world'] },
      },
    );
    const result = await checkBuild(options);
    expect(options.renderPage).toHaveBeenCalledWith('/blog/');
    expect(options.renderPage).toHaveBeenCalledWith('/blog/index.html');
    expect(result.errors).toEqual([
      expect.objectContaining({ target: `${SITE_URL}/blog/index.html` }),
    ]);
  });

  it('rejects soft 404 pages, missing downloads, broken and malformed anchors', async () => {
    const result = await checkBuild(
      await fixture(
        {},
        {
          '/': {
            links: [
              '/missing',
              '/missing.pdf',
              '/blog/post#absent',
              '/blog/post#%ZZ',
              '/blog/post#top',
            ],
          },
        },
      ),
    );
    expect(result.errors.map((error) => error.message)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Rendered page is missing or not found'),
        'Missing built file (SPA fallback is not a file)',
        'Missing anchor #absent',
        'Malformed anchor encoding',
      ]),
    );
    expect(result.errors).toHaveLength(4);
  });

  it.each(['Post Not Found', 'Tag Not Found', 'Author Not Found', 'Case Study Not Found'])(
    'rejects dynamic soft 404: %s',
    async (heading) => {
      const result = await checkBuild(await fixture({}, { '/blog/post': { heading, links: [] } }));
      expect(result.errors).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining('not found') }),
      );
    },
  );

  it('reports malformed XML and missing expected tag feeds', async () => {
    const result = await checkBuild(
      await fixture({ 'feed.xml': '<rss><broken></rss>', 'feed/tag/privacy.xml': null }),
    );
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        source: 'feed.xml',
        message: expect.stringContaining('Invalid or missing XML'),
      }),
    );
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        source: 'feed/tag/privacy.xml',
        message: expect.stringContaining('Invalid or missing XML'),
      }),
    );
  });

  it('rejects absent sitemap, empty sitemap, invalid and foreign sitemap URLs', async () => {
    for (const xml of [
      null,
      '<urlset/>',
      sitemap(['relative']),
      sitemap().replace(SITE_URL, 'https://other.example'),
    ]) {
      const result = await checkBuild(await fixture({ 'sitemap.xml': xml }));
      expect(result.errors.some((error) => error.source === 'sitemap.xml')).toBe(true);
    }
  });

  it('validates feed structure, self URL and item destinations', async () => {
    const result = await checkBuild(
      await fixture({ 'feed.xml': feed('/wrong.xml').replaceAll('/blog/post', '/bad-post') }),
    );
    expect(result.errors).toContainEqual(
      expect.objectContaining({ message: 'RSS self URL does not match feed file' }),
    );
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        target: `${SITE_URL}/bad-post`,
        message: expect.stringContaining('not found'),
      }),
    );
    const malformed = await checkBuild(await fixture({ 'feed.xml': '<rss/>' }));
    expect(malformed.errors).toContainEqual(
      expect.objectContaining({ message: 'RSS channel missing' }),
    );
  });

  it('rejects non-HTTP URLs in XML and unsafe protocols in page links', async () => {
    const result = await checkBuild(
      await fixture(
        {
          'sitemap.xml': sitemap().replace(`${SITE_URL}/blog/post`, 'mailto:someone@example.org'),
          'feed.xml': feed().replaceAll(`${SITE_URL}/blog/post`, 'tel:+1234'),
        },
        { '/': { links: ['javascript:void(0)'] } },
      ),
    );
    for (const source of ['sitemap.xml', 'feed.xml', '/']) {
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          source,
          message: expect.stringContaining('Unsupported link protocol'),
        }),
      );
    }
  });

  it('deduplicates external URLs and only allows explicitly listed failure statuses', async () => {
    const options = await fixture(
      {},
      {
        '/': {
          links: [
            'https://example.org/private#one',
            'https://example.org/private#two',
            'https://example.org/missing',
          ],
        },
      },
    );
    options.externalCheck.mockResolvedValue({ ok: false, status: 403 });
    const allowlist = [
      { url: 'https://example.org/private', reason: 'Requires login', failures: [403] },
    ];
    const result = await checkBuild({ ...options, allowlist });
    expect(options.externalCheck).toHaveBeenCalledTimes(2);
    expect(result.allowed).toHaveLength(1);
    expect(result.errors).toEqual([
      expect.objectContaining({ target: 'https://example.org/missing' }),
    ]);
    options.externalCheck.mockResolvedValue({ ok: false, status: 404 });
    expect((await checkBuild({ ...options, allowlist })).errors).toHaveLength(2);
  });

  it('allows explicit network exceptions and supports an offline internal-only run', async () => {
    const options = await fixture({}, { '/': { links: ['https://example.org/'] } });
    options.externalCheck.mockResolvedValue({ ok: false, status: 'network' });
    const result = await checkBuild({
      ...options,
      allowlist: [
        { url: 'https://example.org/', reason: 'Intentionally offline', failures: ['network'] },
      ],
    });
    expect(result.allowed).toHaveLength(1);
    options.externalCheck.mockClear();
    const offline = await checkBuild({ ...options, internalOnly: true });
    expect(offline.internalOnly).toBe(true);
    expect(options.externalCheck).not.toHaveBeenCalled();
  });

  it('rejects internal, wildcard-like and undocumented allowlist entries', () => {
    for (const entry of [
      { url: `${SITE_URL}/missing`, reason: 'No', failures: [404] },
      { url: 'https://example.org/', reason: '', failures: [403] },
      { url: 'https://example.org/#anchor', reason: 'No', failures: [403] },
      { url: 'https://example.org/', reason: 'No', failures: ['*'] },
    ])
      expect(() => validateAllowlist([entry])).toThrow();
  });
});

describe('external requests', () => {
  const resolvePublicHost = vi.fn().mockResolvedValue([
    {
      address: '93.184.216.34',
      family: 4,
    },
  ]);

  it('uses GET with manual redirects and retries transient server failures', async () => {
    const fetchUrl = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response('', { status: 200 }));

    expect(await checkExternal('https://example.org/', fetchUrl, resolvePublicHost)).toEqual({
      ok: true,
      status: 200,
    });

    expect(fetchUrl).toHaveBeenCalledTimes(2);
    expect(fetchUrl.mock.calls[0][1]).toMatchObject({
      redirect: 'manual',
      signal: expect.any(AbortSignal),
    });
  });

  it('does not retry 404s and reports exhausted network failures', async () => {
    const fetchUrl = vi.fn().mockResolvedValue(new Response('', { status: 404 }));

    expect(await checkExternal('https://example.org/', fetchUrl, resolvePublicHost)).toEqual({
      ok: false,
      status: 404,
    });

    expect(fetchUrl).toHaveBeenCalledTimes(1);

    fetchUrl.mockReset().mockRejectedValue(new Error('offline'));

    expect(await checkExternal('https://example.org/', fetchUrl, resolvePublicHost)).toMatchObject({
      ok: false,
      status: 'network',
    });

    expect(fetchUrl).toHaveBeenCalledTimes(2);
  });

  it('blocks private and link-local destinations before making a request', async () => {
    const fetchUrl = vi.fn();

    for (const url of [
      'http://127.0.0.1/',
      'http://10.0.0.1/',
      'http://192.168.1.1/',
      'http://169.254.169.254/',
      'http://[::1]/',
      'http://[fe80::1]/',
    ]) {
      const result = await checkExternal(url, fetchUrl);

      expect(result).toMatchObject({
        ok: false,
        status: 'network',
      });

      expect(result.detail).toMatch(/Blocked private or link-local destination/);
    }

    expect(fetchUrl).not.toHaveBeenCalled();
  });

  it('blocks redirects to private and link-local destinations', async () => {
    const fetchUrl = vi.fn().mockResolvedValueOnce(
      new Response('', {
        status: 302,
        headers: {
          location: 'http://169.254.169.254/latest/meta-data/',
        },
      }),
    );

    const result = await checkExternal('https://example.org/', fetchUrl, resolvePublicHost);

    expect(result).toMatchObject({
      ok: false,
      status: 'network',
    });

    expect(result.detail).toMatch(/Blocked private or link-local destination/);

    expect(fetchUrl).toHaveBeenCalledTimes(1);
  });
});
