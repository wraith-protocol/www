import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const acknowledgments = [
  { label: 'Stellar', src: '/logos/stellar-mark.svg' },
  { label: 'Drips', src: '/logos/drips-mark.svg' },
];

export default function Footer() {
  const { t } = useTranslation();

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
      ],
    },
  ];

  return (
    <footer className="px-6 pb-8 pt-12 md:px-12">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col justify-between gap-12 md:flex-row">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="" className="h-6 opacity-90" />
              <span className="font-heading text-[13px] font-bold tracking-[2px] text-on-surface">
                {t('footer.brand')}
              </span>
            </div>
            <p className="max-w-[240px] font-body text-[13px] leading-[1.5] text-outline">
              {t('footer.tagline')}
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
          <div className="flex items-center gap-6">
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
