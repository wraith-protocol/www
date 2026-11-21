import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  RELOAD_GUARD_STORAGE_KEY,
  attemptBoundedChunkReload,
  canAttemptChunkReload,
  clearChunkReloadGuard,
  getReloadAttemptCount,
  installVitePreloadRecovery,
  isChunkLoadError,
  isRetryableImportError,
  loadModuleWithRetry,
} from '../utils/lazyWithRecovery';

function setNavigatorOnline(online: boolean): void {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value: online,
  });
}

describe('lazyWithRecovery utilities', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    setNavigatorOnline(true);
  });

  afterEach(() => {
    window.sessionStorage.clear();
    setNavigatorOnline(true);
    vi.restoreAllMocks();
  });

  describe('error classification', () => {
    it('identifies chunk load errors across Chrome, Safari, Firefox, and Vite', () => {
      const chunkErrors = [
        new TypeError(
          'Failed to fetch dynamically imported module: https://usewraith.xyz/assets/Faq-abc.js',
        ),
        new Error('Importing a module script failed.'),
        new Error('error loading dynamically imported module'),
        new Error('Unable to preload CSS for /assets/Stellar-123.css'),
        Object.assign(new Error('Loading chunk 42 failed.'), { name: 'ChunkLoadError' }),
      ];

      for (const err of chunkErrors) {
        expect(isChunkLoadError(err)).toBe(true);
        expect(isRetryableImportError(err)).toBe(true);
      }
    });

    it('does not classify ordinary application runtime errors as chunk errors', () => {
      const runtimeErrors = [
        new ReferenceError('foo is not defined'),
        new SyntaxError('Unexpected token'),
        new Error('Invalid wallet address'),
        null,
        undefined,
      ];

      for (const err of runtimeErrors) {
        expect(isChunkLoadError(err)).toBe(false);
        expect(isRetryableImportError(err)).toBe(false);
      }
    });
  });

  describe('sessionStorage bounded reload guard', () => {
    it('permits a single reload per route window and blocks subsequent reload loops', () => {
      const reload = vi.fn();
      let currentTime = 1_000;
      const now = () => currentTime;

      expect(canAttemptChunkReload({ path: '/stellar', now })).toBe(true);

      const first = attemptBoundedChunkReload({
        path: '/stellar',
        reload,
        maxReloads: 1,
        windowMs: 60_000,
        now,
      });

      expect(first).toEqual({ reloaded: true, reason: 'reloaded', count: 1 });
      expect(reload).toHaveBeenCalledTimes(1);
      expect(getReloadAttemptCount({ path: '/stellar', now })).toBe(1);
      expect(canAttemptChunkReload({ path: '/stellar', maxReloads: 1, now })).toBe(false);

      const second = attemptBoundedChunkReload({
        path: '/stellar',
        reload,
        maxReloads: 1,
        windowMs: 60_000,
        now,
      });

      expect(second).toEqual({ reloaded: false, reason: 'limit_reached', count: 1 });
      expect(reload).toHaveBeenCalledTimes(1);

      // Different route path is tracked independently
      expect(canAttemptChunkReload({ path: '/faq', maxReloads: 1, now })).toBe(true);

      // Once the window expires, reload is allowed again
      currentTime += 61_000;
      expect(
        canAttemptChunkReload({ path: '/stellar', maxReloads: 1, windowMs: 60_000, now }),
      ).toBe(true);
    });

    it('blocks reload attempts when the browser is offline', () => {
      setNavigatorOnline(false);
      const reload = vi.fn();

      expect(canAttemptChunkReload({ path: '/blog' })).toBe(false);
      const result = attemptBoundedChunkReload({ path: '/blog', reload });

      expect(result).toEqual({ reloaded: false, reason: 'offline', count: 0 });
      expect(reload).not.toHaveBeenCalled();
    });

    it('clears the reload guard after a successful load', () => {
      const reload = vi.fn();
      attemptBoundedChunkReload({ path: '/grants', reload });
      expect(window.sessionStorage.getItem(RELOAD_GUARD_STORAGE_KEY)).not.toBeNull();

      clearChunkReloadGuard();
      expect(window.sessionStorage.getItem(RELOAD_GUARD_STORAGE_KEY)).toBeNull();
      expect(getReloadAttemptCount({ path: '/grants' })).toBe(0);
    });

    it('handles storage errors gracefully without crashing', () => {
      const throwingStorage = {
        getItem: () => {
          throw new Error('SecurityError');
        },
        setItem: () => {
          throw new Error('SecurityError');
        },
        removeItem: () => {
          throw new Error('SecurityError');
        },
      } as unknown as Storage;

      const reload = vi.fn();
      expect(getReloadAttemptCount({ path: '/faq', storage: throwingStorage })).toBe(0);
      const result = attemptBoundedChunkReload({
        path: '/faq',
        storage: throwingStorage,
        reload,
      });
      expect(result.reloaded).toBe(true);
      expect(() => clearChunkReloadGuard(throwingStorage)).not.toThrow();
    });
  });

  describe('loadModuleWithRetry', () => {
    it('retries a transient chunk error once and clears the reload guard on recovery', async () => {
      const reload = vi.fn();
      attemptBoundedChunkReload({ path: '/stellar', reload });
      expect(window.sessionStorage.getItem(RELOAD_GUARD_STORAGE_KEY)).not.toBeNull();

      let calls = 0;
      const importer = vi.fn(async () => {
        calls += 1;
        if (calls === 1) {
          throw new TypeError('Failed to fetch dynamically imported module');
        }
        return { default: () => null };
      });

      const mod = await loadModuleWithRetry(importer, { maxRetries: 1, retryDelayMs: 0 });
      expect(mod).toHaveProperty('default');
      expect(importer).toHaveBeenCalledTimes(2);
      expect(window.sessionStorage.getItem(RELOAD_GUARD_STORAGE_KEY)).toBeNull();
    });

    it('stops retrying once the bounded retry count is exhausted', async () => {
      const importer = vi.fn(async () => {
        throw new TypeError('Failed to fetch dynamically imported module');
      });

      await expect(
        loadModuleWithRetry(importer, { maxRetries: 2, retryDelayMs: 0 }),
      ).rejects.toThrow(/dynamically imported module/i);

      expect(importer).toHaveBeenCalledTimes(3);
    });

    it('fails fast without retrying when offline', async () => {
      setNavigatorOnline(false);
      const importer = vi.fn(async () => {
        throw new TypeError('Failed to fetch dynamically imported module');
      });

      await expect(
        loadModuleWithRetry(importer, { maxRetries: 2, retryDelayMs: 0 }),
      ).rejects.toThrow();

      expect(importer).toHaveBeenCalledTimes(1);
    });

    it('fails fast without retrying non-chunk runtime errors', async () => {
      const importer = vi.fn(async () => {
        throw new ReferenceError('broken export');
      });

      await expect(
        loadModuleWithRetry(importer, { maxRetries: 2, retryDelayMs: 0 }),
      ).rejects.toThrow(/broken export/i);

      expect(importer).toHaveBeenCalledTimes(1);
    });

    it('guards optional autoReload so stale chunks reload at most once', async () => {
      const reload = vi.fn();
      const importer = vi.fn(async () => {
        throw new TypeError('Failed to fetch dynamically imported module');
      });

      await expect(
        loadModuleWithRetry(importer, {
          maxRetries: 0,
          autoReload: true,
          path: '/roadmap',
          reload,
          maxReloads: 1,
        }),
      ).rejects.toThrow();

      await expect(
        loadModuleWithRetry(importer, {
          maxRetries: 0,
          autoReload: true,
          path: '/roadmap',
          reload,
          maxReloads: 1,
        }),
      ).rejects.toThrow();

      expect(reload).toHaveBeenCalledTimes(1);
    });
  });

  describe('installVitePreloadRecovery', () => {
    it('prevents default and reloads at most once on vite:preloadError', () => {
      const reload = vi.fn();
      const uninstall = installVitePreloadRecovery({ path: '/blog', reload, maxReloads: 1 });

      const firstEvent = new Event('vite:preloadError', { cancelable: true });
      window.dispatchEvent(firstEvent);
      expect(firstEvent.defaultPrevented).toBe(true);
      expect(reload).toHaveBeenCalledTimes(1);

      const secondEvent = new Event('vite:preloadError', { cancelable: true });
      window.dispatchEvent(secondEvent);
      expect(secondEvent.defaultPrevented).toBe(false);
      expect(reload).toHaveBeenCalledTimes(1);

      uninstall();
    });
  });
});
