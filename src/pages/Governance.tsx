import teamData from '../data/team.json';
import optOutData from '../data/contributors-optout.json';
import { Link } from 'react-router-dom';

type TeamMember = (typeof teamData.team)[number] & { github?: string };

const team: TeamMember[] = teamData.team;

export default function Governance() {
  const maintainerRoles = [
    'Founder & Protocol Architect',
    'Lead Engineer',
    'Cryptography Engineer',
  ];
  const maintainers = team.filter(
    (member) =>
      maintainerRoles.includes(member.role) &&
      (!member.github || !optOutData.includes(member.github.replace('https://github.com/', ''))),
  );

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-4xl font-heading font-bold mb-8 text-on-surface">Governance</h1>

      <section className="mb-12">
        <h2 className="text-2xl font-heading font-semibold mb-4 text-on-surface">
          Decision-Making Process
        </h2>
        <p className="font-body text-[15px] leading-relaxed text-on-surface-variant mb-4">
          Wraith Protocol operates on a Drips-funded contributor model. Decisions are driven by
          community proposals, discussions, and consensus among core maintainers. Proposals are
          drafted on our forums and refined before moving to implementation. Anyone can propose a
          change, but significant protocol upgrades require rigorous review and consensus.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-heading font-semibold mb-4 text-on-surface">
          Maintainer List
        </h2>
        <p className="font-body text-[15px] leading-relaxed text-on-surface-variant mb-6">
          Our core maintainers are responsible for reviewing pull requests, ensuring code quality,
          and merging changes to the main branch. Maintainers have opted into this listing.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {maintainers.map((maintainer) => (
            <div
              key={maintainer.name}
              className="border border-outline-variant bg-surface-container p-4 flex items-center gap-4"
            >
              <div
                className="h-16 w-16 shrink-0 overflow-hidden bg-outline-variant-30"
                role="img"
                aria-label={maintainer.name}
              >
                <div className="flex h-full w-full items-center justify-center font-heading text-xl font-bold text-on-surface-variant">
                  {maintainer.name
                    .split(' ')
                    .map((part) => part[0])
                    .join('')}
                </div>
              </div>
              <div>
                <h3 className="font-bold font-heading text-on-surface">{maintainer.name}</h3>
                <p className="text-[13px] text-outline mb-1">{maintainer.role}</p>
                {maintainer.github && (
                  <a
                    href={maintainer.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[13px] text-on-surface hover:text-on-surface-variant transition-colors hover:underline"
                  >
                    GitHub
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-heading font-semibold mb-4 text-on-surface">
          Wave Scoping Process
        </h2>
        <p className="font-body text-[15px] leading-relaxed text-on-surface-variant mb-4">
          Waves represent phases of funding and development focus. The scoping process involves
          gathering input from contributors and institutional partners, prioritizing features based
          on our roadmap, and allocating the Drips funding accordingly. Detailed wave scopes are
          published before each development cycle begins.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-heading font-semibold mb-4 text-on-surface">
          Dispute & Escalation Path
        </h2>
        <p className="font-body text-[15px] leading-relaxed text-on-surface-variant mb-4">
          In the event of a disagreement regarding technical decisions or wave scoping, issues are
          escalated to a dedicated dispute resolution committee composed of senior maintainers and
          advisors. The goal is always to reach a consensus, but if a deadlock occurs, the Lead
          Protocol Architect has the final say to ensure project momentum.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-heading font-semibold mb-4 text-on-surface">
          Mainnet Parameter Change Process
        </h2>
        <p className="font-body text-[15px] leading-relaxed text-on-surface-variant mb-4">
          [Placeholder] The process for changing mainnet parameters is currently under design. It
          will likely involve a timelock and multi-sig authorization, transitioning towards more
          decentralized governance as the protocol matures.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-heading font-semibold mb-4 text-on-surface">Get Involved</h2>
        <p className="font-body text-[15px] leading-relaxed text-on-surface-variant mb-4">
          Interested in contributing or applying for funding? Check out our{' '}
          <Link
            to="/grants"
            className="text-on-surface hover:text-on-surface-variant transition-colors underline decoration-outline-variant/40 underline-offset-4"
          >
            Grants
          </Link>{' '}
          program and see our{' '}
          <Link
            to="/contributors"
            className="text-on-surface hover:text-on-surface-variant transition-colors underline decoration-outline-variant/40 underline-offset-4"
          >
            Contributors
          </Link>{' '}
          page.
        </p>
      </section>
    </div>
  );
}
