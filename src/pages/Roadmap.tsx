import Header from '../components/Header';
import Footer from '../components/Footer';
import roadmap from '../data/roadmap.json';

type Status = 'shipped' | 'in-progress' | 'planned';

type Milestone = {
  id: string;
  phase: string;
  title: string;
  status: Status;
  summary: string;
  highlights: string[];
};

const statusMeta: Record<Status, { label: string; marker: string; badge: string }> = {
  shipped: {
    label: 'Shipped',
    marker: 'bg-tertiary',
    badge: 'border-tertiary text-tertiary',
  },
  'in-progress': {
    label: 'In Progress',
    marker: 'bg-blue',
    badge: 'border-blue text-blue',
  },
  planned: {
    label: 'Planned',
    marker: 'bg-outline',
    badge: 'border-outline-variant text-outline',
  },
};

const milestones = roadmap.milestones as Milestone[];

export default function Roadmap() {
  return (
    <div className="bg-surface text-on-surface">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>

      <Header />

      <main id="main-content" tabIndex={-1} className="pt-20">
        <section className="border-b border-outline-variant-30 px-6 py-20 md:px-12">
          <div className="mx-auto flex max-w-6xl flex-col gap-5">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
              Roadmap
            </span>
            <h1 className="font-heading text-[40px] font-bold leading-[1.05] tracking-[-1.5px] text-on-surface sm:text-5xl">
              Building private payments for every chain
            </h1>
            <p className="max-w-2xl font-body text-[17px] leading-[1.6] text-on-surface-variant">
              Where Wraith Protocol has been and where it is going — from the core stealth-address
              cryptography to a managed platform and beyond.
            </p>
            <a
              href={roadmap.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 font-heading text-sm font-semibold text-primary transition-colors duration-150 hover:brightness-110"
            >
              Read the full roadmap →
            </a>
          </div>
        </section>

        <section className="px-6 py-20 md:px-12">
          <ol className="mx-auto flex max-w-6xl flex-col lg:flex-row">
            {milestones.map((milestone) => {
              const meta = statusMeta[milestone.status];

              return (
                <li
                  key={milestone.id}
                  className="relative border-l border-outline-variant-30 pb-10 pl-8 last:pb-0 lg:flex-1 lg:border-l-0 lg:border-t lg:pb-0 lg:pl-0 lg:pr-5 lg:pt-8 lg:last:pr-0"
                >
                  <span
                    aria-hidden="true"
                    className={`absolute left-[-4.5px] top-1.5 h-2 w-2 ${meta.marker} lg:left-0 lg:top-[-4.5px]`}
                  />

                  <article className="flex h-full flex-col gap-4 border border-outline-variant-30 bg-surface-container p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
                        {milestone.phase}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 border px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-[1.2px] ${meta.badge}`}
                      >
                        <span aria-hidden="true" className={`h-1.5 w-1.5 ${meta.marker}`} />
                        {meta.label}
                      </span>
                    </div>

                    <h2 className="font-heading text-xl font-bold tracking-[-0.3px] text-on-surface">
                      {milestone.title}
                    </h2>

                    <p className="font-body text-[13px] leading-[1.65] text-on-surface-variant">
                      {milestone.summary}
                    </p>

                    <ul className="flex flex-col gap-2">
                      {milestone.highlights.map((highlight) => (
                        <li
                          key={highlight}
                          className="flex gap-2.5 font-body text-[13px] leading-[1.5] text-outline"
                        >
                          <span
                            aria-hidden="true"
                            className="mt-[7px] h-1 w-1 flex-shrink-0 bg-primary"
                          />
                          <span>{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                </li>
              );
            })}
          </ol>
        </section>

        <section className="border-t border-outline-variant-30 px-6 py-20 md:px-12">
          <div className="mx-auto flex max-w-2xl flex-col items-start gap-5">
            <h2 className="font-heading text-3xl font-bold tracking-[-0.5px]">
              Follow along as we ship
            </h2>
            <p className="font-body text-[15px] leading-[1.6] text-on-surface-variant">
              The roadmap evolves as milestones land. For the detailed breakdown and the latest
              status, head to the docs.
            </p>
            <a
              href={roadmap.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center bg-primary px-6 font-heading text-sm font-semibold uppercase tracking-wider text-surface transition-[filter] duration-150 hover:brightness-110"
            >
              View roadmap docs
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
