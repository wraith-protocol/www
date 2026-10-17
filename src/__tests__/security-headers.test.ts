import { describe, expect, it, vi } from 'vitest';
import middleware from '../../middleware';
import vercelJson from '../../vercel.json';
import {
  API_CONTENT_SECURITY_POLICY,
  FEED_CONTENT_SECURITY_POLICY,
  FEED_SECURITY_HEADERS,
  FONT_ASSET_HEADERS,
  IMMUTABLE_ASSET_HEADERS,
  PAGE_CONTENT_SECURITY_POLICY,
  PAGE_SECURITY_HEADERS,
  STATIC_MEDIA_HEADERS,
  resolveStaticRouteHeaders,
} from '../utils/security-headers';

interface VercelHeaderEntry {
  key: string;
  value: string;
}

interface VercelHeaderRule {
  source: string;
  headers: VercelHeaderEntry[];
}

interface VercelConfig {
  headers?: VercelHeaderRule[];
  rewrites?: Array<{ source: string; destination: string }>;
}

const vercelConfig = vercelJson as VercelConfig;

function headersForSource(source: string): Record<string, string> {
  const rule = vercelConfig.headers?.find((entry) => entry.source === source);
  expect(rule, `Missing vercel.json header rule for ${source}`).toBeDefined();
  return Object.fromEntries(rule!.headers.map(({ key, value }) => [key, value]));
}

function parseCsp(csp: string): Record<string, string[]> {
  return Object.fromEntries(
    csp
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [directive, ...tokens] = part.split(/\s+/);
        return [directive!, tokens];
      }),
  );
}

describe('vercel.json production security headers', () => {
  it('defines global security headers on /(.*) matching PAGE_SECURITY_HEADERS', () => {
    const globalHeaders = headersForSource('/(.*)');
    expect(globalHeaders).toEqual(PAGE_SECURITY_HEADERS);
    expect(globalHeaders['Strict-Transport-Security']).toBe(
      'max-age=63072000; includeSubDomains; preload',
    );
    expect(globalHeaders['X-Content-Type-Options']).toBe('nosniff');
    expect(globalHeaders['X-Frame-Options']).toBe('DENY');
    expect(globalHeaders['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(globalHeaders['Cross-Origin-Opener-Policy']).toBe('same-origin');
    expect(globalHeaders['Permissions-Policy']).toContain('camera=()');
  });

  it('defines route-appropriate headers for feeds, sitemaps, assets, and API routes', () => {
    expect(headersForSource('/assets/(.*)')).toEqual({
      'Cache-Control': IMMUTABLE_ASSET_HEADERS['Cache-Control']!,
    });

    expect(headersForSource('/fonts/(.*)')).toEqual({
      'Cache-Control': FONT_ASSET_HEADERS['Cache-Control']!,
      'Access-Control-Allow-Origin': '*',
    });

    for (const mediaSource of ['/og/(.*)', '/press-kit/(.*)', '/press-kit.zip']) {
      expect(headersForSource(mediaSource)).toEqual({
        'Cache-Control': STATIC_MEDIA_HEADERS['Cache-Control']!,
      });
    }

    for (const feedSource of ['/feed.xml', '/feed/tag/(.*)']) {
      expect(headersForSource(feedSource)).toEqual({
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': FEED_SECURITY_HEADERS['Cache-Control']!,
        'Content-Security-Policy': FEED_CONTENT_SECURITY_POLICY,
      });
    }

    expect(headersForSource('/sitemap.xml')).toEqual({
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': FEED_SECURITY_HEADERS['Cache-Control']!,
      'Content-Security-Policy': FEED_CONTENT_SECURITY_POLICY,
    });

    expect(headersForSource('/api/(.*)')).toEqual({
      'Content-Security-Policy': API_CONTENT_SECURITY_POLICY,
    });

    expect(headersForSource('/api/subscribe')).toEqual({
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
    });

    expect(headersForSource('/api/og')).toEqual({
      'Cache-Control': 'public, max-age=31536000, immutable',
    });
  });
});

describe('Content-Security-Policy compatibility', () => {
  const directives = parseCsp(PAGE_CONTENT_SECURITY_POLICY);

  it('allows self-hosted fonts and data: font URIs', () => {
    expect(directives['font-src']).toEqual(expect.arrayContaining(["'self'", 'data:']));
  });

  it('allows Plausible analytics script and event beacon endpoints', () => {
    expect(directives['script-src']).toEqual(
      expect.arrayContaining(["'self'", "'unsafe-inline'", 'https://plausible.io']),
    );
    expect(directives['connect-src']).toEqual(expect.arrayContaining(['https://plausible.io']));
  });

  it('allows Soroban/Horizon RPC and Wraith status endpoints used by interactive tools', () => {
    expect(directives['connect-src']).toEqual(
      expect.arrayContaining([
        "'self'",
        'https://soroban-testnet.stellar.org',
        'https://soroban-rpc.stellar.org',
        'https://horizon-testnet.stellar.org',
        'https://horizon.stellar.org',
        'https://status.usewraith.xyz',
      ]),
    );
  });

  it('stays compatible with inline critical CSS, bootstrap scripts, and generated JSON-LD blocks', () => {
    expect(directives['style-src']).toEqual(expect.arrayContaining(["'self'", "'unsafe-inline'"]));
    expect(directives['script-src']).toEqual(expect.arrayContaining(["'self'", "'unsafe-inline'"]));
    // Ensure CSP does not contain a sha256-* or nonce-* token in script-src or
    // style-src that would cause browsers to ignore 'unsafe-inline' for static HTML.
    for (const token of [...(directives['script-src'] ?? []), ...(directives['style-src'] ?? [])]) {
      expect(token).not.toMatch(/^'(sha256|sha384|sha512|nonce)-/);
    }
  });

  it('hardens framing, object embedding, base-uri, and form-action', () => {
    expect(directives['frame-ancestors']).toEqual(["'none'"]);
    expect(directives['object-src']).toEqual(["'none'"]);
    expect(directives['base-uri']).toEqual(["'self'"]);
    expect(directives['form-action']).toEqual(["'self'"]);
  });
});

describe('resolveStaticRouteHeaders', () => {
  it('resolves route-appropriate headers for pages, feeds, fonts, bundles, and media', () => {
    const page = resolveStaticRouteHeaders('/stellar', '.html');
    expect(page.contentType).toBe('text/html; charset=utf-8');
    expect(page.cacheControl).toBe('no-store');
    expect(page.headers['Content-Security-Policy']).toBe(PAGE_CONTENT_SECURITY_POLICY);
    expect(page.headers['X-Content-Type-Options']).toBe('nosniff');

    const rss = resolveStaticRouteHeaders('/feed.xml', '.xml');
    expect(rss.contentType).toBe('application/rss+xml; charset=utf-8');
    expect(rss.headers['Content-Security-Policy']).toBe(FEED_CONTENT_SECURITY_POLICY);

    const tagRss = resolveStaticRouteHeaders('/feed/tag/wave-7.xml', '.xml');
    expect(tagRss.contentType).toBe('application/rss+xml; charset=utf-8');

    const sitemap = resolveStaticRouteHeaders('/sitemap.xml', '.xml');
    expect(sitemap.contentType).toBe('application/xml; charset=utf-8');

    const font = resolveStaticRouteHeaders('/fonts/space-grotesk-700-normal.woff2', '.woff2');
    expect(font.cacheControl).toBe('public, max-age=31536000, immutable');
    expect(font.headers['Access-Control-Allow-Origin']).toBe('*');

    const bundle = resolveStaticRouteHeaders('/assets/index-abc123.js', '.js');
    expect(bundle.cacheControl).toBe('public, max-age=31536000, immutable');

    const ogImage = resolveStaticRouteHeaders('/og/home.png', '.png');
    expect(ogImage.cacheControl).toBe('public, max-age=86400, stale-while-revalidate=604800');
  });
});

describe('edge middleware security headers', () => {
  it('attaches PAGE_SECURITY_HEADERS on bot responses from middleware.ts', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        text: () => Promise.resolve('<html lang="en"><head><title>Default</title></head></html>'),
      }),
    );

    const response = await middleware(
      new Request('https://usewraith.xyz/stellar', {
        headers: { 'user-agent': 'TwitterBot/1.0' },
      }),
    );

    expect(response).toBeDefined();
    for (const [key, value] of Object.entries(PAGE_SECURITY_HEADERS)) {
      expect(response!.headers.get(key)).toBe(value);
    }

    vi.unstubAllGlobals();
  });
});
