import { useTranslation } from 'react-i18next';
import { trackEvent } from '../analytics';

export default function CtaStrip() {
  const { t } = useTranslation();

  return (
    <section className="flex flex-col items-start justify-between gap-8 border-y border-outline-variant bg-surface-container px-6 py-[72px] sm:flex-row sm:items-center md:px-12">
      <div className="flex flex-col gap-3">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
          {t('cta.eyebrow')}
        </span>
        <h2 className="font-heading text-[24px] font-bold tracking-[-0.8px] text-on-surface sm:text-[32px]">
          {t('cta.heading')}
        </h2>
      </div>
      <div className="flex items-center gap-3">
        <a
          href="https://console.usewraith.xyz"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent('Get API Key')}
          className="flex h-12 items-center justify-center bg-primary px-7 font-heading text-[13px] font-semibold uppercase tracking-[1.5px] text-surface transition-[filter] duration-150 hover:brightness-110"
        >
          {t('cta.getKeys')}
        </a>
        <a
          href="https://docs.usewraith.xyz"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent('Read the Docs')}
          className="flex h-12 items-center justify-center border border-outline-variant px-7 font-heading text-[13px] font-semibold uppercase tracking-[1.5px] text-primary transition-colors duration-150 hover:bg-surface-bright"
        >
          {t('cta.readDocs')}
        </a>
      </div>
    </section>
  );
}
