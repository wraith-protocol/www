import { useCallback, useEffect, useRef } from 'react';

/**
 * Visibility-aware polling for status and metrics data.
 *
 * - Polls every `intervalMs` while the tab is visible.
 * - Skips ticks while the tab is hidden, so background tabs never poll.
 * - When the tab becomes visible again, it only fetches right away when the
 *   last run is older than the interval — a freshly fetched value is left
 *   alone, so returning to the tab never fires a burst of requests.
 * - Unmounting stops the timer and aborts any in-flight load.
 * - A load already in flight is never duplicated by a tick or a refresh.
 *
 * The load callback owns its error handling; an abort is not an error.
 */

export type SafePollOptions = {
  /** Milliseconds between polls while the tab is visible. */
  intervalMs: number;
  /** Set false to stop polling entirely. Defaults to true. */
  enabled?: boolean;
};

export type SafePollControls = {
  /** Runs a load now and restarts the interval from that run. */
  refresh: () => void;
};

export function useSafePoll(
  load: (signal: AbortSignal) => Promise<void>,
  options: SafePollOptions,
): SafePollControls {
  const { intervalMs, enabled = true } = options;
  const loadRef = useRef(load);
  loadRef.current = load;

  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const controllerRef = useRef<AbortController | undefined>(undefined);
  const inFlightRef = useRef(false);
  const lastRunAtRef = useRef(0);
  const mountedRef = useRef(false);
  const runRef = useRef<() => void>(() => {});

  const refresh = useCallback(() => {
    runRef.current();
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    const clearTimer = () => {
      if (timerRef.current !== undefined) {
        clearTimeout(timerRef.current);
        timerRef.current = undefined;
      }
    };

    const schedule = (delayMs: number) => {
      clearTimer();
      timerRef.current = setTimeout(() => {
        timerRef.current = undefined;
        tick();
      }, delayMs);
    };

    const run = async () => {
      if (!mountedRef.current || !enabled || inFlightRef.current) return;
      inFlightRef.current = true;
      lastRunAtRef.current = Date.now();
      const controller = new AbortController();
      controllerRef.current = controller;
      try {
        await loadRef.current(controller.signal);
      } catch {
        // The load callback owns its error handling; an abort is not an error.
      } finally {
        inFlightRef.current = false;
        if (controllerRef.current === controller) controllerRef.current = undefined;
        if (mountedRef.current && enabled) schedule(intervalMs);
      }
    };

    const tick = () => {
      if (!mountedRef.current || !enabled) return;
      if (document.visibilityState === 'hidden') {
        // Tab is hidden: do not poll, check again after the interval.
        schedule(intervalMs);
        return;
      }
      void run();
    };

    runRef.current = () => {
      if (!enabled) return;
      clearTimer();
      void run();
    };

    const onVisibilityChange = () => {
      if (!enabled || document.visibilityState !== 'visible') return;
      // Resume without a burst: fetch now only when the data is stale.
      if (!inFlightRef.current && Date.now() - lastRunAtRef.current >= intervalMs) {
        void run();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    if (enabled) {
      void run();
    }

    return () => {
      mountedRef.current = false;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      clearTimer();
      controllerRef.current?.abort();
      controllerRef.current = undefined;
    };
  }, [enabled, intervalMs]);

  return { refresh };
}
