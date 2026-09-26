import { Link } from 'react-router-dom';
import CostCalculator from '../components/CostCalculator';
import Footer from '../components/Footer';

type Persona = {
  id: string;
  title: string;
  description: string;
  painPoints: string[];
  solution: string;
  docLink: string;
  docLabel: string;
  icon: string;
};

const personas: Persona[] = [
  {
    id: 'open-source',
    title: 'Open-source Maintainer',
    icon: '⚙️',
    description:
      'Receiving donations for open-source projects while protecting donor anonymity and avoiding public exposure of contributor relationships.',
    painPoints: [
      'Donors want anonymity to avoid targeted harassment or surveillance',
      'Public transaction history exposes all supporter relationships',
      'Self-hosting privacy solutions is complex and risky',
    ],
    solution:
      'Wraith enables receivers to collect donations through unlinkable payment flows. Each donation goes to a unique address that cannot be traced back to previous donations. Contributors stay anonymous, and Wraith handles the cryptography—no infrastructure required.',
    docLink: 'https://docs.usewraith.xyz',
    docLabel: 'Docs',
  },
  {
    id: 'dao-payroll',
    title: 'DAO Paying Contributors',
    icon: '🏛️',
    description:
      'Distributing private payroll to DAO contributors without exposing salary information or organizational structure on-chain.',
    painPoints: [
      'Public payroll reveals who works for the DAO and their roles',
      'Salary amounts are visible to competitors and bad actors',
      'Contributors prefer payment privacy for security',
    ],
    solution:
      'Wraith lets DAOs send private payroll where each contributor receives funds through an unlinkable address. No transaction history reveals who received what, and the organizational structure stays private. Perfect for sensitive or strategic hires.',
    docLink: 'https://docs.usewraith.xyz/sdk/overview',
    docLabel: 'SDK Docs',
  },
  {
    id: 'saas-payments',
    title: 'SaaS Platform',
    icon: '💳',
    description:
      'Processing customer payments without exposing your customer list or buyer relationships to competitors and market analysts.',
    painPoints: [
      'Customer lists are visible on-chain, exposing business relationships',
      'Competitors analyze payment flows to understand your business',
      'Customers demand payment privacy',
    ],
    solution:
      'Wraith enables SaaS platforms to accept payments where customer transactions cannot be linked together. Each customer gets a unique payment flow, and your customer list stays private. Scale without exposing your growth.',
    docLink: 'https://docs.usewraith.xyz',
    docLabel: 'Docs',
  },
  {
    id: 'activist-support',
    title: 'Activist & Journalist',
    icon: '✊',
    description:
      'Receiving funding from supporters without creating a traceable record that could endanger supporters or compromise operational security.',
    painPoints: [
      'Public supporters lists put people at risk of persecution or harassment',
      'Governments can track funding sources and target supporters',
      'Traditional funding creates permanent records',
    ],
    solution:
      'Wraith provides journalists and activists with a way to receive funding safely. Supporters send funds through unlinkable payments that cannot be traced back to them. Each donation is independently anonymous—no permanent record linking donors together.',
    docLink: 'https://demo.usewraith.xyz',
    docLabel: 'Demo',
  },
  {
    id: 'remittances',
    title: 'Family & Remittances',
    icon: '👨‍👩‍👧‍👦',
    description:
      'Sending money to family members in different countries while keeping financial flows private from local authorities or bad actors.',
    painPoints: [
      'Remittance flows are visible and could attract theft or extortion',
      'Authoritarian regimes track outbound funds from diaspora',
      'Expensive traditional remittance services expose transaction details',
    ],
    solution:
      'Wraith lets families send remittances through unlinkable payments. Each transfer goes to a unique address that cannot be linked to previous transfers. Nobody can track how much money is flowing or when, keeping families safe.',
    docLink: 'https://docs.usewraith.xyz',
    docLabel: 'Docs',
  },
  {
    id: 'b2b-invoicing',
    title: 'B2B Supply Chain',
    icon: '📦',
    description:
      'Managing supplier payments without exposing your supplier relationships, which are a competitive advantage and valuable business intelligence.',
    painPoints: [
      'Supplier lists are visible on-chain, revealing your supply chain',
      'Payment patterns expose production volumes and business cycles',
      'Competitors use this intel to out-bid you or target your suppliers',
    ],
    solution:
      'Wraith enables B2B invoicing where supplier payments cannot be linked together. Each invoice payment goes through an unlinkable flow, keeping your supplier relationships and payment patterns private. Protect your competitive edge.',
    docLink: 'https://docs.usewraith.xyz/sdk/overview',
    docLabel: 'SDK Docs',
  },
];

export default function UseCases() {
  return (
    <div className="bg-surface text-on-surface">
      <a href="#main-content" className="skip-link">
        Skip to content
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
            <h1 className="font-heading text-5xl font-bold tracking-tight">Use Cases</h1>
            <p className="mt-6 text-lg text-outline">
              Different audiences need different privacy solutions. Explore how Wraith powers
              payment privacy for diverse use cases.
            </p>
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
                    <h2 className="font-heading text-2xl font-bold">{persona.title}</h2>
                  </div>

                  <p className="text-sm text-outline">{persona.description}</p>

                  <div>
                    <h3 className="mb-3 font-heading text-sm font-semibold uppercase tracking-widest text-on-surface-variant">
                      Pain Points
                    </h3>
                    <ul className="space-y-2">
                      {persona.painPoints.map((point, idx) => (
                        <li key={idx} className="flex gap-3 text-sm text-outline">
                          <span className="mt-1 flex-shrink-0 text-primary">•</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="border-t border-outline-variant-30 pt-6">
                    <h3 className="mb-3 font-heading text-sm font-semibold uppercase tracking-widest text-on-surface-variant">
                      Wraith Solution
                    </h3>
                    <p className="text-sm text-outline">{persona.solution}</p>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <a
                      href={persona.docLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors duration-150 hover:text-primary-hover"
                    >
                      {persona.docLabel} →
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <CostCalculator />

        {/* CTA */}
        <section className="border-t border-outline-variant-30 px-12 py-24">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-heading text-4xl font-bold">Ready to add payment privacy?</h2>
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
                Documentation
              </a>
              <a
                href="https://demo.usewraith.xyz"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center justify-center border border-outline px-6 font-heading text-sm font-semibold uppercase tracking-wider transition-colors duration-150 hover:bg-surface-dim"
              >
                Try Demo
              </a>
              <a
                href="https://console.usewraith.xyz"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center justify-center border border-outline px-6 font-heading text-sm font-semibold uppercase tracking-wider transition-colors duration-150 hover:bg-surface-dim"
              >
                Launch Console
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
