import { useInView } from '../hooks/useInView';

const partners = [
  {
    name: 'Stellar Development Foundation',
    shortName: 'SDF',
    description: 'Foundational protocol development & ecosystem support.',
    logo: '/logos/stellar-partners/sdf.svg',
    link: 'https://stellar.org',
  },
  {
    name: 'Drips',
    shortName: 'Drips',
    description: 'Continuous funding and token streaming for projects.',
    logo: '/logos/stellar-partners/drips.svg',
    link: 'https://www.drips.network',
  },
  {
    name: 'Freighter',
    shortName: 'Freighter',
    description: 'Stellar-native non-custodial browser wallet extension.',
    logo: '/logos/stellar-partners/freighter.svg',
    link: 'https://freighter.app',
  },
  {
    name: 'Albedo',
    shortName: 'Albedo',
    description: 'Secure identity and transaction signer for Stellar apps.',
    logo: '/logos/stellar-partners/albedo.svg',
    link: 'https://albedo.link',
  },
  {
    name: 'xBull',
    shortName: 'xBull',
    description: 'Feature-rich Stellar wallet for desktop and mobile.',
    logo: '/logos/stellar-partners/xbull.svg',
    link: 'https://xbull.app',
  },
  {
    name: 'LOBSTR',
    shortName: 'LOBSTR',
    description: 'Comprehensive wallet and exchange platform on Stellar.',
    logo: '/logos/stellar-partners/lobstr.svg',
    link: 'https://lobstr.co',
  },
];

export default function EcosystemPartners() {
  const { ref, isInView } = useInView({ threshold: 0.1 });

  return (
    <section
      ref={ref}
      className="border-t border-outline-variant-30 px-6 py-24 md:px-12 bg-surface"
    >
      <div className="mx-auto flex max-w-[1344px] flex-col gap-12">
        <div className="flex flex-col gap-3" data-reveal={isInView}>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
            Built on Stellar
          </span>
          <h2 className="font-heading text-[28px] font-bold tracking-[-1.2px] text-on-surface sm:text-[40px]">
            Ecosystem Partners &amp; Credits
          </h2>
          <p className="max-w-[640px] font-body text-sm leading-[1.6] text-on-surface-variant">
            Wraith is proud to be supported by the Stellar Development Foundation&apos;s Stellar
            Wave program via Drips, and integrates with leading wallet providers across the Stellar
            ecosystem.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {partners.map((partner, index) => (
            <a
              key={partner.shortName}
              href={partner.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col gap-5 border border-outline-variant-30 bg-surface-container p-6 transition-all duration-200 hover:border-outline hover:bg-surface-bright rounded-none"
              data-reveal={isInView}
              style={{ transitionDelay: isInView ? `${index * 50}ms` : '0ms' }}
            >
              <div className="flex h-10 items-center justify-between">
                <img
                  src={partner.logo}
                  alt={`${partner.shortName} Logo`}
                  className="h-8 max-w-[120px] object-contain grayscale opacity-60 transition-all duration-200 group-hover:grayscale-0 group-hover:opacity-100"
                />
                <span className="font-mono text-[10px] text-outline opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  VISIT ↗
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="font-heading text-[15px] font-semibold text-on-surface">
                  {partner.name}
                </span>
                <p className="font-body text-xs leading-[1.5] text-outline group-hover:text-on-surface-variant transition-colors duration-150">
                  {partner.description}
                </p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
