import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Footer from '../components/Footer';

type Persona = {
  id: string;
  titleKey: string;
  descriptionKey: string;
  painPointKeys: string[];
  solutionKey: string;
  docLink: string;
  docLabelKey: string;
  icon: string;
};

const personas: Persona[] = [
  {
    id: 'open-source',
    titleKey: 'useCasesPage.personas.openSource.title',
    icon: '⚙️',
    descriptionKey: 'useCasesPage.personas.openSource.description',
    painPointKeys: [
      'useCasesPage.personas.openSource.painPoints.0',
      'useCasesPage.personas.openSource.painPoints.1',
      'useCasesPage.personas.openSource.painPoints.2',
    ],
    solutionKey: 'useCasesPage.personas.openSource.solution',
    docLink: 'https://docs.usewraith.xyz',
    docLabelKey: 'useCasesPage.ctaButtons.docs',
  },
  {
    id: 'dao-payroll',
    titleKey: 'useCasesPage.personas.daoPayroll.title',
    icon: '🏛️',
    descriptionKey: 'useCasesPage.personas.daoPayroll.description',
    painPointKeys: [
      'useCasesPage.personas.daoPayroll.painPoints.0',
      'useCasesPage.personas.daoPayroll.painPoints.1',
      'useCasesPage.personas.daoPayroll.painPoints.2',
    ],
    solutionKey: 'useCasesPage.personas.daoPayroll.solution',
    docLink: 'https://docs.usewraith.xyz/sdk/overview',
    docLabelKey: 'useCasesPage.ctaButtons.docs',
  },
  {
    id: 'saas-payments',
    titleKey: 'useCasesPage.personas.saasPayments.title',
    icon: '💳',
    descriptionKey: 'useCasesPage.personas.saasPayments.description',
    painPointKeys: [
      'useCasesPage.personas.saasPayments.painPoints.0',
      'useCasesPage.personas.saasPayments.painPoints.1',
      'useCasesPage.personas.saasPayments.painPoints.2',
    ],
    solutionKey: 'useCasesPage.personas.saasPayments.solution',
    docLink: 'https://docs.usewraith.xyz',
    docLabelKey: 'useCasesPage.ctaButtons.docs',
  },
  {
    id: 'activist-support',
    titleKey: 'useCasesPage.personas.activistSupport.title',
    icon: '✊',
    descriptionKey: 'useCasesPage.personas.activistSupport.description',
    painPointKeys: [
      'useCasesPage.personas.activistSupport.painPoints.0',
      'useCasesPage.personas.activistSupport.painPoints.1',
      'useCasesPage.personas.activistSupport.painPoints.2',
    ],
    solutionKey: 'useCasesPage.personas.activistSupport.solution',
    docLink: 'https://demo.usewraith.xyz',
    docLabelKey: 'useCasesPage.ctaButtons.tryDemo',
  },
  {
    id: 'remittances',
    titleKey: 'useCasesPage.personas.remittances.title',
    icon: '👨‍👩‍👧‍👦',
    descriptionKey: 'useCasesPage.personas.remittances.description',
    painPointKeys: [
      'useCasesPage.personas.remittances.painPoints.0',
      'useCasesPage.personas.remittances.painPoints.1',
      'useCasesPage.personas.remittances.painPoints.2',
    ],
    solutionKey: 'useCasesPage.personas.remittances.solution',
    docLink: 'https://docs.usewraith.xyz',
    docLabelKey: 'useCasesPage.ctaButtons.docs',
  },
  {
    id: 'b2b-invoicing',
    titleKey: 'useCasesPage.personas.b2bInvoicing.title',
    icon: '📦',
    descriptionKey: 'useCasesPage.personas.b2bInvoicing.description',
    painPointKeys: [
      'useCasesPage.personas.b2bInvoicing.painPoints.0',
      'useCasesPage.personas.b2bInvoicing.painPoints.1',
      'useCasesPage.personas.b2bInvoicing.painPoints.2',
    ],
    solutionKey: 'useCasesPage.personas.b2bInvoicing.solution',
    docLink: 'https://docs.usewraith.xyz/sdk/overview',
    docLabelKey: 'useCasesPage.ctaButtons.docs',
  },
];

export default function UseCases() {
  const { t } = useTranslation();

  return (
    <div className="bg-surface text-on-surface">
      <a href="#main-content" className="skip-link">
        {t('useCasesPage.skipToContent')}
      </a>

      <header className="fixed top-0 z-50 w-full border-b border-outline-variant-30 bg-surface/80 backdrop-blur-sm">
        <div className="mx-auto flex w-full items-center px-12 py-5">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="" width={30} height={24} className="h-6 opacity-90" />
            <span className="font-heading text-[15px] font-bold tracking-[2px] text-on-surface">
              WRAITH
            </span>
          </Link>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="pt-20">
        {/* Hero */}
        <section className="border-b border-outline-variant-30 px-12 py-24">
          <div className="mx-auto max-w-3xl">
            <h1 className="font-heading text-5xl font-bold tracking-tight">
              {t('useCasesPage.title')}
            </h1>
            <p className="mt-6 text-lg text-outline">{t('useCasesPage.description')}</p>
          </div>
        </section>

        {/* Personas Grid */}
        <section className="px-12 py-24">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-12 md:grid-cols-2">
              {personas.map((persona) => (
                <article
                  key={persona.id}
                  className="flex flex-col gap-6 rounded-lg border border-outline-variant-30 bg-surface-dim p-8 transition-colors duration-150 hover:border-primary"
                >
                  <div>
                    <div className="mb-3 text-3xl">{persona.icon}</div>
                    <h2 className="font-heading text-2xl font-bold">{t(persona.titleKey)}</h2>
                  </div>

                  <p className="text-sm text-outline">{t(persona.descriptionKey)}</p>

                  <div>
                    <h3 className="mb-3 font-heading text-sm font-semibold uppercase tracking-widest text-on-surface-variant">
                      {t('useCasesPage.painPoints')}
                    </h3>
                    <ul className="space-y-2">
                      {persona.painPointKeys.map((key, idx) => (
                        <li key={idx} className="flex gap-3 text-sm text-outline">
                          <span className="mt-1 flex-shrink-0 text-primary">•</span>
                          <span>{t(key)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="border-t border-outline-variant-30 pt-6">
                    <h3 className="mb-3 font-heading text-sm font-semibold uppercase tracking-widest text-on-surface-variant">
                      {t('useCasesPage.wraithSolution')}
                    </h3>
                    <p className="text-sm text-outline">{t(persona.solutionKey)}</p>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <a
                      href={persona.docLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors duration-150 hover:text-primary-hover"
                    >
                      {t(persona.docLabelKey)} →
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-outline-variant-30 px-12 py-24">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-heading text-4xl font-bold">{t('useCasesPage.readyToAdd')}</h2>
            <p className="mt-4 text-lg text-outline">
              Start with the docs, explore the demo, or launch the console.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <a
                href="https://docs.usewraith.xyz"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center justify-center bg-primary px-6 font-heading text-sm font-semibold uppercase tracking-wider text-surface transition-[filter] duration-150 hover:brightness-110"
              >
                {t('useCasesPage.ctaButtons.docs')}
              </a>
              <a
                href="https://demo.usewraith.xyz"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center justify-center border border-outline px-6 font-heading text-sm font-semibold uppercase tracking-wider transition-colors duration-150 hover:bg-surface-dim"
              >
                {t('useCasesPage.ctaButtons.tryDemo')}
              </a>
              <a
                href="https://console.usewraith.xyz"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center justify-center border border-outline px-6 font-heading text-sm font-semibold uppercase tracking-wider transition-colors duration-150 hover:bg-surface-dim"
              >
                {t('useCasesPage.ctaButtons.launchConsole')}
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
