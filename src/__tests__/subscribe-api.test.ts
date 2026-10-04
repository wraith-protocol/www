import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const API_KEY = 'test-buttondown-key';

function createRequest({
  method = 'POST',
  body = { email: 'reader@example.com' },
  ip = '192.0.2.1',
  headers = {},
}: {
  method?: string;
  body?: unknown;
  ip?: string;
  headers?: Record<string, string>;
} = {}) {
  return {
    method,
    headers: {
      'content-type': 'application/json',
      'x-real-ip': ip,
      host: 'usewraith.xyz',
      ...headers,
    },
    body,
  };
}

function createResponse() {
  const headers: Record<string, string> = {};
  return {
    headers,
    statusCode: 200,
    payload: '',
    setHeader(name: string, value: string) {
      headers[name] = value;
    },
    end(payload: string) {
      this.payload = payload;
    },
  };
}

async function invoke(request = createRequest()) {
  const { default: handler } = await import('../../api/subscribe');
  const response = createResponse();
  await handler(
    request as unknown as Parameters<typeof handler>[0],
    response as unknown as Parameters<typeof handler>[1],
  );
  return response;
}

describe('POST /api/subscribe', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('BUTTONDOWN_API_KEY', API_KEY);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 201, json: async () => ({}) }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('includes a request id on every response', async () => {
    const response = await invoke(createRequest({ method: 'GET' }));

    expect(response.headers['X-Request-Id']).toBeTruthy();
  });

  it('rejects malformed and oversized JSON without contacting Buttondown', async () => {
    const malformed = await invoke(createRequest({ body: '{bad json' }));
    expect(malformed.statusCode).toBe(400);

    const oversized = await invoke(
      createRequest({
        body: { email: 'reader@example.com' },
        headers: { 'content-length': '1025' },
      }),
    );
    expect(oversized.statusCode).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects cross-origin requests', async () => {
    const response = await invoke(
      createRequest({ headers: { origin: 'https://attacker.example' } }),
    );
    expect(response.statusCode).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rate limits provider requests per client IP', async () => {
    for (let index = 0; index < 5; index += 1) {
      const response = await invoke(
        createRequest({ body: { email: `reader${index}@example.com` } }),
      );
      expect(response.statusCode).toBe(201);
    }

    const limited = await invoke(createRequest({ body: { email: 'sixth@example.com' } }));
    expect(limited.statusCode).toBe(429);
    expect(limited.headers['Retry-After']).toBeDefined();
    expect(fetch).toHaveBeenCalledTimes(5);
  });

  it('deduplicates retry requests and does not reveal existing membership', async () => {
    const first = await invoke(createRequest());
    const retry = await invoke(
      createRequest({ body: { email: ' READER@example.com ' }, ip: '192.0.2.2' }),
    );

    expect(first.statusCode).toBe(201);
    expect(retry.statusCode).toBe(201);
    expect(retry.payload).toBe(first.payload);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('asks Buttondown to send a double opt-in confirmation for new subscriptions', async () => {
    const response = await invoke(createRequest());
    const call = vi.mocked(fetch).mock.calls[0];

    expect(response.statusCode).toBe(201);
    expect(JSON.parse(String(call?.[1]?.body))).toEqual({
      email: 'reader@example.com',
      tags: ['newsletter'],
      type: 'unconfirmed',
    });
  });

  it('returns the same success response when Buttondown says the address exists', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ status: 409, json: async () => ({}) } as Response);
    const response = await invoke(createRequest());

    expect(response.statusCode).toBe(201);
    expect(response.payload).toBe(JSON.stringify({ ok: true }));
  });

  it('aborts a slow provider request and returns a timeout response', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string | URL | Request, options?: RequestInit) =>
          new Promise((_, reject) => {
            options?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
          }),
      ),
    );

    const { UPSTREAM_TIMEOUT_MS } = await import('../../api/subscribe');
    const responsePromise = invoke();
    await vi.advanceTimersByTimeAsync(UPSTREAM_TIMEOUT_MS);
    const response = await responsePromise;

    expect(response.statusCode).toBe(504);
    expect(JSON.parse(response.payload)).toMatchObject({ code: 'upstream_timeout' });
  });
});
