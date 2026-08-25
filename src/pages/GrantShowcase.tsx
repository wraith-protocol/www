import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
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

const labelStyles = 'font-mono text-[10px] font-semibold uppercase tracking-[1.8px] text-outline';

const statusStyles: Record<string, string> = {
  live: 'border-tertiary text-tertiary',
  'in progress': 'border-blue text-blue',
  shipped: 'border-primary text-primary',
};

function StatusBadge({ status }: { status: string }) {
  const styles = statusStyles[status] ?? 'border-outline-variant text-outline';
  return (
    <span
      className={`border px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[1.2px] ${styles}`}
    >
      {status}
    </span>
  );
}

function ShowcaseCard({ entry }: { entry: GrantShowcaseEntry }) {
  const { t } = useTranslation();
  const visibleContributors = filterOptedOutContributors(entry.contributors);

  return (
    <article className="group flex flex-col gap-5 border border-outline-variant bg-surface-container p-7 transition-colors duration-150 hover:bg-surface-bright">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="font-heading text-lg font-semibold tracking-[-0.3px] text-on-surface group-hover:text-primary">
            {entry.name}
          </h3>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[1.2px] text-outline">
            {entry.wave}
          </span>
        </div>
        <StatusBadge status={entry.status} />
      </div>

      <p className="font-body text-[13px] leading-[1.65] text-on-surface-variant">
        {entry.description}
      </p>

      {visibleContributors.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className={labelStyles}>{t('grantShowcase.contributors')}</span>
          <div className="flex flex-wrap gap-2">
            {visibleContributors.map((contributor) => (
              <a
                key={contributor}
                href={`https://github.com/${contributor}`}
                target="_blank"
                rel="noopener noreferrer"
                className="border border-outline-variant-30 px-2 py-1 font-mono text-[10px] font-medium text-on-surface-variant transition-colors duration-150 hover:border-outline hover:text-primary"
              >
                @{contributor}
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="mt-auto flex items-center gap-4 border-t border-outline-variant pt-4">
        <a
          href={entry.codeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 font-mono text-[11px] text-outline transition-colors duration-150 hover:text-primary"
        >
          {t('grantShowcase.viewCode')}
          <span aria-hidden="true">↗</span>
        </a>
        <a
          href={entry.demoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 font-mono text-[11px] text-outline transition-colors duration-150 hover:text-primary"
        >
          {t('grantShowcase.viewDemo')}
          <span aria-hidden="true">↗</span>
        </a>
      </div>
    </article>
  );
}

export default function GrantShowcase() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeWave = searchParams.get('wave') ?? 'all';
  const activeStatus = searchParams.get('status') ?? 'all';

  const uniqueWaves = useMemo(
    () => Array.from(new Set(showcaseEntries.map((entry) => entry.wave))).sort(),
    [],
  );
  const uniqueStatuses = useMemo(
    () => Array.from(new Set(showcaseEntries.map((entry) => entry.status))).sort(),
    [],
  );

  const filteredEntries = useMemo(() => {
    return showcaseEntries.filter((entry) => {
      const waveMatch = activeWave === 'all' || entry.wave === activeWave;
      const statusMatch = activeStatus === 'all' || entry.status === activeStatus;
      return waveMatch && statusMatch;
    });
  }, [activeWave, activeStatus]);

  const hasActiveFilters = activeWave !== 'all' || activeStatus !== 'all';

  const updateFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === 'all') {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setSearchParams(next, { replace: true });
  };

  const resetFilters = () => {
    setSearchParams({}, { replace: true });
  };

  return (
    <Layout>
      <Helmet>
        <title>Grant Showcase – Wraith Protocol</title>
        <meta
          name="description"
          content="Explore grant-funded projects built on Wraith Protocol. Stealth address wallets, DAO treasury tools, cross-chain bridges, and more."
        />
        <meta property="og:title" content="Grant Showcase – Wraith Protocol" />
        <meta
          property="og:description"
          content="Explore grant-funded projects built on Wraith Protocol. Stealth address wallets, DAO treasury tools, cross-chain bridges, and more."
        />
        <meta property="og:url" content="https://usewraith.xyz/grants/showcase" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <div className="mx-auto max-w-[1120px] px-6 py-10 md:px-12 md:py-16">
        {/* Hero */}
        <section className="flex flex-col gap-6 border-b border-outline-variant pb-12">
          <span className={labelStyles}>{t('grantShowcase.eyebrow')}</span>
          <div className="flex max-w-[700px] flex-col gap-3">
            <h1 className="font-heading text-[34px] font-bold tracking-[-1.2px] text-on-surface sm:text-[48px]">
              {t('grantShowcase.heading')}
            </h1>
            <p className="font-body text-[15px] leading-[1.7] text-on-surface-variant">
              {t('grantShowcase.description')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
              {t('grantShowcase.totalProjects')}
            </span>
            <span className="font-heading text-[18px] font-semibold text-on-surface">
              {showcaseEntries.length}{' '}
              {showcaseEntries.length === 1
                ? t('grantShowcase.project')
                : t('grantShowcase.projects')}
            </span>
          </div>
        </section>

        {/* Filters */}
        <section className="flex flex-col gap-4 border-b border-outline-variant py-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className={labelStyles}>{t('grantShowcase.filterByWave')}</span>
            <button
              type="button"
              onClick={() => updateFilter('wave', 'all')}
              className={`border px-3 py-1.5 font-body text-[13px] transition-colors ${
                activeWave === 'all'
                  ? 'border-primary bg-primary text-surface'
                  : 'border-outline-variant text-on-surface-variant hover:border-outline'
              }`}
            >
              {t('grantShowcase.allWaves')}
            </button>
            {uniqueWaves.map((wave) => (
              <button
                key={wave}
                type="button"
                onClick={() => updateFilter('wave', wave)}
                className={`border px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[1.5px] transition-colors ${
                  activeWave === wave
                    ? 'border-primary bg-primary text-surface'
                    : 'border-outline-variant text-outline hover:border-outline'
                }`}
              >
                {wave}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className={labelStyles}>{t('grantShowcase.filterByStatus')}</span>
            <button
              type="button"
              onClick={() => updateFilter('status', 'all')}
              className={`border px-3 py-1.5 font-body text-[13px] transition-colors ${
                activeStatus === 'all'
                  ? 'border-primary bg-primary text-surface'
                  : 'border-outline-variant text-on-surface-variant hover:border-outline'
              }`}
            >
              {t('grantShowcase.allStatuses')}
            </button>
            {uniqueStatuses.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => updateFilter('status', status)}
                className={`border px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[1.5px] transition-colors ${
                  activeStatus === status
                    ? 'border-primary bg-primary text-surface'
                    : 'border-outline-variant text-outline hover:border-outline'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="w-fit font-mono text-[10px] font-semibold uppercase tracking-[1.5px] text-outline underline underline-offset-2 transition-colors hover:text-primary"
            >
              {t('grantShowcase.resetFilters')}
            </button>
          )}
        </section>

        {/* Card Grid */}
        {filteredEntries.length > 0 ? (
          <section className="grid gap-6 py-12 md:grid-cols-2 lg:grid-cols-3">
            {filteredEntries.map((entry) => (
              <ShowcaseCard key={entry.id} entry={entry} />
            ))}
          </section>
        ) : (
          <section className="flex min-h-[300px] flex-col items-center justify-center gap-3 border border-outline-variant bg-surface-container py-16">
            <span className={labelStyles}>{t('grantShowcase.noResults')}</span>
            <p className="font-body text-[14px] text-on-surface-variant">
              {t('grantShowcase.noResultsDescription')}
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-2 font-mono text-[10px] font-semibold uppercase tracking-[1.5px] text-primary underline underline-offset-2"
            >
              {t('grantShowcase.resetFilters')}
            </button>
          </section>
        )}

        {/* Back to Grants */}
        <section className="border-t border-outline-variant pt-8">
          <Link
            to="/grants"
            className="inline-flex items-center gap-2 font-body text-[13px] text-outline transition-colors hover:text-on-surface"
          >
            ← {t('grantShowcase.backToGrants')}
          </Link>
        </section>
      </div>
    </Layout>
  );
}
