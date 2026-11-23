import { useCallback, useEffect, useRef, useState } from 'react';
import incidentsData from '../data/incidents.json';
import { isRecord, requestJson, SafeClientError, safeErrorMessage } from '../utils/safeClient';
import { useSafePoll } from './useSafePoll';

export type ComponentStatus = {
  id: string;
  name: string;
  status: 'operational' | 'degraded' | 'outage';
  uptime90Days: number[]; // 90 days array of percentages or status codes (1 = up, 0.5 = degraded, 0 = down)
  latencyMs: number;
};

export type Incident = {
  id: string;
  title: string;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  impact: 'none' | 'minor' | 'major' | 'critical';
  date: string;
  resolvedAt?: string;
  updates: { timestamp: string; message: string }[];
};

export type StatusData = {
  overall: 'operational' | 'degraded' | 'outage';
  components: ComponentStatus[];
  incidents: Incident[];
  lastUpdated: string;
};

const STATUS_POLL_INTERVAL_MS = 60_000;
const STATUS_CACHE_TTL_MS = 60_000;

function getStatusApiUrl(): string {
  return import.meta.env.VITE_STATUS_API_URL || '';
}

function validateComponent(value: unknown): ComponentStatus {
  if (!isRecord(value)) throw new SafeClientError('malformed');

  const { id, name, status } = value;
  if (typeof id !== 'string' || id.length === 0) throw new SafeClientError('malformed');
  if (typeof name !== 'string' || name.length === 0) throw new SafeClientError('malformed');
  if (status !== 'operational' && status !== 'degraded' && status !== 'outage') {
    throw new SafeClientError('malformed');
  }

  const rawUptime = value.uptime90Days;
  if (!Array.isArray(rawUptime)) throw new SafeClientError('malformed');
  const uptime90Days: number[] = [];
  for (const entry of rawUptime) {
    if (typeof entry !== 'number' || !Number.isFinite(entry)) {
      throw new SafeClientError('malformed');
    }
    uptime90Days.push(entry);
  }

  const { latencyMs } = value;
  if (typeof latencyMs !== 'number' || !Number.isFinite(latencyMs)) {
    throw new SafeClientError('malformed');
  }

  return { id, name, status, uptime90Days, latencyMs };
}

/** Validates the status payload and returns its components. Exported for tests. */
export function validateStatusResponse(payload: unknown): ComponentStatus[] {
  if (!isRecord(payload) || !Array.isArray(payload.components)) {
    throw new SafeClientError('malformed');
  }
  const components = payload.components.map(validateComponent);
  if (!components.some((component) => /stellar/i.test(component.name))) {
    throw new SafeClientError('malformed');
  }
  return components;
}

function deriveOverall(components: ComponentStatus[]): StatusData['overall'] {
  if (components.some((component) => component.status === 'outage')) return 'outage';
  if (components.some((component) => component.status === 'degraded')) return 'degraded';
  return 'operational';
}

export function useStatus() {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const hasDataRef = useRef(false);

  const fetchStatus = useCallback(async (signal?: AbortSignal) => {
    const statusApiUrl = getStatusApiUrl();
    if (!statusApiUrl) {
      setData(null);
      hasDataRef.current = false;
      setError('Status endpoint unavailable');
      setStale(false);
      setLoading(false);
      setLastUpdated(null);
      return;
    }

    try {
      const { data: components, stale: servedStale } = await requestJson(
        statusApiUrl,
        validateStatusResponse,
        { signal, cacheTtlMs: STATUS_CACHE_TTL_MS, serveStaleOnError: true },
      );
      const now = new Date().toISOString();
      setData({
        overall: deriveOverall(components),
        components,
        incidents: incidentsData.incidents as Incident[],
        lastUpdated: now,
      });
      hasDataRef.current = true;
      setError(null);
      setStale(servedStale);
      setLastUpdated(now);
    } catch (err) {
      if (err instanceof SafeClientError && err.kind === 'aborted') return;
      // Keep the last known data on screen and mark it stale instead of blanking the page.
      if (hasDataRef.current) {
        setStale(true);
        setError(safeErrorMessage(err));
      } else {
        setData(null);
        setError(safeErrorMessage(err));
        setStale(false);
        setLastUpdated(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const { refresh } = useSafePoll(fetchStatus, {
    intervalMs: STATUS_POLL_INTERVAL_MS,
    enabled: Boolean(getStatusApiUrl()),
  });

  // No endpoint configured: report that once instead of polling.
  useEffect(() => {
    if (!getStatusApiUrl()) {
      setData(null);
      hasDataRef.current = false;
      setError('Status endpoint unavailable');
      setStale(false);
      setLoading(false);
      setLastUpdated(null);
    }
  }, []);

  return { data, loading, error, stale, refetch: refresh, lastUpdated };
}
