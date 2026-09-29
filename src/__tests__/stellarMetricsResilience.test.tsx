import { render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import StellarMetrics from '../components/StellarMetrics';
import {
  clearStellarMetricsCache,
  fetchStellarMetrics,
  getStellarHealth,
  STELLAR_METRICS_MAX_CONCURRENCY,
  STELLAR_RPC_MAX_ATTEMPTS,
  STELLAR_RPC_TIMEOUT_MS,
} from '../utils/stellarMetrics';

type RpcBody = {
  id: number;
  method: string;
  params?: Record<string, unknown>;
};

const healthResult = { latestLedger: 10_000, oldestLedger: 9_000, ledgerRetentionWindow: 1_001 };

function rpcOk(id: number, result: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({ jsonrpc: '2.0', id, result }),
  } as Response;
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
        signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), {
          once: true,
        });
      }),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const originalFetch = globalThis.fetch;

beforeEach(() => {
  clearStellarMetricsCache();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  globalThis.fetch = originalFetch;
});

describe('cancellation', () => {
  it('rejects in-flight requests when the signal aborts', async () => {
    hangingFetch();
    const controller = new AbortController();

    const promise = fetchStellarMetrics(controller.signal);
    controller.abort();

    const error = await promise.catch((cause: unknown) => cause);
    expect(error).toMatchObject({ kind: 'aborted' });
  });

  it('aborts in-flight requests when the component unmounts', async () => {
    const signals: AbortSignal[] = [];
    const fetchMock = vi.fn((_url: string | URL | Request, init?: RequestInit) => {
      const signal = init?.signal as AbortSignal;
      signals.push(signal);
      return new Promise<Response>((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), {
          once: true,
        });
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const { unmount } = render(<StellarMetrics />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    unmount();

    await waitFor(() => expect(signals.some((signal) => signal.aborted)).toBe(true));
  });
});

describe('timeouts and retries', () => {
  it('bounds each request with a timeout', async () => {
    vi.useFakeTimers();
    hangingFetch();

    const promise = getStellarHealth();
    const assertion = expect(promise).rejects.toMatchObject({ kind: 'timeout' });

    await vi.advanceTimersByTimeAsync(
      STELLAR_RPC_TIMEOUT_MS * STELLAR_RPC_MAX_ATTEMPTS + STELLAR_RPC_TIMEOUT_MS,
    );
    await assertion;
  });

  it('retries a transient network failure and then succeeds', async () => {
    let calls = 0;
    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as RpcBody;
      calls += 1;
      if (calls === 1) throw new TypeError('Failed to fetch');
      return rpcOk(body.id, healthResult);
    });
    vi.stubGlobal('fetch', fetchMock);

    vi.useFakeTimers();
    const promise = getStellarHealth();
    await vi.advanceTimersByTimeAsync(1_000);

    await expect(promise).resolves.toMatchObject({ latestLedger: 10_000 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries rate-limited responses', async () => {
    let calls = 0;
    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as RpcBody;
      calls += 1;
      if (calls < 3) return { ok: false, status: 429, json: async () => ({}) } as Response;
      return rpcOk(body.id, healthResult);
    });
    vi.stubGlobal('fetch', fetchMock);

    vi.useFakeTimers();
    const promise = getStellarHealth();
    await vi.advanceTimersByTimeAsync(2_000);

    await expect(promise).resolves.toMatchObject({ latestLedger: 10_000 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('stops after the bounded attempt budget instead of looping', async () => {
    const fetchMock = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    vi.stubGlobal('fetch', fetchMock);

    vi.useFakeTimers();
    const promise = getStellarHealth();
    const assertion = expect(promise).rejects.toMatchObject({ kind: 'network' });

    await vi.advanceTimersByTimeAsync(10_000);
    await assertion;

    expect(fetchMock).toHaveBeenCalledTimes(STELLAR_RPC_MAX_ATTEMPTS);
  });
});

describe('concurrency budget', () => {
  it('caps how many range queries run at once', async () => {
    let active = 0;
    let maxActive = 0;

    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as RpcBody;
      if (body.method === 'getHealth') return rpcOk(body.id, healthResult);

      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 10));
      active -= 1;

      return rpcOk(body.id, { events: [], cursor: 'cursor-1' });
    });
    vi.stubGlobal('fetch', fetchMock);

    await fetchStellarMetrics();

    expect(maxActive).toBeLessThanOrEqual(STELLAR_METRICS_MAX_CONCURRENCY);
    expect(maxActive).toBeGreaterThan(1);
  });
});
