import { Helmet } from 'react-helmet-async';
import { useState } from 'react';
import waveData from '../data/wave.json';

type FaqEntry = { question: string; answer: string };
type PastWave = {
  number: number;
  title: string;
  status: string;
  period: string;
  summary: string;
  highlights: string[];
  recipients: { name: string; work: string }[];
};

const { currentWave, pastWaves, faq } = waveData;
const faqEntries = faq as FaqEntry[];
const pastWavesData = pastWaves as PastWave[];

const sectionLabelStyles =
  'font-mono text-[10px] font-semibold uppercase tracking-[1.8px] text-outline';
const badgeOpenStyles = 'border-tertiary text-tertiary';
const badgeClosedStyles = 'border-outline-variant text-outline';

export default function Grants() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  return (
    <>
      <Helmet>
        <title>Grants – Wraith Protocol</title>
        <meta
          name="description"
          content="Apply for a Wraith Protocol grant. Funding privacy-preserving payment infrastructure through the Stellar Development Foundation's Drips program."
        />
        <meta property="og:title" content="Grants – Wraith Protocol" />
        <meta
          property="og:description"
          content="Apply for a Wraith Protocol grant — funding privacy-preserving payment infrastructure."
        />
        <meta property="og:url" content="https://usewraith.xyz/grants" />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="min-h-screen bg-surface text-on-surface">
        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <section className="border-b border-outline-variant-30 px-6 py-24 md:px-12">
          <div className="mx-auto flex max-w-3xl flex-col gap-6">
            <span className={sectionLabelStyles}>Grants program</span>
            <h1 className="font-heading text-[36px] font-bold leading-[1.05] tracking-[-1.5px] text-on-surface sm:text-[48px] md:text-[56px]">
              Build the future of private payments
            </h1>
            <p className="max-w-2xl font-body text-[17px] leading-[1.6] text-on-surface-variant">
              The Wraith Grants Program funds teams building privacy-preserving payment
              infrastructure. Whether you're integrating the SDK into a wallet, building tooling, or
              researching novel stealth-address applications, we want to support your work.
            </p>
            <div className="flex flex-wrap gap-4">
              <a
                href={currentWave.applyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center justify-center bg-primary px-6 font-heading text-sm font-semibold uppercase tracking-wider text-surface transition-[filter] duration-150 hover:brightness-110"
              >
                Apply now
              </a>
              <a
                href="#faq"
                className="inline-flex h-11 items-center justify-center border border-outline-variant px-6 font-heading text-sm font-semibold uppercase tracking-wider text-on-surface transition-colors duration-150 hover:bg-surface-container"
              >
                Read the FAQ
              </a>
            </div>
          </div>
        </section>

        {/* ── How Funding Works ───────────────────────────────────────────── */}
        <section className="border-b border-outline-variant-30 px-6 py-24 md:px-12">
          <div className="mx-auto max-w-3xl">
            <div className="flex flex-col gap-10">
              <div className="flex flex-col gap-3">
                <span className={sectionLabelStyles}>How funding works</span>
                <h2 className="font-heading text-[28px] font-bold tracking-[-1.2px] text-on-surface sm:text-[40px]">
                  Drips + Stellar Development Foundation
                </h2>
              </div>

              <p className="font-body text-[17px] leading-[1.6] text-on-surface-variant">
                Wraith grants are funded by the Stellar Development Foundation through its{' '}
                <strong className="text-on-surface">Stellar Wave</strong> program, distributed via{' '}
                <strong className="text-on-surface">Drips</strong> — a continuous, transparent
                funding platform. This means funds flow to grantees in milestone-based streams that
                are publicly verifiable on-chain.
              </p>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="flex flex-col gap-3 border border-outline-variant bg-surface-container p-6">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-semibold uppercase tracking-[1px] text-primary">
                      Drips
                    </span>
                  </div>
                  <p className="font-body text-[14px] leading-[1.65] text-on-surface-variant">
                    Drips enables streaming, milestone-gated grant disbursements directly to
                    grantees. Every payment is transparent and trackable, giving both funders and
                    builders confidence in the process.
                  </p>
                  <a
                    href={waveData.programUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-auto inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[1px] text-primary transition-colors duration-150 hover:brightness-110"
                  >
                    View program on Drips →
                  </a>
                </div>

                <div className="flex flex-col gap-3 border border-outline-variant bg-surface-container p-6">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-semibold uppercase tracking-[1px] text-primary">
                      External funding
                    </span>
                  </div>
                  <p className="font-body text-[14px] leading-[1.65] text-on-surface-variant">
                    Beyond SDF, we welcome co-funding from ecosystem partners, foundations, and DAOs
                    that share our mission. If you represent an organization interested in
                    contributing to the grants pool, reach out to{' '}
                    <a
                      href={`mailto:${waveData.contactEmail}`}
                      className="text-primary underline underline-offset-2 transition-colors hover:brightness-110"
                    >
                      {waveData.contactEmail}
                    </a>
                    .
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Current Wave ────────────────────────────────────────────────── */}
        <section className="border-b border-outline-variant-30 px-6 py-24 md:px-12">
          <div className="mx-auto max-w-3xl">
            <div className="flex flex-col gap-10">
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-4">
                  <span className={sectionLabelStyles}>Current wave</span>
                  <span
                    className={`inline-flex items-center gap-1.5 border px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-[1.2px] ${currentWave.status === 'open' ? badgeOpenStyles : badgeClosedStyles}`}
                  >
                    <span
                      aria-hidden="true"
                      className={`h-1.5 w-1.5 ${currentWave.status === 'open' ? 'bg-tertiary' : 'bg-outline'}`}
                    />
                    {currentWave.status === 'open' ? 'Open' : 'Closed'}
                  </span>
                </div>
                <h2 className="font-heading text-[28px] font-bold tracking-[-1.2px] text-on-surface sm:text-[40px]">
                  {currentWave.title}
                </h2>
              </div>

              <p className="font-body text-[17px] leading-[1.6] text-on-surface-variant">
                {currentWave.summary}
              </p>

              <div className="grid gap-5 rounded-sm border border-outline-variant bg-surface-container p-6 sm:grid-cols-3">
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[1.5px] text-outline">
                    Opens
                  </span>
                  <span className="font-heading text-[16px] font-semibold text-on-surface">
                    {currentWave.opens}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[1.5px] text-outline">
                    Closes
                  </span>
                  <span className="font-heading text-[16px] font-semibold text-on-surface">
                    {currentWave.closes}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[1.5px] text-outline">
                    Total pool
                  </span>
                  <span className="font-heading text-[16px] font-semibold text-on-surface">
                    {currentWave.totalFunding}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-6">
                <div>
                  <h3 className="mb-3 font-heading text-[18px] font-semibold tracking-[-0.3px] text-on-surface">
                    Eligibility
                  </h3>
                  <ul className="flex flex-col gap-2">
                    {currentWave.eligibility.map((item) => (
                      <li
                        key={item}
                        className="flex gap-2.5 font-body text-[14px] leading-[1.6] text-on-surface-variant"
                      >
                        <span
                          aria-hidden="true"
                          className="mt-[7px] h-1.5 w-1.5 flex-shrink-0 bg-primary"
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="mb-3 font-heading text-[18px] font-semibold tracking-[-0.3px] text-on-surface">
                    Review criteria
                  </h3>
                  <ul className="flex flex-col gap-2">
                    {currentWave.reviewCriteria.map((item) => (
                      <li
                        key={item}
                        className="flex gap-2.5 font-body text-[14px] leading-[1.6] text-on-surface-variant"
                      >
                        <span
                          aria-hidden="true"
                          className="mt-[7px] h-1.5 w-1.5 flex-shrink-0 bg-primary"
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="mb-4 font-heading text-[18px] font-semibold tracking-[-0.3px] text-on-surface">
                    Reward tiers
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-3">
                    {currentWave.rewardTiers.map((tier) => (
                      <div
                        key={tier.tier}
                        className="flex flex-col gap-2 border border-outline-variant bg-surface-container p-5"
                      >
                        <span className="font-mono text-[10px] font-semibold uppercase tracking-[1.5px] text-primary">
                          {tier.amount}
                        </span>
                        <span className="font-heading text-[15px] font-semibold tracking-[-0.3px] text-on-surface">
                          {tier.tier}
                        </span>
                        <p className="font-body text-[13px] leading-[1.6] text-on-surface-variant">
                          {tier.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <p className="font-body text-[14px] leading-[1.65] text-on-surface-variant">
                {currentWave.howToApply}
              </p>

              <a
                href={currentWave.applyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 w-fit items-center justify-center bg-primary px-6 font-heading text-sm font-semibold uppercase tracking-wider text-surface transition-[filter] duration-150 hover:brightness-110"
              >
                Apply on Drips
              </a>
            </div>
          </div>
        </section>

        {/* ── Past Waves ──────────────────────────────────────────────────── */}
        <section className="border-b border-outline-variant-30 px-6 py-24 md:px-12">
          <div className="mx-auto max-w-3xl">
            <div className="flex flex-col gap-10">
              <div className="flex flex-col gap-3">
                <span className={sectionLabelStyles}>Past waves</span>
                <h2 className="font-heading text-[28px] font-bold tracking-[-1.2px] text-on-surface sm:text-[40px]">
                  What we have funded
                </h2>
              </div>

              {pastWavesData.length === 0 ? (
                <p className="font-body text-[15px] text-on-surface-variant">
                  No past waves to show yet. Check back after the current wave concludes.
                </p>
              ) : (
                <div className="flex flex-col gap-8">
                  {pastWavesData.map((wave) => (
                    <div
                      key={wave.number}
                      className="flex flex-col gap-6 border border-outline-variant bg-surface-container p-6 sm:p-8"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
                            {wave.period}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1.5 border px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-[1.2px] ${badgeClosedStyles}`}
                          >
                            <span aria-hidden="true" className="h-1.5 w-1.5 bg-outline" />
                            Closed
                          </span>
                        </div>
                        <h3 className="font-heading text-xl font-bold tracking-[-0.3px] text-on-surface">
                          {wave.title}
                        </h3>
                      </div>

                      <p className="font-body text-[14px] leading-[1.65] text-on-surface-variant">
                        {wave.summary}
                      </p>

                      <div>
                        <h4 className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[1.5px] text-outline">
                          Highlights
                        </h4>
                        <ul className="flex flex-col gap-2">
                          {wave.highlights.map((highlight) => (
                            <li
                              key={highlight}
                              className="flex gap-2.5 font-body text-[13px] leading-[1.6] text-on-surface-variant"
                            >
                              <span
                                aria-hidden="true"
                                className="mt-[7px] h-1.5 w-1.5 flex-shrink-0 bg-primary"
                              />
                              {highlight}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[1.5px] text-outline">
                          Recipients
                        </h4>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {wave.recipients.map((recipient) => (
                            <div
                              key={recipient.name}
                              className="flex flex-col gap-1 border border-outline-variant bg-surface-bright p-4"
                            >
                              <span className="font-heading text-[14px] font-semibold tracking-[-0.2px] text-on-surface">
                                {recipient.name}
                              </span>
                              <span className="font-body text-[12px] leading-[1.5] text-outline">
                                {recipient.work}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── FAQ ─────────────────────────────────────────────────────────── */}
        <section id="faq" className="px-6 py-24 md:px-12">
          <div className="mx-auto max-w-3xl">
            <div className="flex flex-col gap-10">
              <div className="flex flex-col gap-3">
                <span className={sectionLabelStyles}>Frequently asked questions</span>
                <h2 className="font-heading text-[28px] font-bold tracking-[-1.2px] text-on-surface sm:text-[40px]">
                  FAQ
                </h2>
              </div>

              <div className="flex flex-col gap-3">
                {faqEntries.map((entry, index) => {
                  const isOpen = openFaqIndex === index;
                  const toggleId = `grant-faq-toggle-${index}`;
                  const panelId = `grant-faq-panel-${index}`;

                  return (
                    <div
                      key={entry.question}
                      className="border border-outline-variant bg-surface-container"
                    >
                      <h3 className="px-5 py-4 font-heading text-[16px] font-semibold tracking-[-0.3px] text-on-surface">
                        <button
                          id={toggleId}
                          type="button"
                          aria-expanded={isOpen}
                          aria-controls={panelId}
                          onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                          className="flex w-full items-center justify-between text-left"
                        >
                          <span>{entry.question}</span>
                          <span className="font-mono text-[10px] font-semibold uppercase tracking-[1.6px] text-outline transition-colors hover:text-on-surface">
                            {isOpen ? 'Hide' : 'Show'}
                          </span>
                        </button>
                      </h3>
                      {isOpen && (
                        <div
                          id={panelId}
                          role="region"
                          aria-labelledby={toggleId}
                          className="border-t border-outline-variant px-5 py-4"
                        >
                          <p className="font-body text-[14px] leading-[1.7] text-on-surface-variant">
                            {entry.answer}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
