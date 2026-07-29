import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { waves, type Wave as WaveData } from '../data/waves';
import Layout from '../components/Layout';

const statusMeta: Record<
  WaveData['status'],
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

function WaveDetail({ wave }: { wave: WaveData }) {
  const { t } = useTranslation();
  const meta = statusMeta[wave.status];

  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date(iso));

  const dateRange =
    wave.startDate && wave.endDate
      ? `${formatDate(wave.startDate)} – ${formatDate(wave.endDate)}`
      : wave.status === 'open'
        ? t('waves.issuesOpen')
        : t('waves.dateTbd');

  const optedInContributors = wave.contributors.filter((c) => c.optedIn);
  const anonCount = wave.contributors.filter((c) => !c.optedIn).length;

  // Schema.org structured data
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: `Wraith Protocol Wave ${wave.number}: ${wave.title}`,
    description: wave.summary,
    ...(wave.startDate && { startDate: wave.startDate }),
    ...(wave.endDate && { endDate: wave.endDate }),
    organizer: {
      '@type': 'Organization',
      name: 'Wraith Protocol',
      url: 'https://usewraith.xyz',
    },
  };

  return (
    <Layout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <div className="mx-auto max-w-4xl px-6 py-16 md:px-12">
        {/* Back link */}
        <Link
          to="/waves"
          className="mb-8 inline-flex items-center gap-2 font-body text-[13px] text-outline transition-colors duration-150 hover:text-on-surface"
        >
          ← {t('waves.backToAll')}
        </Link>

        {/* Header */}
        <div className="mb-12 flex flex-col gap-6 border-b border-outline-variant pb-10">
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center border border-outline-variant bg-surface-container">
              <span className="font-mono text-[13px] font-bold uppercase tracking-[1px] text-primary">
                W{wave.number}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-heading text-[32px] font-bold leading-[1.1] tracking-[-1.2px] text-on-surface sm:text-[40px]">
                  {wave.title}
                </h1>
                <span
                  className={`inline-flex items-center gap-1.5 border px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-[1.2px] ${meta.badge}`}
                >
                  <span aria-hidden="true" className={`h-1.5 w-1.5 flex-shrink-0 ${meta.marker}`} />
                  {meta.label}
                </span>
              </div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[1.5px] text-outline">
                {t('waves.waveNumber', { number: wave.number })} · {dateRange}
              </p>
            </div>
          </div>

          {/* Key metrics */}
          <div className="grid grid-cols-2 gap-px border border-outline-variant sm:grid-cols-4">
            <div className="flex flex-col gap-1 bg-surface-container p-5">
              <span className="font-mono text-[9px] font-semibold uppercase tracking-[1.5px] text-outline">
                {t('waves.budget')}
              </span>
              <span className="font-heading text-[24px] font-bold text-on-surface">
                {Number(wave.budget).toLocaleString()}
              </span>
              <span className="font-mono text-[9px] text-outline">{wave.budgetToken}</span>
            </div>
            <div className="flex flex-col gap-1 bg-surface-container p-5">
              <span className="font-mono text-[9px] font-semibold uppercase tracking-[1.5px] text-outline">
                {t('waves.prs')}
              </span>
              <span className="font-heading text-[24px] font-bold text-on-surface">
                {wave.prsmerged > 0 ? wave.prsmerged : '—'}
              </span>
            </div>
            <div className="flex flex-col gap-1 bg-surface-container p-5">
              <span className="font-mono text-[9px] font-semibold uppercase tracking-[1.5px] text-outline">
                {t('waves.contributors')}
              </span>
              <span className="font-heading text-[24px] font-bold text-on-surface">
                {wave.contributors.length > 0 ? wave.contributors.length : '—'}
              </span>
            </div>
            <div className="flex flex-col gap-1 bg-surface-container p-5">
              <span className="font-mono text-[9px] font-semibold uppercase tracking-[1.5px] text-outline">
                {t('waves.goals')}
              </span>
              <span className="font-heading text-[24px] font-bold text-on-surface">
                {wave.goals.length}
              </span>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="mb-12">
          <h2 className="mb-4 font-heading text-[24px] font-bold tracking-[-0.6px] text-on-surface">
            {t('waves.overviewHeading')}
          </h2>
          <p className="font-body text-[15px] leading-[1.7] text-on-surface-variant">
            {wave.summary}
          </p>
        </div>

        {/* Goals */}
        <div className="mb-12 border-t border-outline-variant pt-12">
          <h2 className="mb-6 font-heading text-[24px] font-bold tracking-[-0.6px] text-on-surface">
            {t('waves.goalsHeading')}
          </h2>
          <ul className="flex flex-col gap-3">
            {wave.goals.map((goal, i) => (
              <li key={i} className="flex gap-3 font-body text-[14px] leading-[1.6] text-on-surface-variant">
                <span
                  aria-hidden="true"
                  className="mt-[9px] h-1 w-1 flex-shrink-0 bg-primary"
                />
                <span>{goal}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Highlights — only for completed waves */}
        {wave.highlights.length > 0 && (
          <div className="mb-12 border-t border-outline-variant pt-12">
            <h2 className="mb-6 font-heading text-[24px] font-bold tracking-[-0.6px] text-on-surface">
              {t('waves.highlightsHeading')}
            </h2>
            <ul className="flex flex-col gap-3">
              {wave.highlights.map((highlight, i) => (
                <li key={i} className="flex gap-3 font-body text-[14px] leading-[1.6] text-on-surface-variant">
                  <span
                    aria-hidden="true"
                    className="mt-[9px] h-1 w-1 flex-shrink-0 bg-tertiary"
                  />
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Contributors */}
        {wave.contributors.length > 0 && (
          <div className="mb-12 border-t border-outline-variant pt-12">
            <h2 className="mb-2 font-heading text-[24px] font-bold tracking-[-0.6px] text-on-surface">
              {t('waves.contributorsHeading')}
            </h2>
            <p className="mb-6 font-body text-[13px] text-outline">
              {t('waves.contributorsOptInNote')}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {optedInContributors.map((contributor) => (
                <div
                  key={contributor.handle}
                  className="flex items-center justify-between border border-outline-variant bg-surface-container px-4 py-3"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-[12px] font-semibold text-on-surface">
                      {contributor.handle}
                    </span>
                    <span className="font-body text-[11px] text-outline">
                      {contributor.role}
                    </span>
                  </div>
                  <span className="flex-shrink-0 border border-outline-variant-30 px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-[1.2px] text-outline">
                    {contributor.prs} {contributor.prs === 1 ? t('waves.pr') : t('waves.prsLabel')}
                  </span>
                </div>
              ))}
            </div>
            {anonCount > 0 && (
              <p className="mt-4 font-body text-[12px] text-outline">
                {t('waves.anonNote', { count: anonCount })}
              </p>
            )}
          </div>
        )}

        {/* Open wave CTA */}
        {wave.status === 'open' && wave.issuesUrl && (
          <div className="border-t border-outline-variant pt-12">
            <div className="flex flex-col gap-4 border border-blue bg-blue-10 p-6">
              <div className="flex flex-col gap-2">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-blue">
                  {t('waves.openCta.eyebrow')}
                </span>
                <h2 className="font-heading text-[22px] font-bold tracking-[-0.5px] text-on-surface">
                  {t('waves.openCta.heading')}
                </h2>
                <p className="font-body text-[14px] leading-[1.6] text-on-surface-variant">
                  {t('waves.openCta.description')}
                </p>
              </div>
              <a
                href={wave.issuesUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 w-fit items-center justify-center bg-primary px-6 font-heading text-[11px] font-semibold uppercase tracking-[1.5px] text-surface transition-[filter] duration-150 hover:brightness-110"
              >
                {t('waves.openCta.button')}
              </a>
            </div>
          </div>
        )}

        {/* Winners note */}
        {wave.winnersNote && (
          <div className="mt-12 border-t border-outline-variant pt-8">
            <p className="font-body text-[12px] leading-[1.6] text-outline">
              <span className="font-semibold">{t('waves.dripsNote')}</span> {wave.winnersNote}
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default function Wave() {
  const { number } = useParams<{ number: string }>();
  const { t } = useTranslation();

  const wave = waves.find((w) => w.number === Number(number));

  if (!wave) {
    return (
      <Layout>
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 px-6">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
            404
          </span>
          <h1 className="font-heading text-[24px] font-bold text-on-surface">
            {t('waves.notFound')}
          </h1>
          <Link
            to="/waves"
            className="font-body text-[13px] text-primary underline underline-offset-2"
          >
            {t('waves.backToAll')}
          </Link>
        </div>
      </Layout>
    );
  }

  return <WaveDetail wave={wave} />;
}
