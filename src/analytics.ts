/**
 * Thin wrapper around window.plausible() so the rest of the app stays
 * decoupled from the analytics provider.
 *
 * Plausible sets no cookies and collects no personal data, so no consent
 * banner is required under GDPR / ePrivacy.
 *
 * Usage:
 *   import { trackEvent } from '../analytics';
 *   trackEvent('Read the Docs');
 *   trackEvent('Code Tab Change', { props: { tab: 'scan.ts' } });
 */

declare global {
  interface Window {
    plausible?: (
      event: string,
      options?: { props?: Record<string, string | number | boolean> },
    ) => void;
  }
}

/** Fires a Plausible custom event. Safe to call even before the script loads. */
export function trackEvent(
  event: string,
  options?: { props?: Record<string, string | number | boolean> },
): void {
  if (typeof window.plausible === 'function') {
    window.plausible(event, options);
  }
}
