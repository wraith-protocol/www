import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const columns = [
  {
    title: 'PRODUCT',
    links: [
      { label: 'Docs', href: 'https://docs.usewraith.xyz' },
      { label: 'Demo', href: 'https://demo.usewraith.xyz' },
      { label: 'Console', href: 'https://console.usewraith.xyz' },
      { label: 'Compare', href: '#compare' },
      { label: 'FAQ', href: '/faq' },
      { label: 'Changelog', href: 'https://docs.usewraith.xyz/changelog' },
    ],
  },
  {
    title: 'DEVELOPERS',
    links: [
      { label: 'SDK', href: 'https://docs.usewraith.xyz/sdk/overview' },
      { label: 'API Reference', href: 'https://docs.usewraith.xyz/api' },
      { label: 'GitHub', href: 'https://github.com/wraith-protocol' },
      { label: 'npm', href: 'https://www.npmjs.com/package/@wraith-protocol/sdk' },
    ],
  },
  {
    title: 'RESOURCES',
    links: [
      { label: 'ERC-5564 spec', href: 'https://eips.ethereum.org/EIPS/eip-5564' },
      { label: 'ERC-6538 spec', href: 'https://eips.ethereum.org/EIPS/eip-6538' },
      { label: 'Security', href: 'https://docs.usewraith.xyz/security' },
      { label: 'Press', href: '/press' },
      { label: 'Stellar Integration', href: '/stellar' },
    ],
  },
];

const acknowledgments = [
  { label: 'Stellar', src: '/logos/stellar-mark.svg' },
  { label: 'Drips', src: '/logos/drips-mark.svg' },
];

type StatusTone = 'green' | 'yellow' | 'red' | 'neutral';

type StatusState = {
  label: string;
  tone: StatusTone;
};

const statusPageUrl = import.meta.env.VITE_STATUS_PAGE_URL || 'https://status.usewraith.xyz';
const statusApiUrl =
  import.meta.env.VITE_STATUS_API_URL || 'https://status.usewraith.xyz/api/v2/status.json';

function normalizeStatus(payload: unknown): StatusState {
  const candidate = payload as Record<string, unknown>;
  const maybeStatus =
    (candidate?.status as Record<string, unknown> | undefined) ??
    (candidate?.page as Record<string, unknown> | undefined) ??
    (candidate?.data as Record<string, unknown> | undefined) ??
    candidate;

  const indicator =
    (maybeStatus?.indicator as string | undefined) ||
    (maybeStatus?.status as string | undefined) ||
    (maybeStatus?.description as string | undefined) ||
    (candidate?.indicator as string | undefined) ||
    (candidate?.status as string | undefined);

  const lowered = indicator?.toLowerCase() ?? '';

  if (['up', 'none', 'operational', 'resolved', 'ok'].includes(lowered)) {
    return { label: 'All systems normal', tone: 'green' };
  }

  if (
    [
      'minor',
      'degraded',
      'partial_outage',
      'warning',
      'investigating',
      'monitoring',
      'identified',
      'hasissues',
      'maintenance',
    ].includes(lowered)
  ) {
    return { label: 'Minor service issues', tone: 'yellow' };
  }

  if (['down', 'major', 'critical', 'incident', 'outage', 'error'].includes(lowered)) {
    return { label: 'Service disruption', tone: 'red' };
  }

  return { label: 'All systems normal', tone: 'green' };
}

export default function Footer() {
  const [status, setStatus] = useState<StatusState>({
    label: 'Checking status...',
    tone: 'neutral',
  });

  useEffect(() => {
    let isMounted = true;

    const refreshStatus = async () => {
      try {
        const response = await fetch(statusApiUrl, {
          headers: { Accept: 'application/json' },
        });

        if (!response.ok) {
          throw new Error('Status endpoint unavailable');
        }

        const payload = await response.json();

        if (isMounted) {
          setStatus(normalizeStatus(payload));
        }
      } catch {
        if (isMounted) {
          setStatus({ label: 'Status unavailable', tone: 'neutral' });
        }
      }
    };

    void refreshStatus();
    const intervalId = window.setInterval(() => {
      void refreshStatus();
    }, 60000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const toneClasses: Record<StatusTone, string> = {
    green: 'border border-[#22c55e]/30 bg-[#22c55e]/15 text-[#22c55e]',
    yellow: 'border border-[#c4c7c5]/40 bg-[#c4c7c5]/10 text-[#c4c7c5]',
    red: 'border border-[#ee7d77]/40 bg-[#ee7d77]/15 text-[#ee7d77]',
    neutral: 'border border-outline-variant/40 bg-surface-container text-outline',
  };

  return (
    <footer className="px-6 pb-8 pt-12 md:px-12">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col justify-between gap-12 md:flex-row">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="" className="h-6 opacity-90" />
              <span className="font-heading text-[13px] font-bold tracking-[2px] text-on-surface">
                WRAITH PROTOCOL
              </span>
            </div>
            <p className="max-w-[240px] font-body text-[13px] leading-normal text-outline">
              Private payments, plainly.
            </p>
          </div>

          <div className="flex flex-wrap gap-12">
            {columns.map((column) => (
              <div key={column.title} className="flex flex-col gap-3">
                <span className="font-mono text-[10px] font-semibold tracking-[1.5px] text-outline">
                  {column.title}
                </span>
                {column.links.map((link) => {
                  const isHash = link.href.startsWith('#');
                  return (
                    <a
                      key={link.label}
                      href={link.href}
                      target={isHash ? undefined : '_blank'}
                      rel={isHash ? undefined : 'noopener noreferrer'}
                      className="font-body text-[13px] text-on-surface-variant transition-colors duration-150 hover:text-on-surface"
                    >
                      {link.label}
                    </a>
                  );
                })}
              </div>
            ))}

            <div className="flex max-w-[260px] flex-col gap-3">
              <span className="font-mono text-[10px] font-semibold tracking-[1.5px] text-outline">
                ACKNOWLEDGMENTS
              </span>
              <a
                href="https://www.drips.network/wave/stellar"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Supported by Stellar Development Foundation's Stellar Wave program via Drips"
                className="group flex flex-col gap-2 font-body text-[13px] leading-[1.45] text-on-surface-variant transition-colors duration-150 hover:text-on-surface"
              >
                <span className="flex items-center gap-2" aria-hidden="true">
                  {acknowledgments.map((logo) => (
                    <img
                      key={logo.label}
                      src={logo.src}
                      alt=""
                      className="h-4 w-4 opacity-70 transition-opacity duration-150 group-hover:opacity-90"
                    />
                  ))}
                </span>
                <span>
                  Supported by Stellar Development Foundation&apos;s Stellar Wave program via Drips
                </span>
              </a>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start justify-between gap-4 border-t border-outline-variant-30 pt-5 sm:flex-row sm:items-center">
          <span className="font-mono text-[10px] font-semibold tracking-[1.5px] text-outline">
            BUILT ON HORIZEN · ERC-5564 · OPEN SOURCE
          </span>
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <a
              href={statusPageUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open Wraith Protocol status page"
              className={`inline-flex items-center gap-2 rounded-none border px-2.5 py-1.5 font-body text-[11px] uppercase tracking-[1.5px] transition-colors duration-150 ${toneClasses[status.tone]}`}
            >
              <span
                aria-hidden="true"
                className={`h-2.5 w-2.5 rounded-full ${
                  status.tone === 'green'
                    ? 'bg-[#22c55e]'
                    : status.tone === 'yellow'
                      ? 'bg-[#c4c7c5]'
                      : status.tone === 'red'
                        ? 'bg-[#ee7d77]'
                        : 'bg-outline'
                }`}
              />
              <span>{status.label}</span>
            </a>
            <Link
              to="/privacy"
              className="font-body text-xs text-outline transition-colors duration-150 hover:text-on-surface-variant"
            >
              Privacy
            </Link>
            <a
              href="https://usewraith.xyz/terms"
              className="font-body text-xs text-outline transition-colors duration-150 hover:text-on-surface-variant"
            >
              Terms
            </a>
            <a
              href="https://usewraith.xyz/.well-known/security.txt"
              className="font-body text-xs text-outline transition-colors duration-150 hover:text-on-surface-variant"
            >
              Security.txt
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
