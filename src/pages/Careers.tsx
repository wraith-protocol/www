import { useState, type FormEvent } from 'react';
import { Helmet } from 'react-helmet-async';
import { trackEvent } from '../analytics';

type SubmitStatus = 'idle' | 'loading' | 'success' | 'error';

const values = [
  {
    title: 'Privacy is the default, not a feature',
    body: 'We build stealth-address infrastructure because we believe unlinkable payments should be the baseline, not a premium add-on. The same principle shows up in how we run this site: no cookies, no trackers, no dark patterns.',
  },
  {
    title: 'Small team, high ownership',
    body: "There's no layer between you and the outcome. Contributors scope their own work, ship it, and own the result — from cryptography to copy.",
  },
  {
    title: 'Open by default',
    body: 'The protocol, the SDK, and this website are all open source. Issues, roadmaps, and decisions happen in the open on GitHub, not behind closed doors.',
  },
  {
    title: 'Async-first, craft-obsessed',
    body: "We're distributed and async. What we ask for in return is care: sharp, considered work over fast, sloppy work. Every page here ships at Lighthouse 95+ and WCAG 2.1 AA.",
  },
];

function CareersSignupForm() {
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState(''); // honeypot — real users never fill this in
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (company) {
      // Silently discard likely-bot submissions without revealing the honeypot.
      setStatus('success');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, tag: 'careers' }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || 'Something went wrong. Please try again.');
      }

      trackEvent('Careers Stay In Touch');
      setStatus('success');
      setEmail('');
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong.');
    }
  };

  if (status === 'success') {
    return (
      <div className="border border-tertiary bg-tertiary-10 px-5 py-4">
        <p className="font-body text-[14px] leading-[1.6] text-on-surface">
          You&apos;re on the list. We&apos;ll reach out here first when a role opens up.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <div className="flex-1">
        <label htmlFor="careers-email" className="sr-only">
          Email address
        </label>
        <input
          id="careers-email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="w-full border border-outline-variant bg-surface-container px-4 py-3 font-body text-[14px] text-on-surface placeholder:text-outline focus:border-on-surface focus:outline-none"
        />
        {/* Honeypot field — hidden from sighted users, left blank by real people */}
        <input
          type="text"
          name="company"
          value={company}
          onChange={(event) => setCompany(event.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="absolute h-0 w-0 opacity-0"
        />
        {status === 'error' && (
          <p role="alert" className="mt-2 font-body text-[13px] text-error">
            {errorMessage}
          </p>
        )}
      </div>
      <button
        type="submit"
        disabled={status === 'loading'}
        className="flex h-12 shrink-0 items-center justify-center bg-primary px-7 font-heading text-[13px] font-semibold uppercase tracking-[1.5px] text-surface transition-[filter] duration-150 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === 'loading' ? 'Submitting…' : 'Stay in touch'}
      </button>
    </form>
  );
}

export default function Careers() {
  return (
    <>
      <Helmet>
        <title>Careers – Wraith Protocol</title>
        <meta
          name="description"
          content="Wraith Protocol isn't hiring full-time roles right now, but we run paid open-source bounties and want to hear from prospective contributors."
        />
        <meta property="og:title" content="Careers – Wraith Protocol" />
        <meta
          property="og:description"
          content="Not hiring full-time right now — but we run paid open-source bounties and want to hear from you."
        />
        <meta property="og:url" content="https://usewraith.xyz/careers" />
        <meta property="og:type" content="website" />
      </Helmet>

      <section className="border-b border-outline-variant-30 px-6 py-24 md:px-12">
        <div className="mx-auto flex max-w-336 flex-col gap-6">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
            Careers
          </span>
          <h1 className="font-heading text-[36px] font-bold leading-[1.05] tracking-[-1.5px] text-on-surface sm:text-[48px] md:text-[56px]">
            We&apos;re not hiring right now — but we still want to hear from you.
          </h1>
          <p className="max-w-2xl font-body text-[17px] leading-[1.6] text-on-surface-variant">
            Wraith Protocol is a small, remote, open-source team. We don&apos;t have full-time
            openings today, but we regularly fund contract work through the Stellar Wave program and
            always want to know who&apos;s out there for when that changes.
          </p>
        </div>
      </section>

      <section className="border-b border-outline-variant-30 px-6 py-24 md:px-12">
        <div className="mx-auto flex max-w-336 flex-col gap-10">
          <div className="flex flex-col gap-3">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
              Paid contract work
            </span>
            <h2 className="font-heading text-[28px] font-bold tracking-[-1.2px] text-on-surface sm:text-[40px]">
              Contribute now, get paid through Stellar Wave
            </h2>
            <p className="max-w-2xl font-body text-base leading-[1.6] text-on-surface-variant">
              Every open issue on our GitHub tagged{' '}
              <code className="font-mono text-[13px] text-primary">help wanted</code> is scoped,
              sized, and eligible for the Stellar Wave / Drips reward pool. No interview process —
              apply on the issue, get assigned, ship it, get paid.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <a
              href="https://github.com/wraith-protocol/www/issues?q=is%3Aopen+is%3Aissue+label%3A%22help+wanted%22"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent('Careers Open Issues CTA')}
              className="group flex flex-col gap-4 border border-outline-variant bg-surface-container p-7 transition-colors duration-150 hover:bg-surface-bright"
            >
              <span className="font-mono text-[11px] font-semibold tracking-[1.5px] text-outline">
                01
              </span>
              <h3 className="font-heading text-lg font-semibold tracking-[-0.3px] text-on-surface group-hover:text-primary">
                Browse open bounties
              </h3>
              <p className="font-body text-[13px] leading-[1.65] text-on-surface-variant">
                Every issue lists context, scope, tier, and acceptance criteria up front.
              </p>
              <span className="mt-auto font-mono text-[11px] text-outline transition-colors duration-150 group-hover:text-primary">
                View on GitHub →
              </span>
            </a>

            <div className="flex flex-col gap-4 border border-outline-variant bg-surface-container p-7">
              <span className="font-mono text-[11px] font-semibold tracking-[1.5px] text-outline">
                02
              </span>
              <h3 className="font-heading text-lg font-semibold tracking-[-0.3px] text-on-surface">
                Apply on the issue
              </h3>
              <p className="font-body text-[13px] leading-[1.65] text-on-surface-variant">
                Comment with a short note on why you want it. Maintainers assign based on fit, not
                pedigree.
              </p>
            </div>

            <div className="flex flex-col gap-4 border border-outline-variant bg-surface-container p-7">
              <span className="font-mono text-[11px] font-semibold tracking-[1.5px] text-outline">
                03
              </span>
              <h3 className="font-heading text-lg font-semibold tracking-[-0.3px] text-on-surface">
                Ship it, get reviewed, get paid
              </h3>
              <p className="font-body text-[13px] leading-[1.65] text-on-surface-variant">
                Open a PR linked to the issue. Once it&apos;s merged, Points convert to a share of
                the Stellar Wave reward pool via Drips.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-outline-variant-30 px-6 py-24 md:px-12">
        <div className="mx-auto flex max-w-336 flex-col gap-10">
          <div className="flex flex-col gap-3">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
              Values &amp; working style
            </span>
            <h2 className="font-heading text-[28px] font-bold tracking-[-1.2px] text-on-surface sm:text-[40px]">
              How we work
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {values.map((value) => (
              <div
                key={value.title}
                className="flex flex-col gap-3 border border-outline-variant bg-surface-container p-7"
              >
                <h3 className="font-heading text-lg font-semibold tracking-[-0.3px] text-on-surface">
                  {value.title}
                </h3>
                <p className="font-body text-[13px] leading-[1.65] text-on-surface-variant">
                  {value.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-24 md:px-12">
        <div className="mx-auto flex max-w-336 flex-col gap-6">
          <div className="flex flex-col gap-3">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
              Stay in touch
            </span>
            <h2 className="font-heading text-[28px] font-bold tracking-[-1.2px] text-on-surface sm:text-[40px]">
              First to know when a full-time role opens
            </h2>
            <p className="max-w-2xl font-body text-base leading-[1.6] text-on-surface-variant">
              Leave your email and we&apos;ll reach out directly — no spam, no third-party trackers,
              unsubscribe anytime.
            </p>
          </div>

          <div className="max-w-xl">
            <CareersSignupForm />
          </div>
        </div>
      </section>
    </>
  );
}
