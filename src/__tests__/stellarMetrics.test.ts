import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearStellarMetricsCache,
  countStellarEventsInRange,
  fetchStellarMetrics,
  getStellarHealth,
  loadStellarMetrics,
  StellarRpcError,
} from '../utils/stellarMetrics';

type RpcBody = {
  id: number;
  method: string;
  params?: Record<string, unknown>;
};

function jsonResponse(payload: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => payload,
  } as Response;
}

function ok(id: number, result: unknown) {
  return { jsonrpc: '2.0', id, result };
}

function rpcError(id: number, code: number, message: string) {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

function mockFetch(
  handler: (method: string, params: Record<string, unknown> | undefined, id: number) => Response,
) {
  const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as RpcBody;
    return handler(body.method, body.params, body.id);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

/** A Soroban event whose topic array has the given length. */
function announcement(topicLength: number) {
  return { topic: Array.from({ length: topicLength }, (_, i) => `topic-${i}`) };
}

const fullPage = Array.from({ length: 1_000 }, () => announcement(3));

function getEventStartLedgers(fetchMock: ReturnType<typeof mockFetch>): number[] {
  return fetchMock.mock.calls
    .map((call) => JSON.parse(String((call[1] as RequestInit).body)) as RpcBody)
    .filter((body) => body.method === 'getEvents')
    .map((body) => Number(body.params?.startLedger));
}

beforeEach(() => {
  clearStellarMetricsCache();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('getStellarHealth', () => {
  it('reads the retention window from getHealth', async () => {
    mockFetch((method, _params, id) => {
      expect(method).toBe('getHealth');
      return jsonResponse(
        ok(id, {
          status: 'healthy',
          latestLedger: 5_000,
          oldestLedger: 4_000,
          ledgerRetentionWindow: 1_001,
        }),
      );
    });

    await expect(getStellarHealth()).resolves.toEqual({
      latestLedger: 5_000,
      oldestLedger: 4_000,
      ledgerRetentionWindow: 1_001,
    });
  });

  it('derives oldestLedger when the RPC only reports a retention window', async () => {
    mockFetch((_method, _params, id) =>
      jsonResponse(ok(id, { latestLedger: 5_000, ledgerRetentionWindow: 1_001 })),
    );

    await expect(getStellarHealth()).resolves.toEqual({
      latestLedger: 5_000,
      oldestLedger: 4_000,
      ledgerRetentionWindow: 1_001,
    });
  });

  it('rejects a malformed health response', async () => {
    mockFetch((_method, _params, id) => jsonResponse(ok(id, { status: 'healthy' })));

    const error = await getStellarHealth().catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(StellarRpcError);
    expect(error).toMatchObject({ kind: 'malformed' });
  });

  it('classifies a rate-limited response', async () => {
    mockFetch(() => ({ ok: false, status: 429, json: async () => ({}) }) as Response);

    await expect(getStellarHealth()).rejects.toMatchObject({ kind: 'rate-limit' });
  });
});

describe('countStellarEventsInRange', () => {
  it('paginates across a full page and counts announcement events', async () => {
    let eventsCall = 0;
    const fetchMock = mockFetch((_method, _params, id) => {
      eventsCall += 1;
      if (eventsCall === 1) {
        return jsonResponse(ok(id, { events: fullPage, cursor: 'cursor-1' }));
      }
      return jsonResponse(
        ok(id, { events: [announcement(3), announcement(2)], cursor: 'cursor-2' }),
      );
    });

    await expect(countStellarEventsInRange(1, 100)).resolves.toEqual({
      count: 1_001,
      partial: false,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('treats a full page without an advancing cursor as malformed', async () => {
    mockFetch((_method, _params, id) =>
      jsonResponse(ok(id, { events: fullPage, cursor: 'cursor-1' })),
    );

    await expect(countStellarEventsInRange(1, 100)).rejects.toMatchObject({
      kind: 'malformed',
    });
  });

  it('rejects a response whose events field is missing', async () => {
    mockFetch((_method, _params, id) => jsonResponse(ok(id, { cursor: 'cursor-1' })));

    await expect(countStellarEventsInRange(1, 100)).rejects.toMatchObject({
      kind: 'malformed',
    });
  });

  it('classifies an out-of-retention startLedger error', async () => {
    mockFetch((_method, _params, id) =>
      jsonResponse(
        rpcError(id, -32602, 'startLedger must be within the ledger range: 9000 - 10000'),
      ),
    );

    await expect(countStellarEventsInRange(1, 100)).rejects.toMatchObject({
      kind: 'retention',
      code: -32602,
    });
  });

  it('classifies a generic JSON-RPC error', async () => {
    mockFetch((_method, _params, id) => jsonResponse(rpcError(id, -32000, 'internal error')));

    await expect(countStellarEventsInRange(1, 100)).rejects.toMatchObject({ kind: 'rpc' });
  });

  it('returns zero without calling the RPC when the range is inverted', async () => {
    const fetchMock = mockFetch(() => jsonResponse(ok(1, { events: [] })));

    await expect(countStellarEventsInRange(10, 5)).resolves.toEqual({ count: 0, partial: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('fetchStellarMetrics', () => {
  it('clamps windows to retained history and marks them partial', async () => {
    const fetchMock = mockFetch((method, _params, id) => {
      if (method === 'getHealth') {
        return jsonResponse(
          ok(id, { latestLedger: 10_000, oldestLedger: 9_000, ledgerRetentionWindow: 1_001 }),
        );
      }
      return jsonResponse(ok(id, { events: [announcement(3)], cursor: 'cursor-1' }));
    });

    const metrics = await fetchStellarMetrics();

    expect(metrics.last24h).toEqual({ count: 1, partial: true });
    expect(metrics.last7d).toEqual({ count: 1, partial: true });
    expect(metrics.retained).toEqual({ count: 1, partial: false });

    const starts = getEventStartLedgers(fetchMock);
    expect(starts).toHaveLength(3);
    expect(starts.every((start) => start >= 9_000)).toBe(true);
  });

  it('reports full windows when retention covers the requested range', async () => {
    mockFetch((method, _params, id) => {
      if (method === 'getHealth') {
        return jsonResponse(
          ok(id, { latestLedger: 30_000, oldestLedger: 1, ledgerRetentionWindow: 30_000 }),
        );
      }
      return jsonResponse(ok(id, { events: [], cursor: 'cursor-1' }));
    });

    const metrics = await fetchStellarMetrics();

    expect(metrics.last24h).toEqual({ count: 0, partial: false });
    expect(metrics.last7d).toEqual({ count: 0, partial: false });
    expect(metrics.retained).toEqual({ count: 0, partial: false });
  });

  it('surfaces a malformed events response instead of presenting a partial count', async () => {
    mockFetch((method, _params, id) => {
      if (method === 'getHealth') {
        return jsonResponse(
          ok(id, { latestLedger: 10_000, oldestLedger: 9_000, ledgerRetentionWindow: 1_001 }),
        );
      }
      return jsonResponse(ok(id, { cursor: 'cursor-1' }));
    });

    await expect(fetchStellarMetrics()).rejects.toMatchObject({ kind: 'malformed' });
  });
});

describe('loadStellarMetrics', () => {
  it('serves cached metrics within the TTL', async () => {
    const fetchMock = mockFetch((method, _params, id) => {
      if (method === 'getHealth') {
        return jsonResponse(
          ok(id, { latestLedger: 10_000, oldestLedger: 9_000, ledgerRetentionWindow: 1_001 }),
        );
      }
      return jsonResponse(ok(id, { events: [], cursor: 'cursor-1' }));
    });

    await loadStellarMetrics();
    await loadStellarMetrics();

    const healthCalls = fetchMock.mock.calls.filter((call) => {
      const body = JSON.parse(String((call[1] as RequestInit).body)) as RpcBody;
      return body.method === 'getHealth';
    });

    expect(healthCalls).toHaveLength(1);
  });
});
