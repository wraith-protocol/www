import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Footer from '../components/Footer';
import { track } from '../utils/track';

// ─── Types ────────────────────────────────────────────────────────────────────

type FormState =
  | 'idle'
  | 'submitting'
  | 'success'
  | 'error_invalid'
  | 'error_duplicate'
  | 'error_generic';

// ─── Constants ────────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@][^@]*\.[^\s@]+$/;

// ─── Component ────────────────────────────────────────────────────────────────

export default function Newsletter() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [formState, setFormState] = useState<FormState>('idle');
  // Exactly-once guard: prevents duplicate submissions (and therefore duplicate
  // conversion telemetry) from rapid repeat clicks on the submit button.
  const submittedRef = useRef(false);

  const errorMessage = (): string | null => {
    switch (formState) {
      case 'error_invalid':
        return t('newsletter.errorInvalidEmail');
      case 'error_duplicate':
        return t('newsletter.errorAlreadySubscribed');
      case 'error_generic':
        return t('newsletter.errorGeneric');
      default:
        return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Exactly-once: ignore repeat submits while one is already in flight or done.
    if (submittedRef.current) return;

    const trimmed = email.trim().toLowerCase();

    if (!trimmed || !EMAIL_RE.test(trimmed)) {
      setFormState('error_invalid');
      return;
    }

    setFormState('submitting');

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });

      // 201 = subscription accepted by the backend and a double opt-in
      // confirmation email has been queued by Buttondown. This is the successful
      // submission conversion. (The actual email-confirmation step is handled by
      // Buttondown's email flow, which is outside this SPA — see newsletter_confirm.)
      if (res.status === 201) {
        submittedRef.current = true;
        track('newsletter_submit', { source: 'newsletter-page' });
        setFormState('success');
        return;
      }

      if (res.status === 409) {
        setFormState('error_duplicate');
        return;
      }

      if (res.status === 422) {
        setFormState('error_invalid');
        return;
      }

      setFormState('error_generic');
    } catch {
      setFormState('error_generic');
    }
  };

  const isSubmitting = formState === 'submitting';
  const errMsg = errorMessage();

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
        <Link
          to="/"
          className="font-body text-[13px] text-outline transition-colors hover:text-on-surface"
        >
          Back home
        </Link>
      </header>

      <main className="mx-auto max-w-[720px] px-6 py-16 md:px-12" id="main-content" tabIndex={-1}>
        <div className="flex flex-col gap-12">
          {/* page header */}
          <div className="flex flex-col gap-4 border-b border-outline-variant pb-10">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
              {t('newsletter.eyebrow')}
            </span>
            <h1 className="font-heading text-[36px] font-bold tracking-[-1.5px] text-on-surface sm:text-[48px]">
              {t('newsletter.heading')}
            </h1>
            <p className="max-w-[540px] font-body text-[15px] leading-[1.7] text-on-surface-variant">
              {t('newsletter.description')}
            </p>
          </div>

          {/* sign-up form or success state */}
          {formState === 'success' ? (
            <div
              role="status"
              aria-live="polite"
              className="flex flex-col gap-4 border border-outline-variant bg-surface-container px-6 py-8"
            >
              <span
                className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-[#22c55e]"
                aria-hidden="true"
              >
                ✓ CONFIRMED
              </span>
              <h2 className="font-heading text-[22px] font-bold tracking-[-0.5px] text-on-surface">
                {t('newsletter.successHeading')}
              </h2>
              <p className="font-body text-[14px] leading-[1.7] text-on-surface-variant">
                {t('newsletter.successBody')}
              </p>
            </div>
          ) : (
            <section aria-label={t('newsletter.heading')}>
              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="newsletter-email"
                    className="font-mono text-[10px] font-semibold uppercase tracking-[1.5px] text-outline"
                  >
                    {t('newsletter.labelEmail')}
                  </label>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <input
                      id="newsletter-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (formState !== 'idle' && formState !== 'submitting') {
                          setFormState('idle');
                        }
                      }}
                      placeholder={t('newsletter.placeholder')}
                      disabled={isSubmitting}
                      aria-describedby={errMsg ? 'newsletter-error' : 'newsletter-hint'}
                      aria-invalid={errMsg ? 'true' : undefined}
                      className="w-full border border-outline-variant bg-surface-container px-4 py-3 font-body text-[14px] text-on-surface placeholder:text-outline focus:border-outline focus:outline-none disabled:opacity-60"
                    />
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="border border-outline-variant bg-surface-bright px-6 py-3 font-mono text-[11px] font-semibold uppercase tracking-[1.6px] text-on-surface transition-colors hover:border-outline disabled:cursor-wait disabled:opacity-60"
                    >
                      {isSubmitting ? t('newsletter.submitting') : t('newsletter.submit')}
                    </button>
                  </div>

                  {errMsg && (
                    <p
                      id="newsletter-error"
                      role="alert"
                      className="font-body text-[13px] text-[#ee7d77]"
                    >
                      {errMsg}
                    </p>
                  )}
                </div>

                <p
                  id="newsletter-hint"
                  className="max-w-[480px] font-body text-[12px] leading-[1.6] text-outline"
                >
                  {t('newsletter.privacyNote')}{' '}
                  <Link
                    to="/privacy"
                    className="text-on-surface-variant underline transition-colors hover:text-on-surface"
                  >
                    Privacy Policy
                  </Link>
                  .
                </p>
              </form>
            </section>
          )}

          {/* back link */}
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

      <Footer />
    </div>
  );
}
