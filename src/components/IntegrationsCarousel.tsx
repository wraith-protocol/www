import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { featured } from '../data/integrations.json';

export type Integration = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  logo: string | null;
  logoInitials?: string;
  logoWidth: number;
  category: string;
  chains: string[];
  website: string;
};

const integrations = featured as Integration[];
const ROTATE_MS = 4500;
/** Fixed card footprint — prevents CLS when the strip mounts or rotates. */
const CARD_MIN_HEIGHT = 188;
const CARD_WIDTH = 280;
const CARD_GAP = 16;
const SLIDE_STEP = CARD_WIDTH + CARD_GAP;

function IntegrationCard({ item }: { item: Integration }) {
  const { t } = useTranslation();

  return (
    <Link
      to={`/ecosystem/${item.slug}`}
      className="group flex h-full shrink-0 flex-col gap-4 border border-outline-variant-30 bg-surface-container p-5 transition-colors duration-150 hover:border-outline hover:bg-surface-bright"
      style={{ minHeight: CARD_MIN_HEIGHT, width: CARD_WIDTH }}
    >
      <div className="flex h-10 items-center justify-between gap-3">
        {item.logo ? (
          <img
            src={item.logo}
            alt=""
            width={item.logoWidth}
            height={32}
            className="h-8 w-auto object-contain opacity-70 grayscale transition-all duration-150 group-hover:opacity-100 group-hover:grayscale-0"
          />
        ) : (
          <span
            className="flex h-8 w-8 items-center justify-center border border-outline-variant bg-surface font-heading text-[11px] font-bold text-primary"
            aria-hidden="true"
          >
            {item.logoInitials ?? item.name.slice(0, 2).toUpperCase()}
          </span>
        )}
        <span className="font-mono text-[9px] font-semibold uppercase tracking-[1.2px] text-outline">
          {item.category}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1.5">
        <h3 className="font-heading text-[15px] font-semibold tracking-[-0.2px] text-on-surface group-hover:text-primary">
          {item.name}
        </h3>
        <p className="font-body text-[12px] leading-[1.5] text-on-surface-variant">
          {item.tagline}
        </p>
      </div>

      <span className="font-mono text-[10px] font-semibold uppercase tracking-[1.2px] text-outline transition-colors duration-150 group-hover:text-primary">
        {t('integrationsCarousel.view')} →
      </span>
    </Link>
  );
}

export default function IntegrationsCarousel() {
  const { t } = useTranslation();
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  );

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReducedMotion(media.matches);
    onChange();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (reducedMotion || paused || integrations.length <= 1) return;

    const id = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % integrations.length);
    }, ROTATE_MS);

    return () => window.clearInterval(id);
  }, [paused, reducedMotion]);

  if (integrations.length === 0) return null;

  return (
    <section
      aria-label={t('integrationsCarousel.ariaLabel')}
      className="border-t border-outline-variant-30 px-6 py-24 md:px-12"
    >
      <div className="mx-auto flex max-w-[1344px] flex-col gap-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-3">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
              {t('integrationsCarousel.eyebrow')}
            </span>
            <h2 className="font-heading text-[28px] font-bold leading-[1.1] tracking-[-1.2px] text-on-surface sm:text-[40px]">
              {t('integrationsCarousel.heading')}
            </h2>
            <p className="max-w-[640px] font-body text-base leading-[1.6] text-on-surface-variant">
              {t('integrationsCarousel.description')}
            </p>
          </div>
          <Link
            to="/ecosystem"
            className="group flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[1.5px] text-outline transition-colors duration-150 hover:text-primary"
          >
            {t('integrationsCarousel.viewAll')}
            <span className="transition-transform duration-150 group-hover:translate-x-0.5">→</span>
          </Link>
        </div>

        {reducedMotion ? (
          <div
            className="flex gap-4 overflow-x-auto pb-1"
            data-testid="integrations-static-row"
            style={{ minHeight: CARD_MIN_HEIGHT }}
          >
            {integrations.map((item) => (
              <IntegrationCard key={item.slug} item={item} />
            ))}
          </div>
        ) : (
          <div
            className="relative overflow-hidden"
            data-testid="integrations-carousel"
            style={{ minHeight: CARD_MIN_HEIGHT }}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocusCapture={() => setPaused(true)}
            onBlurCapture={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                setPaused(false);
              }
            }}
          >
            <div
              className="flex gap-4 transition-transform duration-500 ease-out"
              style={{
                transform: `translateX(-${activeIndex * SLIDE_STEP}px)`,
              }}
              aria-live="polite"
            >
              {/* Duplicate once so the strip never looks empty mid-rotation. */}
              {[...integrations, ...integrations].map((item, index) => (
                <IntegrationCard key={`${item.slug}-${index}`} item={item} />
              ))}
            </div>

            <div
              className="mt-6 flex items-center gap-2"
              role="tablist"
              aria-label={t('integrationsCarousel.dotsLabel')}
            >
              {integrations.map((item, index) => (
                <button
                  key={item.slug}
                  type="button"
                  role="tab"
                  aria-selected={index === activeIndex}
                  aria-label={t('integrationsCarousel.goTo', { name: item.name })}
                  className={`h-1.5 w-6 border-0 transition-colors duration-150 ${
                    index === activeIndex ? 'bg-primary' : 'bg-outline-variant'
                  }`}
                  onClick={() => setActiveIndex(index)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
