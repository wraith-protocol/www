import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import securityData from '../data/security.json';

export default function Security() {
  const {
    contact,
    threatModel,
    disclosure,
    keyManagement,
    dependencies,
    audits,
    bounty,
    disclosures,
    compliance,
  } = securityData;

  return (
    <>
      <Helmet>
        <title>Security Commitments — Wraith Protocol</title>
        <meta
          name="description"
          content="Wraith Protocol's security posture, threat model, coordinated disclosure policy, audit cadence, and bug bounty program."
        />
      </Helmet>

      <div className="mx-auto max-w-4xl px-6 py-12 md:px-12 md:py-16">
        {/* Header */}
        <header className="mb-12 border-b border-outline-variant-30 pb-8">
          <h1 className="font-heading text-4xl font-bold tracking-tight text-on-surface md:text-5xl">
            Security Commitments
          </h1>
          <p className="mt-4 font-body text-lg leading-relaxed text-on-surface-variant">
            Our security posture, disclosure policy, and organizational trust practices.
          </p>
        </header>

        {/* Contact Section */}
        <section className="mb-12">
          <h2 className="mb-4 font-heading text-2xl font-semibold text-on-surface">
            Security Contact
          </h2>
          <div className="rounded border border-outline-variant bg-surface-container p-6">
            <p className="mb-3 font-body text-sm leading-relaxed text-on-surface-variant">
              Report security vulnerabilities to:
            </p>
            <div className="mb-4 flex flex-col gap-2">
              <a
                href={`mailto:${contact.email}`}
                className="font-mono text-base text-primary transition-colors hover:text-primary-variant"
              >
                {contact.email}
              </a>
              {contact.pgp.enabled && (
                <div className="flex flex-col gap-1">
                  <span className="font-body text-sm text-outline">
                    PGP Fingerprint:{' '}
                    <code className="font-mono text-xs text-on-surface">
                      {contact.pgp.fingerprint}
                    </code>
                  </span>
                  <a
                    href={contact.pgp.keyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-body text-sm text-primary transition-colors hover:text-primary-variant"
                  >
                    Download PGP Key ↗
                  </a>
                </div>
              )}
            </div>
            <p className="font-body text-sm text-outline">
              Preferred languages: {contact.preferredLanguages.join(', ')}
            </p>
          </div>
        </section>

        {/* Threat Model */}
        <section className="mb-12">
          <h2 className="mb-4 font-heading text-2xl font-semibold text-on-surface">Threat Model</h2>
          <p className="mb-6 font-body text-base leading-relaxed text-on-surface-variant">
            {threatModel.summary}
          </p>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded border border-outline-variant bg-surface-container p-5">
              <h3 className="mb-3 font-heading text-lg font-semibold text-on-surface">
                Assumptions
              </h3>
              <ul className="space-y-2">
                {threatModel.assumptions.map((assumption, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                    <span className="font-body text-sm leading-relaxed text-on-surface-variant">
                      {assumption}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded border border-outline-variant bg-surface-container p-5">
              <h3 className="mb-3 font-heading text-lg font-semibold text-on-surface">
                Out of Scope
              </h3>
              <ul className="space-y-2">
                {threatModel.outOfScope.map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-outline" />
                    <span className="font-body text-sm leading-relaxed text-on-surface-variant">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Coordinated Disclosure */}
        <section className="mb-12">
          <h2 className="mb-4 font-heading text-2xl font-semibold text-on-surface">
            Coordinated Disclosure Policy
          </h2>
          <div className="rounded border border-outline-variant bg-surface-container p-6">
            <dl className="space-y-4">
              <div>
                <dt className="font-mono text-xs font-semibold uppercase tracking-wider text-outline">
                  Policy
                </dt>
                <dd className="mt-1 font-body text-base text-on-surface capitalize">
                  {disclosure.policy} Disclosure
                </dd>
              </div>
              <div>
                <dt className="font-mono text-xs font-semibold uppercase tracking-wider text-outline">
                  Response Time
                </dt>
                <dd className="mt-1 font-body text-base text-on-surface">
                  {disclosure.responseTime}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-xs font-semibold uppercase tracking-wider text-outline">
                  Disclosure Timeline
                </dt>
                <dd className="mt-1 font-body text-base text-on-surface">{disclosure.timeline}</dd>
              </div>
              <div>
                <dt className="font-mono text-xs font-semibold uppercase tracking-wider text-outline">
                  In Scope
                </dt>
                <dd className="mt-2">
                  <ul className="space-y-1">
                    {disclosure.scope.map((item, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                        <span className="font-body text-sm text-on-surface-variant">{item}</span>
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            </dl>
          </div>
        </section>

        {/* Key Management */}
        <section className="mb-12">
          <h2 className="mb-4 font-heading text-2xl font-semibold text-on-surface">
            Key Management
          </h2>
          <div className="space-y-4">
            <div className="rounded border border-outline-variant bg-surface-container p-5">
              <h3 className="mb-2 font-heading text-base font-semibold text-on-surface">
                Signing Infrastructure
              </h3>
              <p className="font-body text-sm leading-relaxed text-on-surface-variant">
                {keyManagement.signingInfra}
              </p>
            </div>
            <div className="rounded border border-outline-variant bg-surface-container p-5">
              <h3 className="mb-2 font-heading text-base font-semibold text-on-surface">
                Developer Keys
              </h3>
              <p className="font-body text-sm leading-relaxed text-on-surface-variant">
                {keyManagement.developerKeys}
              </p>
            </div>
            <div className="rounded border border-outline-variant bg-surface-container p-5">
              <h3 className="mb-2 font-heading text-base font-semibold text-on-surface">
                Rotation Policy
              </h3>
              <p className="font-body text-sm leading-relaxed text-on-surface-variant">
                {keyManagement.rotation}
              </p>
            </div>
          </div>
        </section>

        {/* Dependencies */}
        <section className="mb-12">
          <h2 className="mb-4 font-heading text-2xl font-semibold text-on-surface">
            Dependency Management
          </h2>
          <div className="space-y-4">
            <div className="rounded border border-outline-variant bg-surface-container p-5">
              <h3 className="mb-2 font-heading text-base font-semibold text-on-surface">Policy</h3>
              <p className="font-body text-sm leading-relaxed text-on-surface-variant">
                {dependencies.policy}
              </p>
            </div>
            <div className="rounded border border-outline-variant bg-surface-container p-5">
              <h3 className="mb-2 font-heading text-base font-semibold text-on-surface">
                Review Cadence
              </h3>
              <p className="font-body text-sm leading-relaxed text-on-surface-variant">
                {dependencies.review}
              </p>
            </div>
            <div className="rounded border border-outline-variant bg-surface-container p-5">
              <h3 className="mb-2 font-heading text-base font-semibold text-on-surface">
                Supply Chain Security
              </h3>
              <p className="font-body text-sm leading-relaxed text-on-surface-variant">
                {dependencies.supply}
              </p>
            </div>
          </div>
        </section>

        {/* Security Audits */}
        <section className="mb-12">
          <h2 className="mb-4 font-heading text-2xl font-semibold text-on-surface">
            Security Audits
          </h2>
          <div className="rounded border border-outline-variant bg-surface-container p-6">
            <div className="mb-6 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="font-mono text-xs font-semibold uppercase tracking-wider text-outline">
                  Last Completed
                </dt>
                <dd className="mt-1 font-body text-base text-on-surface">{audits.lastCompleted}</dd>
              </div>
              <div>
                <dt className="font-mono text-xs font-semibold uppercase tracking-wider text-outline">
                  Auditor
                </dt>
                <dd className="mt-1 font-body text-base text-on-surface">{audits.auditor}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="font-mono text-xs font-semibold uppercase tracking-wider text-outline">
                  Scope
                </dt>
                <dd className="mt-1 font-body text-base text-on-surface-variant">{audits.scope}</dd>
              </div>
              <div>
                <dt className="font-mono text-xs font-semibold uppercase tracking-wider text-outline">
                  Findings
                </dt>
                <dd className="mt-1 font-body text-base text-on-surface">{audits.findings}</dd>
              </div>
              <div>
                <dt className="font-mono text-xs font-semibold uppercase tracking-wider text-outline">
                  Next Scheduled
                </dt>
                <dd className="mt-1 font-body text-base text-on-surface">{audits.nextScheduled}</dd>
              </div>
            </div>
            <a
              href={audits.reports}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 font-body text-sm text-primary transition-colors hover:text-primary-variant"
            >
              View Audit Reports ↗
            </a>
          </div>
        </section>

        {/* Bug Bounty */}
        <section className="mb-12">
          <h2 className="mb-4 font-heading text-2xl font-semibold text-on-surface">
            Bug Bounty Program
          </h2>
          <div className="rounded border border-outline-variant bg-surface-container p-6">
            <div className="mb-4 flex items-center gap-3">
              <span
                className={`rounded px-3 py-1 font-mono text-xs font-semibold uppercase tracking-wider ${
                  bounty.status === 'active'
                    ? 'bg-[#22c55e]/15 text-[#22c55e]'
                    : 'bg-outline/15 text-outline'
                }`}
              >
                {bounty.status}
              </span>
              <span className="font-body text-sm text-outline">
                Max Reward:{' '}
                <span className="font-semibold text-on-surface">{bounty.maxReward}</span>
              </span>
            </div>

            <div className="mb-4 space-y-3">
              <div>
                <h3 className="mb-1 font-heading text-sm font-semibold text-on-surface">
                  Eligibility
                </h3>
                <p className="font-body text-sm leading-relaxed text-on-surface-variant">
                  {bounty.eligibility}
                </p>
              </div>
              <div>
                <h3 className="mb-1 font-heading text-sm font-semibold text-on-surface">
                  Ineligibility
                </h3>
                <p className="font-body text-sm leading-relaxed text-on-surface-variant">
                  {bounty.ineligibility}
                </p>
              </div>
            </div>

            <a
              href={bounty.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 font-body text-sm text-primary transition-colors hover:text-primary-variant"
            >
              View Bounty Program ↗
            </a>
          </div>
        </section>

        {/* Public Disclosures */}
        <section className="mb-12">
          <h2 className="mb-4 font-heading text-2xl font-semibold text-on-surface">
            Public Disclosures
          </h2>
          <div className="rounded border border-outline-variant bg-surface-container p-6">
            <p className="mb-4 font-body text-base text-on-surface-variant">
              We maintain a public disclosure log of all remediated vulnerabilities.
            </p>
            <div className="mb-4">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-outline">
                Total Disclosures
              </span>
              <p className="mt-1 font-heading text-3xl font-bold text-on-surface">
                {disclosures.count}
              </p>
            </div>
            <a
              href={disclosures.public}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 font-body text-sm text-primary transition-colors hover:text-primary-variant"
            >
              View Disclosure Log ↗
            </a>
          </div>
        </section>

        {/* Compliance & Standards */}
        <section className="mb-12">
          <h2 className="mb-4 font-heading text-2xl font-semibold text-on-surface">
            Compliance & Standards
          </h2>
          <div className="rounded border border-outline-variant bg-surface-container p-6">
            <div className="mb-4">
              <h3 className="mb-2 font-heading text-base font-semibold text-on-surface">
                Standards
              </h3>
              <ul className="flex flex-wrap gap-2">
                {compliance.standards.map((standard, index) => (
                  <li
                    key={index}
                    className="rounded border border-outline-variant bg-surface px-3 py-1 font-mono text-xs text-on-surface"
                  >
                    {standard}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-2 font-heading text-base font-semibold text-on-surface">
                Frameworks
              </h3>
              <p className="font-body text-sm leading-relaxed text-on-surface-variant">
                {compliance.frameworks}
              </p>
            </div>
          </div>
        </section>

        {/* Related Pages */}
        <section className="border-t border-outline-variant-30 pt-8">
          <h2 className="mb-4 font-heading text-xl font-semibold text-on-surface">Related Pages</h2>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/vitals"
              className="inline-flex items-center gap-2 rounded border border-outline-variant bg-surface-container px-4 py-2 font-body text-sm text-on-surface transition-colors hover:border-outline hover:bg-surface-bright"
            >
              Web Vitals →
            </Link>
            <Link
              to="/privacy"
              className="inline-flex items-center gap-2 rounded border border-outline-variant bg-surface-container px-4 py-2 font-body text-sm text-on-surface transition-colors hover:border-outline hover:bg-surface-bright"
            >
              Privacy Policy →
            </Link>
            <a
              href="https://docs.usewraith.xyz/security"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded border border-outline-variant bg-surface-container px-4 py-2 font-body text-sm text-on-surface transition-colors hover:border-outline hover:bg-surface-bright"
            >
              Full Security Docs ↗
            </a>
          </div>
        </section>
      </div>
    </>
  );
}
