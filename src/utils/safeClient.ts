/**
 * Shared, privacy-safe request client for status and metrics endpoints.
 *
 * One client for every status/metrics consumer (status page, footer badge,
 * trust strip, Stellar metrics) so polling, caching and error handling stop
 * drifting apart. It provides:
 *
 * - schema validation of every response before it is used,
 * - a per-request timeout and external abort support,
 * - deduplication of concurrent identical requests,
 * - cache freshness (a fresh entry is served without a fetch; a stale entry
 *   is served only while offline or when the caller opts into it),
 * - a bounded retry budget with exponential backoff,
 * - privacy-safe errors: messages never contain URLs, status bodies or raw
 *   response payloads, and requests never send credentials.
 *
 * Nothing sensitive is ever stored: the cache holds validated, typed data
 * only, and only in memory.
 */

export type SafeClientErrorKind =
  | 'aborted'
  | 'http'
  | 'malformed'
  | 'network'
  | 'offline'
  | 'rate-limit'
  | 'timeout';

/** Generic, privacy-safe message per failure kind. No URLs, no payloads. */
const SAFE_MESSAGES: Record<SafeClientErrorKind, string> = {
  aborted: 'The request was cancelled.',
  http: 'The service returned an error.',
  malformed: 'The service returned an unexpected response.',
  network: 'The service could not be reached.',
  offline: 'You appear to be offline.',
  'rate-limit': 'The service is rate limited. Please try again shortly.',
  timeout: 'The request timed out.',
};

export class SafeClientError extends Error {
  readonly kind: SafeClientErrorKind;
  readonly status?: number;

  constructor(kind: SafeClientErrorKind, options?: { status?: number }) {
    super(SAFE_MESSAGES[kind]);
    this.name = 'SafeClientError';
    this.kind = kind;
    this.status = options?.status;
  }
}

/** Turns any failure into a message that is safe to show or log. */
export function safeErrorMessage(error: unknown): string {
  if (error instanceof SafeClientError) return error.message;
  if (isAbortError(error)) return SAFE_MESSAGES.aborted;
  if (error instanceof TypeError) return SAFE_MESSAGES.network;
  return SAFE_MESSAGES.network;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isAbortError(value: unknown): boolean {
  return isRecord(value) && value.name === 'AbortError';
}

export const SAFE_CLIENT_DEFAULT_TIMEOUT_MS = 8_000;
export const SAFE_CLIENT_DEFAULT_MAX_ATTEMPTS = 3;
export const SAFE_CLIENT_DEFAULT_RETRY_BASE_DELAY_MS = 300;
export const SAFE_CLIENT_DEFAULT_CACHE_TTL_MS = 60_000;

export type SafeRequestOptions = {
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
  maxAttempts?: number;
  retryBaseDelayMs?: number;
  signal?: AbortSignal;
  /** Milliseconds a response stays fresh in the cache. 0 disables caching. */
  cacheTtlMs?: number;
  /** Serve a stale cached entry instead of throwing when the request fails. */
  serveStaleOnError?: boolean;
  /** Share one in-flight request between concurrent identical callers. */
  dedupe?: boolean;
};

export type SafeResponse<T> = {
  data: T;
  /** True when the data came from an expired cache entry. */
  stale: boolean;
  /** True when the data came from the cache without a fetch. */
  fromCache: boolean;
};

type CacheEntry = {
  data: unknown;
  expiry: number;
};

const cache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<SafeResponse<unknown>>>();

/** Clears the in-memory cache. Intended for tests. */
export function clearSafeClientCache(): void {
  cache.clear();
}

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

function cacheKeyFor(method: string, url: string, body: unknown): string {
  if (body === undefined) return `${method}:${url}`;
  try {
    return `${method}:${url}:${JSON.stringify(body)}`;
  } catch {
    return `${method}:${url}`;
  }
}

/** Transient failures worth retrying; everything else fails fast. */
function isRetryable(error: SafeClientError): boolean {
  if (error.kind === 'network' || error.kind === 'rate-limit' || error.kind === 'timeout') {
    return true;
  }
  return error.kind === 'http' && typeof error.status === 'number' && error.status >= 500;
}

function toSafeClientError(cause: unknown): SafeClientError {
  if (cause instanceof SafeClientError) return cause;
  return new SafeClientError('network');
}

/** A single round-trip with a hard timeout and external-abort forwarding. */
async function fetchJsonOnce<T>(
  url: string,
  validate: (payload: unknown) => T,
  options: {
    method: 'GET' | 'POST';
    headers?: Record<string, string>;
    body?: unknown;
    timeoutMs: number;
    signal?: AbortSignal;
  },
): Promise<T> {
  const { method, headers, body, timeoutMs, signal } = options;
  const controller = new AbortController();
  let timedOut = false;

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const forwardAbort = () => controller.abort();

  if (signal?.aborted) {
    clearTimeout(timer);
    throw new SafeClientError('aborted');
  }
  signal?.addEventListener('abort', forwardAbort, { once: true });

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: { Accept: 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
      // Status and metrics requests never carry credentials.
      credentials: 'omit',
      signal: controller.signal,
    });
  } catch (cause) {
    if (signal?.aborted) {
      throw new SafeClientError('aborted');
    }
    if (timedOut || isAbortError(cause)) {
      throw new SafeClientError('timeout');
    }
    throw new SafeClientError('network');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', forwardAbort);
  }

  if (response.status === 429) {
    throw new SafeClientError('rate-limit', { status: 429 });
  }
  if (!response.ok) {
    throw new SafeClientError('http', { status: response.status });
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new SafeClientError('malformed');
  }

  try {
    return validate(payload);
  } catch (cause) {
    if (cause instanceof SafeClientError) throw cause;
    throw new SafeClientError('malformed');
  }
}

/** Waits between retries, but bails immediately if the caller aborts. */
function waitBeforeRetry(
  attempt: number,
  retryBaseDelayMs: number,
  signal?: AbortSignal,
): Promise<void> {
  const delayMs = retryBaseDelayMs * 2 ** (attempt - 1);

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new SafeClientError('aborted'));
      return;
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, delayMs);

    const onAbort = () => {
      clearTimeout(timer);
      reject(new SafeClientError('aborted'));
    };

    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/** A round-trip with a bounded retry budget and exponential backoff. */
async function runWithRetries<T>(
  url: string,
  validate: (payload: unknown) => T,
  options: {
    method: 'GET' | 'POST';
    headers?: Record<string, string>;
    body?: unknown;
    timeoutMs: number;
    maxAttempts: number;
    retryBaseDelayMs: number;
    signal?: AbortSignal;
  },
): Promise<T> {
  const { maxAttempts, retryBaseDelayMs, signal } = options;
  let lastError: SafeClientError | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await fetchJsonOnce(url, validate, options);
    } catch (cause) {
      const error = toSafeClientError(cause);

      if (!isRetryable(error) || attempt === maxAttempts) {
        throw error;
      }

      lastError = error;
      await waitBeforeRetry(attempt, retryBaseDelayMs, signal);
    }
  }

  throw lastError ?? new SafeClientError('network');
}

/**
 * Fetches JSON and validates it against a schema before returning it.
 *
 * A fresh cached entry is returned without a fetch. While offline, a stale
 * cached entry is returned instead of throwing. Concurrent identical calls
 * share one in-flight request. Failures are reported as `SafeClientError`
 * with a privacy-safe message — the URL and the raw response are never
 * included.
 */
export async function requestJson<T>(
  url: string,
  validate: (payload: unknown) => T,
  options: SafeRequestOptions = {},
): Promise<SafeResponse<T>> {
  const {
    method = 'GET',
    headers,
    body,
    timeoutMs = SAFE_CLIENT_DEFAULT_TIMEOUT_MS,
    maxAttempts = SAFE_CLIENT_DEFAULT_MAX_ATTEMPTS,
    retryBaseDelayMs = SAFE_CLIENT_DEFAULT_RETRY_BASE_DELAY_MS,
    signal,
    cacheTtlMs = method === 'GET' ? SAFE_CLIENT_DEFAULT_CACHE_TTL_MS : 0,
    serveStaleOnError = false,
    dedupe = true,
  } = options;

  const key = cacheKeyFor(method, url, body);
  const cached = cacheTtlMs > 0 ? cache.get(key) : undefined;
  const fresh = cached !== undefined && Date.now() < cached.expiry;

  if (fresh) {
    return { data: cached.data as T, stale: false, fromCache: true };
  }

  if (isOffline()) {
    if (cached !== undefined) {
      return { data: cached.data as T, stale: true, fromCache: true };
    }
    throw new SafeClientError('offline');
  }

  if (dedupe) {
    const inFlight = inFlightRequests.get(key);
    if (inFlight !== undefined) {
      return inFlight as Promise<SafeResponse<T>>;
    }
  }

  const promise = runWithRetries<T>(url, validate, {
    method,
    headers,
    body,
    timeoutMs,
    maxAttempts,
    retryBaseDelayMs,
    signal,
  }).then(
    (data) => {
      if (cacheTtlMs > 0) {
        cache.set(key, { data, expiry: Date.now() + cacheTtlMs });
      }
      return { data, stale: false, fromCache: false };
    },
    (error: unknown) => {
      if (serveStaleOnError && cached !== undefined) {
        return { data: cached.data as T, stale: true, fromCache: true };
      }
      throw error;
    },
  );

  if (dedupe) {
    inFlightRequests.set(key, promise as Promise<SafeResponse<unknown>>);
    // Drop the entry once it settles so later calls fetch again.
    void promise.then(
      () => {
        inFlightRequests.delete(key);
      },
      () => {
        inFlightRequests.delete(key);
      },
    );
  }

  return promise;
}
