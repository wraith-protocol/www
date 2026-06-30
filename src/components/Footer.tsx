import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

// ─── Types ────────────────────────────────────────────────────────────────────

type StatusTone = 'green' | 'yellow' | 'red' | 'neutral';

type StatusState = {
  label: string;
  tone: StatusTone;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const acknowledgments = [
  { label: 'Stellar', src: '/logos/stellar-mark.svg' },
  { label: 'Drips', src: '/logos/drips-mark.svg' },
];

const statusPageUrl = import.meta.env.VITE_STATUS_PAGE_URL || 'https://status.usewraith.xyz';

// Static fallback — replace with a useEffect fetch from VITE_STATUS_API_URL
// if you want live status back. For now this unblocks the build.
const status: StatusState = { label: 'All systems normal', tone: 'green' };

// ─── Component ────────────────────────────────────────────────────────────────

export default function Footer() {
  const { t } = useTranslation();
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

  const columns = [
    {
      title: t('footer.columns.product'),
      links: [
        { label: t('footer.product.docs'), href: 'https://docs.usewraith.xyz' },
        { label: t('footer.product.demo'), href: 'https://demo.usewraith.xyz' },
        { label: t('footer.product.console'), href: 'https://console.usewraith.xyz' },
        { label: t('footer.product.compare'), href: '#compare' },
        { label: t('footer.product.faq'), href: '/faq' },
        { label: t('footer.product.changelog'), href: 'https://docs.usewraith.xyz/changelog' },
      ],
    },
    {
      title: t('footer.columns.developers'),
      links: [
        { label: t('footer.developers.sdk'), href: 'https://docs.usewraith.xyz/sdk/overview' },
        { label: t('footer.developers.apiReference'), href: 'https://docs.usewraith.xyz/api' },
        { label: t('footer.developers.github'), href: 'https://github.com/wraith-protocol' },
        {
          label: t('footer.developers.npm'),
          href: 'https://www.npmjs.com/package/@wraith-protocol/sdk',
        },
      ],
    },
    {
      title: t('footer.columns.resources'),
      links: [
        { label: t('footer.resources.erc5564'), href: 'https://eips.ethereum.org/EIPS/eip-5564' },
        { label: t('footer.resources.erc6538'), href: 'https://eips.ethereum.org/EIPS/eip-6538' },
        { label: t('footer.resources.security'), href: 'https://docs.usewraith.xyz/security' },
        { label: t('footer.resources.press'), href: '/press' },
        { label: 'Stellar Integration', href: '/stellar' },
      ],
    },
  ];

  return (
    <footer className="px-6 pb-8 pt-12 md:px-12">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col justify-between gap-12 md:flex-row">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="" width={30} height={24} className="h-6 opacity-90" />
              <span className="font-heading text-[13px] font-bold tracking-[2px] text-on-surface">
                {t('footer.brand')}
              </span>
            </div>
            <p className="max-w-60 font-body text-[13px] leading-normal text-outline">
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
                  const isInternal = link.href.startsWith('/') || link.href.startsWith('#');
                  if (link.href.startsWith('/')) {
                    return (
                      <Link
                        key={link.label}
                        to={link.href}
                        className="font-body text-[13px] text-on-surface-variant transition-colors duration-150 hover:text-on-surface"
                      >
                        {link.label}
                      </Link>
                    );
                  }
                  return (
                    <a
                      key={link.label}
                      href={link.href}
                      target={isInternal ? undefined : '_blank'}
                      rel={isInternal ? undefined : 'noopener noreferrer'}
                      className="font-body text-[13px] text-on-surface-variant transition-colors duration-150 hover:text-on-surface"
                    >
                      {link.label}
                    </a>
                  );
                })}
              </div>
            ))}

            <div className="flex max-w-65 flex-col gap-3">
              <span className="font-mono text-[10px] font-semibold tracking-[1.5px] text-outline">
                {t('footer.columns.acknowledgments')}
              </span>
              <a
                href="https://www.drips.network/wave/stellar"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t('footer.acknowledgmentsAria')}
                className="group flex flex-col gap-2 font-body text-[13px] leading-[1.45] text-on-surface-variant transition-colors duration-150 hover:text-on-surface"
              >
                <span className="flex items-center gap-2" aria-hidden="true">
                  {acknowledgments.map((logo) => (
                    <img
                      key={logo.label}
                      src={logo.src}
                      alt=""
                      width={16}
                      height={16}
                      className="h-4 w-4 opacity-70 transition-opacity duration-150 group-hover:opacity-90"
                    />
                  ))}
                </span>
                <span>{t('footer.acknowledgmentsText')}</span>
              </a>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start justify-between gap-4 border-t border-outline-variant-30 pt-5 sm:flex-row sm:items-center">
          <span className="font-mono text-[10px] font-semibold tracking-[1.5px] text-outline">
            {t('footer.built')}
          </span>
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <a
              href={statusPageUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open Wraith Protocol status page"
              className={`inline-flex items-center gap-2 rounded-none border px-2.5 py-1.5 font-body text-[11px] uppercase tracking-[1.5px] transition-colors duration-150 ${status.tone}`}
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
              {t('footer.legal.privacy')}
            </Link>
            <a
              href="https://usewraith.xyz/terms"
              className="font-body text-xs text-outline transition-colors duration-150 hover:text-on-surface-variant"
            >
              {t('footer.legal.terms')}
            </a>
            <a
              href="https://usewraith.xyz/.well-known/security.txt"
              className="font-body text-xs text-outline transition-colors duration-150 hover:text-on-surface-variant"
            >
              {t('footer.legal.securityTxt')}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
