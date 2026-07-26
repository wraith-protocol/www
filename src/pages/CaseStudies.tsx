import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { entries } from '../data/case-studies.json';
import Layout from '../components/Layout';

type CaseStudy = {
  id: string;
  slug: string;
  org: string;
  logo: string;
  industry: string;
  useCase: string;
  integrationDate: string;
  status: string;
  quote: string;
  quotee: string;
  summary: string;
  challenge: string;
  solution: string;
  results: {
    privacyImprovement: string;
    integrationTime: string;
    txProcessed: string;
    chainsUsed: string[];
  };
  chains: string[];
  testimonial: string;
  technical: {
    sdkVersion: string;
    implementation: string;
    challenges: string;
  };
};

function CaseStudyDetail({ study }: { study: CaseStudy }) {
  const { t } = useTranslation();
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(study.integrationDate));

  // Schema.org structured data for SEO
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${study.org} - ${study.useCase}`,
    description: study.summary,
    datePublished: study.integrationDate,
    author: {
      '@type': 'Organization',
      name: study.org,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Wraith Protocol',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.usewraith.xyz/logo.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://www.usewraith.xyz/case-studies/${study.slug}`,
    },
  };

  return (
    <Layout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <div className="mx-auto max-w-4xl px-6 py-16 md:px-12">
        <Link
          to="/case-studies"
          className="mb-8 inline-flex items-center gap-2 font-body text-[13px] text-outline transition-colors hover:text-on-surface"
        >
          ← {t('caseStudies.backToAll')}
        </Link>

        {/* Header */}
        <div className="mb-12 flex flex-col gap-6 border-b border-outline-variant pb-10">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center border border-outline-variant bg-surface-container">
              <span className="font-heading text-xl font-bold tracking-[-0.3px] text-primary">
                {study.logo}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <h1 className="font-heading text-[32px] font-bold leading-[1.1] tracking-[-1.2px] text-on-surface sm:text-[40px]">
                {study.org}
              </h1>
              <p className="font-body text-[15px] text-on-surface-variant">{study.industry}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 border border-outline-variant bg-surface-container px-3 py-2">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[1.5px] text-outline">
                {t('caseStudies.useCase')}
              </span>
              <span className="font-body text-[13px] text-on-surface">{study.useCase}</span>
            </div>
            <div className="flex items-center gap-2 border border-outline-variant bg-surface-container px-3 py-2">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[1.5px] text-outline">
                {t('caseStudies.integration')}
              </span>
              <span className="font-body text-[13px] text-on-surface">{formattedDate}</span>
            </div>
            {study.chains.map((chain) => (
              <div
                key={chain}
                className="flex items-center border border-outline-variant-30 px-3 py-2"
              >
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[1.5px] text-outline">
                  {chain}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quote */}
        <blockquote className="mb-12 border-l-2 border-primary pl-6">
          <p className="mb-3 font-body text-[18px] leading-[1.6] text-on-surface">
            "{study.quote}"
          </p>
          <cite className="font-body text-[13px] not-italic text-on-surface-variant">
            — {study.quotee}, {study.org}
          </cite>
        </blockquote>

        {/* Summary */}
        <div className="mb-12">
          <h2 className="mb-4 font-heading text-[24px] font-bold tracking-[-0.6px] text-on-surface">
            {t('caseStudies.summary')}
          </h2>
          <p className="font-body text-[15px] leading-[1.7] text-on-surface-variant">
            {study.summary}
          </p>
        </div>

        {/* Challenge */}
        <div className="mb-12">
          <h2 className="mb-4 font-heading text-[24px] font-bold tracking-[-0.6px] text-on-surface">
            {t('caseStudies.challenge')}
          </h2>
          <p className="font-body text-[15px] leading-[1.7] text-on-surface-variant">
            {study.challenge}
          </p>
        </div>

        {/* Solution */}
        <div className="mb-12">
          <h2 className="mb-4 font-heading text-[24px] font-bold tracking-[-0.6px] text-on-surface">
            {t('caseStudies.solution')}
          </h2>
          <p className="font-body text-[15px] leading-[1.7] text-on-surface-variant">
            {study.solution}
          </p>
        </div>

        {/* Results */}
        <div className="mb-12">
          <h2 className="mb-4 font-heading text-[24px] font-bold tracking-[-0.6px] text-on-surface">
            {t('caseStudies.results')}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="border border-outline-variant bg-surface-container p-5">
              <span className="mb-2 block font-mono text-[10px] font-semibold uppercase tracking-[1.5px] text-outline">
                {t('caseStudies.privacyImprovement')}
              </span>
              <span className="font-heading text-[24px] font-bold text-primary">
                {study.results.privacyImprovement}
              </span>
            </div>
            <div className="border border-outline-variant bg-surface-container p-5">
              <span className="mb-2 block font-mono text-[10px] font-semibold uppercase tracking-[1.5px] text-outline">
                {t('caseStudies.integrationTime')}
              </span>
              <span className="font-heading text-[24px] font-bold text-primary">
                {study.results.integrationTime}
              </span>
            </div>
            <div className="border border-outline-variant bg-surface-container p-5">
              <span className="mb-2 block font-mono text-[10px] font-semibold uppercase tracking-[1.5px] text-outline">
                {t('caseStudies.txProcessed')}
              </span>
              <span className="font-heading text-[24px] font-bold text-primary">
                {study.results.txProcessed}
              </span>
            </div>
            <div className="border border-outline-variant bg-surface-container p-5">
              <span className="mb-2 block font-mono text-[10px] font-semibold uppercase tracking-[1.5px] text-outline">
                {t('caseStudies.chainsUsed')}
              </span>
              <span className="font-heading text-[24px] font-bold text-primary">
                {study.results.chainsUsed.join(', ')}
              </span>
            </div>
          </div>
        </div>

        {/* Testimonial */}
        <div className="mb-12 border-t border-outline-variant pt-12">
          <h2 className="mb-4 font-heading text-[24px] font-bold tracking-[-0.6px] text-on-surface">
            {t('caseStudies.testimonial')}
          </h2>
          <p className="font-body text-[15px] leading-[1.7] text-on-surface-variant">
            {study.testimonial}
          </p>
        </div>

        {/* Technical Details */}
        <div className="border-t border-outline-variant pt-12">
          <h2 className="mb-4 font-heading text-[24px] font-bold tracking-[-0.6px] text-on-surface">
            {t('caseStudies.technicalDetails')}
          </h2>
          <dl className="space-y-3">
            <div>
              <dt className="font-mono text-[10px] font-semibold uppercase tracking-[1.5px] text-outline">
                {t('caseStudies.sdkVersion')}
              </dt>
              <dd className="mt-1 font-body text-[14px] text-on-surface-variant">
                {study.technical.sdkVersion}
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] font-semibold uppercase tracking-[1.5px] text-outline">
                {t('caseStudies.implementation')}
              </dt>
              <dd className="mt-1 font-body text-[14px] text-on-surface-variant">
                {study.technical.implementation}
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] font-semibold uppercase tracking-[1.5px] text-outline">
                {t('caseStudies.challenges')}
              </dt>
              <dd className="mt-1 font-body text-[14px] text-on-surface-variant">
                {study.technical.challenges}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </Layout>
  );
}

function CaseStudiesList() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<string>('all');

  const caseStudies = entries as CaseStudy[];
  const filteredStudies =
    filter === 'all' ? caseStudies : caseStudies.filter((study) => study.chains.includes(filter));

  const uniqueChains = Array.from(new Set(caseStudies.flatMap((study) => study.chains)));

  return (
    <Layout>
      <div className="mx-auto max-w-[1344px] px-6 py-16 md:px-12">
        {/* Header */}
        <div className="mb-12 flex flex-col gap-6 border-b border-outline-variant pb-10">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
            {t('caseStudies.eyebrow')}
          </span>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex max-w-[700px] flex-col gap-3">
              <h1 className="font-heading text-[34px] font-bold leading-[1.1] tracking-[-1.2px] text-on-surface sm:text-[48px]">
                {t('caseStudies.heading')}
              </h1>
              <p className="font-body text-[15px] leading-[1.7] text-on-surface-variant">
                {t('caseStudies.description')}
              </p>
            </div>
            <div className="flex flex-col gap-1 rounded-sm border border-outline-variant px-4 py-3">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
                {t('caseStudies.totalStudies')}
              </span>
              <span className="font-heading text-[18px] font-semibold text-on-surface">
                {caseStudies.length}{' '}
                {caseStudies.length === 1 ? t('caseStudies.study') : t('caseStudies.studies')}
              </span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
            {t('caseStudies.filterByChain')}
          </span>
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`border px-3 py-1.5 font-body text-[13px] transition-colors ${
              filter === 'all'
                ? 'border-primary bg-primary text-surface'
                : 'border-outline-variant text-on-surface-variant hover:border-outline'
            }`}
          >
            {t('caseStudies.allChains')}
          </button>
          {uniqueChains.map((chain) => (
            <button
              key={chain}
              type="button"
              onClick={() => setFilter(chain)}
              className={`border px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[1.5px] transition-colors ${
                filter === chain
                  ? 'border-primary bg-primary text-surface'
                  : 'border-outline-variant text-outline hover:border-outline'
              }`}
            >
              {chain}
            </button>
          ))}
        </div>

        {/* Case Study Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredStudies.map((study) => {
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
                    {t('caseStudies.readStudy')}
                  </span>
                  <span className="text-outline transition-transform duration-150 group-hover:translate-x-0.5">
                    →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredStudies.length === 0 && (
          <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 border border-outline-variant bg-surface-container py-16">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
              {t('caseStudies.noStudies')}
            </span>
            <p className="font-body text-[14px] text-on-surface-variant">
              {t('caseStudies.noStudiesDescription')}
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default function CaseStudies() {
  const { slug } = useParams<{ slug?: string }>();

  if (slug) {
    const study = (entries as CaseStudy[]).find((s) => s.slug === slug);
    if (!study) {
      return (
        <Layout>
          <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 px-6">
            <h1 className="font-heading text-[24px] font-bold text-on-surface">
              Case Study Not Found
            </h1>
            <Link
              to="/case-studies"
              className="font-body text-[13px] text-primary underline underline-offset-2"
            >
              ← Back to all case studies
            </Link>
          </div>
        </Layout>
      );
    }
    return <CaseStudyDetail study={study} />;
  }

  return <CaseStudiesList />;
}
