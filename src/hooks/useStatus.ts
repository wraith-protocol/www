import { useState, useEffect, useCallback } from 'react';
import incidentsData from '../data/incidents.json';

const statusApiUrl = import.meta.env.VITE_STATUS_API_URL || '';

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

export function useStatus() {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!statusApiUrl) {
      setData(null);
      setError('Status endpoint unavailable');
      setLoading(false);
      setLastUpdated(null);
      return;
    }

    try {
      const headers: HeadersInit = {
        Accept: 'application/json',
      };
      // Status polling sends no telemetry and never includes cookies.
      const res = await fetch(statusApiUrl, { headers, credentials: 'omit' });
      if (!res.ok) throw new Error(`Status endpoint returned ${res.status}`);
      const json = await res.json();
      if (!Array.isArray(json.components)) throw new Error('Status response has no components');
      const apiComponents = json.components as ComponentStatus[];
      if (!apiComponents.some((component) => /stellar/i.test(component.name))) {
        throw new Error('Status response is missing Stellar');
      }

      setData({
        overall: apiComponents.some((c) => c.status === 'outage')
          ? 'outage'
          : apiComponents.some((c) => c.status === 'degraded')
            ? 'degraded'
            : 'operational',
        components: apiComponents,
        incidents: incidentsData.incidents as Incident[],
        lastUpdated: new Date().toISOString(),
      });
      setError(null);
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : 'Failed to fetch status data');
      setLastUpdated(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();

    // Auto-refresh every 60s, pause when tab is hidden
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchStatus();
      }
    }, 60000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchStatus]);

  return { data, loading, error, refetch: fetchStatus, lastUpdated };
}
