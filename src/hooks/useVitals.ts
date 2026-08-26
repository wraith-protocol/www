import { useEffect, useState, useCallback } from 'react';
import { trackEvent } from '../analytics';
import { isDNTEnabled } from '../utils/privacy';
import {
  MetricType,
  MetricRating,
  getRating,
  getVitalsSummary,
  MetricSummary,
  VitalsLocale,
} from '../data/vitalsData';

export interface RecordedVital {
  metric: MetricType;
  value: number;
  rating: MetricRating;
  page: string;
  timestamp: number;
}

// Re-exported from the shared privacy gate so existing imports keep working.
// The canonical implementation now lives in `src/utils/privacy.ts`.
export { isDNTEnabled } from '../utils/privacy';

export function useVitals() {
  const [dntEnabled, setDntEnabled] = useState<boolean>(false);
  const [recordedVitals, setRecordedVitals] = useState<RecordedVital[]>([]);

  useEffect(() => {
    setDntEnabled(isDNTEnabled());
  }, []);

  const recordVital = useCallback((metric: MetricType, value: number, pageOverride?: string) => {
    const page = pageOverride || (typeof window !== 'undefined' ? window.location.pathname : '/');
    const rating = getRating(metric, value);
    const newRecord: RecordedVital = {
      metric,
      value,
      rating,
      page,
      timestamp: Date.now(),
    };

    setRecordedVitals((prev) => [...prev, newRecord]);

    // Strictly respect DNT header before forwarding custom event to Plausible
    if (!isDNTEnabled()) {
      trackEvent('Web Vital', {
        props: {
          metric,
          value: metric === 'CLS' ? Number(value.toFixed(3)) : Math.round(value),
          rating,
          page,
        },
      });
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return;
    }

    const observers: PerformanceObserver[] = [];

    // Observe LCP
    try {
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          const lcpSeconds = Number((lastEntry.startTime / 1000).toFixed(2));
          recordVital('LCP', lcpSeconds);
        }
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      observers.push(lcpObserver);
    } catch {
      // Ignore if observer type not supported
    }

    // Observe INP / Event Timing
    try {
      const inpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        entries.forEach((entry) => {
          const duration = Math.round(entry.duration);
          if (duration > 0) {
            recordVital('INP', duration);
          }
        });
      });
      inpObserver.observe({ type: 'first-input', buffered: true });
      observers.push(inpObserver);
    } catch {
      // Ignore if observer type not supported
    }

    // Observe CLS
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          const layoutShift = entry as PerformanceEntry & {
            hadRecentInput?: boolean;
            value?: number;
          };
          if (!layoutShift.hadRecentInput && layoutShift.value) {
            clsValue += layoutShift.value;
          }
        }
        if (clsValue > 0) {
          recordVital('CLS', Number(clsValue.toFixed(3)));
        }
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
      observers.push(clsObserver);
    } catch {
      // Ignore if observer type not supported
    }

    return () => {
      observers.forEach((obs) => obs.disconnect());
    };
  }, [recordVital]);

  const getSummary = useCallback(
    (metric: MetricType, page: string = 'All Pages', locale: VitalsLocale = 'all'): MetricSummary => {
      const liveOverrides = recordedVitals.map((v) => ({
        page: v.page,
        metric: v.metric,
        value: v.value,
      }));
      return getVitalsSummary(metric, page, liveOverrides, locale);
    },
    [recordedVitals],
  );

  return {
    dntEnabled,
    recordedVitals,
    recordVital,
    getSummary,
  };
}
