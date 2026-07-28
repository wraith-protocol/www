import { useState, type FormEvent } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { trackEvent } from '../analytics';

type SubmitStatus = 'idle' | 'loading' | 'success' | 'error';

function CareersSignupForm() {
  const { t } = useTranslation();
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
        throw new Error(payload?.error || t('careers.signup.errorDefault'));
      }

      trackEvent('Careers Stay In Touch');
      setStatus('success');
      setEmail('');
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : t('careers.signup.errorDefault'));
    }
  };

  if (status === 'success') {
    return (
      <div className="border border-tertiary bg-tertiary-10 px-5 py-4">
        <p className="font-body text-[14px] leading-[1.6] text-on-surface">
          {t('careers.signup.success')}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <div className="flex-1">
        <label htmlFor="careers-email" className="sr-only">
          {t('careers.signup.emailLabel')}
        </label>
        <input
          id="careers-email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={t('careers.signup.emailPlaceholder')}
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
        {status === 'loading' ? t('careers.signup.submitting') : t('careers.signup.stayInTouch')}
      </button>
    </form>
  );
}

export default function Careers() {
  const { t } = useTranslation();

  const values = [
    {
      title: t('careers.workingStyle.values.v1Title'),
      body: t('careers.workingStyle.values.v1Body'),
    },
    {
      title: t('careers.workingStyle.values.v2Title'),
      body: t('careers.workingStyle.values.v2Body'),
    },
    {
      title: t('careers.workingStyle.values.v3Title'),
      body: t('careers.workingStyle.values.v3Body'),
    },
    {
      title: t('careers.workingStyle.values.v4Title'),
      body: t('careers.workingStyle.values.v4Body'),
    },
  ];

  return (
    <>
      <Helmet>
        <title>{t('careers.meta.title')}</title>
        <meta name="description" content={t('careers.meta.description')} />
        <meta property="og:title" content={t('careers.meta.title')} />
        <meta property="og:description" content={t('careers.meta.description')} />
        <meta property="og:url" content="https://usewraith.xyz/careers" />
        <meta property="og:type" content="website" />
      </Helmet>

      <section className="border-b border-outline-variant-30 px-6 py-24 md:px-12">
        <div className="mx-auto flex max-w-336 flex-col gap-6">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
            {t('careers.hero.eyebrow')}
          </span>
          <h1 className="font-heading text-[36px] font-bold leading-[1.05] tracking-[-1.5px] text-on-surface sm:text-[48px] md:text-[56px]">
            {t('careers.hero.title')}
          </h1>
          <p className="max-w-2xl font-body text-[17px] leading-[1.6] text-on-surface-variant">
            {t('careers.hero.description')}
          </p>
        </div>
      </section>

      <section className="border-b border-outline-variant-30 px-6 py-24 md:px-12">
        <div className="mx-auto flex max-w-336 flex-col gap-10">
          <div className="flex flex-col gap-3">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
              {t('careers.bounties.eyebrow')}
            </span>
            <h2 className="font-heading text-[28px] font-bold tracking-[-1.2px] text-on-surface sm:text-[40px]">
              {t('careers.bounties.title')}
            </h2>
            <p className="max-w-2xl font-body text-base leading-[1.6] text-on-surface-variant">
              {t('careers.bounties.description')}
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
                {t('careers.bounties.step1Title')}
              </h3>
              <p className="font-body text-[13px] leading-[1.65] text-on-surface-variant">
                {t('careers.bounties.step1Body')}
              </p>
              <span className="mt-auto font-mono text-[11px] text-outline transition-colors duration-150 group-hover:text-primary">
                {t('careers.bounties.step1Link')}
              </span>
            </a>

            <div className="flex flex-col gap-4 border border-outline-variant bg-surface-container p-7">
              <span className="font-mono text-[11px] font-semibold tracking-[1.5px] text-outline">
                02
              </span>
              <h3 className="font-heading text-lg font-semibold tracking-[-0.3px] text-on-surface">
                {t('careers.bounties.step2Title')}
              </h3>
              <p className="font-body text-[13px] leading-[1.65] text-on-surface-variant">
                {t('careers.bounties.step2Body')}
              </p>
            </div>

            <div className="flex flex-col gap-4 border border-outline-variant bg-surface-container p-7">
              <span className="font-mono text-[11px] font-semibold tracking-[1.5px] text-outline">
                03
              </span>
              <h3 className="font-heading text-lg font-semibold tracking-[-0.3px] text-on-surface">
                {t('careers.bounties.step3Title')}
              </h3>
              <p className="font-body text-[13px] leading-[1.65] text-on-surface-variant">
                {t('careers.bounties.step3Body')}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-outline-variant-30 px-6 py-24 md:px-12">
        <div className="mx-auto flex max-w-336 flex-col gap-10">
          <div className="flex flex-col gap-3">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
              {t('careers.workingStyle.eyebrow')}
            </span>
            <h2 className="font-heading text-[28px] font-bold tracking-[-1.2px] text-on-surface sm:text-[40px]">
              {t('careers.workingStyle.title')}
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
              {t('careers.stayInTouchSection.eyebrow')}
            </span>
            <h2 className="font-heading text-[28px] font-bold tracking-[-1.2px] text-on-surface sm:text-[40px]">
              {t('careers.stayInTouchSection.title')}
            </h2>
            <p className="max-w-2xl font-body text-base leading-[1.6] text-on-surface-variant">
              {t('careers.stayInTouchSection.description')}
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
