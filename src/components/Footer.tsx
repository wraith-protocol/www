import { useEffect, useState } from 'react';

const columns = [
  {
    title: 'PRODUCT',
    links: [
      { label: 'Docs', href: 'https://docs.usewraith.xyz' },
      { label: 'Demo', href: 'https://demo.usewraith.xyz' },
      { label: 'Console', href: 'https://console.usewraith.xyz' },
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
    ],
  },
];

const statusPageUrl = import.meta.env.VITE_STATUS_PAGE_URL || 'https://status.usewraith.xyz';
const statusBadgeJsonUrl = import.meta.env.VITE_STATUS_BADGE_JSON_URL;

type StatusLevel = 'operational' | 'degraded' | 'major' | 'unknown';

type ProviderStatus = {
  status?: string;
  page?: {
    status?: string;
  };
};

const statusCopy: Record<StatusLevel, { label: string; className: string }> = {
  operational: {
    label: 'All systems normal',
    className: 'bg-tertiary',
  },
  degraded: {
    label: 'Partial outage',
    className: 'bg-yellow-400',
  },
  major: {
    label: 'Major outage',
    className: 'bg-error',
  },
  unknown: {
    label: 'Status pending',
    className: 'bg-outline',
  },
};

function normalizeStatus(payload: ProviderStatus): StatusLevel {
  const status = String(payload.status || payload.page?.status || '').toLowerCase();

  if (status.includes('major') || status.includes('down') || status.includes('outage')) {
    return 'major';
  }

  if (status.includes('partial') || status.includes('degraded') || status.includes('minor')) {
    return 'degraded';
  }

  if (status.includes('up') || status.includes('operational') || status.includes('normal')) {
    return 'operational';
  }

  return 'unknown';
}

function StatusBadge() {
  const [level, setLevel] = useState<StatusLevel>(statusBadgeJsonUrl ? 'unknown' : 'operational');

  useEffect(() => {
    if (!statusBadgeJsonUrl) {
      return;
    }

    const controller = new AbortController();

    async function refreshStatus() {
      try {
        const response = await fetch(statusBadgeJsonUrl, {
          cache: 'no-store',
          signal: controller.signal,
        });

        if (!response.ok) {
          setLevel('unknown');
          return;
        }

        setLevel(normalizeStatus((await response.json()) as ProviderStatus));
      } catch (error) {
        if (!controller.signal.aborted) {
          setLevel('unknown');
        }
      }
    }

    refreshStatus();
    const interval = window.setInterval(refreshStatus, 60000);

    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, []);

  const copy = statusCopy[level];

  return (
    <a
      href={statusPageUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex h-7 items-center gap-2 rounded-full border border-outline-variant-30 px-3 font-body text-xs text-outline transition-colors duration-150 hover:border-outline hover:text-on-surface-variant"
      aria-label={`Wraith Protocol status: ${copy.label}`}
    >
      <span className={`h-2 w-2 rounded-full ${copy.className}`} aria-hidden="true" />
      <span>{copy.label}</span>
    </a>
  );
}

export default function Footer() {
  return (
    <footer className="px-6 pb-8 pt-12 md:px-12">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col justify-between gap-12 md:flex-row">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Wraith" className="h-6 opacity-90" />
              <span className="font-heading text-[13px] font-bold tracking-[2px] text-on-surface">
                WRAITH PROTOCOL
              </span>
            </div>
            <p className="max-w-[240px] font-body text-[13px] leading-[1.5] text-outline">
              Private payments, plainly.
            </p>
          </div>

          <div className="flex flex-wrap gap-12">
            {columns.map((column) => (
              <div key={column.title} className="flex flex-col gap-3">
                <span className="font-mono text-[10px] font-semibold tracking-[1.5px] text-outline">
                  {column.title}
                </span>
                {column.links.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-body text-[13px] text-on-surface-variant transition-colors duration-150 hover:text-on-surface"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-start justify-between gap-4 border-t border-outline-variant-30 pt-5 sm:flex-row sm:items-center">
          <span className="font-mono text-[10px] font-semibold tracking-[1.5px] text-outline">
            BUILT ON HORIZEN · ERC-5564 · OPEN SOURCE
          </span>
          <div className="flex items-center gap-6">
            <StatusBadge />
            <a
              href="https://usewraith.xyz/privacy"
              className="font-body text-xs text-outline transition-colors duration-150 hover:text-on-surface-variant"
            >
              Privacy
            </a>
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
