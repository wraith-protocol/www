import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';

type FaqEntry = {
  id: string;
  question: string;
  answer: string;
};

type FaqSection = {
  id: string;
  title: string;
  entries: FaqEntry[];
};

const faqSections: FaqSection[] = [
  {
    id: 'about-wraith',
    title: 'About Wraith',
    entries: [
      {
        id: 'what-is-wraith',
        question: 'What is Wraith?',
        answer:
          'Wraith is a privacy toolkit for payments. It gives apps a way to send payments that are unlinkable by default, so recipients receive funds without exposing a permanent public address that can be traced back to the sender.',
      },
      {
        id: 'why-wraith',
        question: 'Why does Wraith exist?',
        answer:
          'Most payment systems make privacy an afterthought. Wraith was built for teams that want to ship payments with strong receiver privacy without forcing users to run custom infrastructure or understand cryptography.',
      },
      {
        id: 'who-is-wraith-for',
        question: 'Who is Wraith for?',
        answer:
          'Wraith is aimed at wallet teams, exchanges, payments apps, and on-chain products that want private transfers without sacrificing developer ergonomics. It is especially useful in apps that handle recurring payments or sensitive user flows.',
      },
      {
        id: 'does-wraith-replace-my-wallet',
        question: 'Does Wraith replace my wallet or app?',
        answer:
          'No. Wraith plugs into existing apps and wallets as a privacy layer. You can keep your current UX and add private payment flows where they matter most.',
      },
    ],
  },
  {
    id: 'privacy-mechanics',
    title: 'Privacy mechanics',
    entries: [
      {
        id: 'how-is-this-private',
        question: 'How is this private?',
        answer:
          'Wraith uses stealth-address style payment flows. Each transfer is routed to a fresh one-time address, so observers can see a payment happened without linking it to the recipient’s long-term identity or wallet.',
      },
      {
        id: 'what-do-observers-see',
        question: 'What do observers see?',
        answer:
          'Observers can see that a transaction occurred and which chain it was sent on, but they do not get a simple link between the sender and the recipient’s canonical address in the same way as a standard transfer.',
      },
      {
        id: 'what-is-stored',
        question: 'What is stored on-chain or in the service?',
        answer:
          'The system stores only the data required for the privacy flow to work. In practice, that means the privacy metadata needed to discover and claim payments, while the recipient’s long-term address remains unlinkable from the sender’s view.',
      },
      {
        id: 'is-it-anonymous',
        question: 'Is Wraith anonymous?',
        answer:
          'It is privacy-preserving rather than fully anonymous in every context. The level of privacy depends on the chain, the app’s implementation, and the amount of metadata available outside the protocol layer.',
      },
    ],
  },
  {
    id: 'stellar-specifics',
    title: 'Stellar specifics',
    entries: [
      {
        id: 'why-stellar',
        question: 'Why Stellar?',
        answer:
          'Stellar is a strong fit for this because it is lightweight, fast, and already optimized for payments. Its simple transaction model and memo support make it practical for stealth-style flows without adding unnecessary complexity.',
      },
      {
        id: 'what-is-different-on-stellar',
        question: 'What is different on Stellar?',
        answer:
          'On Stellar, Wraith supports memo-enabled stealth flows so payloads and recipient metadata can be carried in a way that is compatible with the network’s payment model while still keeping the recipient unlinkable at the protocol level.',
      },
      {
        id: 'why-not-use-only-ethereum',
        question: 'Why not just use Ethereum?',
        answer:
          'Ethereum is one important venue, but it is not the only one. Stellar gives teams a more payment-native environment with simpler developer workflows for certain use cases, especially where transaction speed and cost matter.',
      },
      {
        id: 'does-stellar-change-the-privacy-model',
        question: 'Does Stellar change the privacy model?',
        answer:
          'The privacy mechanics are the same, but the implementation details differ. Stellar’s transaction format and memo support influence how the metadata is encoded and discovered, not the core principle of recipient unlinkability.',
      },
    ],
  },
  {
    id: 'trust-and-custody',
    title: 'Trust and custody',
    entries: [
      {
        id: 'where-do-keys-live',
        question: 'Where do keys live?',
        answer:
          'Keys are generated and managed by the wallet or app using the Wraith SDK. In the standard flow, the user controls the keys needed to derive and claim funds, and the service does not become the custodian of the funds.',
      },
      {
        id: 'who-can-see-what',
        question: 'Who can see what?',
        answer:
          'The sender sees the transaction they created. The receiver sees the payments they can claim. The network and public observers can see the on-chain activity, but the privacy layer is designed to reduce the amount of linkable information exposed.',
      },
      {
        id: 'do-i-need-to-run-a-node',
        question: 'Do I need to run a node?',
        answer:
          'No. You do not need to run a node to use the SDK or test the privacy flows. The SDK and service layer let developers integrate without operating their own relay or scanning infrastructure.',
      },
      {
        id: 'is-this-a-custodial-service',
        question: 'Is this a custodial service?',
        answer:
          'No. Wraith is not a custody product. The privacy layer does not take control of user funds, and users retain control over the keys needed to claim payments.',
      },
    ],
  },
  {
    id: 'cost-and-fees',
    title: 'Cost and fees',
    entries: [
      {
        id: 'what-does-it-cost',
        question: 'What does it cost?',
        answer:
          'The cost is mostly the underlying chain fees plus any application-layer overhead. The privacy flow is designed to be practical, but the final cost depends on the chain and the way the app chooses to broadcast the transaction.',
      },
      {
        id: 'are-there-extra-fees',
        question: 'Are there extra fees for privacy?',
        answer:
          'There can be extra metadata or transaction size costs depending on the implementation, but Wraith aims to keep them minimal and predictable so teams can budget around normal payment costs.',
      },
      {
        id: 'is-it-cheaper-than-a-regular-transfer',
        question: 'Is it cheaper than a regular transfer?',
        answer:
          'Not always. Privacy-preserving flows can be slightly more expensive than a plain transfer because they require additional metadata or transaction complexity. The trade-off is that the privacy properties are preserved without a separate custody layer.',
      },
    ],
  },
  {
    id: 'regulatory-posture',
    title: 'Regulatory posture',
    entries: [
      {
        id: 'is-this-regulated',
        question: 'Is this regulated?',
        answer:
          'The product is designed as a privacy-preserving payment primitive rather than a mixer or laundering tool. Its regulatory posture depends on the jurisdiction, the app’s implementation, and the compliance controls added by the team deploying it.',
      },
      {
        id: 'is-this-a-mixer',
        question: 'Is this a mixer?',
        answer:
          'No. The goal is not to pool funds or obscure them through a centralized mixing service. Wraith is a protocol-style privacy mechanism for directed payments, with clear sender and receiver intent and no pooled custody.',
      },
      {
        id: 'does-this-mean-transaction-privacy-is-illegal',
        question: 'Does transaction privacy mean the product is illegal?',
        answer:
          'Not by itself. Privacy features are not inherently unlawful, but teams should evaluate compliance requirements carefully and make sure any deployment follows local law and the product’s intended use case.',
      },
    ],
  },
  {
    id: 'getting-started',
    title: 'Getting started',
    entries: [
      {
        id: 'how-do-i-start',
        question: 'How do I get started?',
        answer:
          'Start with the SDK docs and a testnet demo. The quickest path is to add the SDK to your app, generate a stealth-aware payment flow, and test the recipient discovery path on a supported chain.',
      },
      {
        id: 'do-i-need-a-backend',
        question: 'Do I need a backend?',
        answer:
          'Not always. Simple integrations can work without a custom backend, but more production-grade flows may need a small infrastructure layer for announcement discovery, indexing, or monitoring.',
      },
      {
        id: 'where-can-i-see-a-demo',
        question: 'Where can I see a demo?',
        answer:
          'The public demo is the fastest place to experience the flow. It shows how a sender creates a stealth payment and how a recipient discovers and claims it on supported networks.',
      },
      {
        id: 'where-do-i-go-for-support',
        question: 'Where do I go for support?',
        answer:
          'The docs, demo, and developer console are the best starting points. If you are integrating Wraith into a product, the SDK and support channels in the docs will help you move from prototype to production.',
      },
    ],
  },
];

const sectionLabelStyles =
  'font-mono text-[10px] font-semibold uppercase tracking-[1.8px] text-outline';

export default function Faq() {
  const [openEntryId, setOpenEntryId] = useState<string | null>(
    faqSections[0]?.entries[0]?.id ?? null,
  );

  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (!hash) return;

    const entryExists = faqSections.some((section) =>
      section.entries.some((entry) => entry.id === hash),
    );
    if (entryExists) {
      setOpenEntryId(hash);
    }
  }, []);

  const entryCount = useMemo(
    () => faqSections.reduce((count, section) => count + section.entries.length, 0),
    [],
  );

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <header className="flex items-center justify-between px-6 py-5 md:px-12">
        <Link to="/" className="flex items-center gap-3">
          <img src="/logo.png" alt="Wraith" className="h-6 opacity-90" />
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

      <main className="mx-auto flex max-w-[1120px] flex-col gap-12 px-6 py-10 md:px-12 md:py-16">
        <div className="flex flex-col gap-6 border-b border-outline-variant pb-10">
          <span className={sectionLabelStyles}>Support</span>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex max-w-[700px] flex-col gap-3">
              <h1 className="font-heading text-[34px] font-bold tracking-[-1.2px] text-on-surface sm:text-[48px]">
                FAQ
              </h1>
              <p className="font-body text-[15px] leading-[1.7] text-on-surface-variant">
                Short answers to the questions that come up most often in Discord, support, and
                product demos. Each answer is written to be easy to share and easy to find.
              </p>
            </div>
            <div className="flex flex-col gap-1 rounded-sm border border-outline-variant px-4 py-3">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
                Indexed answers
              </span>
              <span className="font-heading text-[18px] font-semibold text-on-surface">
                {entryCount} entries
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
          <nav
            className="flex flex-col gap-3 lg:sticky lg:top-6 lg:h-fit"
            aria-label="FAQ sections"
          >
            <span className={sectionLabelStyles}>Jump to</span>
            <div className="flex flex-col gap-2">
              {faqSections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="font-body text-[13px] text-on-surface-variant transition-colors hover:text-on-surface"
                >
                  {section.title}
                </a>
              ))}
            </div>
          </nav>

          <div className="flex flex-col gap-10">
            {faqSections.map((section) => (
              <section key={section.id} id={section.id} className="flex flex-col gap-4">
                <h2 className="font-heading text-[20px] font-semibold tracking-[-0.4px] text-on-surface">
                  {section.title}
                </h2>
                <div className="flex flex-col gap-3">
                  {section.entries.map((entry) => {
                    const isOpen = openEntryId === entry.id;
                    const toggleId = `faq-toggle-${entry.id}`;
                    const panelId = `faq-panel-${entry.id}`;
                    return (
                      <div
                        key={entry.id}
                        className="rounded-sm border border-outline-variant bg-surface-container"
                      >
                        <div className="px-4 py-4 sm:px-5">
                          <h3
                            id={entry.id}
                            className="font-heading text-[16px] font-semibold tracking-[-0.3px] text-on-surface"
                          >
                            <a
                              href={`#${entry.id}`}
                              className="mr-2 text-outline transition-colors hover:text-on-surface"
                              aria-label={`Direct link to ${entry.question}`}
                            >
                              #
                            </a>
                            <button
                              id={toggleId}
                              type="button"
                              aria-expanded={isOpen}
                              aria-controls={panelId}
                              aria-label={`${isOpen ? 'Hide' : 'Show'} answer for ${entry.question}`}
                              onClick={() => setOpenEntryId(isOpen ? null : entry.id)}
                              className="flex w-full items-center justify-between text-left"
                            >
                              <span className="block w-full text-left">{entry.question}</span>
                              <span className="font-mono text-[10px] font-semibold uppercase tracking-[1.6px] text-outline transition-colors hover:text-on-surface">
                                {isOpen ? 'Hide' : 'Show'}
                              </span>
                            </button>
                          </h3>
                        </div>
                        {isOpen && (
                          <div
                            id={panelId}
                            role="region"
                            aria-labelledby={toggleId}
                            className="border-t border-outline-variant px-4 py-4 sm:px-5"
                          >
                            <p className="font-body text-[14px] leading-[1.7] text-on-surface-variant">
                              {entry.answer}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
