import { Helmet } from 'react-helmet-async';
import teamData from '../data/team.json';

const socialIcon = (type: 'github' | 'twitter') => {
  if (type === 'github') {
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 1200 1227" fill="currentColor" aria-hidden="true">
      <path d="M714.163 519.284L1160.89 0H1055.03L667.137 450.887L357.328 0H0L468.492 681.821L0 1226.37H105.866L515.491 750.218L842.672 1226.37H1200L714.137 519.284H714.163ZM569.165 687.828L521.697 619.934L144.011 79.6944H306.615L611.412 515.685L658.88 583.579L1055.08 1150.3H892.476L569.165 687.854V687.828Z" />
    </svg>
  );
};

export default function About() {
  return (
    <>
      <Helmet>
        <title>About – Wraith Protocol</title>
        <meta
          name="description"
          content="Meet the team behind Wraith Protocol — building privacy-preserving payment infrastructure for everyone."
        />
        <meta property="og:title" content="About – Wraith Protocol" />
        <meta
          property="og:description"
          content="Meet the team behind Wraith Protocol — building privacy-preserving payment infrastructure."
        />
        <meta property="og:url" content="https://usewraith.xyz/about" />
        <meta property="og:type" content="website" />
      </Helmet>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="border-b border-outline-variant-30 px-6 py-24 md:px-12">
        <div className="mx-auto flex max-w-336 flex-col gap-6">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
            About us
          </span>
          <h1 className="font-heading text-[36px] font-bold leading-[1.05] tracking-[-1.5px] text-on-surface sm:text-[48px] md:text-[56px]">
            Privacy is not a feature.
            <br />
            It&apos;s the foundation.
          </h1>
        </div>
      </section>

      {/* ── Mission ───────────────────────────────────────────────────────── */}
      <section className="border-b border-outline-variant-30 px-6 py-24 md:px-12">
        <div className="mx-auto max-w-336">
          <div className="flex flex-col gap-10">
            <div className="flex flex-col gap-3">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
                Mission
              </span>
              <h2 className="font-heading text-[28px] font-bold tracking-[-1.2px] text-on-surface sm:text-[40px]">
                Why we build
              </h2>
            </div>
            <p className="max-w-3xl font-body text-[17px] leading-[1.6] text-on-surface-variant">
              {teamData.mission}
            </p>
          </div>
        </div>
      </section>

      {/* ── Team ──────────────────────────────────────────────────────────── */}
      <section className="border-b border-outline-variant-30 px-6 py-24 md:px-12">
        <div className="mx-auto flex max-w-336 flex-col gap-12">
          <div className="flex flex-col gap-3">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
              Core team
            </span>
            <h2 className="font-heading text-[28px] font-bold tracking-[-1.2px] text-on-surface sm:text-[40px]">
              Who we are
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {teamData.team.map((member) => (
              <div
                key={member.name}
                className="flex flex-col gap-5 border border-outline-variant bg-surface-container p-7 transition-colors duration-150 hover:bg-surface-bright"
              >
                <div className="flex items-start gap-5">
                  <div
                    className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-outline-variant-30"
                    role="img"
                    aria-label={member.name}
                  >
                    <div className="flex h-full w-full items-center justify-center font-heading text-xl font-bold text-outline">
                      {member.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <h3 className="font-heading text-lg font-semibold tracking-[-0.3px] text-on-surface">
                      {member.name}
                    </h3>
                    <span className="font-mono text-[11px] font-semibold tracking-[1px] text-primary">
                      {member.role}
                    </span>
                  </div>
                </div>
                <p className="font-body text-[13px] leading-[1.65] text-on-surface-variant">
                  {member.bio}
                </p>
                {'github' in member && (
                  <div className="mt-auto flex gap-3">
                    <a
                      href={member.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${member.name} on GitHub`}
                      className="text-outline transition-colors duration-150 hover:text-on-surface"
                    >
                      {socialIcon('github')}
                    </a>
                    {'twitter' in member && (
                      <a
                        href={member.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${member.name} on X (Twitter)`}
                        className="text-outline transition-colors duration-150 hover:text-on-surface"
                      >
                        {socialIcon('twitter')}
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Advisors ──────────────────────────────────────────────────────── */}
      <section className="border-b border-outline-variant-30 px-6 py-24 md:px-12">
        <div className="mx-auto flex max-w-336 flex-col gap-12">
          <div className="flex flex-col gap-3">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
              Advisors
            </span>
            <h2 className="font-heading text-[28px] font-bold tracking-[-1.2px] text-on-surface sm:text-[40px]">
              Trusted guidance
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {teamData.advisors.map((advisor) => (
              <div
                key={advisor.name}
                className="flex flex-col gap-5 border border-outline-variant bg-surface-container p-7"
              >
                <div className="flex items-start gap-5">
                  <div
                    className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-outline-variant-30"
                    role="img"
                    aria-label={advisor.name}
                  >
                    <div className="flex h-full w-full items-center justify-center font-heading text-xl font-bold text-outline">
                      {advisor.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <h3 className="font-heading text-lg font-semibold tracking-[-0.3px] text-on-surface">
                      {advisor.name}
                    </h3>
                    <span className="font-mono text-[11px] font-semibold tracking-[1px] text-primary">
                      {advisor.role}
                    </span>
                  </div>
                </div>
                <p className="font-body text-[13px] leading-[1.65] text-on-surface-variant">
                  {advisor.bio}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Community Contributors ────────────────────────────────────────── */}
      <section className="px-6 py-24 md:px-12">
        <div className="mx-auto flex max-w-336 flex-col gap-10">
          <div className="flex flex-col gap-3">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
              Community
            </span>
            <h2 className="font-heading text-[28px] font-bold tracking-[-1.2px] text-on-surface sm:text-[40px]">
              Built in the open
            </h2>
          </div>

          <div className="border border-outline-variant bg-surface-container p-8">
            <p className="font-body text-[17px] leading-[1.6] text-on-surface-variant">
              {teamData.contributors[0]?.bio ?? 'Our community is the backbone of Wraith Protocol.'}
            </p>
            <a
              href="https://github.com/wraith-protocol"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 font-mono text-[11px] font-semibold tracking-[1px] text-primary transition-colors duration-150 hover:brightness-110"
            >
              View our GitHub → {socialIcon('github')}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
