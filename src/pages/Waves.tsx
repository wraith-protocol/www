import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { waves, type Wave } from '../data/waves';
import Layout from '../components/Layout';

const statusMeta: Record<
  Wave['status'],
  { label: string; marker: string; badge: string }
> = {
  completed: {
    label: 'Completed',
    marker: 'bg-tertiary',
    badge: 'border-tertiary text-tertiary',
  },
  open: {
    label: 'Open',
    marker: 'bg-blue',
    badge: 'border-blue text-blue',
  },
  upcoming: {
    label: 'Upcoming',
    marker: 'bg-outline',
    badge: 'border-outline-variant text-outline',
  },
};

function WaveCard({ wave }: { wave: Wave }) {
  const { t } = useTranslation();
  const meta = statusMeta[wave.status];

  const dateRange =
    wave.startDate && wave.endDate
      ? `${new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(
          new Date(wave.startDate),
        )} – ${new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(
          new Date(wave.endDate),
        )}`
      : wave.status === 'open'
        ? t('waves.issuesOpen')
        : t('waves.dateTbd');

  const optedInContributors = wave.contributors.filter((c) => c.optedIn);

  return (
    <Link
      to={`/waves/${wave.number}`}
      className="group flex flex-col gap-5 border border-outline-variant bg-surface-container p-7 transition-colors duration-150 hover:bg-surface-bright"
      aria-label={t('waves.cardAriaLabel', {
        number: wave.number,
        title: wave.title,
        status: meta.label,
      })}
    >
      {/* Wave number + status */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center border border-outline-variant bg-surface">
          <span className="font-mono text-[11px] font-bold uppercase tracking-[1px] text-primary">
            W{wave.number}
          </span>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 border px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-[1.2px] ${meta.badge}`}
        >
          <span aria-hidden="true" className={`h-1.5 w-1.5 flex-shrink-0 ${meta.marker}`} />
          {meta.label}
        </span>
      </div>

      {/* Title + summary */}
      <div className="flex flex-col gap-2">
        <h2 className="font-heading text-lg font-semibold tracking-[-0.3px] text-on-surface transition-colors duration-150 group-hover:text-primary">
          {wave.title}
        </h2>
        <p className="font-body text-[12px] text-outline">{dateRange}</p>
        <p className="font-body text-[13px] leading-[1.65] text-on-surface-variant line-clamp-3">
          {wave.summary}
        </p>
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap gap-4 border-t border-outline-variant pt-4">
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-[9px] font-semibold uppercase tracking-[1.5px] text-outline">
            {t('waves.budget')}
          </span>
          <span className="font-heading text-[15px] font-bold text-on-surface">
            {Number(wave.budget).toLocaleString()} {wave.budgetToken}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-[9px] font-semibold uppercase tracking-[1.5px] text-outline">
            {t('waves.prs')}
          </span>
          <span className="font-heading text-[15px] font-bold text-on-surface">
            {wave.prsmerged > 0 ? wave.prsmerged : '—'}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-[9px] font-semibold uppercase tracking-[1.5px] text-outline">
            {t('waves.contributors')}
          </span>
          <span className="font-heading text-[15px] font-bold text-on-surface">
            {wave.contributors.length > 0 ? wave.contributors.length : '—'}
          </span>
        </div>
      </div>

      {/* Opted-in contributor handles */}
      {optedInContributors.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {optedInContributors.map((c) => (
            <span
              key={c.handle}
              className="border border-outline-variant-30 px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-[1.2px] text-outline"
            >
              {c.handle}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-1.5">
        <span className="font-mono text-[11px] text-outline transition-colors duration-150 group-hover:text-primary">
          {wave.status === 'open' ? t('waves.viewOpenIssues') : t('waves.viewWave')}
        </span>
        <span
          aria-hidden="true"
          className="text-outline transition-transform duration-150 group-hover:translate-x-0.5"
        >
          →
        </span>
      </div>
    </Link>
  );
}

export default function Waves() {
  const { t } = useTranslation();

  const completedWaves = waves.filter((w) => w.status === 'completed');
  const totalBudget = completedWaves.reduce((sum, w) => sum + Number(w.budget), 0);
  const totalPrs = completedWaves.reduce((sum, w) => sum + w.prsmerged, 0);
  const totalContributors = new Set(
    completedWaves.flatMap((w) => w.contributors.map((c) => c.handle)),
  ).size;

  return (
    <Layout>
      <div className="mx-auto max-w-[1344px] px-6 py-16 md:px-12">
        {/* Page header */}
        <div className="mb-12 flex flex-col gap-6 border-b border-outline-variant pb-10">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
            {t('waves.eyebrow')}
          </span>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex max-w-[700px] flex-col gap-3">
              <h1 className="font-heading text-[34px] font-bold leading-[1.1] tracking-[-1.2px] text-on-surface sm:text-[48px]">
                {t('waves.heading')}
              </h1>
              <p className="font-body text-[15px] leading-[1.7] text-on-surface-variant">
                {t('waves.description')}
              </p>
            </div>

            {/* Aggregate stats */}
            <div className="flex flex-wrap gap-px border border-outline-variant">
              <div className="flex flex-col gap-1 bg-surface-container px-5 py-4">
                <span className="font-mono text-[9px] font-semibold uppercase tracking-[2px] text-outline">
                  {t('waves.statWaves')}
                </span>
                <span className="font-heading text-[22px] font-bold text-on-surface">
                  {completedWaves.length}
                </span>
              </div>
              <div className="flex flex-col gap-1 bg-surface-container px-5 py-4">
                <span className="font-mono text-[9px] font-semibold uppercase tracking-[2px] text-outline">
                  {t('waves.statBudget')}
                </span>
                <span className="font-heading text-[22px] font-bold text-on-surface">
                  ${totalBudget.toLocaleString()}
                </span>
              </div>
              <div className="flex flex-col gap-1 bg-surface-container px-5 py-4">
                <span className="font-mono text-[9px] font-semibold uppercase tracking-[2px] text-outline">
                  {t('waves.statPrs')}
                </span>
                <span className="font-heading text-[22px] font-bold text-on-surface">
                  {totalPrs}
                </span>
              </div>
              <div className="flex flex-col gap-1 bg-surface-container px-5 py-4">
                <span className="font-mono text-[9px] font-semibold uppercase tracking-[2px] text-outline">
                  {t('waves.statContributors')}
                </span>
                <span className="font-heading text-[22px] font-bold text-on-surface">
                  {totalContributors}+
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Wave grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {waves.map((wave) => (
            <WaveCard key={wave.number} wave={wave} />
          ))}
        </div>

        {/* Contributor privacy note */}
        <p className="mt-10 font-body text-[12px] leading-[1.6] text-outline">
          {t('waves.privacyNote')}
        </p>
      </div>
    </Layout>
  );
}
