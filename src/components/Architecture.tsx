import { useTranslation } from 'react-i18next';
import { useInView } from '../hooks/useInView';

export default function Architecture() {
  const { t } = useTranslation();
  const { ref, isInView } = useInView({ threshold: 0.1 });

  const steps = [
    {
      num: '1',
      label: t('architecture.sender.label'),
      description: t('architecture.sender.description'),
      code: 'deriveStealthAddress()',
      border: true,
    },
    {
      num: '2',
      label: t('architecture.announcer.label'),
      description: t('architecture.announcer.description'),
      code: 'Announcement event',
      border: true,
    },
    {
      num: '3',
      label: t('architecture.receiver.label'),
      description: t('architecture.receiver.description'),
      code: 'scan() → withdraw()',
      border: false,
    },
  ];

  return (
    <section ref={ref} className="border-t border-outline-variant-30 px-6 py-24 md:px-12">
      <div className="mx-auto flex max-w-[1344px] flex-col items-center gap-12">
        <div className="flex flex-col items-center gap-3" data-reveal={isInView}>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
            {t('architecture.eyebrow')}
          </span>
          <h2 className="font-heading text-[28px] font-bold tracking-[-1.2px] text-on-surface sm:text-[40px]">
            {t('architecture.heading')}
          </h2>
        </div>

        <div className="w-full max-w-[960px] border border-outline-variant bg-surface-container">
          <div className="flex flex-col md:flex-row">
            {steps.map((step, index) => (
              <div
                key={step.num}
                className={`flex flex-1 flex-col gap-4 p-8 ${step.border ? 'border-b border-outline-variant md:border-r md:border-b-0' : ''}`}
                data-reveal={isInView}
                style={{ transitionDelay: isInView ? `${index * 100}ms` : '0ms' }}
              >
                <div className="flex h-8 w-8 items-center justify-center border border-outline-variant">
                  <span className="font-heading text-[13px] font-semibold text-on-surface">
                    {step.num}
                  </span>
                </div>
                <span className="font-mono text-[10px] font-semibold tracking-[1.5px] text-outline">
                  {step.label}
                </span>
                <p className="font-body text-[13px] leading-[1.6] text-on-surface-variant">
                  {step.description}
                </p>
                <div className="border border-outline-variant-30 bg-surface px-3 py-2">
                  <span className="font-mono text-[11px] text-primary">{step.code}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
