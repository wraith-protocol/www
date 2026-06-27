import { useTranslation } from 'react-i18next';
import { entries } from '../data/showcase.json';

type ShowcaseEntry = {
  name: string;
  logo: string;
  description: string;
  url: string;
  stellar: boolean;
};

export default function Showcase() {
  const { t } = useTranslation();

  if (!entries || entries.length === 0) return null;

  return (
    <section className="border-t border-outline-variant-30 px-6 py-24 md:px-12">
      <div className="mx-auto flex max-w-[1344px] flex-col gap-10">
        <div className="flex flex-col gap-3">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
            {t('showcase.eyebrow')}
          </span>
          <h2 className="font-heading text-[28px] font-bold leading-[1.1] tracking-[-1.2px] text-on-surface sm:text-[40px]">
            {t('showcase.heading')}
          </h2>
          <p className="font-body text-base leading-[1.6] text-on-surface-variant">
            {t('showcase.description')}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(entries as ShowcaseEntry[]).map((entry) => (
            <a
              key={entry.name}
              href={entry.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col gap-5 border border-outline-variant bg-surface-container p-7 transition-colors duration-150 hover:bg-surface-bright"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center border border-outline-variant bg-surface">
                  <span className="font-heading text-sm font-bold tracking-[-0.3px] text-primary">
                    {entry.logo}
                  </span>
                </div>
                {entry.stellar && (
                  <span className="flex h-6 items-center border border-outline-variant-30 px-2 font-mono text-[9px] font-semibold uppercase tracking-[1.2px] text-outline">
                    Stellar
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="font-heading text-lg font-semibold tracking-[-0.3px] text-on-surface group-hover:text-primary">
                  {entry.name}
                </h3>
                <p className="font-body text-[13px] leading-[1.65] text-on-surface-variant">
                  {entry.description}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[11px] text-outline transition-colors duration-150 group-hover:text-primary">
                  {t('showcase.visit')}
                </span>
                <span className="text-outline transition-transform duration-150 group-hover:translate-x-0.5">
                  ↗
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
