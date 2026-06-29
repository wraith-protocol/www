import { useEffect, useRef, useState } from 'react';
import { useInView } from '../hooks/useInView';

/**
 * Cache strategy:
 * - Client-side in-memory cache with 5-minute TTL
 * - Resets on page reload (acceptable for a landing page)
 * - Prevents hammering Soroban RPC on scroll/revisit
 * - No server-side cache to keep infra minimal
 */
const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000;

// ~1 ledger per 5s on Stellar testnet
const LEDGERS_PER_DAY = 17_280;
const LEDGERS_PER_WEEK = 120_960;

type Metrics = {
  last24h: number;
  last7d: number;
  allTime: number;
};

type CacheEntry = {
  data: Metrics;
  expiry: number;
};

const rpcUrl = 'https://soroban-testnet.stellar.org';
const contractId = 'CCJLJ2QRBJAAKIG6ELNQVXLLWMKKWVN5O2FKWUETHZGMPAD4MHK7WVWL';

async function getLatestLedger(): Promise<number> {
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getLatestLedger',
    }),
  });
  const data: any = await res.json();
  const seq = data.result?.sequence;
  if (typeof seq === 'number') return seq;
  throw new Error('Could not determine latest ledger');
}

async function countInRange(startLedger: number): Promise<number> {
  let total = 0;
  let cursor: string | undefined;
  while (true) {
    const params: Record<string, any> = {
      filters: [{ type: 'contract', contractIds: [contractId] }],
      pagination: cursor ? { limit: 1_000, cursor } : { limit: 1_000 },
    };
    if (!cursor) params.startLedger = startLedger;
    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'getEvents', params }),
    });
    const data: any = await res.json();
    const events = data.result?.events ?? [];
    for (const event of events) {
      if (event.topic && event.topic.length >= 3) {
        total++;
      }
    }
    if (events.length < 1_000) break;
    cursor = data.result?.cursor;
    if (!cursor) break;
  }
  return total;
}

async function fetchMetrics(): Promise<Metrics> {
  const cached = cache.get('metrics');
  if (cached && Date.now() < cached.expiry) return cached.data;

  const latestLedger = await getLatestLedger();
  const [allTime, last24h, last7d] = await Promise.all([
    countInRange(1),
    countInRange(Math.max(1, latestLedger - LEDGERS_PER_DAY)),
    countInRange(Math.max(1, latestLedger - LEDGERS_PER_WEEK)),
  ]);

  const metrics: Metrics = { last24h, last7d, allTime };
  cache.set('metrics', { data: metrics, expiry: Date.now() + CACHE_TTL });
  return metrics;
}

function formatCount(n: number): string {
  if (n === 0) return '0';
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

type StatCardProps = {
  label: string;
  count: number;
  loading: boolean;
  error: boolean;
  inView: boolean;
  delay: number;
};

function StatCard({ label, count, loading, error, inView, delay }: StatCardProps) {
  const isZero = count === 0 && !loading && !error;
  return (
    <div
      className="flex flex-col gap-3 border border-outline-variant bg-surface-container p-7"
      data-reveal={inView}
      style={{ transitionDelay: inView ? `${delay}ms` : '0ms' }}
    >
      <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
        {label}
      </span>
      {loading ? (
        <div className="flex flex-col gap-2">
          <div className="h-9 w-24 animate-pulse bg-surface-bright" />
          <div className="h-4 w-36 animate-pulse bg-surface-bright" />
        </div>
      ) : error ? (
        <>
          <span className="font-heading text-[32px] font-bold tracking-[-1.2px] text-error">
            &mdash;
          </span>
          <span className="font-body text-[13px] leading-[1.65] text-error">Unable to fetch</span>
        </>
      ) : isZero ? (
        <span className="font-body text-sm leading-[1.6] text-on-surface-variant">
          Just getting started
        </span>
      ) : (
        <>
          <span className="font-heading text-[32px] font-bold tracking-[-1.2px] text-on-surface">
            {formatCount(count)}
          </span>
          <span className="font-body text-[13px] leading-[1.65] text-on-surface-variant">
            stealth payments processed on Stellar testnet
          </span>
        </>
      )}
    </div>
  );
}

export default function StellarMetrics() {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(false);
        const data = await fetchMetrics();
        if (!cancelled && mountedRef.current) {
          setMetrics(data);
          setLoading(false);
        }
      } catch {
        if (!cancelled && mountedRef.current) {
          setError(true);
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
      mountedRef.current = false;
    };
  }, []);

  return (
    <section ref={ref} className="border-t border-outline-variant-30 px-6 py-24 md:px-12">
      <div className="mx-auto flex max-w-[1344px] flex-col gap-10">
        <div className="flex flex-col gap-3" data-reveal={isInView}>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
            Live Metrics
          </span>
          <h2 className="font-heading text-[28px] font-bold tracking-[-1.2px] text-on-surface sm:text-[40px]">
            Stellar testnet activity.
          </h2>
          <p className="font-body text-base leading-[1.6] text-on-surface-variant">
            Real-time stealth payment activity on the Stellar Soroban testnet.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            label="Last 24 hours"
            count={metrics?.last24h ?? 0}
            loading={loading}
            error={error}
            inView={isInView}
            delay={0}
          />
          <StatCard
            label="Last 7 days"
            count={metrics?.last7d ?? 0}
            loading={loading}
            error={error}
            inView={isInView}
            delay={80}
          />
          <StatCard
            label="All time"
            count={metrics?.allTime ?? 0}
            loading={loading}
            error={error}
            inView={isInView}
            delay={160}
          />
        </div>
      </div>
    </section>
  );
}
