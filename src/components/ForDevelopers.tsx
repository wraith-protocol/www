import { useTranslation } from 'react-i18next';
import { useInView } from '../hooks/useInView';

export default function ForDevelopers() {
  const { t } = useTranslation();
  const { ref, isInView } = useInView({ threshold: 0.1 });

  const resources = [
    {
      label: t('forDevelopers.sdk.label'),
      badge: { text: t('forDevelopers.sdk.badge'), color: 'text-tertiary', bg: 'bg-tertiary-10' },
      title: t('forDevelopers.sdk.title'),
      description: t('forDevelopers.sdk.description'),
      code: '$ npm install @wraith-protocol/sdk',
      link: 'https://docs.usewraith.xyz/sdk/overview',
      linkText: t('forDevelopers.sdk.linkText'),
    },
    {
      label: t('forDevelopers.demo.label'),
      badge: { text: t('forDevelopers.demo.badge'), color: 'text-blue', bg: 'bg-blue-10' },
      title: t('forDevelopers.demo.title'),
      description: t('forDevelopers.demo.description'),
      code: '→ demo.usewraith.xyz',
      link: 'https://demo.usewraith.xyz',
      linkText: t('forDevelopers.demo.linkText'),
    },
    {
      label: t('forDevelopers.console.label'),
      badge: {
        text: t('forDevelopers.console.badge'),
        color: 'text-on-surface-variant',
        bg: 'bg-surface-bright',
      },
      title: t('forDevelopers.console.title'),
      description: t('forDevelopers.console.description'),
      code: '→ console.usewraith.xyz',
      link: 'https://console.usewraith.xyz',
      linkText: t('forDevelopers.console.linkText'),
    },
  ];

  return (
    <section ref={ref} className="border-t border-outline-variant-30 px-6 py-24 md:px-12">
      <div className="mx-auto flex max-w-[1344px] flex-col gap-12">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex flex-col gap-3" data-reveal={isInView}>
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
              {t('forDevelopers.eyebrow')}
            </span>
            <h2 className="font-heading text-[28px] font-bold tracking-[-1.2px] text-on-surface sm:text-[40px]">
              {t('forDevelopers.heading')}
            </h2>
          </div>
          <a
            href="https://docs.usewraith.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-10 items-center justify-center border border-outline-variant px-5 font-heading text-xs font-semibold uppercase tracking-[1.5px] text-primary transition-colors duration-150 hover:bg-surface-bright"
          >
            {t('forDevelopers.fullDocs')}
          </a>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {resources.map((resource, index) => (
            <div
              key={resource.label}
              className="flex flex-col gap-5 border border-outline-variant bg-surface-container p-7"
              data-reveal={isInView}
              style={{ transitionDelay: isInView ? `${index * 100}ms` : '0ms' }}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-semibold tracking-[2px] text-outline">
                  {resource.label}
                </span>
                <span
                  className={`px-2 py-0.5 font-mono text-[9px] font-semibold tracking-[1px] ${resource.badge.color} ${resource.badge.bg}`}
                >
                  {resource.badge.text}
                </span>
              </div>

              <h3 className="font-heading text-lg font-semibold tracking-[-0.3px] text-on-surface">
                {resource.title}
              </h3>

              <p className="font-body text-[13px] leading-[1.6] text-on-surface-variant">
                {resource.description}
              </p>

              <div className="border border-outline-variant-30 bg-surface px-4 py-3">
                <span className="font-mono text-xs text-primary">{resource.code}</span>
              </div>

              <a
                href={resource.link}
                target="_blank"
                rel="noopener noreferrer"
                className="font-heading text-[11px] font-semibold tracking-[1.5px] text-on-surface transition-colors duration-150 hover:text-primary"
              >
                {resource.linkText} →
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
