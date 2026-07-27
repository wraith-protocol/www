import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * Vercel serverless function — not part of the Vite/tsc build (only `src` is
 * type-checked by `tsc -b`); Vercel transpiles this file independently at deploy time.
 *
 * Proxies subscribe requests to Buttondown server-side so no third-party JS or
 * API key is ever exposed to the client. Requires BUTTONDOWN_API_KEY to be set
 * in the Vercel project's environment variables.
 */

type SubscribeBody = { email?: string; tag?: string };
type SubscribeRequest = IncomingMessage & { body?: SubscribeBody };

const BUTTONDOWN_API_URL = 'https://api.buttondown.email/v1/subscribers';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  const email = req.body?.email?.trim();
  const tag = req.body?.tag?.trim() || 'newsletter';

  if (!email || !EMAIL_RE.test(email)) {
    sendJson(res, 400, { error: 'A valid email address is required.' });
    return;
  }

  const apiKey = process.env.BUTTONDOWN_API_KEY;
  if (!apiKey) {
    sendJson(res, 500, { error: 'Subscription service is not configured.' });
    return;
  }

  try {
    const buttondownRes = await fetch(BUTTONDOWN_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, tags: [tag], type: 'unconfirmed' }),
    });

    // Buttondown returns 409 when the address is already subscribed. Treat it
    // as success so the response never reveals whether an email was already on the list.
    if (buttondownRes.ok || buttondownRes.status === 409) {
      sendJson(res, 200, { success: true });
      return;
    }

    sendJson(res, 502, { error: 'Subscription service is unavailable.' });
  } catch {
    sendJson(res, 502, { error: 'Subscription service is unavailable.' });
  }
}
