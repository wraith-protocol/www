import { useState } from 'react';
import waveData from '../data/wave.json';

type Wave = (typeof waveData)['currentWave'];
type PastWave = (typeof waveData)['pastWaves'][number];
type FaqEntry = (typeof waveData)['faq'][number];

const currentWave = waveData.currentWave as Wave;
const pastWaves = waveData.pastWaves as PastWave[];
const faqEntries = waveData.faq as FaqEntry[];

const labelStyles = 'font-mono text-[10px] font-semibold uppercase tracking-[1.8px] text-outline';

export default function Grants() {
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);

  return (
    <div className="mx-auto flex max-w-[1120px] flex-col px-6 py-10 md:px-12 md:py-16">
      {/* Hero */}
      <section className="flex flex-col gap-6 border-b border-outline-variant pb-12">
        <span className={labelStyles}>Grants</span>
        <div className="flex max-w-[700px] flex-col gap-3">
          <h1 className="font-heading text-[34px] font-bold tracking-[-1.2px] text-on-surface sm:text-[48px]">
            Build private payments. Get funded.
          </h1>
          <p className="font-body text-[15px] leading-[1.7] text-on-surface-variant">
            Wraith runs a grant program supported by{' '}
            <a
              href="https://www.drips.network"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2 transition-colors hover:brightness-110"
            >
              Drips
            </a>{' '}
            recurring revenue and external ecosystem funding. Each wave funds teams building stealth
            address infrastructure, SDK integrations, and privacy-preserving payment tooling.
          </p>
        </div>
      </section>

      {/* Current wave */}
      {currentWave && (
        <section className="flex flex-col gap-6 border-b border-outline-variant py-12">
          <span className={labelStyles}>Current wave</span>
          <div className="flex flex-col gap-4 rounded-sm border border-outline-variant bg-surface-container p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex flex-col gap-2">
                <h2 className="font-heading text-[22px] font-bold tracking-[-0.5px] text-on-surface">
                  {currentWave.name}
                </h2>
                <p className="font-body text-[14px] text-on-surface-variant">
                  {currentWave.description}
                </p>
              </div>
              <div className="flex flex-col gap-1 rounded-sm border border-outline-variant px-4 py-3">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
                  Budget
                </span>
                <span className="font-heading text-[18px] font-semibold text-on-surface">
                  {currentWave.budget}
                </span>
                <span className="font-mono text-[10px] text-outline-variant">
                  {currentWave.fundingSource}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-sm border border-tertiary px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[1.2px] text-tertiary">
                {currentWave.status === 'open' ? 'Open for applications' : currentWave.status}
              </span>
              <span className="rounded-sm border border-outline-variant px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[1.2px] text-outline">
                {currentWave.rewardRange} per grant
              </span>
            </div>

            <div className="flex flex-col gap-3 border-t border-outline-variant pt-4">
              <p className="font-body text-[14px] leading-[1.7] text-on-surface-variant">
                {currentWave.howToApply}
              </p>
              <a
                href={currentWave.applyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 w-fit items-center justify-center bg-primary px-6 font-heading text-[13px] font-semibold uppercase tracking-[1.5px] text-surface transition-[filter] duration-150 hover:brightness-110"
              >
                Apply on Drips
              </a>
            </div>
          </div>

          {/* Eligibility */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-3">
              <h3 className="font-heading text-[16px] font-semibold text-on-surface">
                Eligibility
              </h3>
              <ul className="flex flex-col gap-2">
                {currentWave.eligibility.map((item) => (
                  <li
                    key={item}
                    className="flex gap-2.5 font-body text-[14px] leading-[1.6] text-on-surface-variant"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-3">
              <h3 className="font-heading text-[16px] font-semibold text-on-surface">
                Review criteria
              </h3>
              <ul className="flex flex-col gap-2">
                {currentWave.reviewCriteria.map((item) => (
                  <li
                    key={item}
                    className="flex gap-2.5 font-body text-[14px] leading-[1.6] text-on-surface-variant"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* Past waves */}
      {pastWaves.length > 0 && (
        <section className="flex flex-col gap-6 border-b border-outline-variant py-12">
          <span className={labelStyles}>Past waves</span>
          <div className="grid gap-4">
            {pastWaves.map((wave) => (
              <div
                key={wave.id}
                className="flex flex-col gap-4 rounded-sm border border-outline-variant bg-surface-container p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <h2 className="font-heading text-[18px] font-semibold text-on-surface">
                      {wave.name}
                    </h2>
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
                      {wave.budget} &middot; {wave.fundingSource}
                    </span>
                  </div>
                  <span className="rounded-sm border border-outline-variant px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[1.2px] text-outline">
                    Closed
                  </span>
                </div>

                {wave.highlights && wave.highlights.length > 0 && (
                  <ul className="flex flex-col gap-1.5">
                    {wave.highlights.map((highlight) => (
                      <li
                        key={highlight}
                        className="flex gap-2.5 font-body text-[13px] leading-[1.6] text-on-surface-variant"
                      >
                        <span className="mt-[5px] h-1 w-1 shrink-0 bg-outline" />
                        {highlight}
                      </li>
                    ))}
                  </ul>
                )}

                {wave.recipients && wave.recipients.length > 0 && (
                  <div className="flex flex-col gap-2 border-t border-outline-variant pt-3">
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
                      Recipients
                    </span>
                    <div className="flex flex-col gap-2">
                      {wave.recipients.map((r) => (
                        <div
                          key={r.name}
                          className="flex flex-wrap items-center justify-between gap-2 font-body text-[13px]"
                        >
                          <span className="text-on-surface font-medium">{r.name}</span>
                          <span className="text-on-surface-variant">{r.project}</span>
                          <span className="font-mono text-[11px] text-outline">
                            {r.grantAmount}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* FAQ */}
      {faqEntries.length > 0 && (
        <section className="flex flex-col gap-6 py-12">
          <span className={labelStyles}>FAQ</span>
          <h2 className="font-heading text-[22px] font-bold tracking-[-0.5px] text-on-surface">
            Frequently asked questions
          </h2>
          <div className="flex flex-col gap-3">
            {faqEntries.map((entry) => {
              const isOpen = openFaqId === entry.id;
              return (
                <div
                  key={entry.id}
                  className="rounded-sm border border-outline-variant bg-surface-container"
                >
                  <div className="px-4 py-4 sm:px-5">
                    <h3 className="font-heading text-[16px] font-semibold tracking-[-0.3px] text-on-surface">
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        onClick={() => setOpenFaqId(isOpen ? null : entry.id)}
                        className="flex w-full items-center justify-between text-left"
                      >
                        <span>{entry.question}</span>
                        <span className="font-mono text-[10px] font-semibold uppercase tracking-[1.6px] text-outline">
                          {isOpen ? 'Hide' : 'Show'}
                        </span>
                      </button>
                    </h3>
                  </div>
                  {isOpen && (
                    <div className="border-t border-outline-variant px-4 py-4 sm:px-5">
                      <p className="font-body text-[14px] leading-[1.7] text-on-surface-variant">
                        {entry.answer}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>{' '}
        </section>
      )}
    </div>
  );
}
