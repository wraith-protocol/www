/**
 * Shared privacy gate for first-party analytics.
 *
 * Centralizes Do-Not-Track (DNT) and Global Privacy Control (GPC) detection so
 * every analytics surface respects the same signal:
 *   - named events via `track()` in `src/utils/track.ts`
 *   - Web Vitals via `useVitals` in `src/hooks/useVitals.ts`
 *
 * This module owns the canonical implementation. No caller should re-implement
 * the check; named analytics automatically respect it through `track()`, and
 * Web Vitals reuse `isDNTEnabled()` from here.
 */

export function isDNTEnabled(): boolean {
  if (typeof window === 'undefined' || typeof window.navigator === 'undefined') {
    return false;
  }

  const nav = window.navigator as {
    doNotTrack?: string | null;
    globalPrivacyControl?: boolean;
  };
  const win = window as { doNotTrack?: string | null };

  const dnt = nav.doNotTrack ?? win.doNotTrack;
  const gpc = nav.globalPrivacyControl;

  return dnt === '1' || dnt === 'yes' || gpc === true;
}
