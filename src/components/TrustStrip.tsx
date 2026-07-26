import { useEffect, useState } from 'react';
import { useInView } from '../hooks/useInView';
import trustData from '../data/trust.json';

type AuditStatus = 'verified' | 'scheduled';

type AuditItem = {
  label: string;
  status: AuditStatus;
  detail: string;
  link: string;
};

const statusStyles: Record<AuditStatus, string> = {
  verified: 'border-tertiary text-tertiary',
  scheduled: 'border-outline-variant text-outline',
};

const statusText: Record<AuditStatus, string> = {
  verified: 'Verified',
  scheduled: 'Scheduled',
};

const uptimeApiUrl = import.meta.env.VITE_UPTIME_API_URL || '';

function initials(label: string): string {
  return label
    .split(' ')
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function TrustStrip() {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const { integrations, uptime } = trustData;
  const audits = trustData.audits as { eyebrow: string; items: AuditItem[] };

  const [uptimePercent, setUptimePercent] = useState(uptime.fallbackPercent);
  const [uptimeLoaded, setUptimeLoaded] = useState(false);

  useEffect(() => {
    if (!uptimeApiUrl) return;
    let cancelled = false;

    async function loadUptime() {
      try {
        const res = await fetch(uptimeApiUrl, { headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error('Uptime endpoint unavailable');
        const payload: unknown = await res.json();
        const percent =
          payload && typeof payload === 'object' && 'uptimePercent' in payload
            ? String((payload as { uptimePercent: unknown }).uptimePercent)
            : null;
        if (!cancelled && percent) {
          setUptimePercent(percent);
          setUptimeLoaded(true);
        }
      } catch {
        // Keep the static fallback from trust.json — no visible change, no layout shift.
      }
    }

    void loadUptime();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section
      ref={ref}
      aria-label="Trust and reliability signals"
      className="border-t border-outline-variant-30 px-6 py-12 md:px-12"
    >
      <div className="mx-auto grid max-w-[1344px] gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {audits.items.map((item, index) => (
          <a
            key={item.label}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-4 border border-outline-variant-30 bg-surface-container p-5 transition-colors duration-150 hover:border-outline"
            data-reveal={isInView}
            style={{ transitionDelay: isInView ? `${index * 60}ms` : '0ms' }}
          >
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center border font-mono text-[11px] font-semibold ${statusStyles[item.status]}`}
              aria-hidden="true"
            >
              {initials(item.label)}
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[1.5px] text-outline">
                {statusText[item.status]}
              </span>
              <span className="font-heading text-[13px] font-semibold text-on-surface">
                {item.label}
              </span>
              <span className="font-body text-[11px] leading-[1.4] text-on-surface-variant">
                {item.detail}
              </span>
            </div>
          </a>
        ))}

        <a
          href={integrations.link}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex flex-col justify-center gap-1 border border-outline-variant-30 bg-surface-container p-5 transition-colors duration-150 hover:border-outline"
          data-reveal={isInView}
          style={{ transitionDelay: isInView ? '120ms' : '0ms' }}
        >
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[1.5px] text-outline">
            {integrations.eyebrow}
          </span>
          <span className="font-heading text-[24px] font-bold tracking-[-1px] text-on-surface">
            {integrations.count}+
          </span>
          <span className="font-body text-[11px] leading-[1.4] text-on-surface-variant">
            {integrations.label}
          </span>
        </a>

        <a
          href={uptime.statusPageUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open the Wraith Protocol status page — ${uptimePercent}% uptime, ${uptime.windowLabel.toLowerCase()}`}
          className="group flex flex-col justify-center gap-1 border border-outline-variant-30 bg-surface-container p-5 transition-colors duration-150 hover:border-outline"
          data-reveal={isInView}
          style={{ transitionDelay: isInView ? '180ms' : '0ms' }}
        >
          <span className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[1.5px] text-outline">
            <span
              className={`h-1.5 w-1.5 rounded-full ${uptimeLoaded ? 'bg-tertiary' : 'bg-outline'}`}
              aria-hidden="true"
            />
            {uptime.eyebrow}
          </span>
          <span className="font-heading text-[24px] font-bold tracking-[-1px] text-on-surface">
            {uptimePercent}%
          </span>
          <span className="font-body text-[11px] leading-[1.4] text-on-surface-variant">
            {uptime.windowLabel}
          </span>
        </a>
      </div>
    </section>
  );
}
