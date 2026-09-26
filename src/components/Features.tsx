import { useTranslation } from 'react-i18next';
import { useInView } from '../hooks/useInView';

export default function Features() {
  const { t } = useTranslation();
  const { ref, isInView } = useInView({ threshold: 0.1 });

  const features = [
    {
      num: '01',
      title: t('features.stealth.title'),
      description: t('features.stealth.description'),
      meta: t('features.stealth.meta'),
    },
    {
      num: '02',
      title: t('features.scanning.title'),
      description: t('features.scanning.description'),
      meta: t('features.scanning.meta'),
    },
    {
      num: '03',
      title: t('features.multichain.title'),
      description: t('features.multichain.description'),
      meta: t('features.multichain.meta'),
    },
  ];

  return (
    <section ref={ref} className="border-t border-outline-variant-30 px-6 py-24 md:px-12">
      <div className="mx-auto flex max-w-[1344px] flex-col gap-12">
        <div className="flex flex-col gap-3" data-reveal={isInView}>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
            {t('features.eyebrow')}
          </span>
          <h2 className="font-heading text-[28px] font-bold leading-[1.1] tracking-[-1.2px] text-on-surface sm:text-[40px]">
            {t('features.heading')}
          </h2>
          <p className="font-body text-base leading-[1.6] text-on-surface-variant">
            {t('features.description')}{' '}
            <a
              href="#compare"
              className="text-primary hover:text-on-surface transition-colors duration-150 underline underline-offset-4 decoration-outline-variant"
            >
              {t('features.compareLink')}
            </a>
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {features.map((feature, index) => (
            <div
              key={feature.num}
              className="flex flex-col gap-4 border border-outline-variant bg-surface-container p-7"
              data-reveal={isInView}
              style={{ transitionDelay: isInView ? `${index * 100}ms` : '0ms' }}
            >
              <span className="font-mono text-[11px] font-semibold tracking-[1.5px] text-outline">
                {feature.num}
              </span>
              <h3 className="font-heading text-xl font-semibold tracking-[-0.5px] text-on-surface">
                {feature.title}
              </h3>
              <p className="font-body text-[13px] leading-[1.65] text-on-surface-variant">
                {feature.description}
              </p>
              <div className="flex items-center gap-2 border-t border-outline-variant-30 pt-3">
                <span className="font-mono text-[11px] text-outline">{feature.meta}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
