import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSafePoll } from '../hooks/useSafePoll';

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
}

function fireVisibilityChange() {
  document.dispatchEvent(new Event('visibilitychange'));
}

beforeEach(() => {
  setVisibility('visible');
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  setVisibility('visible');
});

describe('useSafePoll', () => {
  it('loads on mount and polls while the tab is visible', async () => {
    vi.useFakeTimers();
    const load = vi.fn(async (_signal: AbortSignal) => {});

    const { unmount } = renderHook(() => useSafePoll(load, { intervalMs: 60_000 }));
    await vi.advanceTimersByTimeAsync(0);
    expect(load).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(60_000);
    expect(load).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(60_000);
    expect(load).toHaveBeenCalledTimes(3);
    unmount();
  });

  it('does not poll while the tab is hidden', async () => {
    vi.useFakeTimers();
    setVisibility('hidden');
    const load = vi.fn(async (_signal: AbortSignal) => {});

    const { unmount } = renderHook(() => useSafePoll(load, { intervalMs: 60_000 }));
    await vi.advanceTimersByTimeAsync(0);
    expect(load).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(180_000);
    expect(load).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('resumes without a burst when the tab becomes visible with fresh data', async () => {
    vi.useFakeTimers();
    const load = vi.fn(async (_signal: AbortSignal) => {});

    const { unmount } = renderHook(() => useSafePoll(load, { intervalMs: 60_000 }));
    await vi.advanceTimersByTimeAsync(0);
    expect(load).toHaveBeenCalledTimes(1);

    setVisibility('hidden');
    fireVisibilityChange();
    await vi.advanceTimersByTimeAsync(10_000);

    setVisibility('visible');
    fireVisibilityChange();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(load).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(60_000);
    expect(load).toHaveBeenCalledTimes(2);
    unmount();
  });

  it('fetches on return when the data is stale', async () => {
    vi.useFakeTimers();
    const load = vi.fn(async (_signal: AbortSignal) => {});

    const { unmount } = renderHook(() => useSafePoll(load, { intervalMs: 60_000 }));
    await vi.advanceTimersByTimeAsync(0);
    expect(load).toHaveBeenCalledTimes(1);

    setVisibility('hidden');
    fireVisibilityChange();
    await vi.advanceTimersByTimeAsync(120_000);
    expect(load).toHaveBeenCalledTimes(1);

    setVisibility('visible');
    fireVisibilityChange();
    await vi.advanceTimersByTimeAsync(0);
    expect(load).toHaveBeenCalledTimes(2);
    unmount();
  });

  it('stops polling and aborts in-flight loads on unmount', async () => {
    vi.useFakeTimers();
    const signals: AbortSignal[] = [];
    const load = vi.fn((signal: AbortSignal) => {
      signals.push(signal);
      return new Promise<void>(() => {});
    });

    const { unmount } = renderHook(() => useSafePoll(load, { intervalMs: 60_000 }));
    expect(load).toHaveBeenCalledTimes(1);
    expect(signals[0]?.aborted).toBe(false);

    unmount();
    expect(signals[0]?.aborted).toBe(true);

    await vi.advanceTimersByTimeAsync(300_000);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('refresh runs a load now and restarts the interval', async () => {
    vi.useFakeTimers();
    const load = vi.fn(async (_signal: AbortSignal) => {});

    const { result, unmount } = renderHook(() => useSafePoll(load, { intervalMs: 60_000 }));
    await vi.advanceTimersByTimeAsync(0);
    expect(load).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.refresh();
    });
    expect(load).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(60_000);
    expect(load).toHaveBeenCalledTimes(3);
    unmount();
  });

  it('does nothing when disabled', () => {
    const load = vi.fn(async (_signal: AbortSignal) => {});

    const { result, unmount } = renderHook(() =>
      useSafePoll(load, { intervalMs: 60_000, enabled: false }),
    );
    expect(load).not.toHaveBeenCalled();

    act(() => {
      result.current.refresh();
    });
    expect(load).not.toHaveBeenCalled();
    unmount();
  });
});
