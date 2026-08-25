import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { entries } from '../data/grant-showcase.json';
import { filterOptedOutContributors } from '../utils/contributors';

type GrantShowcaseEntry = {
  id: string;
  name: string;
  description: string;
  wave: string;
  contributors: string[];
  status: string;
  codeUrl: string;
  demoUrl: string;
  featured: boolean;
};

const showcaseEntries = entries as GrantShowcaseEntry[];

const statusStyles: Record<string, string> = {
  live: 'border-tertiary text-tertiary',
  'in progress': 'border-blue text-blue',
  shipped: 'border-primary text-primary',
};

export default function FeaturedGrantShowcase() {
  const { t } = useTranslation();

  const featured = showcaseEntries.filter((entry) => entry.featured).slice(0, 3);

  if (featured.length === 0) return null;

  return (
    <section className="border-t border-outline-variant-30 px-6 py-24 md:px-12">
      <div className="mx-auto flex max-w-[1344px] flex-col gap-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-3">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
              {t('featuredGrants.eyebrow')}
            </span>
            <h2 className="font-heading text-[28px] font-bold leading-[1.1] tracking-[-1.2px] text-on-surface sm:text-[40px]">
              {t('featuredGrants.heading')}
            </h2>
            <p className="font-body text-base leading-[1.6] text-on-surface-variant">
              {t('featuredGrants.description')}
            </p>
          </div>
          <Link
            to="/grants/showcase"
            className="group flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[1.5px] text-outline transition-colors duration-150 hover:text-primary"
          >
            {t('featuredGrants.viewAll')}
            <span className="transition-transform duration-150 group-hover:translate-x-0.5">→</span>
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {featured.map((entry) => {
            const visibleContributors = filterOptedOutContributors(entry.contributors);
            const statusClass = statusStyles[entry.status] ?? 'border-outline-variant text-outline';

            return (
              <div
                key={entry.id}
                className="group flex flex-col gap-5 border border-outline-variant bg-surface-container p-7 transition-colors duration-150 hover:bg-surface-bright"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <h3 className="font-heading text-lg font-semibold tracking-[-0.3px] text-on-surface group-hover:text-primary">
                      {entry.name}
                    </h3>
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-[1.2px] text-outline">
                      {entry.wave}
                    </span>
                  </div>
                  <span
                    className={`border px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[1.2px] ${statusClass}`}
                  >
                    {entry.status}
                  </span>
                </div>

                <p className="font-body text-[13px] leading-[1.65] text-on-surface-variant">
                  {entry.description}
                </p>

                {visibleContributors.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {visibleContributors.map((contributor) => (
                      <a
                        key={contributor}
                        href={`https://github.com/${contributor}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="border border-outline-variant-30 px-2 py-1 font-mono text-[9px] font-medium text-outline transition-colors duration-150 hover:border-outline hover:text-primary"
                      >
                        @{contributor}
                      </a>
                    ))}
                  </div>
                )}

                <div className="mt-auto flex items-center gap-1.5 border-t border-outline-variant pt-4">
                  <Link
                    to="/grants/showcase"
                    className="font-mono text-[11px] text-outline transition-colors duration-150 group-hover:text-primary"
                  >
                    {t('featuredGrants.readMore')}
                  </Link>
                  <span className="text-outline transition-transform duration-150 group-hover:translate-x-0.5">
                    →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
