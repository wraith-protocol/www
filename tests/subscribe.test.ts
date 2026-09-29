// Unit tests for the newsletter proxy. Lives outside `src` because the Vercel
// function in `api/` is intentionally excluded from the site's tsc/Vite build.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler, { BUTTONDOWN_API_URL, UPSTREAM_TIMEOUT_MS } from '../api/subscribe';

// ─── Harness ─────────────────────────────────────────────────────────────────

type HandlerRequest = Parameters<typeof handler>[0];
type HandlerResponse = Parameters<typeof handler>[1];

type SubscribeResponseBody = { error?: string; code?: string; ok?: boolean };

interface CapturedResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  json: () => SubscribeResponseBody | null;
  setHeader: (name: string, value: string) => void;
  end: (chunk: string) => void;
}

function createResponse(): CapturedResponse {
  return {
    statusCode: 200,
    headers: {},
    body: '',
    json() {
      return this.body ? (JSON.parse(this.body) as SubscribeResponseBody) : null;
    },
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    end(chunk) {
      this.body = chunk;
    },
  };
}

function createRequest(body: unknown, method = 'POST'): HandlerRequest {
  return { method, headers: {}, body } as unknown as HandlerRequest;
}

async function invoke(body: unknown, method = 'POST', response = createResponse()) {
  await handler(createRequest(body, method), response as unknown as HandlerResponse);
  return response;
}

/** Minimal stand-in for a Buttondown response. */
function providerResponse(status: number, payload: unknown = {}): Response {
  return { status, json: async () => payload } as unknown as Response;
}

/** Provider that returns a 4xx/5xx with a body that is not valid JSON. */
function malformedProviderResponse(status: number): Response {
  return {
    status,
    json: async () => {
      throw new SyntaxError('Unexpected token < in JSON at position 0');
    },
  } as unknown as Response;
}

const VALID_EMAIL = 'user@example.com';

const originalApiKey = process.env.BUTTONDOWN_API_KEY;

const fetchMock = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>();

beforeEach(() => {
  process.env.BUTTONDOWN_API_KEY = 'test-key';
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  if (originalApiKey === undefined) delete process.env.BUTTONDOWN_API_KEY;
  else process.env.BUTTONDOWN_API_KEY = originalApiKey;
});

// ─── Request validation ──────────────────────────────────────────────────────

describe('subscribe proxy — request validation', () => {
  it('rejects non-POST methods with 405', async () => {
    const response = await invoke({ email: VALID_EMAIL }, 'GET');

    expect(response.statusCode).toBe(405);
    expect(response.json()).toMatchObject({ code: 'method_not_allowed' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns a stable 500 when the provider key is not configured', async () => {
    delete process.env.BUTTONDOWN_API_KEY;

    const response = await invoke({ email: VALID_EMAIL });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toMatchObject({ code: 'not_configured' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects malformed emails without calling the provider', async () => {
    const response = await invoke({ email: 'not-an-email' });

    expect(response.statusCode).toBe(422);
    expect(response.json()).toMatchObject({ code: 'invalid_email' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('exposes a request id on every response', async () => {
    fetchMock.mockResolvedValue(providerResponse(201));

    const response = await invoke({ email: VALID_EMAIL });

    expect(response.headers['x-request-id']).toBeTruthy();
  });
});

// ─── Successful path ─────────────────────────────────────────────────────────

describe('subscribe proxy — success', () => {
  it('normalises the email and forwards a tagged, unconfirmed subscription', async () => {
    fetchMock.mockResolvedValue(providerResponse(201));

    const response = await invoke({ email: '  User@Example.com  ' });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({ ok: true });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(BUTTONDOWN_API_URL);
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual({
      email: VALID_EMAIL,
      tags: ['newsletter'],
      type: 'unconfirmed',
    });
  });
});

// ─── Provider 4xx ────────────────────────────────────────────────────────────

describe('subscribe proxy — provider 4xx', () => {
  it('maps a 409 to already_subscribed', async () => {
    fetchMock.mockResolvedValue(providerResponse(409));

    const response = await invoke({ email: VALID_EMAIL });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({ code: 'already_subscribed' });
  });

  it.each(['email_already_exists', 'subscriber_already_exists'])(
    'maps a 400 with code %s to already_subscribed',
    async (code) => {
      fetchMock.mockResolvedValue(providerResponse(400, { code }));

      const response = await invoke({ email: VALID_EMAIL });

      expect(response.statusCode).toBe(409);
      expect(response.json()).toMatchObject({ code: 'already_subscribed' });
    },
  );

  it('maps a 422 with an unknown body code to invalid_email', async () => {
    fetchMock.mockResolvedValue(providerResponse(422, { code: 'something_else' }));

    const response = await invoke({ email: VALID_EMAIL });

    expect(response.statusCode).toBe(422);
    expect(response.json()).toMatchObject({ code: 'invalid_email' });
  });

  it('does not leak the provider status or body on a 4xx', async () => {
    fetchMock.mockResolvedValue(providerResponse(422, { detail: 'internal provider reason' }));

    const response = await invoke({ email: VALID_EMAIL });

    expect(response.body).not.toContain('internal provider reason');
    expect(response.body).not.toContain('422');
  });
});

// ─── Provider 5xx and transport failures ────────────────────────────────────

describe('subscribe proxy — provider failures', () => {
  it.each([500, 503])('maps a provider %s to a stable 502', async (status) => {
    fetchMock.mockResolvedValue(providerResponse(status));

    const response = await invoke({ email: VALID_EMAIL });

    expect(response.statusCode).toBe(502);
    expect(response.json()).toMatchObject({ code: 'upstream_error' });
    expect(response.body).not.toContain(String(status));
  });

  it('maps a provider 429 to a stable 502', async () => {
    fetchMock.mockResolvedValue(providerResponse(429));

    const response = await invoke({ email: VALID_EMAIL });

    expect(response.statusCode).toBe(502);
    expect(response.json()).toMatchObject({ code: 'upstream_error' });
  });

  it('maps a network failure to a stable 502', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    const response = await invoke({ email: VALID_EMAIL });

    expect(response.statusCode).toBe(502);
    expect(response.json()).toMatchObject({ code: 'upstream_error' });
  });
});

// ─── Malformed upstream responses ────────────────────────────────────────────

describe('subscribe proxy — malformed upstream responses', () => {
  it('handles a 4xx with a non-JSON body without throwing', async () => {
    fetchMock.mockResolvedValue(malformedProviderResponse(400));

    const response = await invoke({ email: VALID_EMAIL });

    expect(response.statusCode).toBe(422);
    expect(response.json()).toMatchObject({ code: 'invalid_email' });
  });

  it('handles a 5xx with a non-JSON body as upstream_error', async () => {
    fetchMock.mockResolvedValue(malformedProviderResponse(502));

    const response = await invoke({ email: VALID_EMAIL });

    expect(response.statusCode).toBe(502);
    expect(response.json()).toMatchObject({ code: 'upstream_error' });
  });

  it('handles a null JSON body on a 4xx', async () => {
    fetchMock.mockResolvedValue(providerResponse(400, null));

    const response = await invoke({ email: VALID_EMAIL });

    expect(response.statusCode).toBe(422);
    expect(response.json()).toMatchObject({ code: 'invalid_email' });
  });
});

// ─── Timeout ─────────────────────────────────────────────────────────────────

describe('subscribe proxy — timeout', () => {
  it('aborts a slow provider after the bound and returns 504', async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(Object.assign(new Error('The operation was aborted'), { name: 'AbortError' }));
          });
        }),
    );

    const response = createResponse();
    const pending = invoke({ email: VALID_EMAIL }, 'POST', response);

    await vi.advanceTimersByTimeAsync(UPSTREAM_TIMEOUT_MS);
    await pending;

    expect(response.statusCode).toBe(504);
    expect(response.json()).toEqual({
      error: 'Subscription service timed out. Please try again.',
      code: 'upstream_timeout',
    });
  });

  it('does not abort a provider that responds before the bound', async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValue(providerResponse(201));

    const response = await invoke({ email: VALID_EMAIL });

    expect(response.statusCode).toBe(201);
  });
});

// ─── Logging privacy ─────────────────────────────────────────────────────────

describe('subscribe proxy — logging', () => {
  it('never logs the subscriber email or the provider key', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockResolvedValue(providerResponse(201));

    await invoke({ email: VALID_EMAIL });
    await invoke({ email: 'another@example.com' });

    const lines = [...logSpy.mock.calls, ...errorSpy.mock.calls].map((call) => call.join(' '));
    expect(lines.join('\n')).toContain('request_id=');
    expect(lines.join('\n')).not.toContain(VALID_EMAIL);
    expect(lines.join('\n')).not.toContain('another@example.com');
    expect(lines.join('\n')).not.toContain('test-key');
  });

  it('logs the request id and status for provider failures', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockResolvedValue(providerResponse(503));

    await invoke({ email: VALID_EMAIL });

    const line = errorSpy.mock.calls.map((call) => call.join(' ')).join('\n');
    expect(line).toContain('request_id=');
    expect(line).toContain('status=503');
  });
});
