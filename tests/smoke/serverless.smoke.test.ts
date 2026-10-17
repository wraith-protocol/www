import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  API_CONTENT_SECURITY_POLICY,
  COMMON_SECURITY_HEADERS,
  FEED_CONTENT_SECURITY_POLICY,
  PAGE_CONTENT_SECURITY_POLICY,
  PAGE_SECURITY_HEADERS,
  SUBSCRIBE_API_SECURITY_HEADERS,
} from '../../src/utils/security-headers';

/**
 * Preview smoke tests for the serverless routes.
 *
 * `vite preview` only serves the static build, so these run against
 * `scripts/preview-server.ts` — the same `dist/` output with `/api/subscribe`
 * and `/api/og` mounted, and with Buttondown stubbed so no mail is ever sent.
 * A second preview is started with the OG font asset missing and the Buttondown
 * key unset so the failure responses can be asserted.
 *
 * Nothing here touches the network: the only outbound call the site makes is
 * the subscribe proxy, and the preview intercepts it.
 */

const BOOT_TIMEOUT_MS = 60_000;
const REQUEST_TIMEOUT_MS = 60_000;

interface Preview {
  baseUrl: string;
  stop: () => Promise<void>;
}

function startPreview(env: Record<string, string> = {}): Promise<Preview> {
  const child: ChildProcessWithoutNullStreams = spawn(
    process.execPath,
    ['--import', 'tsx', 'scripts/preview-server.ts', '--port', '0'],
    { env: { ...process.env, SMOKE_MODE: '1', ...env } },
  );

  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk: string) => {
    if (process.env.SMOKE_DEBUG) {
      console.error(`[preview] ${chunk}`);
    }
  });

  return new Promise<Preview>((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('preview-server did not start in time'));
    }, BOOT_TIMEOUT_MS);

    let stdout = '';
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
      const baseUrl = stdout.match(/listening on (http:\/\/127\.0\.0\.1:\d+)/)?.[1];
      if (!baseUrl) {
        return;
      }
      clearTimeout(timer);

      resolve({
        baseUrl,
        stop: () =>
          new Promise<void>((done) => {
            const force = setTimeout(() => {
              child.kill('SIGKILL');
              done();
            }, 5_000);
            child.once('exit', () => {
              clearTimeout(force);
              done();
            });
            child.kill('SIGTERM');
          }),
      });
    });

    child.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`preview-server exited early with code ${code}\n${stdout}`));
    });
  });
}

function get(url: string): Promise<Response> {
  return fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
}

function postJson(url: string, body: unknown): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
}

async function png(url: string): Promise<{ response: Response; bytes: Uint8Array }> {
  const response = await get(url);
  return { response, bytes: new Uint8Array(await response.arrayBuffer()) };
}

function pngSize(bytes: Uint8Array): { width: number; height: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47];
const isPng = (bytes: Uint8Array) => [...bytes.slice(0, 4)].join() === PNG_SIGNATURE.join();

function expectCommonSecurityHeaders(
  response: Response,
  overrides: Partial<Record<string, string>> = {},
) {
  const expected = { ...COMMON_SECURITY_HEADERS, ...overrides };
  for (const [key, value] of Object.entries(expected)) {
    if (value !== undefined) {
      expect(response.headers.get(key), `Header ${key} mismatch`).toBe(value);
    }
  }
}

// ─── /api/subscribe ─────────────────────────────────────────────────────────

describe('POST /api/subscribe', () => {
  let preview: Preview;
  let subscribeUrl: string;

  const recordedUpstreamCalls = async (): Promise<unknown[]> =>
    (await (await get(`${preview.baseUrl}/__smoke/upstream`)).json()) as unknown[];

  beforeAll(async () => {
    preview = await startPreview();
    subscribeUrl = `${preview.baseUrl}/api/subscribe`;
  });

  afterAll(async () => {
    await preview.stop();
  });

  it('accepts a valid address and returns ok', async () => {
    const response = await postJson(subscribeUrl, { email: 'reader@example.com' });

    expect(response.status).toBe(201);
    expect(response.headers.get('content-type')).toContain('application/json');
    expectCommonSecurityHeaders(response, SUBSCRIBE_API_SECURITY_HEADERS);
    expect(await response.json()).toEqual({ ok: true });
  });

  it('normalises the address and defaults the tag before calling the provider', async () => {
    await postJson(subscribeUrl, { email: '  Second@Example.COM  ' });
    await postJson(subscribeUrl, { email: 'third@example.com', tag: '  careers  ' });

    expect(await recordedUpstreamCalls()).toEqual([
      { email: 'reader@example.com', tags: ['newsletter'], type: 'unconfirmed' },
      { email: 'second@example.com', tags: ['newsletter'], type: 'unconfirmed' },
      { email: 'third@example.com', tags: ['careers'], type: 'unconfirmed' },
    ]);
  });

  it('rejects malformed addresses without calling the provider', async () => {
    const before = (await recordedUpstreamCalls()).length;

    for (const email of ['', '   ', 'not-an-email', 'missing@domain', 'a@b@c.co', 42, null]) {
      const response = await postJson(subscribeUrl, { email });
      expect(response.status).toBe(422);
      expect(await response.json()).toEqual({
        error: 'Enter a valid email address.',
        code: 'invalid_email',
      });
    }

    const response = await postJson(subscribeUrl, { tag: 'newsletter' });
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      error: 'Enter a valid email address.',
      code: 'invalid_email',
    });

    expect((await recordedUpstreamCalls()).length).toBe(before);
  });

  it('rejects a malformed JSON body', async () => {
    const response = await fetch(subscribeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ not json',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    expect(response.status).toBe(400);
    expectCommonSecurityHeaders(response, SUBSCRIBE_API_SECURITY_HEADERS);
  });

  it('answers 405 for non-POST methods', async () => {
    for (const method of ['GET', 'PUT', 'DELETE']) {
      const response = await fetch(subscribeUrl, { method });
      expect(response.status).toBe(405);
      expectCommonSecurityHeaders(response, SUBSCRIBE_API_SECURITY_HEADERS);
      expect(await response.json()).toEqual({
        error: 'Method not allowed.',
        code: 'method_not_allowed',
      });
    }
  });

  it('maps provider conflicts to already_subscribed', async () => {
    const conflict = await postJson(subscribeUrl, { email: 'dupe@stub-conflict.example' });
    expect(conflict.status).toBe(409);
    expect(await conflict.json()).toEqual({
      error: 'This email is already subscribed.',
      code: 'already_subscribed',
    });

    const duplicateCode = await postJson(subscribeUrl, {
      email: 'dupe@stub-duplicate-code.example',
    });
    expect(duplicateCode.status).toBe(409);
    expect(await duplicateCode.json()).toEqual({
      error: 'This email is already subscribed.',
      code: 'already_subscribed',
    });
  });

  it('maps provider outages and network failures to 502', async () => {
    const outage = await postJson(subscribeUrl, { email: 'user@stub-outage.example' });
    expect(outage.status).toBe(502);
    expect(await outage.json()).toEqual({
      error: 'Subscription service is unavailable.',
      code: 'upstream_error',
    });

    const offline = await postJson(subscribeUrl, { email: 'user@stub-offline.example' });
    expect(offline.status).toBe(502);
    expect(await offline.json()).toEqual({
      error: 'Subscription service is unavailable.',
      code: 'upstream_error',
    });
  });
});

// ─── /api/og ────────────────────────────────────────────────────────────────

describe('GET /api/og', () => {
  let preview: Preview;
  let ogUrl: string;

  beforeAll(async () => {
    preview = await startPreview();
    ogUrl = `${preview.baseUrl}/api/og`;
  });

  afterAll(async () => {
    await preview.stop();
  });

  it('renders a 1200x630 PNG with immutable cache headers', async () => {
    const { response, bytes } = await png(
      `${ogUrl}?title=Private%20payments&subtitle=Every%20chain`,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/png');
    expect(response.headers.get('cache-control')).toContain('public');
    expect(response.headers.get('cache-control')).toContain('immutable');
    expect(response.headers.get('cache-control')).toContain('max-age=31536000');
    expectCommonSecurityHeaders(response, {
      'Content-Security-Policy': API_CONTENT_SECURITY_POLICY,
    });
    expect(isPng(bytes)).toBe(true);
    expect(bytes.byteLength).toBeGreaterThan(1_000);
    expect(pngSize(bytes)).toEqual({ width: 1200, height: 630 });
  });

  it('falls back to a default title when no query parameters are given', async () => {
    const { response, bytes } = await png(ogUrl);

    expect(response.status).toBe(200);
    expect(isPng(bytes)).toBe(true);
  });

  it('escapes reserved characters in the query without failing', async () => {
    const title = 'Radar & Trust <script>alert("x")</script>';
    const reserved = await png(
      `${ogUrl}?title=${encodeURIComponent(title)}&subtitle=${encodeURIComponent('1+1=2 ? #hash 100%')}`,
    );
    const plain = await png(`${ogUrl}?title=Hello`);

    expect(reserved.response.status).toBe(200);
    expect(isPng(reserved.bytes)).toBe(true);
    expect(reserved.bytes.byteLength).not.toBe(plain.bytes.byteLength);
  });

  it('survives malformed percent-encoding in the query', async () => {
    const { response, bytes } = await png(`${ogUrl}?title=%E0%A4%A&subtitle=100%25`);

    expect(response.status).toBe(200);
    expect(isPng(bytes)).toBe(true);
  });

  it('renders very long titles without failing', async () => {
    const { response, bytes } = await png(`${ogUrl}?title=${'stealth '.repeat(40)}`);

    expect(response.status).toBe(200);
    expect(pngSize(bytes)).toEqual({ width: 1200, height: 630 });
  });
});

// ─── failure responses ──────────────────────────────────────────────────────

describe('serverless failure responses', () => {
  let preview: Preview;

  beforeAll(async () => {
    preview = await startPreview({
      SMOKE_OG_FONT: 'missing',
      SMOKE_API_KEY: 'none',
      BUTTONDOWN_API_KEY: '',
    });
  });

  afterAll(async () => {
    await preview.stop();
  });

  it('returns 500 when the OG font asset cannot be loaded', async () => {
    const response = await get(`${preview.baseUrl}/api/og?title=Broken`);

    expect(response.status).toBe(500);
    expectCommonSecurityHeaders(response, {
      'Content-Security-Policy': API_CONTENT_SECURITY_POLICY,
    });
    expect(await response.text()).toContain('Failed to generate the image');
  });

  it('returns 500 when the subscribe function has no API key', async () => {
    const response = await postJson(`${preview.baseUrl}/api/subscribe`, {
      email: 'reader@example.com',
    });

    expect(response.status).toBe(500);
    expectCommonSecurityHeaders(response, SUBSCRIBE_API_SECURITY_HEADERS);
    expect(await response.json()).toEqual({
      error: 'Subscription service is not configured.',
      code: 'not_configured',
    });
  });

  it('still serves the built site', async () => {
    for (const path of ['/', '/stellar']) {
      const response = await get(`${preview.baseUrl}${path}`);
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/html');
    }
  });
});

// ─── security headers verification (preview smoke server & deployed preview) ──

describe('production security headers across pages, feeds, assets, and API routes', () => {
  let preview: Preview | undefined;
  let targetBaseUrl: string;

  beforeAll(async () => {
    const externalPreviewUrl = process.env.PREVIEW_URL?.trim();
    if (externalPreviewUrl) {
      targetBaseUrl = externalPreviewUrl.replace(/\/+$/, '');
    } else {
      preview = await startPreview();
      targetBaseUrl = preview.baseUrl;
    }
  });

  afterAll(async () => {
    if (preview) {
      await preview.stop();
    }
  });

  it('serves HTML pages and SPA fallback routes with PAGE_SECURITY_HEADERS and JSON-LD intact', async () => {
    for (const route of ['/', '/stellar', '/blog/wave-7-kickoff', '/spa-client-route']) {
      const response = await get(`${targetBaseUrl}${route}`);
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/html');
      expectCommonSecurityHeaders(response, PAGE_SECURITY_HEADERS);

      const csp = response.headers.get('content-security-policy') ?? '';
      expect(csp).toBe(PAGE_CONTENT_SECURITY_POLICY);

      const html = await response.text();
      expect(html).toContain('<script type="application/ld+json">');
    }
  });

  it('serves RSS feeds and XML sitemaps with feed-appropriate headers', async () => {
    for (const feedRoute of ['/feed.xml', '/feed/tag/wave-7.xml']) {
      const response = await get(`${targetBaseUrl}${feedRoute}`);
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('application/rss+xml; charset=utf-8');
      expect(response.headers.get('cache-control')).toContain('max-age=3600');
      expectCommonSecurityHeaders(response, {
        'Content-Security-Policy': FEED_CONTENT_SECURITY_POLICY,
      });
    }

    const sitemapResponse = await get(`${targetBaseUrl}/sitemap.xml`);
    expect(sitemapResponse.status).toBe(200);
    expect(sitemapResponse.headers.get('content-type')).toBe('application/xml; charset=utf-8');
    expect(sitemapResponse.headers.get('cache-control')).toContain('max-age=3600');
    expectCommonSecurityHeaders(sitemapResponse, {
      'Content-Security-Policy': FEED_CONTENT_SECURITY_POLICY,
    });
  });

  it('serves self-hosted fonts, fingerprinted bundles, and static media with asset headers', async () => {
    const fontResponse = await get(`${targetBaseUrl}/fonts/space-grotesk-700-normal.woff2`);
    expect(fontResponse.status).toBe(200);
    expect(fontResponse.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
    expect(fontResponse.headers.get('access-control-allow-origin')).toBe('*');
    expectCommonSecurityHeaders(fontResponse);

    const homeHtml = await (await get(`${targetBaseUrl}/`)).text();
    const assetMatch = homeHtml.match(/src="(\/assets\/[^"]+\.js)"/);
    expect(assetMatch?.[1]).toBeTruthy();

    const bundleResponse = await get(`${targetBaseUrl}${assetMatch![1]}`);
    expect(bundleResponse.status).toBe(200);
    expect(bundleResponse.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
    expectCommonSecurityHeaders(bundleResponse);

    const ogAssetResponse = await get(`${targetBaseUrl}/og/home.png`);
    expect(ogAssetResponse.status).toBe(200);
    expect(ogAssetResponse.headers.get('cache-control')).toContain('max-age=86400');
    expectCommonSecurityHeaders(ogAssetResponse);

    const pressKitResponse = await get(`${targetBaseUrl}/press-kit.zip`);
    expect(pressKitResponse.status).toBe(200);
    expect(pressKitResponse.headers.get('cache-control')).toContain('max-age=86400');
    expectCommonSecurityHeaders(pressKitResponse);
  });
});
