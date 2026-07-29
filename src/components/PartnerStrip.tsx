import { useState } from 'react';
import { useInView } from '../hooks/useInView';
import ecosystemData from '../data/ecosystem.json';

type Partner = (typeof ecosystemData.partners)[number];

function PartnerTooltip({ partner }: { partner: Partner }) {
  const categoryLabel =
    ecosystemData.categories.find((c) => c.id === partner.category)?.label ?? partner.category;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 -translate-y-full opacity-0 transition-all duration-200 group-hover/hint:opacity-100"
    >
      <div className="whitespace-nowrap rounded-none border border-outline-variant bg-surface-container px-3 py-2 shadow-lg">
        <p className="font-heading text-[13px] font-semibold text-on-surface">{partner.name}</p>
        <p className="font-mono text-[9px] font-semibold uppercase tracking-[1.5px] text-outline">
          {categoryLabel}
        </p>
      </div>
    </div>
  );
}

function PartnerItem({ partner }: { partner: Partner }) {
  const categoryLabel =
    ecosystemData.categories.find((c) => c.id === partner.category)?.label ?? partner.category;

  return (
    <a
      href={partner.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group/hint relative flex shrink-0 items-center gap-3 border border-outline-variant-30 bg-surface-container px-5 py-3 transition-all duration-200 hover:border-outline hover:bg-surface-bright"
      aria-label={`${partner.name} — ${categoryLabel}`}
      title={`${partner.name} — ${categoryLabel}`}
    >
      <img
        src={partner.logo}
        alt={`${partner.name} logo`}
        width={partner.width}
        height={28}
        className="h-7 w-auto object-contain grayscale opacity-40 transition-all duration-300 group-hover/hint:grayscale-0 group-hover/hint:opacity-90"
      />
      <span className="font-heading text-[13px] font-semibold text-on-surface transition-colors duration-200 group-hover/hint:text-primary">
        {partner.shortName}
      </span>
      <PartnerTooltip partner={partner} />
    </a>
  );
}

// Duplicate partners for seamless infinite scroll
const duplicatedPartners = [...ecosystemData.partners, ...ecosystemData.partners];

export default function PartnerStrip() {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const [paused, setPaused] = useState(false);

  return (
    <section
      ref={ref}
      aria-label="Ecosystem partners"
      className="border-t border-outline-variant-30 bg-surface py-12"
      data-reveal={isInView}
    >
      <div className="mx-auto mb-8 flex max-w-[1344px] flex-col gap-3 px-6 md:px-12">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
          Ecosystem Integrations
        </span>
        <h2 className="font-heading text-[22px] font-bold tracking-[-0.8px] text-on-surface sm:text-[28px]">
          Powered by{' '}
          <span className="text-on-surface-variant">{ecosystemData.partners.length}+ partners</span>
        </h2>
      </div>

      <div
        className="overflow-hidden"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        role="list"
        aria-label={`Scrolling list of ${ecosystemData.partners.length} ecosystem partners`}
      >
        <div
          className={`flex w-max gap-4 px-6 md:px-12 animate-scroll`}
          style={{ animationPlayState: paused ? 'paused' : 'running' }}
        >
          {duplicatedPartners.map((partner, index) => (
            <div key={`${partner.shortName}-${index}`} role="listitem">
              <PartnerItem partner={partner} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
