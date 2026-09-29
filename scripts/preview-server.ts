/**
 * Production preview server with the Vercel serverless functions mounted.
 *
 * `vite preview` only serves the static `dist/` output, so the serverless
 * routes (`/api/subscribe`, `/api/og`) are unavailable locally and on CI
 * runners.  This server reproduces the deployed topology on a single port:
 *
 *   - `dist/` is served exactly like Vercel does it (static assets first,
 *     directory `index.html` for known routes, SPA fallback for everything
 *     that is not excluded by the rewrite rule in `vercel.json`).
 *   - `api/subscribe.ts` is mounted as-is — its signature is already the
 *     Node `http` request/response shape Vercel uses for `/api` functions.
 *   - `src/api/og.tsx` is mounted behind a small `http` → Web `Request` /
 *     `Response` adapter because it is written against the edge runtime.
 *
 * Two preview-only shims are enabled with `SMOKE_MODE=1` and exist purely so
 * the smoke suite can run offline against a preview:
 *
 *   1. `api.buttondown.email` calls are intercepted and recorded, so no real
 *      mail is ever sent.  The recorded calls are readable on
 *      `GET /__smoke/upstream`.
 *   2. `file:` fetches resolve from disk, which is how the edge runtime serves
 *      bundled static assets to the OG renderer.  `SMOKE_OG_FONT=missing`
 *      makes that fetch fail so the OG failure path can be exercised.
 *
 * `SMOKE_MODE=1` also injects a throwaway `BUTTONDOWN_API_KEY` when none is
 * set; pass `SMOKE_API_KEY=none` to leave it unset and exercise the
 * "service not configured" response instead.
 *
 * Usage:
 *   pnpm preview:functions            # port 4174, functions mounted
 *   pnpm preview:functions -- --port 0
 *   SMOKE_MODE=1 SMOKE_OG_FONT=missing pnpm preview:functions
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const distDir = join(rootDir, 'dist');

const smokeMode = process.env.SMOKE_MODE === '1';
const ogFontMissing = process.env.SMOKE_OG_FONT === 'missing';
const buttondownCalls: Array<{ email: string; tags: string[]; type: string }> = [];

if (smokeMode && !process.env.BUTTONDOWN_API_KEY && process.env.SMOKE_API_KEY !== 'none') {
  process.env.BUTTONDOWN_API_KEY = 'smoke-test-key';
}

const MIME_TYPES: Record<string, string> = {
  '.avif': 'image/avif',
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
  '.zip': 'application/zip',
};

function contentType(filePath: string): string {
  return MIME_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream';
}

// ─── Edge-runtime shims ─────────────────────────────────────────────────────

const realFetch = globalThis.fetch;

/**
 * Resolves the `file:` URLs used by the OG renderer from disk, which is how
 * the edge runtime serves bundled static assets.  `SMOKE_OG_FONT=missing`
 * turns that lookup into a failure so the OG error path can be exercised.
 */
function fetchEdgeAsset(url: string): Promise<Response> {
  if (ogFontMissing) {
    return Promise.reject(new Error(`ENOENT: no such file or directory, open '${url}'`));
  }
  return readFile(fileURLToPath(url)).then((data) => new Response(data));
}

/**
 * Stands in for Buttondown in smoke mode.  The subscribe handler posts the
 * subscriber payload as a JSON string; the stub records it and replies with a
 * status derived from the address so one server can play back every documented
 * upstream response.  No mail is ever sent.
 */
function stubButtondown(init?: RequestInit): Promise<Response> {
  const body = JSON.parse(String(init?.body ?? '{}')) as {
    email?: string;
    tags?: string[];
    type?: string;
  };
  buttondownCalls.push({ email: body.email ?? '', tags: body.tags ?? [], type: body.type ?? '' });

  const email = body.email ?? '';
  if (email.endsWith('@stub-conflict.example')) {
    return Promise.resolve(new Response('{}', { status: 409 }));
  }
  if (email.endsWith('@stub-duplicate-code.example')) {
    return Promise.resolve(
      new Response(JSON.stringify({ code: 'email_already_exists' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  }
  if (email.endsWith('@stub-outage.example')) {
    return Promise.resolve(new Response('upstream down', { status: 503 }));
  }
  if (email.endsWith('@stub-offline.example')) {
    return Promise.reject(new Error('stubbed network failure'));
  }

  return Promise.resolve(new Response('{}', { status: 201 }));
}

globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

  if (url.startsWith('file:')) {
    return fetchEdgeAsset(url);
  }
  if (smokeMode && url.startsWith('https://api.buttondown.email/')) {
    return stubButtondown(init);
  }
  return realFetch(input, init);
}) as typeof globalThis.fetch;

// ─── Static file serving ────────────────────────────────────────────────────

function safeJoin(base: string, urlPath: string): string | null {
  const candidate = normalize(join(base, urlPath));
  return candidate === base || candidate.startsWith(base + sep) ? candidate : null;
}

async function readFileOrNull(filePath: string): Promise<Buffer | null> {
  try {
    return await readFile(filePath);
  } catch {
    return null;
  }
}

function decodePath(rawPath: string): string | null {
  try {
    return decodeURIComponent(rawPath);
  } catch {
    return null;
  }
}

function badRequest(res: ServerResponse): void {
  res.statusCode = 400;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end('Bad request');
}

async function serveStatic(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const urlPath = decodePath((req.url ?? '/').split('?')[0] ?? '/');
  const target = urlPath === null ? null : safeJoin(distDir, urlPath);
  if (urlPath === null || target === null) {
    // Malformed percent-encoding and traversal attempts never resolve to a file.
    badRequest(res);
    return;
  }

  const candidates = [target];
  if (!extname(urlPath)) {
    candidates.push(join(target, 'index.html'));
  }

  for (const candidate of candidates) {
    const data = await readFileOrNull(candidate);
    if (!data) {
      continue;
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', contentType(candidate));
    res.setHeader(
      'Cache-Control',
      extname(candidate) === '.html' ? 'no-store' : 'public, max-age=3600',
    );
    res.end(data);
    return;
  }

  // `vercel.json` rewrites everything except `/api/` and `/press-kit/` to the
  // SPA shell, so anything else falls back to the root document.
  if (!urlPath.startsWith('/api/') && !urlPath.startsWith('/press-kit/')) {
    const shell = await readFileOrNull(join(distDir, 'index.html'));
    if (shell) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.end(shell);
      return;
    }
  }

  res.statusCode = 404;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end('Not found');
}

// ─── /api/subscribe ─────────────────────────────────────────────────────────

async function readRequestBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function handleSubscribe(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const raw = await readRequestBody(req);
  if (raw.length > 0) {
    try {
      // Vercel parses JSON request bodies before invoking the function.
      (req as IncomingMessage & { body?: unknown }).body = JSON.parse(raw);
    } catch {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Invalid JSON body' }));
      return;
    }
  }

  const { default: subscribe } = await import('../api/subscribe.ts');
  await subscribe(req as Parameters<typeof subscribe>[0], res);
}

// ─── /api/og ────────────────────────────────────────────────────────────────

async function handleOg(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const { default: og } = await import('../src/api/og.tsx');
  const origin = `http://${req.headers.host ?? 'localhost'}`;

  const response = await og(
    new Request(new URL(req.url ?? '/api/og', origin), {
      method: req.method,
      headers: Object.entries(req.headers).flatMap(([key, value]) =>
        value === undefined ? [] : [[key, Array.isArray(value) ? value.join(', ') : value]],
      ),
    }),
  );

  const body = Buffer.from(await response.arrayBuffer());
  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  res.setHeader('Content-Length', String(body.byteLength));
  res.end(body);
}

// ─── Smoke control endpoints ────────────────────────────────────────────────

function handleSmokeControl(req: IncomingMessage, res: ServerResponse): void {
  if (req.url === '/__smoke/upstream' && req.method === 'GET') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(buttondownCalls));
    return;
  }

  res.statusCode = 404;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end('Not found');
}

// ─── Server ─────────────────────────────────────────────────────────────────

function readPort(): number {
  const flagIndex = process.argv.indexOf('--port');
  const fromFlag = flagIndex === -1 ? undefined : Number(process.argv[flagIndex + 1]);
  return Number(process.env.PORT ?? fromFlag ?? 4174);
}

const port = readPort();

const server = createServer((req, res) => {
  const urlPath = (req.url ?? '/').split('?')[0] ?? '/';

  const run = async () => {
    if (smokeMode && urlPath.startsWith('/__smoke/')) {
      handleSmokeControl(req, res);
      return;
    }
    if (urlPath === '/api/subscribe') {
      await handleSubscribe(req, res);
      return;
    }
    if (urlPath === '/api/og') {
      await handleOg(req, res);
      return;
    }
    await serveStatic(req, res);
  };

  run().catch((error: unknown) => {
    console.error('preview-server error', error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    }
    res.end('Internal server error');
  });
});

server.listen(port, '127.0.0.1', async () => {
  const address = server.address();
  const actualPort = typeof address === 'object' && address ? address.port : port;

  if (!(await readFileOrNull(join(distDir, 'index.html')))) {
    console.warn('preview-server: dist/ not found — run `pnpm build` to serve static routes');
  }
  console.log(`preview-server listening on http://127.0.0.1:${actualPort}`);
  console.log(
    smokeMode
      ? 'preview-server: smoke mode on (Buttondown stubbed, no mail sent)'
      : 'preview-server: live mode (requests are proxied upstream)',
  );
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
