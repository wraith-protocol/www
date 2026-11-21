import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { trackOutbound } from '../utils/track';
import { canonicalForRoute } from '../utils/seo';

const CANONICAL = canonicalForRoute('terms');
const LAST_UPDATED = '2026-10-17';

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

export default function Terms() {
  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <Helmet>
        <title>Terms of Use — Wraith Protocol</title>
        <meta
          name="description"
          content="Terms for using usewraith.xyz and the open-source Wraith Protocol software it describes."
        />
        <link rel="canonical" href={CANONICAL} />
        <meta property="og:title" content="Terms of Use — Wraith Protocol" />
        <meta property="og:url" content={CANONICAL} />
      </Helmet>

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
              Terms of Use
            </h1>
            <p className="font-body text-[14px] text-outline">
              usewraith.xyz · Last updated {LAST_UPDATED}
            </p>
          </div>

          <p className="font-body text-[15px] leading-[1.7] text-on-surface-variant">
            These terms cover your use of usewraith.xyz. By using the site you accept them. If you
            do not, please do not use the site.
          </p>

          <Section title="Information only">
            <p>
              The site describes Wraith Protocol software and links to its documentation, demo, and
              source code. Nothing on it is financial, investment, legal, or tax advice.
            </p>
          </Section>

          <Section title="Open-source software">
            <p>
              The Wraith SDK, contracts, and this website are open source. Each repository&apos;s
              license governs your use of that code; the source of this site is published under the
              MIT License at{' '}
              <a
                href="https://github.com/wraith-protocol/www"
                target="_blank"
                rel="noopener noreferrer"
                onClick={trackOutbound('github')}
                className="text-primary hover:underline"
              >
                github.com/wraith-protocol/www
              </a>
              .
            </p>
          </Section>

          <Section title="No warranty">
            <p>
              The site and the software it describes are provided &quot;as is&quot;, without
              warranty of any kind. You are responsible for how you use them, including any
              transaction you sign and the keys you keep.
            </p>
          </Section>

          <Section title="Third-party services">
            <p>
              The site links to services that Wraith Protocol does not operate, such as GitHub, npm,
              and Stellar ecosystem projects. Their own terms and policies apply when you use them.
            </p>
          </Section>

          <Section title="Privacy">
            <p>
              How the site handles analytics and data is described in the{' '}
              <Link to="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </Section>

          <Section title="Changes">
            <p>
              These terms may change. The date at the top of this page shows the latest revision.
            </p>
          </Section>

          <Section title="Contact">
            <p>
              Questions about these terms can be raised in{' '}
              <a
                href="https://github.com/wraith-protocol/www/issues"
                target="_blank"
                rel="noopener noreferrer"
                onClick={trackOutbound('github')}
                className="text-primary hover:underline"
              >
                the website repository
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
