import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearSafeClientCache,
  isRecord,
  requestJson,
  SafeClientError,
  safeErrorMessage,
} from '../utils/safeClient';

const STATUS_URL = 'https://status.example.test/api';
const SECRET_PAYLOAD = 'SECRET-PAYLOAD-123';

function jsonResponse(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response;
}

function mockFetch(handler: () => Response | Promise<Response>) {
  const fetchMock = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => handler());
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

/** A fetch that never settles until its request signal aborts. */
function hangingFetch() {
  const fetchMock = vi.fn(
    (_url: string | URL | Request, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal;
        if (signal?.aborted) {
          reject(new DOMException('Aborted', 'AbortError'));
          return;
        }
        signal?.addEventListener(
          'abort',
          () => reject(new DOMException('Aborted', 'AbortError')),
          { once: true },
        );
      }),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function validateValue(payload: unknown): { value: number } {
  if (!isRecord(payload) || typeof payload.value !== 'number') {
    throw new SafeClientError('malformed');
  }
  return { value: payload.value };
}

function setOnline(online: boolean) {
  Object.defineProperty(window.navigator, 'onLine', { value: online, configurable: true });
}

beforeEach(() => {
  clearSafeClientCache();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  setOnline(true);
});

describe('requestJson', () => {
  it('returns parsed data for a valid response without sending credentials', async () => {
    const fetchMock = mockFetch(async () => jsonResponse({ value: 42 }));

    const result = await requestJson(STATUS_URL, validateValue, { cacheTtlMs: 0 });

    expect(result).toEqual({ data: { value: 42 }, stale: false, fromCache: false });
    expect(fetchMock).toHaveBeenCalledWith(
      STATUS_URL,
      expect.objectContaining({ credentials: 'omit' }),
    );
  });

  it('rejects a malformed response without leaking the payload or URL', async () => {
    const fetchMock = mockFetch(async () => jsonResponse({ token: SECRET_PAYLOAD }));

    const error = await requestJson(
      STATUS_URL,
      () => {
        throw new Error('bad shape');
      },
      { cacheTtlMs: 0 },
    ).catch((cause: unknown) => cause);

    expect(error).toMatchObject({ kind: 'malformed' });
    expect(safeErrorMessage(error)).not.toContain(SECRET_PAYLOAD);
    expect(safeErrorMessage(error)).not.toContain('status.example.test');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not retry a malformed response', async () => {
    const fetchMock = mockFetch(async () => jsonResponse({ value: 'not-a-number' }));

    await expect(requestJson(STATUS_URL, validateValue, { cacheTtlMs: 0 })).rejects.toMatchObject({
      kind: 'malformed',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('times out a hanging request within the retry budget', async () => {
    vi.useFakeTimers();
    const fetchMock = hangingFetch();

    const promise = requestJson(STATUS_URL, validateValue, { cacheTtlMs: 0 });
    const assertion = expect(promise).rejects.toMatchObject({ kind: 'timeout' });

    await vi.advanceTimersByTimeAsync(8_000 * 3 + 1_000);
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('aborts when the caller signal aborts', async () => {
    const fetchMock = hangingFetch();
    const controller = new AbortController();

    const promise = requestJson(STATUS_URL, validateValue, {
      signal: controller.signal,
      cacheTtlMs: 0,
    });
    controller.abort();

    await expect(promise).rejects.toMatchObject({ kind: 'aborted' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries a rate-limited response and then succeeds', async () => {
    let calls = 0;
    const fetchMock = mockFetch(async () => {
      calls += 1;
      if (calls < 3) return { ok: false, status: 429, json: async () => ({}) } as Response;
      return jsonResponse({ value: 7 });
    });

    vi.useFakeTimers();
    const promise = requestJson(STATUS_URL, validateValue, { cacheTtlMs: 0 });
    await vi.advanceTimersByTimeAsync(2_000);

    await expect(promise).resolves.toEqual({
      data: { value: 7 },
      stale: false,
      fromCache: false,
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('gives up after the retry budget on repeated network failures', async () => {
    const fetchMock = mockFetch(async () => {
      throw new TypeError('Failed to fetch');
    });

    vi.useFakeTimers();
    const promise = requestJson(STATUS_URL, validateValue, { cacheTtlMs: 0 });
    const assertion = expect(promise).rejects.toMatchObject({ kind: 'network' });

    await vi.advanceTimersByTimeAsync(5_000);
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('retries HTTP 500s but not 404s', async () => {
    const fetch500 = mockFetch(
      async () => ({ ok: false, status: 500, json: async () => ({}) }) as Response,
    );

    vi.useFakeTimers();
    const promise500 = requestJson(STATUS_URL, validateValue, { cacheTtlMs: 0 });
    const assertion500 = expect(promise500).rejects.toMatchObject({ kind: 'http', status: 500 });

    await vi.advanceTimersByTimeAsync(5_000);
    await assertion500;
    expect(fetch500).toHaveBeenCalledTimes(3);
    vi.useRealTimers();

    const fetch404 = mockFetch(
      async () => ({ ok: false, status: 404, json: async () => ({}) }) as Response,
    );

    await expect(requestJson(STATUS_URL, validateValue, { cacheTtlMs: 0 })).rejects.toMatchObject({
      kind: 'http',
      status: 404,
    });
    expect(fetch404).toHaveBeenCalledTimes(1);
  });

  it('serves fresh cache without a second fetch', async () => {
    const fetchMock = mockFetch(async () => jsonResponse({ value: 1 }));

    const first = await requestJson(STATUS_URL, validateValue, { cacheTtlMs: 60_000 });
    const second = await requestJson(STATUS_URL, validateValue, { cacheTtlMs: 60_000 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first).toEqual({ data: { value: 1 }, stale: false, fromCache: false });
    expect(second).toEqual({ data: { value: 1 }, stale: false, fromCache: true });
  });

  it('refetches after the cache TTL expires', async () => {
    vi.useFakeTimers();
    const fetchMock = mockFetch(async () => jsonResponse({ value: 1 }));

    await requestJson(STATUS_URL, validateValue, { cacheTtlMs: 60_000 });
    await vi.advanceTimersByTimeAsync(61_000);
    await requestJson(STATUS_URL, validateValue, { cacheTtlMs: 60_000 });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('returns stale cache when offline', async () => {
    vi.useFakeTimers();
    const fetchMock = mockFetch(async () => jsonResponse({ value: 1 }));

    await requestJson(STATUS_URL, validateValue, { cacheTtlMs: 60_000 });
    await vi.advanceTimersByTimeAsync(61_000);
    setOnline(false);

    const result = await requestJson(STATUS_URL, validateValue, { cacheTtlMs: 60_000 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ data: { value: 1 }, stale: true, fromCache: true });
  });

  it('rejects as offline with no cache when offline', async () => {
    setOnline(false);
    const fetchMock = mockFetch(async () => jsonResponse({ value: 1 }));

    await expect(requestJson(STATUS_URL, validateValue, { cacheTtlMs: 0 })).rejects.toMatchObject({
      kind: 'offline',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('deduplicates concurrent subscribers into one request', async () => {
    let calls = 0;
    const fetchMock = vi.fn(async () => {
      calls += 1;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return jsonResponse({ value: 1 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const [first, second] = await Promise.all([
      requestJson(STATUS_URL, validateValue, { cacheTtlMs: 60_000 }),
      requestJson(STATUS_URL, validateValue, { cacheTtlMs: 60_000 }),
    ]);

    expect(calls).toBe(1);
    expect(first).toEqual(second);
  });
});

describe('safeErrorMessage', () => {
  it('returns generic, privacy-safe messages', () => {
    expect(safeErrorMessage(new SafeClientError('timeout'))).toBe('The request timed out.');
    expect(safeErrorMessage(new SafeClientError('offline'))).toBe('You appear to be offline.');
    expect(safeErrorMessage(new TypeError('Failed to fetch'))).toBe(
      'The service could not be reached.',
    );
    expect(safeErrorMessage(new DOMException('Aborted', 'AbortError'))).toBe(
      'The request was cancelled.',
    );
    expect(safeErrorMessage('something else')).toBe('The service could not be reached.');
  });
});
