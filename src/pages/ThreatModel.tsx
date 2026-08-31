import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import threatModelData from '../data/threat-model.json';

type ThreatCell = {
  learns: string;
  inferred: string;
  private: string;
  footnote: number;
};

type ThreatApproach = {
  key: string;
  label: string;
  cells: Record<string, ThreatCell>;
};

export default function ThreatModel() {
  const { title, overview, reviewer, approaches, footnotes } = threatModelData;

  return (
    <>
      <Helmet>
        <title>{title} — Wraith Protocol</title>
        <meta
          name="description"
          content="A comparison of what an on-chain observer, network observer, compromised RPC, malicious counterparty, and subpoenaed indexer can and cannot learn under plaintext, ring-signature, mixer, and Wraith stealth flows."
        />
      </Helmet>

      <div className="mx-auto max-w-6xl px-4 py-12 md:px-8 lg:px-10">
        <header className="mb-8 border-b border-outline-variant pb-8">
          <div className="mb-4 flex items-center justify-between gap-4">
            <Link
              to="/security"
              className="font-mono text-[10px] uppercase tracking-[2px] text-outline hover:text-on-surface"
            >
              ← Security
            </Link>
            <Link
              to="/privacy"
              className="font-mono text-[10px] uppercase tracking-[2px] text-outline hover:text-on-surface"
            >
              Privacy →
            </Link>
          </div>
          <h1 className="font-heading text-4xl font-bold tracking-tight text-on-surface md:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-3xl font-body text-base leading-relaxed text-on-surface-variant">
            {overview}
          </p>
        </header>

        <div className="overflow-x-auto pb-2">
          <table
            aria-label="Threat model matrix"
            className="min-w-[980px] border-collapse border border-outline-variant bg-surface-container"
          >
            <thead>
              <tr>
                <th
                  scope="col"
                  className="border border-outline-variant bg-surface-bright px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[2px] text-outline"
                >
                  Approach
                </th>
                {threatModelData.threatActors.map((actor) => (
                  <th
                    key={actor.key}
                    scope="col"
                    className="border border-outline-variant bg-surface-bright px-4 py-3 text-left align-top"
                  >
                    <span className="font-mono text-[10px] uppercase tracking-[2px] text-outline">
                      Threat actor
                    </span>
                    <div className="mt-2 font-heading text-lg font-semibold text-on-surface">
                      {actor.label}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(approaches as ThreatApproach[]).map((approach) => (
                <tr key={approach.key}>
                  <th
                    scope="row"
                    className="border border-outline-variant bg-surface-bright px-4 py-4 text-left align-top"
                  >
                    <div className="font-heading text-xl font-semibold text-on-surface">
                      {approach.label}
                    </div>
                  </th>
                  {threatModelData.threatActors.map((actor) => {
                    const cell = (approach.cells as Record<string, ThreatCell>)[actor.key];

                    if (!cell) {
                      return (
                        <td
                          key={`${approach.key}-${actor.key}`}
                          className="border border-outline-variant px-4 py-4 align-top"
                        >
                          <div className="text-sm text-on-surface-variant">Missing data</div>
                        </td>
                      );
                    }

                    return (
                      <td
                        key={`${approach.key}-${actor.key}`}
                        className="border border-outline-variant px-4 py-4 align-top"
                      >
                        <div className="space-y-3 text-sm leading-relaxed text-on-surface-variant">
                          <div>
                            <div className="mb-1 font-mono text-[10px] uppercase tracking-[2px] text-outline">
                              Learns
                            </div>
                            <p>{cell.learns}</p>
                          </div>
                          <div>
                            <div className="mb-1 font-mono text-[10px] uppercase tracking-[2px] text-outline">
                              Inferred
                            </div>
                            <p>{cell.inferred}</p>
                          </div>
                          <div>
                            <div className="mb-1 font-mono text-[10px] uppercase tracking-[2px] text-outline">
                              Private
                            </div>
                            <p>{cell.private}</p>
                          </div>
                          <div className="pt-1 font-mono text-[10px] uppercase tracking-[2px] text-outline">
                            Assumption {cell.footnote}
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 rounded border border-outline-variant bg-surface-container p-5">
          <h2 className="font-heading text-xl font-semibold text-on-surface">Assumption notes</h2>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-on-surface-variant">
            {footnotes.map((note) => (
              <li key={note.id}>
                <span className="font-mono text-[10px] uppercase tracking-[2px] text-outline">
                  [{note.id}]
                </span>
                {note.text}
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-10 border-t border-outline-variant pt-6">
          <p className="font-body text-sm leading-relaxed text-on-surface-variant">
            Reviewed by <span className="font-semibold text-on-surface">{reviewer.name}</span>,{' '}
            {reviewer.role}.{' '}
            <span className="font-mono text-[10px] uppercase tracking-[2px] text-outline">
              Opt-in confirmed
            </span>
          </p>
        </div>
      </div>
    </>
  );
}
