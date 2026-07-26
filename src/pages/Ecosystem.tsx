import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import { featured } from '../data/integrations.json';
import type { Integration } from '../components/IntegrationsCarousel';

const integrations = featured as Integration[];

function PartnerDetail({ partner }: { partner: Integration }) {
  const { t } = useTranslation();

  return (
    <Layout>
      <div className="mx-auto max-w-3xl px-6 py-16 md:px-12">
        <Link
          to="/ecosystem"
          className="mb-8 inline-flex items-center gap-2 font-body text-[13px] text-outline transition-colors hover:text-on-surface"
        >
          ← {t('ecosystem.backToAll')}
        </Link>

        <div className="mb-10 flex flex-col gap-6 border-b border-outline-variant pb-10">
          <div className="flex items-center gap-4">
            {partner.logo ? (
              <img
                src={partner.logo}
                alt=""
                width={partner.logoWidth}
                height={40}
                className="h-10 w-auto object-contain"
              />
            ) : (
              <span className="flex h-12 w-12 items-center justify-center border border-outline-variant bg-surface-container font-heading text-sm font-bold text-primary">
                {partner.logoInitials ?? partner.name.slice(0, 2).toUpperCase()}
              </span>
            )}
            <div className="flex flex-col gap-1">
              <h1 className="font-heading text-[32px] font-bold tracking-[-1.2px] text-on-surface sm:text-[40px]">
                {partner.name}
              </h1>
              <p className="font-body text-[15px] text-on-surface-variant">{partner.tagline}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="border border-outline-variant-30 px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[1.5px] text-outline">
              {partner.category}
            </span>
            {partner.chains.map((chain) => (
              <span
                key={chain}
                className="border border-outline-variant-30 px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[1.5px] text-outline"
              >
                {chain}
              </span>
            ))}
          </div>
        </div>

        <p className="mb-10 font-body text-[15px] leading-[1.7] text-on-surface-variant">
          {partner.description}
        </p>

        <a
          href={partner.website}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 border border-outline-variant bg-surface-container px-5 py-3 font-mono text-[11px] font-semibold uppercase tracking-[1.5px] text-on-surface transition-colors hover:border-outline hover:bg-surface-bright"
        >
          {t('ecosystem.visitWebsite')} ↗
        </a>
      </div>
    </Layout>
  );
}

function EcosystemList() {
  const { t } = useTranslation();

  return (
    <Layout>
      <div className="mx-auto max-w-[1344px] px-6 py-16 md:px-12">
        <div className="mb-12 flex flex-col gap-3">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
            {t('ecosystem.eyebrow')}
          </span>
          <h1 className="font-heading text-[32px] font-bold tracking-[-1.2px] text-on-surface sm:text-[48px]">
            {t('ecosystem.heading')}
          </h1>
          <p className="max-w-[640px] font-body text-base leading-[1.6] text-on-surface-variant">
            {t('ecosystem.description')}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {integrations.map((partner) => (
            <Link
              key={partner.slug}
              to={`/ecosystem/${partner.slug}`}
              className="group flex flex-col gap-4 border border-outline-variant bg-surface-container p-6 transition-colors duration-150 hover:bg-surface-bright"
            >
              <div className="flex h-10 items-center justify-between">
                {partner.logo ? (
                  <img
                    src={partner.logo}
                    alt=""
                    width={partner.logoWidth}
                    height={32}
                    className="h-8 w-auto object-contain opacity-70 grayscale transition-all group-hover:opacity-100 group-hover:grayscale-0"
                  />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center border border-outline-variant bg-surface font-heading text-[11px] font-bold text-primary">
                    {partner.logoInitials ?? partner.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
                <span className="font-mono text-[9px] uppercase tracking-[1.2px] text-outline">
                  {partner.category}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <h2 className="font-heading text-lg font-semibold text-on-surface group-hover:text-primary">
                  {partner.name}
                </h2>
                <p className="font-body text-[13px] leading-[1.5] text-on-surface-variant">
                  {partner.tagline}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
}

export default function Ecosystem() {
  const { slug } = useParams<{ slug?: string }>();
  const { t } = useTranslation();

  if (slug) {
    const partner = integrations.find((item) => item.slug === slug);
    if (!partner) {
      return (
        <Layout>
          <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 px-6">
            <h1 className="font-heading text-[24px] font-bold text-on-surface">
              {t('ecosystem.notFound')}
            </h1>
            <Link
              to="/ecosystem"
              className="font-body text-[13px] text-primary underline underline-offset-2"
            >
              ← {t('ecosystem.backToAll')}
            </Link>
          </div>
        </Layout>
      );
    }
    return <PartnerDetail partner={partner} />;
  }

  return <EcosystemList />;
}
