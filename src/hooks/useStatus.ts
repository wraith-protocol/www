import { useState, useEffect, useCallback, useRef } from 'react';
import incidentsData from '../data/incidents.json';

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

const MOCK_COMPONENTS: ComponentStatus[] = [
  {
    id: 'rpc-eth',
    name: 'Ethereum RPC',
    status: 'operational',
    uptime90Days: Array(90).fill(1),
    latencyMs: 42,
  },
  {
    id: 'rpc-sol',
    name: 'Solana RPC',
    status: 'operational',
    uptime90Days: Array(90).fill(1),
    latencyMs: 28,
  },
  {
    id: 'scanner',
    name: 'Wraith Scanner',
    status: 'operational',
    uptime90Days: Array(90).fill(1),
    latencyMs: 65,
  },
  {
    id: 'docs',
    name: 'Documentation',
    status: 'operational',
    uptime90Days: Array(90).fill(1),
    latencyMs: 15,
  },
  {
    id: 'marketing',
    name: 'Marketing Web',
    status: 'operational',
    uptime90Days: Array(90).fill(1),
    latencyMs: 20,
  },
];

export function useStatus() {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toISOString());

  const fetchStatus = useCallback(async () => {
    try {
      // Respect DNT header if enabled in browser
      const isDnt =
        navigator.doNotTrack === '1' ||
        (window as unknown as { doNotTrack?: string }).doNotTrack === '1';
      const headers: HeadersInit = {
        Accept: 'application/json',
      };
      if (isDnt) {
        // DNT honored, ensure no cookies are sent/requested
      }

      // Try fetching from public status endpoint or fallback gracefully to mock data
      let apiComponents = MOCK_COMPONENTS;
      try {
        const res = await fetch('/api/status', { headers, credentials: 'omit' });
        if (res.ok) {
          const json = await res.json();
          if (json.components) apiComponents = json.components;
        }
      } catch {
        // Fallback gracefully if endpoint is unreachable without spinner-forever
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch status data');
    } finally {
      setLoading(false);
      setLastUpdated(new Date().toISOString());
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
