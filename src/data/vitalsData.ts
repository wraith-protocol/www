export type MetricType = 'LCP' | 'INP' | 'CLS';

export type MetricRating = 'good' | 'needs-improvement' | 'poor';

export interface MetricDefinition {
  name: MetricType;
  fullName: string;
  unit: string;
  goodThreshold: number;
  poorThreshold: number;
  targetFormatted: string;
  description: string;
  impact: string;
  optimization: string;
}

export const METRIC_DEFINITIONS: Record<MetricType, MetricDefinition> = {
  LCP: {
    name: 'LCP',
    fullName: 'Largest Contentful Paint',
    unit: 's',
    goodThreshold: 2.5,
    poorThreshold: 4.0,
    targetFormatted: '≤ 2.5s',
    description:
      'LCP measures perceived loading speed. It marks the point in the page load timeline when the main content has likely loaded.',
    impact:
      'Fast LCP reassures visitors that the page is useful and responsive. Delayed LCP leads to higher bounce rates and poor developer trust.',
    optimization:
      'Wraith Protocol optimizes LCP using static Vite HTML pre-rendering, critical inline CSS, asset preloading, and zero runtime bundle bloat.',
  },
  INP: {
    name: 'INP',
    fullName: 'Interaction to Next Paint',
    unit: 'ms',
    goodThreshold: 200,
    poorThreshold: 500,
    targetFormatted: '≤ 200ms',
    description:
      'INP measures overall page responsiveness to user interactions (clicks, taps, keyboard entries) by tracking latency until visual feedback is rendered.',
    impact:
      'Low interaction latency ensures UI controls respond instantly without stutter or freeze during stealth payment configuration and SDK navigation.',
    optimization:
      'Optimized with efficient React render boundaries, unblocked main-thread event loops, and lightweight state mutations.',
  },
  CLS: {
    name: 'CLS',
    fullName: 'Cumulative Layout Shift',
    unit: '',
    goodThreshold: 0.1,
    poorThreshold: 0.25,
    targetFormatted: '≤ 0.10',
    description:
      'CLS measures visual stability by quantifying unexpected layout shifts during the entire lifecycle of the page.',
    impact:
      'Eliminating unexpected shifts prevents accidental misclicks or jumpy text while inspecting chain addresses or code snippets.',
    optimization:
      'Enforced via explicitly reserved image/icon dimensions, fixed layout containers, and font fallback matching.',
  },
};

export const SITE_PAGES = [
  'All Pages',
  '/',
  '/faq',
  '/stellar',
  '/privacy',
  '/use-cases',
  '/roadmap',
  '/case-studies',
  '/careers',
  '/vitals',
] as const;

export type SitePage = (typeof SITE_PAGES)[number];

/** Locale filter options for the Vitals v2 dashboard (synthetic fixture). */
export const VITALS_LOCALES = ['all', 'en', 'es'] as const;
export type VitalsLocale = (typeof VITALS_LOCALES)[number];

export interface DailyMetricPoint {
  date: string; // ISO date format YYYY-MM-DD
  formattedDate: string; // e.g. "Jul 15"
  value: number;
  rating: MetricRating;
  samples: number;
}

export interface MetricSummary {
  metric: MetricType;
  p75Value: number;
  rating: MetricRating;
  unit: string;
  targetFormatted: string;
  totalSamples: number;
  dailyPoints: DailyMetricPoint[];
}

/** Per-locale scaling applied to the synthetic RUM fixture so the locale
 *  filter yields visibly distinct (but still synthetic) dashboards. */
const LOCALE_SEED: Record<VitalsLocale, number> = {
  all: 1.0,
  en: 0.97,
  es: 1.06,
};

/** Helper to generate 30 days of consistent, realistic rolling historical RUM
 *  data, split by locale. This is development/demo fixture data — not production
 *  telemetry. */
export function generateRolling30DayData(): Record<
  string,
  Record<VitalsLocale, Record<MetricType, { values: number[]; samples: number[] }>>
> {
  const seedMultiplier: Record<string, number> = {
    '/': 0.85,
    '/faq': 0.9,
    '/stellar': 1.05,
    '/privacy': 0.8,
    '/use-cases': 0.95,
    '/roadmap': 0.88,
    '/case-studies': 0.92,
    '/careers': 0.82,
    '/vitals': 0.78,
  };

  const pages = SITE_PAGES.filter((p) => p !== 'All Pages');
  const result: Record<
    string,
    Record<VitalsLocale, Record<MetricType, { values: number[]; samples: number[] }>>
  > = {};

  pages.forEach((page) => {
    const mult = seedMultiplier[page] || 1.0;
    const perLocale = {} as Record<
      VitalsLocale,
      Record<MetricType, { values: number[]; samples: number[] }>
    >;

    (VITALS_LOCALES as readonly VitalsLocale[]).forEach((locale) => {
      const lmult = mult * LOCALE_SEED[locale];

      // LCP around 1.1s - 1.8s
      const lcpValues = Array.from({ length: 30 }, (_, i) => {
        const noise = (Math.sin(i * 0.7) * 0.15 + Math.cos(i * 0.4) * 0.1) * lmult;
        return Number(Math.max(0.6, 1.25 + noise).toFixed(2));
      });

      // INP around 32ms - 65ms
      const inpValues = Array.from({ length: 30 }, (_, i) => {
        const noise = (Math.cos(i * 0.5) * 8 + Math.sin(i * 0.3) * 5) * lmult;
        return Math.max(12, Math.round(42 + noise));
      });

      // CLS around 0.005 - 0.03
      const clsValues = Array.from({ length: 30 }, (_, i) => {
        const noise = (Math.sin(i * 0.9) * 0.004 + Math.cos(i * 0.2) * 0.003) * lmult;
        return Number(Math.max(0.001, 0.012 + noise).toFixed(3));
      });

      const sampleCounts = Array.from({ length: 30 }, (_, i) => {
        const baseSamples = Math.round(140 + Math.sin(i * 0.5) * 40);
        return Math.max(50, baseSamples);
      });

      perLocale[locale] = {
        LCP: { values: lcpValues, samples: sampleCounts },
        INP: { values: inpValues, samples: sampleCounts },
        CLS: { values: clsValues, samples: sampleCounts },
      };
    });

    result[page] = perLocale;
  });

  return result;
}

const HISTORICAL_DATA_STORE = generateRolling30DayData();

export function calculateP75(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil(0.75 * sorted.length) - 1;
  const safeIndex = Math.max(0, Math.min(index, sorted.length - 1));
  return sorted[safeIndex] ?? 0;
}

export function getRating(metric: MetricType, value: number): MetricRating {
  const def = METRIC_DEFINITIONS[metric];
  if (value <= def.goodThreshold) return 'good';
  if (value <= def.poorThreshold) return 'needs-improvement';
  return 'poor';
}

export function getVitalsSummary(
  metric: MetricType,
  selectedPage: string = 'All Pages',
  liveOverrides?: { page: string; metric: MetricType; value: number }[],
  locale: VitalsLocale = 'all',
): MetricSummary {
  const today = new Date();
  const pagesToInclude =
    selectedPage === 'All Pages' ? SITE_PAGES.filter((p) => p !== 'All Pages') : [selectedPage];

  const dailyPoints: DailyMetricPoint[] = [];

  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0] ?? '';
    const formattedDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    let dayValues: number[] = [];
    let daySamples = 0;

    pagesToInclude.forEach((page) => {
      const pageData = HISTORICAL_DATA_STORE[page];
      const localeData = pageData?.[locale] ?? pageData?.all;
      if (localeData && localeData[metric]) {
        const val = localeData[metric].values[29 - i] ?? 0;
        const samp = localeData[metric].samples[29 - i] ?? 100;
        dayValues.push(val);
        daySamples += samp;
      }
    });

    // Check for live overrides for current day (i === 0)
    if (i === 0 && liveOverrides) {
      liveOverrides.forEach((override) => {
        if (
          override.metric === metric &&
          (selectedPage === 'All Pages' || override.page === selectedPage)
        ) {
          dayValues.push(override.value);
          daySamples += 1;
        }
      });
    }

    const dayValue =
      dayValues.length > 0
        ? metric === 'CLS'
          ? Number((dayValues.reduce((a, b) => a + b, 0) / dayValues.length).toFixed(3))
          : metric === 'LCP'
            ? Number((dayValues.reduce((a, b) => a + b, 0) / dayValues.length).toFixed(2))
            : Math.round(dayValues.reduce((a, b) => a + b, 0) / dayValues.length)
        : 0;

    dailyPoints.push({
      date: dateStr,
      formattedDate,
      value: dayValue,
      rating: getRating(metric, dayValue),
      samples: daySamples,
    });
  }

  const allValues = dailyPoints.map((p) => p.value);
  const rawP75 = calculateP75(allValues);
  const p75Value =
    metric === 'CLS'
      ? Number(rawP75.toFixed(3))
      : metric === 'LCP'
        ? Number(rawP75.toFixed(2))
        : Math.round(rawP75);

  const totalSamples = dailyPoints.reduce((acc, p) => acc + p.samples, 0);

  return {
    metric,
    p75Value,
    rating: getRating(metric, p75Value),
    unit: METRIC_DEFINITIONS[metric].unit,
    targetFormatted: METRIC_DEFINITIONS[metric].targetFormatted,
    totalSamples,
    dailyPoints,
  };
}
