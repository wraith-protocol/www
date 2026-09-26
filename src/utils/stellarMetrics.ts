import { getDeployment } from '@wraith-protocol/sdk/chains/stellar';

/**
 * Stellar Soroban RPC metrics for the announcer contract.
 *
 * The public RPC only retains a bounded window of ledger history, so a naive
 * "count from ledger 1" is both slow and wrong: it silently presents a partial
 * count as all-time activity. This module reads the RPC's actual retention
 * window from `getHealth`, clamps every query to it, and reports when a metric
 * only covers part of the requested range.
 */

const { sorobanUrl: rpcUrl, contracts } = getDeployment('stellar');
const contractId = contracts.announcer;

/** ~1 ledger per 5s on Stellar testnet. */
const LEDGERS_PER_DAY = 17_280;
const LEDGERS_PER_WEEK = 120_960;

/** Page size accepted by `getEvents`, and a hard cap on pagination work. */
const PAGE_LIMIT = 1_000;
const MAX_PAGES = 50;

const CACHE_TTL = 5 * 60 * 1000;

type CacheEntry = {
  data: StellarMetrics;
  expiry: number;
};

const cache = new Map<string, CacheEntry>();

let requestId = 0;

export type StellarRpcErrorKind =
  | 'network'
  | 'http'
  | 'rate-limit'
  | 'rpc'
  | 'retention'
  | 'malformed';

export class StellarRpcError extends Error {
  readonly kind: StellarRpcErrorKind;
  readonly code?: number;
  readonly cause?: unknown;

  constructor(
    kind: StellarRpcErrorKind,
    message: string,
    options?: { cause?: unknown; code?: number },
  ) {
    super(message);
    this.name = 'StellarRpcError';
    this.kind = kind;
    this.code = options?.code;
    this.cause = options?.cause;
  }
}

export type StellarRpcHealth = {
  latestLedger: number;
  oldestLedger: number;
  ledgerRetentionWindow: number;
};

/**
 * A metric value scoped to a ledger window.
 *
 * `partial` is true when the value covers less than the full requested range —
 * either because the window predates the RPC's retained history, or because
 * pagination stopped at the safety budget.
 */
export type MetricWindow = {
  count: number;
  partial: boolean;
};

export type StellarMetrics = {
  last24h: MetricWindow;
  last7d: MetricWindow;
  /** Everything the RPC still retains — explicitly not an all-time count. */
  retained: MetricWindow;
  latestLedger: number;
  oldestLedger: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function expectNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new StellarRpcError('malformed', `Soroban RPC response is missing a valid "${field}"`);
  }
  return value;
}

function isRetentionError(message: string): boolean {
  return /startLedger|retention|ledger range|oldest ledger|out of range/i.test(message);
}

type JsonRpcPayload = {
  error?: unknown;
  result?: unknown;
};

function parseJsonRpcPayload(payload: unknown, method: string): unknown {
  if (!isRecord(payload)) {
    throw new StellarRpcError(
      'malformed',
      `Soroban RPC returned a non-object response (${method})`,
    );
  }

  const envelope = payload as JsonRpcPayload;

  if (envelope.error !== undefined) {
    if (!isRecord(envelope.error)) {
      throw new StellarRpcError('rpc', `Soroban RPC returned an invalid error (${method})`);
    }

    const message = typeof envelope.error.message === 'string' ? envelope.error.message : '';
    const code = typeof envelope.error.code === 'number' ? envelope.error.code : undefined;
    const kind: StellarRpcErrorKind = isRetentionError(message) ? 'retention' : 'rpc';

    throw new StellarRpcError(kind, `Soroban RPC error (${method}): ${message || 'unknown'}`, {
      code,
    });
  }

  if (!isRecord(envelope.result)) {
    throw new StellarRpcError('malformed', `Soroban RPC response is missing a result (${method})`);
  }

  return envelope.result;
}

async function rpcRequest(method: string, params?: unknown): Promise<Record<string, unknown>> {
  let response: Response;

  try {
    response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: (requestId += 1),
        method,
        ...(params === undefined ? {} : { params }),
      }),
    });
  } catch (cause) {
    throw new StellarRpcError('network', `Could not reach the Soroban RPC (${method})`, { cause });
  }

  if (response.status === 429) {
    throw new StellarRpcError('rate-limit', `Soroban RPC rate-limited the request (${method})`);
  }

  if (!response.ok) {
    throw new StellarRpcError(
      'http',
      `Soroban RPC responded with HTTP ${response.status} (${method})`,
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (cause) {
    throw new StellarRpcError('malformed', `Soroban RPC returned invalid JSON (${method})`, {
      cause,
    });
  }

  return parseJsonRpcPayload(payload, method) as Record<string, unknown>;
}

/**
 * Reads the RPC's health and retention window.
 *
 * `oldestLedger` is the authoritative floor for event queries. Older nodes that
 * omit it fall back to `latestLedger - ledgerRetentionWindow + 1`.
 */
export async function getStellarHealth(): Promise<StellarRpcHealth> {
  const result = await rpcRequest('getHealth');

  const latestLedger = expectNumber(result.latestLedger, 'latestLedger');
  let oldestLedger: number;
  let ledgerRetentionWindow: number;

  if (result.oldestLedger !== undefined) {
    oldestLedger = expectNumber(result.oldestLedger, 'oldestLedger');
    ledgerRetentionWindow =
      result.ledgerRetentionWindow !== undefined
        ? expectNumber(result.ledgerRetentionWindow, 'ledgerRetentionWindow')
        : Math.max(1, latestLedger - oldestLedger + 1);
  } else {
    ledgerRetentionWindow = expectNumber(result.ledgerRetentionWindow, 'ledgerRetentionWindow');
    oldestLedger = Math.max(1, latestLedger - ledgerRetentionWindow + 1);
  }

  if (oldestLedger > latestLedger) {
    throw new StellarRpcError(
      'malformed',
      'Soroban RPC reported an oldestLedger newer than its latestLedger',
    );
  }

  return { latestLedger, oldestLedger, ledgerRetentionWindow };
}

/**
 * Counts announcer events within an inclusive ledger range.
 *
 * Responses and pagination are validated: a full page without an advancing
 * cursor is treated as malformed rather than being silently dropped.
 */
export async function countStellarEventsInRange(
  startLedger: number,
  endLedger: number,
): Promise<MetricWindow> {
  if (startLedger > endLedger) {
    return { count: 0, partial: false };
  }

  let count = 0;
  let cursor: string | undefined;
  let partial = false;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const params: Record<string, unknown> = {
      filters: [{ type: 'contract', contractIds: [contractId] }],
      pagination: cursor === undefined ? { limit: PAGE_LIMIT } : { limit: PAGE_LIMIT, cursor },
    };

    if (cursor === undefined) {
      params.startLedger = startLedger;
    }

    const result = await rpcRequest('getEvents', params);
    const events = result.events;

    if (!Array.isArray(events)) {
      throw new StellarRpcError('malformed', 'Soroban RPC getEvents response has no events array');
    }

    for (const event of events) {
      if (!isRecord(event)) {
        throw new StellarRpcError('malformed', 'Soroban RPC returned a malformed event');
      }

      if (Array.isArray(event.topic) && event.topic.length >= 3) {
        count += 1;
      }
    }

    if (events.length < PAGE_LIMIT) {
      return { count, partial };
    }

    const nextCursor = result.cursor;
    if (typeof nextCursor !== 'string' || nextCursor.length === 0 || nextCursor === cursor) {
      throw new StellarRpcError(
        'malformed',
        'Soroban RPC returned a full page without a usable pagination cursor',
      );
    }

    cursor = nextCursor;
    partial = page + 1 >= MAX_PAGES;
  }

  return { count, partial: true };
}

/**
 * Fetches windowed announcer counts, clamped to the RPC's retained history.
 *
 * The returned `retained` window is the full retained range — it is a bounded
 * "since retention" figure, never an all-time total.
 */
export async function fetchStellarMetrics(): Promise<StellarMetrics> {
  const { latestLedger, oldestLedger } = await getStellarHealth();

  const dayStart = Math.max(1, latestLedger - LEDGERS_PER_DAY);
  const weekStart = Math.max(1, latestLedger - LEDGERS_PER_WEEK);

  const last24hStart = Math.max(dayStart, oldestLedger);
  const last7dStart = Math.max(weekStart, oldestLedger);

  const [last24h, last7d, retained] = await Promise.all([
    countStellarEventsInRange(last24hStart, latestLedger),
    countStellarEventsInRange(last7dStart, latestLedger),
    countStellarEventsInRange(oldestLedger, latestLedger),
  ]);

  return {
    latestLedger,
    oldestLedger,
    last24h: {
      count: last24h.count,
      partial: last24h.partial || last24hStart > dayStart,
    },
    last7d: {
      count: last7d.count,
      partial: last7d.partial || last7dStart > weekStart,
    },
    retained,
  };
}

/** Clears the in-memory cache. Intended for tests. */
export function clearStellarMetricsCache(): void {
  cache.clear();
}

/**
 * Returns cached metrics when fresh, otherwise fetches them.
 *
 * The 5-minute TTL keeps scroll and revisit traffic from hammering the RPC.
 */
export async function loadStellarMetrics(force = false): Promise<StellarMetrics> {
  const key = 'metrics';
  const cached = cache.get(key);

  if (!force && cached && Date.now() < cached.expiry) {
    return cached.data;
  }

  const data = await fetchStellarMetrics();
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL });
  return data;
}
