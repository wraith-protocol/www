import { Link } from 'react-router-dom';
import PrivacyComparison from '../components/PrivacyComparison';
import { trackOutbound } from '../utils/track';

const ANALYTICS_ENDPOINT = 'https://plausible.io/api/event';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="flex flex-col gap-3">
    <h2 className="font-heading text-[18px] font-semibold tracking-[-0.4px] text-on-surface">
      {title}
    </h2>
    <div className="flex flex-col gap-2 font-body text-[14px] leading-[1.7] text-on-surface-variant">
      {children}
    </div>
  </section>
);

function EventRow({
  name,
  payload,
  trigger,
  status = 'Emitted by this site',
}: {
  name: string;
  payload: string;
  trigger: string;
  status?: string;
}) {
  return (
    <div className="border-l border-outline-variant pl-4">
      <p className="font-mono text-[12px] font-semibold text-on-surface">{name}</p>
      <ul className="ml-4 list-disc space-y-1">
        <li>
          <strong className="text-on-surface">Trigger:</strong> {trigger}
        </li>
        <li>
          <strong className="text-on-surface">Payload:</strong>{' '}
          <code className="font-mono text-xs">{payload}</code>
        </li>
        <li>
          <strong className="text-on-surface">Retention:</strong> aggregate event data retained by
          Plausible under the project&apos;s analytics retention configuration.
        </li>
        <li>
          <strong className="text-on-surface">Endpoint:</strong>{' '}
          <code className="break-all font-mono text-xs">{ANALYTICS_ENDPOINT}</code>
        </li>
        <li>
          <strong className="text-on-surface">DNT/GPC:</strong> suppressed before the analytics
          script or event request is sent.
        </li>
        <li>
          <strong className="text-on-surface">Status:</strong> {status}.
        </li>
      </ul>
    </div>
  );
}

export default function Privacy() {
  return (
    <div className="min-h-screen bg-surface text-on-surface">
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
          <div className="flex flex-col gap-4 border-b border-outline-variant pb-10">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
              Legal
            </span>
            <h1 className="font-heading text-[36px] font-bold tracking-[-1.5px] text-on-surface sm:text-[48px]">
              Privacy Policy
            </h1>
            <p className="font-body text-[14px] text-outline">usewraith.xyz</p>
          </div>

          <p className="font-body text-[15px] leading-[1.7] text-on-surface-variant">
            Wraith Protocol is privacy-first. We collect only aggregate product and performance
            telemetry needed to understand the site, and we do not include wallet data, form
            contents, or other personally identifying values in analytics events.
          </p>

          <PrivacyComparison />

          <div className="rounded border border-outline-variant bg-surface-container p-4">
            <Link
              to="/threat-model"
              className="inline-flex items-center gap-2 font-heading text-[12px] font-semibold tracking-[1.5px] text-on-surface transition-colors hover:text-primary"
            >
              THREAT MODEL MATRIX →
            </Link>
          </div>

          <Section title="Analytics provider and endpoint">
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
              for aggregate page and event analytics. Custom events are delivered to exactly{' '}
              <code className="break-all font-mono text-xs text-primary">{ANALYTICS_ENDPOINT}</code>.
              No second analytics provider or tag manager is introduced by this instrumentation.
            </p>
          </Section>

          <Section title="DNT and Global Privacy Control">
            <p>
              Do-Not-Track and Global Privacy Control are checked before analytics loads. If either
              signal opts the visitor out, the Plausible script is not requested and named analytics
              events and Web Vitals do not make requests to the analytics endpoint.
            </p>
          </Section>

          <Section title="What we do not send">
            <ul className="ml-4 list-disc space-y-1">
              <li>No wallet or stealth addresses.</li>
              <li>No transaction hashes or transaction amounts.</li>
              <li>No newsletter email address or form contents.</li>
              <li>No persistent cross-site identifier or fingerprint.</li>
              <li>No full outbound destination URL in custom event payloads.</li>
            </ul>
          </Section>

          <Section title="Analytics event schema">
            <p>
              The following names and payloads are defined by the typed analytics helper. Events
              marked reserved have no corresponding UI in the current repository and therefore are
              intentionally not emitted until that product surface exists.
            </p>

            <div className="flex flex-col gap-5">
              <EventRow
                name="cta_click"
                payload="source: string"
                trigger="A visitor activates an instrumented primary call-to-action."
              />
              <EventRow
                name="newsletter_submit"
                payload="source: string"
                trigger="The newsletter backend accepts a valid subscription request with HTTP 201."
              />
              <EventRow
                name="newsletter_confirm"
                payload="source: string"
                trigger="A double-opt-in confirmation event, if a site-owned confirmation route is added."
                status="Reserved; the current confirmation step happens in Buttondown email and this SPA has no confirmation route"
              />
              <EventRow
                name="blog_post_read"
                payload="slug: string; locale?: string"
                trigger="A reader reaches at least 80% scroll depth on a blog article, once per article view."
              />
              <EventRow
                name="calculator_share"
                payload="source?: string"
                trigger="A calculator result is shared."
                status="Reserved; no calculator share UI exists in the current repository"
              />
              <EventRow
                name="chain_matrix_sort"
                payload="column: string; direction: 'asc' | 'desc'"
                trigger="A sortable chain comparison matrix changes sort order."
                status="Reserved; no sortable chain matrix UI exists in the current repository"
              />
              <EventRow
                name="outbound_click"
                payload="category: github | docs | social | explorer | ecosystem | partner | other"
                trigger="A visitor activates an instrumented external link."
              />
              <EventRow
                name="Web Vital"
                payload="metric, value, rating, page"
                trigger="The browser records an LCP, INP, or CLS performance measurement."
              />
            </div>
          </Section>

          <Section title="Your rights">
            <p>
              If you have privacy questions, contact{' '}
              <a href="mailto:privacy@usewraith.xyz" className="text-primary hover:underline">
                privacy@usewraith.xyz
              </a>
              .
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
