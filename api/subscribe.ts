import { randomUUID } from 'node:crypto';
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

type SubscribeBody = { email?: string; tag?: string };
type SubscribeRequest = IncomingMessage & { body?: SubscribeBody };

export const BUTTONDOWN_API_URL = 'https://api.buttondown.email/v1/subscribers';

/**
 * Bounded upstream timeout. A slow provider must never hold the function open
 * indefinitely, so every request is aborted after this window.
 */
export const UPSTREAM_TIMEOUT_MS = 5000;

// Simple email regex — we validate server-side to avoid trusting the client.
const EMAIL_RE = /^[^\s@]+@[^\s@][^@]*\.[^\s@]+$/;

/** Stable client-facing error codes. Provider details never reach the client. */
export type SubscribeErrorCode =
  | 'method_not_allowed'
  | 'not_configured'
  | 'invalid_email'
  | 'already_subscribed'
  | 'upstream_timeout'
  | 'upstream_error';

const ERROR_STATUS: Record<SubscribeErrorCode, number> = {
  method_not_allowed: 405,
  not_configured: 500,
  invalid_email: 422,
  already_subscribed: 409,
  upstream_timeout: 504,
  upstream_error: 502,
};

const ERROR_MESSAGE: Record<SubscribeErrorCode, string> = {
  method_not_allowed: 'Method not allowed.',
  not_configured: 'Subscription service is not configured.',
  invalid_email: 'Enter a valid email address.',
  already_subscribed: 'This email is already subscribed.',
  upstream_timeout: 'Subscription service timed out. Please try again.',
  upstream_error: 'Subscription service is unavailable.',
};

/**
 * Prefer the platform-provided request ID when present so logs correlate with
 * Vercel's own traces; otherwise mint one for this invocation.
 */
function resolveRequestId(req: SubscribeRequest): string {
  const header = req.headers['x-vercel-id'] ?? req.headers['x-request-id'];
  if (typeof header === 'string' && header.length > 0) return header;
  return randomUUID();
}

/**
 * Log request IDs and status codes only — never email addresses, tags, secrets,
 * or raw provider payloads.
 */
function logEvent(requestId: string, event: string, status: number) {
  const line = `[subscribe] event=${event} request_id=${requestId} status=${status}`;
  if (status >= 400) {
    console.error(line);
  } else {
    console.log(line);
  }
}

function sendJson(res: ServerResponse, requestId: string, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Request-Id', requestId);
  res.end(JSON.stringify(payload));
}

function sendError(res: ServerResponse, requestId: string, code: SubscribeErrorCode) {
  sendJson(res, requestId, ERROR_STATUS[code], { error: ERROR_MESSAGE[code], code });
}

export default async function handler(req: SubscribeRequest, res: ServerResponse) {
  const requestId = resolveRequestId(req);

  if (req.method !== 'POST') {
    logEvent(requestId, 'method_not_allowed', 405);
    sendError(res, requestId, 'method_not_allowed');
    return;
  }

  const apiKey = process.env.BUTTONDOWN_API_KEY;
  if (!apiKey) {
    logEvent(requestId, 'not_configured', 500);
    sendError(res, requestId, 'not_configured');
    return;
  }

  const rawEmail = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const tag = typeof req.body?.tag === 'string' ? req.body.tag.trim() : 'newsletter';

  if (!rawEmail || !EMAIL_RE.test(rawEmail)) {
    logEvent(requestId, 'invalid_email', 422);
    sendError(res, requestId, 'invalid_email');
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const bdRes = await fetch(BUTTONDOWN_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      // Ask Buttondown to send the double opt-in confirmation email.
      body: JSON.stringify({ email: rawEmail, tags: [tag], type: 'unconfirmed' }),
      signal: controller.signal,
    });

    // 201 Created — subscription queued, confirmation email sent.
    if (bdRes.status === 201) {
      logEvent(requestId, 'subscribed', 201);
      sendJson(res, requestId, 201, { ok: true });
      return;
    }

    // Buttondown returns 409 when the address is already subscribed. Treat it
    // as a distinct code so clients can show a friendly message without
    // revealing list membership (the client decides whether to surface it).
    if (bdRes.status === 409) {
      logEvent(requestId, 'already_subscribed', 409);
      sendError(res, requestId, 'already_subscribed');
      return;
    }

    if (bdRes.status === 400 || bdRes.status === 422) {
      let code: unknown;
      try {
        const body = (await bdRes.json()) as Record<string, unknown> | null;
        code = body?.code;
      } catch {
        // Malformed or non-JSON provider body — fall through to invalid_email.
        code = undefined;
      }

      if (code === 'email_already_exists' || code === 'subscriber_already_exists') {
        logEvent(requestId, 'already_subscribed', 409);
        sendError(res, requestId, 'already_subscribed');
        return;
      }

      logEvent(requestId, 'invalid_email', 422);
      sendError(res, requestId, 'invalid_email');
      return;
    }

    // Every other provider response (auth failures, 429, 5xx, unexpected
    // shapes) collapses into one stable client error so nothing about the
    // upstream is exposed.
    logEvent(requestId, 'upstream_error', bdRes.status);
    sendError(res, requestId, 'upstream_error');
  } catch {
    // AbortController only fires on the timeout path here.
    if (controller.signal.aborted) {
      logEvent(requestId, 'upstream_timeout', 504);
      sendError(res, requestId, 'upstream_timeout');
      return;
    }
    logEvent(requestId, 'upstream_error', 502);
    sendError(res, requestId, 'upstream_error');
  } finally {
    clearTimeout(timeout);
  }
}
