/**
 * Synthetic dashboard fixtures for the /vitals v2 dashboard.
 *
 * These are DEVELOPMENT/DEMO fixtures, not production telemetry. They give the
 * conversion tiles and incident overlay a realistic shape so the UI can later be
 * wired to the real first-party analytics API (Plausible) and status feed
 * (issue #10) without restructuring.
 */

export interface ConversionTile {
  event: string;
  label: string;
  /** Conversions over the trailing 30-day window (fixture value). */
  conversions30d: number;
  isFixture: true;
  /** When true, no UI emitter exists yet — instrumentation is blocked. */
  blocked?: boolean;
  note?: string;
}

/**
 * Conversion tiles. Only events that have an actual emitter in the app carry a
 * non-zero fixture count. `calculator_share` and `chain_matrix_sort` are typed
 * but have no UI, so they are explicitly marked blocked.
 */
export const CONVERSION_FIXTURES: ConversionTile[] = [
  { event: 'cta_click', label: 'CTA Clicks', conversions30d: 4821, isFixture: true },
  {
    event: 'newsletter_submit',
    label: 'Newsletter Signups',
    conversions30d: 312,
    isFixture: true,
  },
  {
    event: 'blog_post_read',
    label: 'Blog Reads (80% depth)',
    conversions30d: 1190,
    isFixture: true,
  },
  { event: 'outbound_click', label: 'Outbound Clicks', conversions30d: 2640, isFixture: true },
  {
    event: 'calculator_share',
    label: 'Calculator Shares',
    conversions30d: 0,
    isFixture: true,
    blocked: true,
    note: 'No calculator share UI exists in the app.',
  },
  {
    event: 'chain_matrix_sort',
    label: 'Chain Matrix Sorts',
    conversions30d: 0,
    isFixture: true,
    blocked: true,
    note: 'No sortable chain matrix UI exists in the app.',
  },
];

export interface IncidentRecord {
  /** ISO date (YYYY-MM-DD) the incident started. */
  date: string;
  /** ISO date (YYYY-MM-DD) the incident was resolved. */
  resolvedDate: string;
  title: string;
  severity: 'minor' | 'major' | 'critical';
}

/**
 * Last-30-day incident history for the overlay layer.
 *
 * Real incident history is BLOCKED by issue #10 (no status/incident feed exists
 * in the repository). The array is intentionally empty so the dashboard renders
 * its empty state. The overlay boundary (rendering + empty state) is in place
 * and will populate automatically when a real feed is connected.
 */
export const INCIDENT_FIXTURES: IncidentRecord[] = [];
