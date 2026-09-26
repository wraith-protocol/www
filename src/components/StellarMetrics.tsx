import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useInView } from '../hooks/useInView';
import {
  loadStellarMetrics,
  type MetricWindow,
  type StellarMetrics,
} from '../utils/stellarMetrics';

function formatCount(n: number): string {
  if (n === 0) return '0';
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

type StatCardProps = {
  label: string;
  unit: string;
  metric: MetricWindow | null;
  loading: boolean;
  error: boolean;
  inView: boolean;
  delay: number;
};

function StatCard({ label, unit, metric, loading, error, inView, delay }: StatCardProps) {
  const { t } = useTranslation();
  const isZero = metric?.count === 0 && !loading && !error;
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
      ) : error || !metric ? (
        <>
          <span className="font-heading text-[32px] font-bold tracking-[-1.2px] text-error">
            &mdash;
          </span>
          <span className="font-body text-[13px] leading-[1.65] text-error">
            {t('stellarMetrics.unableToFetch')}
          </span>
        </>
      ) : isZero ? (
        <span className="font-body text-sm leading-[1.6] text-on-surface-variant">
          Just getting started
        </span>
      ) : (
        <>
          <span className="font-heading text-[32px] font-bold tracking-[-1.2px] text-on-surface">
            {formatCount(metric.count)}
          </span>
          <span className="font-body text-[13px] leading-[1.65] text-on-surface-variant">
            {unit}
          </span>
          {metric.partial ? (
            <span className="font-mono text-[10px] tracking-[1px] text-outline">
              partial — outside retained history
            </span>
          ) : null}
        </>
      )}
    </div>
  );
}

export default function StellarMetrics() {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const [metrics, setMetrics] = useState<StellarMetrics | null>(null);
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
        const data = await loadStellarMetrics();
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
            Real-time stealth payment activity on the Stellar Soroban testnet, scoped to the RPC's
            retained ledger window.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            label="Last 24 hours"
            unit="stealth payments processed on Stellar testnet"
            metric={metrics?.last24h ?? null}
            loading={loading}
            error={error}
            inView={isInView}
            delay={0}
          />
          <StatCard
            label="Last 7 days"
            unit="stealth payments processed on Stellar testnet"
            metric={metrics?.last7d ?? null}
            loading={loading}
            error={error}
            inView={isInView}
            delay={80}
          />
          <StatCard
            label="Retained window"
            unit="stealth payments in the RPC's retained history"
            metric={metrics?.retained ?? null}
            loading={loading}
            error={error}
            inView={isInView}
            delay={160}
          />
        </div>

        <p className="font-mono text-[10px] tracking-[1px] text-outline">
          Counts cover the Soroban RPC's retained ledger window. Older history is not queryable, so
          no all-time total is shown.
        </p>
      </div>
    </section>
  );
}
