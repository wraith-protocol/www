import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useInView } from '../hooks/useInView';
import ecosystemData from '../data/ecosystem.json';

const categories = ecosystemData.categories;
const partners = ecosystemData.partners;

function PartnerCard({
  partner,
  index,
  isInView,
}: {
  partner: (typeof partners)[number];
  index: number;
  isInView: boolean;
}) {
  const categoryLabel =
    categories.find((c) => c.id === partner.category)?.label ?? partner.category;

  return (
    <a
      href={partner.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col gap-5 border border-outline-variant-30 bg-surface-container p-6 transition-all duration-200 hover:border-outline hover:bg-surface-bright"
      data-reveal={isInView}
      style={{ transitionDelay: isInView ? `${index * 60}ms` : '0ms' }}
    >
      <div className="flex h-10 items-center justify-between">
        <img
          src={partner.logo}
          alt={`${partner.shortName} logo`}
          width={partner.width}
          height={28}
          className="h-7 w-auto object-contain grayscale opacity-60 transition-all duration-200 group-hover:grayscale-0 group-hover:opacity-100"
        />
        <span className="font-mono text-[10px] text-outline opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          VISIT ↗
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="font-heading text-[15px] font-semibold text-on-surface">
            {partner.name}
          </span>
        </div>
        <span className="font-mono text-[9px] font-semibold uppercase tracking-[1.5px] text-outline">
          {categoryLabel}
        </span>
        <p className="font-body text-xs leading-[1.5] text-on-surface-variant transition-colors duration-150 group-hover:text-on-surface">
          {partner.description}
        </p>
      </div>
    </a>
  );
}

export default function Ecosystem() {
  const { ref: headerRef, isInView: headerInView } = useInView({ threshold: 0.1 });
  const { ref: walletsRef, isInView: walletsInView } = useInView({ threshold: 0.1 });
  const { ref: dexesRef, isInView: dexesInView } = useInView({ threshold: 0.1 });
  const { ref: lendingRef, isInView: lendingInView } = useInView({ threshold: 0.1 });
  const { ref: indexersRef, isInView: indexersInView } = useInView({ threshold: 0.1 });

  const partnerGroups = categories.map((cat) => ({
    ...cat,
    items: partners.filter((p) => p.category === cat.id),
  }));

  const visibleGroups = partnerGroups.filter((g) => g.items.length > 0);

  return (
    <>
      <Helmet>
        <title>Ecosystem & Partners – Wraith Protocol</title>
        <meta
          name="description"
          content="Explore the Wraith Protocol ecosystem — wallets, DEXes, lending protocols, indexers, and oracles integrated with stealth address technology."
        />
        <meta property="og:title" content="Ecosystem & Partners – Wraith Protocol" />
        <meta
          property="og:description"
          content="Explore wallets, DEXes, lending protocols, and indexers powering the Wraith Protocol ecosystem."
        />
        <meta property="og:url" content="https://usewraith.xyz/ecosystem" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <div className="bg-surface text-on-surface">
        {/* Header */}
        <section
          ref={headerRef}
          className="border-b border-outline-variant-30 px-6 pb-24 pt-32 md:px-12"
        >
          <div className="mx-auto flex max-w-[1344px] flex-col gap-6" data-reveal={headerInView}>
            <div className="flex flex-wrap items-center gap-3">
              <div className="border border-tertiary px-2.5 py-1.5">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[1.5px] text-tertiary">
                  {partners.length} INTEGRATIONS
                </span>
              </div>
              <div className="border border-outline-variant px-2.5 py-1.5">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[1.5px] text-outline">
                  {visibleGroups.length} CATEGORIES
                </span>
              </div>
            </div>
            <h1 className="font-heading text-[36px] font-bold leading-[1.05] tracking-[-2px] text-on-surface sm:text-[48px] md:text-[56px]">
              Ecosystem &amp; Partners
            </h1>
            <p className="max-w-[640px] font-body text-[17px] leading-[1.6] text-on-surface-variant">
              Wraith Protocol integrates with leading wallets, DEXes, lending protocols, indexers,
              and oracles across the Stellar and EVM ecosystems. Every partner brings stealth
              privacy to their users through seamless SDK integration.
            </p>
          </div>
        </section>

        {/* Partner groups */}
        {visibleGroups.map((group, groupIndex) => {
          let groupRef;
          if (group.id === 'wallets') groupRef = walletsRef;
          else if (group.id === 'dexes') groupRef = dexesRef;
          else if (group.id === 'lending') groupRef = lendingRef;
          else if (group.id === 'indexers') groupRef = indexersRef;

          const isInView =
            group.id === 'wallets'
              ? walletsInView
              : group.id === 'dexes'
                ? dexesInView
                : group.id === 'lending'
                  ? lendingInView
                  : indexersInView;

          return (
            <section
              key={group.id}
              ref={groupRef}
              className="border-b border-outline-variant-30 px-6 py-20 md:px-12"
            >
              <div className="mx-auto flex max-w-[1344px] flex-col gap-10">
                <div className="flex flex-col gap-3" data-reveal={isInView}>
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
                    {String(groupIndex + 1).padStart(2, '0')}. {group.label.toUpperCase()}
                  </span>
                  <h2 className="font-heading text-[28px] font-bold tracking-[-1.2px] text-on-surface sm:text-[40px]">
                    {group.label}
                  </h2>
                  <p className="max-w-[560px] font-body text-sm leading-[1.6] text-on-surface-variant">
                    {group.description}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {group.items.map((partner, i) => (
                    <PartnerCard
                      key={partner.name}
                      partner={partner}
                      index={i}
                      isInView={isInView}
                    />
                  ))}
                </div>
              </div>
            </section>
          );
        })}

        {/* CTA */}
        <section className="px-6 py-20 md:px-12">
          <div className="mx-auto flex max-w-[1344px] flex-col items-start gap-6">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
              Get involved
            </span>
            <h2 className="font-heading text-[28px] font-bold tracking-[-1.2px] text-on-surface sm:text-[40px]">
              Integrate Wraith
            </h2>
            <p className="max-w-[560px] font-body text-sm leading-[1.6] text-on-surface-variant">
              Is your project interested in bringing stealth privacy to its users? We&apos;d love to
              partner. The SDK is open source and integrates in under a day.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://docs.usewraith.xyz/sdk/overview"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-12 items-center justify-center bg-primary px-7 font-heading text-[13px] font-semibold uppercase tracking-[1.5px] text-surface transition-[filter] duration-150 hover:brightness-110"
              >
                Read the Docs
              </a>
              <Link
                to="/"
                className="flex h-12 items-center justify-center border border-outline-variant px-7 font-heading text-[13px] font-semibold uppercase tracking-[1.5px] text-primary transition-colors duration-150 hover:bg-surface-bright"
              >
                ← Back to Home
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
