import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { entries } from '../data/case-studies.json';

type CaseStudy = {
  id: string;
  slug: string;
  org: string;
  logo: string;
  industry: string;
  useCase: string;
  integrationDate: string;
  quote: string;
  quotee: string;
  summary: string;
  chains: string[];
};

export default function CaseStudiesStrip() {
  const { t } = useTranslation();

  if (!entries || entries.length === 0) return null;

  const caseStudies = entries as CaseStudy[];
  const displayStudies = caseStudies.slice(0, 3);

  return (
    <section className="border-t border-outline-variant-30 px-6 py-24 md:px-12">
      <div className="mx-auto flex max-w-[1344px] flex-col gap-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-3">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
              {t('caseStudiesStrip.eyebrow')}
            </span>
            <h2 className="font-heading text-[28px] font-bold leading-[1.1] tracking-[-1.2px] text-on-surface sm:text-[40px]">
              {t('caseStudiesStrip.heading')}
            </h2>
            <p className="font-body text-base leading-[1.6] text-on-surface-variant">
              {t('caseStudiesStrip.description')}
            </p>
          </div>
          <Link
            to="/case-studies"
            className="group flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[1.5px] text-outline transition-colors duration-150 hover:text-primary"
          >
            {t('caseStudiesStrip.viewAll')}
            <span className="transition-transform duration-150 group-hover:translate-x-0.5">→</span>
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {displayStudies.map((study) => {
            const formattedDate = new Intl.DateTimeFormat('en-US', {
              month: 'short',
              year: 'numeric',
            }).format(new Date(study.integrationDate));

            return (
              <Link
                key={study.id}
                to={`/case-studies/${study.slug}`}
                className="group flex flex-col gap-5 border border-outline-variant bg-surface-container p-7 transition-colors duration-150 hover:bg-surface-bright"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center border border-outline-variant bg-surface">
                    <span className="font-heading text-sm font-bold tracking-[-0.3px] text-primary">
                      {study.logo}
                    </span>
                  </div>
                  <span className="font-mono text-[9px] font-semibold uppercase tracking-[1.2px] text-outline">
                    {formattedDate}
                  </span>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <h3 className="font-heading text-lg font-semibold tracking-[-0.3px] text-on-surface group-hover:text-primary">
                      {study.org}
                    </h3>
                    <p className="font-body text-[12px] text-outline">{study.industry}</p>
                  </div>
                  <p className="font-body text-[13px] leading-[1.65] text-on-surface-variant">
                    {study.summary}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {study.chains.map((chain) => (
                    <span
                      key={chain}
                      className="border border-outline-variant-30 px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-[1.2px] text-outline"
                    >
                      {chain}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[11px] text-outline transition-colors duration-150 group-hover:text-primary">
                    {t('caseStudiesStrip.readMore')}
                  </span>
                  <span className="text-outline transition-transform duration-150 group-hover:translate-x-0.5">
                    →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
