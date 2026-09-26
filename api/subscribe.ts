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

const BUTTONDOWN_API_URL = 'https://api.buttondown.email/v1/subscribers';
// Simple email regex — we validate server-side to avoid trusting the client.
const EMAIL_RE = /^[^\s@]+@[^\s@][^@]*\.[^\s@]+$/;

function sendJson(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

export default async function handler(req: SubscribeRequest, res: ServerResponse) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.BUTTONDOWN_API_KEY;
  if (!apiKey) {
    console.error('BUTTONDOWN_API_KEY env var is not set');
    sendJson(res, 500, { error: 'Subscription service is not configured.' });
    return;
  }

  const rawEmail = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const tag = typeof req.body?.tag === 'string' ? req.body.tag.trim() : 'newsletter';

  if (!rawEmail || !EMAIL_RE.test(rawEmail)) {
    sendJson(res, 422, { error: 'invalid_email' });
    return;
  }

  try {
    const bdRes = await fetch(BUTTONDOWN_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      // Ask Buttondown to send the double opt-in confirmation email.
      body: JSON.stringify({ email: rawEmail, tags: [tag], type: 'unconfirmed' }),
    });

    // 201 Created — subscription queued, confirmation email sent.
    if (bdRes.status === 201) {
      sendJson(res, 201, { ok: true });
      return;
    }

    // Buttondown returns 409 when the address is already subscribed. Treat it
    // as a distinct code so clients can show a friendly message without
    // revealing list membership (the client decides whether to surface it).
    if (bdRes.status === 409) {
      sendJson(res, 409, { error: 'already_subscribed' });
      return;
    }

    if (bdRes.status === 400 || bdRes.status === 422) {
      const body = (await bdRes.json()) as Record<string, unknown>;
      const code = typeof body?.code === 'string' ? body.code : 'unknown';
      if (code === 'email_already_exists' || code === 'subscriber_already_exists') {
        sendJson(res, 409, { error: 'already_subscribed' });
        return;
      }
      sendJson(res, 422, { error: 'invalid_email' });
      return;
    }

    // Unexpected upstream error.
    console.error('Buttondown unexpected status', bdRes.status);
    sendJson(res, 502, { error: 'Subscription service is unavailable.' });
  } catch (err) {
    console.error('Buttondown fetch failed', err);
    sendJson(res, 502, { error: 'Subscription service is unavailable.' });
  }
}
