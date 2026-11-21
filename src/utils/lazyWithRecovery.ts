import {
  createContext,
  createElement,
  lazy,
  useContext,
  type ComponentProps,
  type ComponentType,
  type LazyExoticComponent,
} from 'react';

export const RELOAD_GUARD_STORAGE_KEY = 'wraith:route-reload-guard';
export const DEFAULT_MAX_AUTO_RETRIES = 1;
export const DEFAULT_RETRY_DELAY_MS = 150;
export const DEFAULT_MAX_RELOADS = 1;
export const DEFAULT_RELOAD_WINDOW_MS = 60_000;

export interface RouteRecoveryContextValue {
  boundaryId: number;
  retryVersion: number;
}

export const RouteRecoveryContext = createContext<RouteRecoveryContextValue>({
  boundaryId: 0,
  retryVersion: 0,
});

export function useRouteRecovery(): RouteRecoveryContextValue {
  return useContext(RouteRecoveryContext);
}

export interface ReloadGuardRecord {
  path: string;
  count: number;
  timestamp: number;
}

export interface ReloadGuardOptions {
  path?: string;
  storage?: Storage | null;
  maxReloads?: number;
  windowMs?: number;
  now?: () => number;
  reload?: () => void;
  offline?: boolean;
}

export interface ReloadAttemptResult {
  reloaded: boolean;
  reason: 'reloaded' | 'offline' | 'limit_reached' | 'unavailable';
  count: number;
}

export interface LazyRecoveryOptions {
  /** Automatic in-flight retries before surfacing the error to a boundary. */
  maxRetries?: number;
  /** Delay between automatic in-flight retries in milliseconds. */
  retryDelayMs?: number;
  /** Optional bounded reload attempt when a chunk load error occurs. */
  autoReload?: boolean;
  /** Maximum guarded reloads within the reload window. */
  maxReloads?: number;
  /** Time window for the sessionStorage reload guard in milliseconds. */
  reloadWindowMs?: number;
  /** Optional reload function override for deterministic testing. */
  reload?: () => void;
  /** Optional Storage override for deterministic testing. */
  storage?: Storage | null;
  /** Optional path override for deterministic testing. */
  path?: string;
  /** Optional clock override for deterministic testing. */
  now?: () => number;
}

const CHUNK_ERROR_PATTERNS = [
  /chunkloaderror/i,
  /loading\s+(?:css\s+)?chunk\s+\S+\s+failed/i,
  /failed to fetch dynamically imported module/i,
  /importing a module script failed/i,
  /error loading dynamically imported module/i,
  /unable to preload css/i,
  /failed to load module script/i,
  /dynamically imported module/i,
];

const NETWORK_ERROR_PATTERNS = [/networkerror/i, /failed to fetch/i, /load failed/i];

function getErrorSignature(error: unknown): { name: string; message: string } {
  if (error instanceof Error) {
    return { name: error.name || '', message: error.message || '' };
  }
  if (typeof error === 'object' && error !== null) {
    const candidate = error as { name?: unknown; message?: unknown };
    return {
      name: typeof candidate.name === 'string' ? candidate.name : '',
      message: typeof candidate.message === 'string' ? candidate.message : '',
    };
  }
  if (typeof error === 'string') {
    return { name: '', message: error };
  }
  return { name: '', message: '' };
}

/**
 * Returns true when the browser reports an offline network state.
 */
export function isBrowserOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

/**
 * Identifies dynamic import / stale deployment chunk failures across browsers.
 */
export function isChunkLoadError(error: unknown): boolean {
  const { name, message } = getErrorSignature(error);
  const combined = `${name} ${message}`.trim();
  if (!combined) return false;
  return CHUNK_ERROR_PATTERNS.some((pattern) => pattern.test(combined));
}

/**
 * Identifies errors caused by stale chunks or transient network import failures.
 */
export function isRetryableImportError(error: unknown): boolean {
  if (isChunkLoadError(error)) return true;
  const { name, message } = getErrorSignature(error);
  const combined = `${name} ${message}`.trim();
  return NETWORK_ERROR_PATTERNS.some((pattern) => pattern.test(combined));
}

function getDefaultStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

function getCurrentPath(override?: string): string {
  if (typeof override === 'string') return override;
  if (typeof window !== 'undefined' && window.location) {
    return `${window.location.pathname}${window.location.search}`;
  }
  return '/';
}

function defaultReload(): void {
  if (typeof window !== 'undefined' && window.location) {
    window.location.reload();
  }
}

/**
 * Reads an active reload-guard record for the target route within the guard window.
 */
export function getReloadGuardRecord(options: ReloadGuardOptions = {}): ReloadGuardRecord | null {
  const storage = options.storage !== undefined ? options.storage : getDefaultStorage();
  if (!storage) return null;

  const path = getCurrentPath(options.path);
  const windowMs = options.windowMs ?? DEFAULT_RELOAD_WINDOW_MS;
  const now = (options.now ?? Date.now)();

  try {
    const raw = storage.getItem(RELOAD_GUARD_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<ReloadGuardRecord>;
    if (
      typeof parsed.path !== 'string' ||
      typeof parsed.count !== 'number' ||
      typeof parsed.timestamp !== 'number'
    ) {
      return null;
    }

    if (parsed.path !== path) return null;
    if (now - parsed.timestamp > windowMs) return null;

    return {
      path: parsed.path,
      count: parsed.count,
      timestamp: parsed.timestamp,
    };
  } catch {
    return null;
  }
}

/**
 * Returns the number of guarded reloads already recorded for this route window.
 */
export function getReloadAttemptCount(options: ReloadGuardOptions = {}): number {
  return getReloadGuardRecord(options)?.count ?? 0;
}

/**
 * Determines whether a bounded reload can be attempted without risking a reload loop.
 */
export function canAttemptChunkReload(options: ReloadGuardOptions = {}): boolean {
  const offline = options.offline ?? isBrowserOffline();
  if (offline) return false;

  const maxReloads = options.maxReloads ?? DEFAULT_MAX_RELOADS;
  if (maxReloads <= 0) return false;

  return getReloadAttemptCount(options) < maxReloads;
}

/**
 * Clears the reload guard after a lazy route or section loads successfully.
 */
export function clearChunkReloadGuard(storage?: Storage | null): void {
  const target = storage !== undefined ? storage : getDefaultStorage();
  if (!target) return;
  try {
    target.removeItem(RELOAD_GUARD_STORAGE_KEY);
  } catch {
    // Ignore storage access restrictions in hardened browser modes.
  }
}

/**
 * Attempts a single bounded reload guarded by sessionStorage so invalidated
 * deployment chunks never trigger an infinite reload loop.
 */
export function attemptBoundedChunkReload(options: ReloadGuardOptions = {}): ReloadAttemptResult {
  const offline = options.offline ?? isBrowserOffline();
  const count = getReloadAttemptCount(options);
  if (offline) {
    return { reloaded: false, reason: 'offline', count };
  }

  const maxReloads = options.maxReloads ?? DEFAULT_MAX_RELOADS;
  if (count >= maxReloads) {
    return { reloaded: false, reason: 'limit_reached', count };
  }

  const storage = options.storage !== undefined ? options.storage : getDefaultStorage();
  const path = getCurrentPath(options.path);
  const now = (options.now ?? Date.now)();
  const nextCount = count + 1;

  if (storage) {
    try {
      const record: ReloadGuardRecord = {
        path,
        count: nextCount,
        timestamp: now,
      };
      storage.setItem(RELOAD_GUARD_STORAGE_KEY, JSON.stringify(record));
    } catch {
      // Proceed with reload even if sessionStorage write is blocked.
    }
  }

  const reload = options.reload ?? defaultReload;
  try {
    reload();
    return { reloaded: true, reason: 'reloaded', count: nextCount };
  } catch {
    return { reloaded: false, reason: 'unavailable', count: nextCount };
  }
}

/**
 * Attaches a bounded recovery handler to Vite's `vite:preloadError` event so
 * stale hashed assets after a deployment trigger at most one reload per window.
 */
export function installVitePreloadRecovery(options: ReloadGuardOptions = {}): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handlePreloadError = (event: Event) => {
    const result = attemptBoundedChunkReload(options);
    if (result.reloaded) {
      event.preventDefault();
    }
  };

  window.addEventListener('vite:preloadError', handlePreloadError);
  return () => {
    window.removeEventListener('vite:preloadError', handlePreloadError);
  };
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Loads a lazy module with bounded retry on transient network/chunk failures.
 * Skips retries immediately when offline or when the failure is not an import error.
 */
export async function loadModuleWithRetry<T>(
  importer: () => Promise<T>,
  options: LazyRecoveryOptions = {},
): Promise<T> {
  const maxRetries = Math.max(0, options.maxRetries ?? DEFAULT_MAX_AUTO_RETRIES);
  const retryDelayMs = Math.max(0, options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS);
  const storage = options.storage;

  let attempt = 0;

  while (true) {
    try {
      const loaded = await importer();
      clearChunkReloadGuard(storage);
      return loaded;
    } catch (error) {
      const canRetry = attempt < maxRetries && !isBrowserOffline() && isRetryableImportError(error);

      if (canRetry) {
        attempt += 1;
        if (retryDelayMs > 0) {
          await wait(retryDelayMs);
        }
        continue;
      }

      if (options.autoReload && isChunkLoadError(error)) {
        attemptBoundedChunkReload({
          path: options.path,
          storage: options.storage,
          maxReloads: options.maxReloads,
          windowMs: options.reloadWindowMs,
          now: options.now,
          reload: options.reload,
        });
      }

      throw error;
    }
  }
}

const MAX_CACHED_LAZY_ENTRIES = 4;

/**
 * Wraps a dynamic import in a retry-aware lazy component that integrates with
 * RouteBoundary so manual retries or route resets create a fresh lazy loader
 * instead of rethrowing a permanently cached rejected promise.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithRecovery<T extends ComponentType<any>>(
  importer: () => Promise<{ default: T }>,
  options: LazyRecoveryOptions = {},
): ComponentType<ComponentProps<T>> {
  let sharedResolvedLazy: LazyExoticComponent<T> | null = null;
  const cache = new Map<string, LazyExoticComponent<T>>();

  function LazyRecoveredComponent(props: ComponentProps<T>) {
    const { boundaryId, retryVersion } = useRouteRecovery();

    if (retryVersion === 0 && sharedResolvedLazy) {
      return createElement(sharedResolvedLazy, props);
    }

    const cacheKey = `${boundaryId}:${retryVersion}`;
    let Component = cache.get(cacheKey);
    if (!Component) {
      if (cache.size >= MAX_CACHED_LAZY_ENTRIES) {
        const oldestKey = cache.keys().next().value;
        if (oldestKey !== undefined) {
          cache.delete(oldestKey);
        }
      }
      const nextLazy = lazy(() =>
        loadModuleWithRetry(importer, options).then((mod) => {
          sharedResolvedLazy = nextLazy;
          return mod;
        }),
      );
      Component = nextLazy;
      cache.set(cacheKey, Component);
    }

    return createElement(Component, props);
  }

  LazyRecoveredComponent.displayName = 'LazyRecoveredComponent';

  return LazyRecoveredComponent;
}
