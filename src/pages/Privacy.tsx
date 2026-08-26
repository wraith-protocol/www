import { Link } from 'react-router-dom';
import { trackOutbound } from '../utils/track';
import PrivacyComparison from '../components/PrivacyComparison';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-3">
    <h2 className="font-heading text-[18px] font-semibold tracking-[-0.4px] text-on-surface">
      {title}
    </h2>
    <div className="flex flex-col gap-2 font-body text-[14px] leading-[1.7] text-on-surface-variant">
      {children}
    </div>
  </div>
);

export default function Privacy() {
  return (
    <div className="min-h-screen bg-surface text-on-surface">
      {/* minimal nav */}
      <header className="flex items-center justify-between px-6 py-5 md:px-12">
        <Link to="/" className="flex items-center gap-3">
          <img src="/logo.png" alt="Wraith" width={30} height={24} className="h-6 opacity-90" />
          <span className="font-heading text-[13px] font-bold tracking-[2px] text-on-surface">
            WRAITH PROTOCOL
          </span>
        </Link>
      </header>

      <main className="mx-auto max-w-[720px] px-6 py-16 md:px-12">
        <div className="flex flex-col gap-12">
          {/* header */}
          <div className="flex flex-col gap-4 border-b border-outline-variant pb-10">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
              Legal
            </span>
            <h1 className="font-heading text-[36px] font-bold tracking-[-1.5px] text-on-surface sm:text-[48px]">
              Privacy Policy
            </h1>
            <p className="font-body text-[14px] text-outline">
              Last updated: June 2025 &nbsp;·&nbsp; usewraith.xyz
            </p>
          </div>

          {/* intro */}
          <p className="font-body text-[15px] leading-[1.7] text-on-surface-variant">
            Wraith Protocol is a privacy-first project. We apply the same principle to this website:
            collect only what we need to improve the product, and nothing that could identify you
            personally.
          </p>

          {/* interactive comparison */}
          <PrivacyComparison />

          <div className="rounded border border-outline-variant bg-surface-container p-4">
            <Link
              to="/threat-model"
              className="inline-flex items-center gap-2 font-heading text-[12px] font-semibold tracking-[1.5px] text-on-surface transition-colors hover:text-primary"
            >
              THREAT MODEL MATRIX →
            </Link>
          </div>

          <Section title="What we collect">
            <p>
              We use{' '}
              <a
                href="https://plausible.io"
                target="_blank"
                onClick={trackOutbound('other')}
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Plausible Analytics
              </a>{' '}
              — an open-source, EU-hosted analytics platform — to understand how visitors interact
              with this site.
            </p>
            <p>
              Plausible collects the following{' '}
              <strong className="text-on-surface">aggregate</strong> data per page visit:
            </p>
            <ul className="ml-4 list-disc space-y-1">
              <li>Page URL and referrer</li>
              <li>Browser name and version (no fingerprinting)</li>
              <li>Operating system</li>
              <li>Country and region (derived from IP; the IP itself is never stored)</li>
              <li>Device type (desktop / tablet / mobile)</li>
              <li>Scroll depth percentage</li>
              <li>
                Goal events: &ldquo;Read the Docs&rdquo;, &ldquo;Try the Demo&rdquo;, &ldquo;Get API
                Key&rdquo;, &ldquo;Code Tab Change&rdquo;
              </li>
            </ul>
          </Section>

          <Section title="What we do NOT collect">
            <ul className="ml-4 list-disc space-y-1">
              <li>No cookies are set — ever.</li>
              <li>No persistent identifiers or device fingerprints.</li>
              <li>No cross-site tracking.</li>
              <li>No IP addresses stored or logged.</li>
              <li>No personal information (name, email, wallet address, etc.).</li>
            </ul>
            <p>
              Because Plausible is cookieless,{' '}
              <strong className="text-on-surface">no consent banner is required</strong> under GDPR,
              PECR, or ePrivacy Directive. See Plausible&apos;s own{' '}
              <a
                href="https://plausible.io/data-policy"
                target="_blank"
                onClick={trackOutbound('other')}
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                data policy
              </a>{' '}
              for the full breakdown.
            </p>
          </Section>

          <Section title="Why Plausible?">
            <p>We chose Plausible over Google Analytics or other trackers because it is: </p>
            <ul className="ml-4 list-disc space-y-1">
              <li>
                <strong className="text-on-surface">Cookieless by design</strong> — the script uses
                a daily rotating hash, not a persistent cookie or localStorage value.
              </li>
              <li>
                <strong className="text-on-surface">EU-hosted</strong> — data is processed on
                servers in the EU (Hetzner, Germany/Finland). No data transfer to the US.
              </li>
              <li>
                <strong className="text-on-surface">Open source</strong> — the full codebase is
                auditable at{' '}
                <a
                  href="https://github.com/plausible/analytics"
                  target="_blank"
                  onClick={trackOutbound('other')}
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  github.com/plausible/analytics
                </a>
                .
              </li>
              <li>
                <strong className="text-on-surface">Lightweight</strong> — the tracking script is
                under 2 KB gzipped, adding no meaningful latency.
              </li>
            </ul>
          </Section>

          <Section title="Third-party services">
            <p>
              Beyond Plausible, this site loads fonts from{' '}
              <a
                href="https://fonts.google.com"
                target="_blank"
                onClick={trackOutbound('other')}
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Google Fonts
              </a>
              . Google Fonts requests include your IP address; you can block them with a content
              blocker if you prefer. No other third-party scripts are loaded.
            </p>
          </Section>

          <Section title="Analytics event schema">
            <p>
              All custom events below are sent to the same first-party endpoint (Plausible) and are
              automatically suppressed when Do-Not-Track (DNT) or Global Privacy Control (GPC) is
              enabled in the visitor&apos;s browser. None of them contain personally identifiable
              information, wallet data, or form contents.
            </p>

            <div className="flex flex-col gap-4 border-l border-outline-variant pl-4">
              <div>
                <p className="font-mono text-[12px] font-semibold text-on-surface">cta_click</p>
                <ul className="ml-4 list-disc space-y-1">
                  <li>
                    <strong className="text-on-surface">Trigger:</strong> a visitor clicks a primary
                    call-to-action.
                  </li>
                  <li>
                    <strong className="text-on-surface">Payload:</strong>{' '}
                    <code className="font-mono text-xs">source</code> (e.g. hero-docs,
                    ctastrip-console).
                  </li>
                  <li>
                    <strong className="text-on-surface">Purpose:</strong> measure CTA effectiveness.
                  </li>
                  <li>
                    <strong className="text-on-surface">Retention:</strong> aggregated in Plausible.
                  </li>
                  <li>
                    <strong className="text-on-surface">Endpoint:</strong> Plausible event API.
                  </li>
                  <li>
                    <strong className="text-on-surface">DNT/GPC:</strong> suppressed when enabled.
                  </li>
                </ul>
              </div>

              <div>
                <p className="font-mono text-[12px] font-semibold text-on-surface">
                  newsletter_submit
                </p>
                <ul className="ml-4 list-disc space-y-1">
                  <li>
                    <strong className="text-on-surface">Trigger:</strong> a signup request is
                    accepted by the backend (HTTP 201).
                  </li>
                  <li>
                    <strong className="text-on-surface">Payload:</strong>{' '}
                    <code className="font-mono text-xs">source</code>.
                  </li>
                  <li>
                    <strong className="text-on-surface">Purpose:</strong> newsletter conversion
                    tracking.
                  </li>
                  <li>
                    <strong className="text-on-surface">Retention:</strong> aggregated in Plausible.
                  </li>
                  <li>
                    <strong className="text-on-surface">Endpoint:</strong> Plausible event API.
                  </li>
                  <li>
                    <strong className="text-on-surface">DNT/GPC:</strong> suppressed when enabled.
                  </li>
                </ul>
              </div>

              <div>
                <p className="font-mono text-[12px] font-semibold text-on-surface">
                  newsletter_confirm
                </p>
                <ul className="ml-4 list-disc space-y-1">
                  <li>
                    <strong className="text-on-surface">Trigger:</strong> the double opt-in email
                    confirmation step (handled by Buttondown, outside this site).
                  </li>
                  <li>
                    <strong className="text-on-surface">Payload:</strong>{' '}
                    <code className="font-mono text-xs">source</code>.
                  </li>
                  <li>
                    <strong className="text-on-surface">Status:</strong> typed and reserved, but{' '}
                    <strong className="text-on-surface">not currently emitted</strong> — this SPA has
                    no confirmation route; the confirmation happens via email.
                  </li>
                </ul>
              </div>

              <div>
                <p className="font-mono text-[12px] font-semibold text-on-surface">
                  blog_post_read
                </p>
                <ul className="ml-4 list-disc space-y-1">
                  <li>
                    <strong className="text-on-surface">Trigger:</strong> a reader scrolls to at
                    least 80% of a blog article (once per article view).
                  </li>
                  <li>
                    <strong className="text-on-surface">Payload:</strong>{' '}
                    <code className="font-mono text-xs">slug</code>, optional{' '}
                    <code className="font-mono text-xs">locale</code>.
                  </li>
                  <li>
                    <strong className="text-on-surface">Purpose:</strong> content engagement.
                  </li>
                  <li>
                    <strong className="text-on-surface">Retention:</strong> aggregated in Plausible.
                  </li>
                  <li>
                    <strong className="text-on-surface">Endpoint:</strong> Plausible event API.
                  </li>
                  <li>
                    <strong className="text-on-surface">DNT/GPC:</strong> suppressed when enabled.
                  </li>
                </ul>
              </div>

              <div>
                <p className="font-mono text-[12px] font-semibold text-on-surface">
                  calculator_share
                </p>
                <ul className="ml-4 list-disc space-y-1">
                  <li>
                    <strong className="text-on-surface">Trigger:</strong> a visitor shares a result
                    from the (hypothetical) calculator.
                  </li>
                  <li>
                    <strong className="text-on-surface">Payload:</strong> optional{' '}
                    <code className="font-mono text-xs">source</code>.
                  </li>
                  <li>
                    <strong className="text-on-surface">Status:</strong> typed and reserved, but{' '}
                    <strong className="text-on-surface">not currently emitted</strong> — no
                    calculator share UI exists on the site.
                  </li>
                </ul>
              </div>

              <div>
                <p className="font-mono text-[12px] font-semibold text-on-surface">
                  chain_matrix_sort
                </p>
                <ul className="ml-4 list-disc space-y-1">
                  <li>
                    <strong className="text-on-surface">Trigger:</strong> a visitor sorts the (hypothetical)
                    chain comparison matrix.
                  </li>
                  <li>
                    <strong className="text-on-surface">Payload:</strong>{' '}
                    <code className="font-mono text-xs">column</code>,{' '}
                    <code className="font-mono text-xs">direction</code>.
                  </li>
                  <li>
                    <strong className="text-on-surface">Status:</strong> typed and reserved, but{' '}
                    <strong className="text-on-surface">not currently emitted</strong> — no sortable
                    chain matrix UI exists on the site.
                  </li>
                </ul>
              </div>

              <div>
                <p className="font-mono text-[12px] font-semibold text-on-surface">outbound_click</p>
                <ul className="ml-4 list-disc space-y-1">
                  <li>
                    <strong className="text-on-surface">Trigger:</strong> a visitor clicks an
                    external link.
                  </li>
                  <li>
                    <strong className="text-on-surface">Payload:</strong>{' '}
                    <code className="font-mono text-xs">category</code> — one of github, docs,
                    social, explorer, ecosystem, partner, other.
                  </li>
                  <li>
                    <strong className="text-on-surface">Purpose:</strong> understand outbound link
                    interest. The full destination URL is not recorded.
                  </li>
                  <li>
                    <strong className="text-on-surface">Retention:</strong> aggregated in Plausible.
                  </li>
                  <li>
                    <strong className="text-on-surface">Endpoint:</strong> Plausible event API.
                  </li>
                  <li>
                    <strong className="text-on-surface">DNT/GPC:</strong> suppressed when enabled.
                  </li>
                </ul>
              </div>

              <div>
                <p className="font-mono text-[12px] font-semibold text-on-surface">Web Vital</p>
                <ul className="ml-4 list-disc space-y-1">
                  <li>
                    <strong className="text-on-surface">Trigger:</strong> a real-user performance
                    metric (LCP, INP, or CLS) is recorded by the browser.
                  </li>
                  <li>
                    <strong className="text-on-surface">Payload:</strong>{' '}
                    <code className="font-mono text-xs">metric</code>,{' '}
                    <code className="font-mono text-xs">value</code>,{' '}
                    <code className="font-mono text-xs">rating</code>,{' '}
                    <code className="font-mono text-xs">page</code>.
                  </li>
                  <li>
                    <strong className="text-on-surface">Purpose:</strong> public performance
                    transparency (see /vitals).
                  </li>
                  <li>
                    <strong className="text-on-surface">Retention:</strong> aggregated in Plausible.
                  </li>
                  <li>
                    <strong className="text-on-surface">Endpoint:</strong> Plausible event API.
                  </li>
                  <li>
                    <strong className="text-on-surface">DNT/GPC:</strong> suppressed when enabled.
                  </li>
                </ul>
              </div>
            </div>
          </Section>

          <Section title="Your rights">
            <p>
              Under GDPR you have the right to access, rectify, and erase personal data held about
              you. Because we store no personal data, there is nothing to access, rectify, or erase.
              If you have questions, reach us at{' '}
              <a href="mailto:privacy@usewraith.xyz" className="text-primary hover:underline">
                privacy@usewraith.xyz
              </a>
              .
            </p>
          </Section>

          <Section title="Changes to this policy">
            <p>
              We may update this page when our data practices change. The date at the top of this
              page reflects the most recent revision.
            </p>
          </Section>

          <div className="border-t border-outline-variant pt-8">
            <Link
              to="/"
              className="font-heading text-[11px] font-semibold tracking-[1.5px] text-on-surface-variant transition-colors hover:text-on-surface"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
