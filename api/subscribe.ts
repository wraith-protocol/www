import { createHash, randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * Vercel serverless function — not part of the Vite/tsc build (only `src` is
 * type-checked by `tsc -b`); Vercel transpiles this file independently at deploy time.
 *
 * Proxies subscribe requests to Buttondown server-side so no third-party JS or
 * API key is ever exposed to the client. Requires BUTTONDOWN_API_KEY to be set
 * in the Vercel project's environment variables.
 *
 * Provider choice: Buttondown
 *   - Open-source-friendly, privacy-respecting operator (no tracking pixels by
 *     default, GDPR-compliant hosting)
 *   - Simple REST API requiring only an API key — no client SDK needed
 *   - Supports double opt-in natively via a list toggle, not custom code
 *   - Free tier covers the initial subscriber volume; no vendor lock-in
 */

type SubscribeBody = { email?: unknown; tag?: unknown };
type SubscribeRequest = IncomingMessage & { body?: unknown };

type SubscribeErrorCode =
  | 'method_not_allowed'
  | 'origin_not_allowed'
  | 'unsupported_media_type'
  | 'invalid_request'
  | 'not_configured'
  | 'invalid_email'
  | 'rate_limited'
  | 'upstream_timeout'
  | 'upstream_error';

export const BUTTONDOWN_API_URL = 'https://api.buttondown.email/v1/subscribers';

/**
 * Bounded upstream timeout. A slow provider must never hold the function open
 * indefinitely, so every request is aborted after this window.
 */
export const UPSTREAM_TIMEOUT_MS = 5000;

// Simple email regex — we validate server-side to avoid trusting the client.
const EMAIL_RE = /^[^\s@]+@[^\s@][^@]*\.[^\s@]+$/;
const MAX_BODY_BYTES = 1024;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const DEDUPE_WINDOW_MS = 60 * 60 * 1000;
const MAX_TRACKED_KEYS = 10_000;
export const UPSTREAM_TIMEOUT_MS = 5000;

const ERROR_STATUS: Record<SubscribeErrorCode, number> = {
  method_not_allowed: 405,
  origin_not_allowed: 403,
  unsupported_media_type: 415,
  invalid_request: 400,
  not_configured: 500,
  invalid_email: 422,
  rate_limited: 429,
  upstream_timeout: 504,
  upstream_error: 502,
};

const ERROR_MESSAGE: Record<SubscribeErrorCode, string> = {
  method_not_allowed: 'Method not allowed.',
  origin_not_allowed: 'Request origin is not allowed.',
  unsupported_media_type: 'Content type must be application/json.',
  invalid_request: 'Invalid request.',
  not_configured: 'Subscription service is not configured.',
  invalid_email: 'Enter a valid email address.',
  rate_limited: 'Too many requests. Please try again later.',
  upstream_timeout: 'Subscription service timed out. Please try again.',
  upstream_error: 'Subscription service is unavailable.',
};

const rateLimits = new Map<string, { count: number; resetAt: number }>();
const recentSubscriptions = new Map<string, number>();
const pendingSubscriptions = new Map<string, Promise<number>>();

function resolveRequestId(req: SubscribeRequest): string {
  const header = req.headers['x-vercel-id'] ?? req.headers['x-request-id'];
  if (typeof header === 'string' && header.length > 0) return header;
  return randomUUID();
}

function logEvent(requestId: string, event: string, status: number) {
  const line = `[subscribe] event=${event} request_id=${requestId} status=${status}`;
  if (status >= 400) console.error(line);
  else console.log(line);
}

function sendJsonWithRequestId(
  res: ServerResponse,
  requestId: string,
  status: number,
  payload: unknown,
) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Request-Id', requestId);
  res.end(JSON.stringify(payload));
}

function sendError(res: ServerResponse, requestId: string, code: SubscribeErrorCode) {
  sendJsonWithRequestId(res, requestId, ERROR_STATUS[code], {
    error: ERROR_MESSAGE[code],
    code,
  });
}

function getBody(req: SubscribeRequest): SubscribeBody | null {
  const contentLength = req.headers['content-length'];
  if (contentLength !== undefined) {
    if (typeof contentLength !== 'string' || !/^\d+$/.test(contentLength)) return null;
    if (Number(contentLength) > MAX_BODY_BYTES) return null;
  }

  let body = req.body;
  if (typeof body === 'string') {
    if (Buffer.byteLength(body, 'utf8') > MAX_BODY_BYTES) return null;
    try {
      body = JSON.parse(body);
    } catch {
      return null;
    }
  } else if (Buffer.isBuffer(body)) {
    if (body.byteLength > MAX_BODY_BYTES) return null;
    try {
      body = JSON.parse(body.toString('utf8'));
    } catch {
      return null;
    }
  } else {
    try {
      if (Buffer.byteLength(JSON.stringify(body) ?? '', 'utf8') > MAX_BODY_BYTES) return null;
    } catch {
      return null;
    }
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  return body as SubscribeBody;
}

function isSameOrigin(req: SubscribeRequest): boolean {
  const origin = req.headers.origin;
  if (origin === undefined) return true;
  if (typeof origin !== 'string') return false;

  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

function getClientKey(req: SubscribeRequest): string {
  const realIp = req.headers['x-real-ip'];
  const forwardedFor = req.headers['x-forwarded-for'];
  const ip =
    (typeof realIp === 'string' && realIp) ||
    (typeof forwardedFor === 'string' && forwardedFor.split(',')[0]?.trim()) ||
    'unknown';
  return createHash('sha256').update(ip).digest('hex');
}

function pruneExpired(now: number) {
  for (const [key, expiresAt] of recentSubscriptions) {
    if (expiresAt <= now) recentSubscriptions.delete(key);
  }
  for (const [key, entry] of rateLimits) {
    if (entry.resetAt <= now) rateLimits.delete(key);
  }
}

function allowRequest(clientKey: string, now: number): { allowed: boolean; resetAt: number } {
  const current = rateLimits.get(clientKey);
  if (!current || current.resetAt <= now) {
    if (rateLimits.size >= MAX_TRACKED_KEYS) {
      const oldestKey = rateLimits.keys().next().value;
      if (oldestKey) rateLimits.delete(oldestKey);
    }
    const resetAt = now + RATE_LIMIT_WINDOW_MS;
    rateLimits.set(clientKey, { count: 1, resetAt });
    return { allowed: true, resetAt };
  }
  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, resetAt: current.resetAt };
  }
  current.count += 1;
  return { allowed: true, resetAt: current.resetAt };
}

function rememberSubscription(key: string, now: number) {
  if (recentSubscriptions.size >= MAX_TRACKED_KEYS) {
    const oldestKey = recentSubscriptions.keys().next().value;
    if (oldestKey) recentSubscriptions.delete(oldestKey);
  }
  recentSubscriptions.set(key, now + DEDUPE_WINDOW_MS);
}

async function subscribeWithButtondown(
  email: string,
  tag: string,
  apiKey: string,
  signal: AbortSignal,
): Promise<number> {
  const bdRes = await fetch(BUTTONDOWN_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Token ${apiKey}`,
      'Content-Type': 'application/json',
    },
    // Ask Buttondown to send the double opt-in confirmation email.
    body: JSON.stringify({ email, tags: [tag], type: 'unconfirmed' }),
    signal,
  });

  if (bdRes.status === 201 || bdRes.status === 409) return 201;

  if (bdRes.status === 400 || bdRes.status === 422) {
    let code = 'unknown';
    try {
      const body = (await bdRes.json()) as Record<string, unknown> | null;
      code = typeof body?.code === 'string' ? body.code : 'unknown';
    } catch {
      return 422;
    }
    if (code === 'email_already_exists' || code === 'subscriber_already_exists') return 201;
    return 422;
  }
  return 502;
}

export default async function handler(req: SubscribeRequest, res: ServerResponse) {
  const requestId = resolveRequestId(req);

  if (req.method !== 'POST') {
    logEvent(requestId, 'method_not_allowed', 405);
    sendError(res, requestId, 'method_not_allowed');
    return;
  }

  if (!isSameOrigin(req)) {
    logEvent(requestId, 'origin_not_allowed', 403);
    sendError(res, requestId, 'origin_not_allowed');
    return;
  }

  const contentType = req.headers['content-type'];
  if (typeof contentType !== 'string' || !/^application\/json(?:\s*;|\s*$)/i.test(contentType)) {
    logEvent(requestId, 'unsupported_media_type', 415);
    sendError(res, requestId, 'unsupported_media_type');
    return;
  }

  const body = getBody(req);
  if (!body) {
    logEvent(requestId, 'invalid_request', 400);
    sendError(res, requestId, 'invalid_request');
    return;
  }

  const apiKey = process.env.BUTTONDOWN_API_KEY;
  if (!apiKey) {
    logEvent(requestId, 'not_configured', 500);
    sendError(res, requestId, 'not_configured');
    return;
  }

  const rawEmail = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const tag = typeof body.tag === 'string' ? body.tag.trim() : 'newsletter';

  if (!rawEmail || rawEmail.length > 254 || !EMAIL_RE.test(rawEmail) || tag.length > 64) {
    logEvent(requestId, 'invalid_email', 422);
    sendError(res, requestId, 'invalid_email');
    return;
  }

  const now = Date.now();
  pruneExpired(now);
  const dedupeKey = createHash('sha256').update(rawEmail).digest('hex');
  if (recentSubscriptions.has(dedupeKey)) {
    logEvent(requestId, 'deduplicated', 201);
    sendJsonWithRequestId(res, requestId, 201, { ok: true });
    return;
  }

  const pending = pendingSubscriptions.get(dedupeKey);
  if (pending) {
    const status = await pending;
    sendSubscriptionResult(res, requestId, status);
    return;
  }

  const limit = allowRequest(getClientKey(req), now);
  if (!limit.allowed) {
    res.setHeader('Retry-After', String(Math.ceil((limit.resetAt - now) / 1000)));
    logEvent(requestId, 'rate_limited', 429);
    sendError(res, requestId, 'rate_limited');
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const subscription = subscribeWithButtondown(rawEmail, tag, apiKey, controller.signal).catch(
      () => (controller.signal.aborted ? 504 : 502),
    );
    pendingSubscriptions.set(dedupeKey, subscription);
    const status = await subscription;

    if (status === 201) {
      rememberSubscription(dedupeKey, now);
      logEvent(requestId, 'subscribed', 201);
    } else if (status === 504) {
      logEvent(requestId, 'upstream_timeout', 504);
    } else if (status === 422) {
      logEvent(requestId, 'invalid_email', 422);
    } else {
      logEvent(requestId, 'upstream_error', 502);
    }

    sendSubscriptionResult(res, requestId, status);
  } finally {
    clearTimeout(timeout);
    pendingSubscriptions.delete(dedupeKey);
  }
}

function sendSubscriptionResult(res: ServerResponse, requestId: string, status: number) {
  if (status === 201) {
    sendJsonWithRequestId(res, requestId, 201, { ok: true });
  } else if (status === 422) {
    sendError(res, requestId, 'invalid_email');
  } else if (status === 504) {
    sendError(res, requestId, 'upstream_timeout');
  } else {
    sendError(res, requestId, 'upstream_error');
  }
}
