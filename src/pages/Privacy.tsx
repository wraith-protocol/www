import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();

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
              {t('privacyPage.title')}
            </h1>
            <p className="font-body text-[14px] text-outline">{t('privacyPage.meta')}</p>
          </div>

          {/* intro */}
          <p className="font-body text-[15px] leading-[1.7] text-on-surface-variant">
            {t('privacyPage.intro')}
          </p>

          {/* interactive comparison */}
          <PrivacyComparison />

          <Section title={t('privacyPage.sections.whatWeCollect')}>
            <p>
              We use{' '}
              <a
                href="https://plausible.io"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Plausible Analytics
              </a>{' '}
              — an open-source, EU-hosted analytics platform — to understand how visitors interact
              with this site.
            </p>
            <p>
              Plausible collects aggregate data per page visit including Page URL, browser info, OS,
              region, device type, scroll depth, and goal events.
            </p>
          </Section>

          <Section title={t('privacyPage.sections.whatWeDoNotCollect')}>
            <ul className="ml-4 list-disc space-y-1">
              <li>{t('privacyPage.listItems.noCookies')}</li>
              <li>{t('privacyPage.listItems.noIdentifiers')}</li>
              <li>{t('privacyPage.listItems.noTracking')}</li>
              <li>{t('privacyPage.listItems.noIp')}</li>
              <li>{t('privacyPage.listItems.noPersonal')}</li>
            </ul>
            <p>
              Because Plausible is cookieless, no consent banner is required under GDPR, PECR, or
              ePrivacy Directive. See Plausible&apos;s own{' '}
              <a
                href="https://plausible.io/data-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                data policy
              </a>{' '}
              for the full breakdown.
            </p>
          </Section>

          <Section title={t('privacyPage.sections.whyPlausible')}>
            <p>{t('privacyPage.listItems.whyPlausibleSummary')}</p>
          </Section>

          <Section title={t('privacyPage.sections.thirdParty')}>
            <p>
              Beyond Plausible, this site loads fonts from{' '}
              <a
                href="https://fonts.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Google Fonts
              </a>
              . Google Fonts requests include your IP address; you can block them with a content
              blocker if you prefer. No other third-party scripts are loaded.
            </p>
          </Section>

          <Section title={t('privacyPage.sections.yourRights')}>
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

          <Section title={t('privacyPage.sections.changes')}>
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
              {t('privacyPage.backToHome')}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
