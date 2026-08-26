import { trackEvent } from '../analytics';
import { isDNTEnabled } from '../hooks/useVitals';

/**
 * Strongly-typed map of first-party analytics events and their payloads.
 *
 * These names are forwarded verbatim to the existing Plausible endpoint via
 * `trackEvent`, so the event taxonomy stays centralized and auditable.
 */
export type AnalyticsEventMap = {
  cta_click: {
    source: string;
  };

  newsletter_submit: {
    source: string;
  };

  newsletter_confirm: {
    source: string;
  };

  blog_post_read: {
    slug: string;
    locale?: string;
  };

  calculator_share: {
    source?: string;
  };

  chain_matrix_sort: {
    column: string;
    direction: 'asc' | 'desc';
  };

  outbound_click: {
    category: string;
  };
};

export type AnalyticsEventName = keyof AnalyticsEventMap;

type AnalyticsProps = Record<string, string | number | boolean>;

/** Flattens a payload into Plausible props, dropping explicitly undefined fields. */
function toProps<K extends AnalyticsEventName>(payload: AnalyticsEventMap[K]): AnalyticsProps {
  const props: AnalyticsProps = {};

  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined) {
      props[key] = value;
    }
  }

  return props;
}

/**
 * DNT-aware, strongly-typed wrapper around the first-party analytics endpoint.
 *
 * Respects Do-Not-Track / Global Privacy Control (GPC) before forwarding any
 * named event, so no telemetry leaves the browser when the visitor opts out.
 */
export function track<K extends AnalyticsEventName>(event: K, payload: AnalyticsEventMap[K]): void {
  if (isDNTEnabled()) {
    return;
  }

  trackEvent(event, { props: toProps(payload) });
}
