import { Link } from 'react-router-dom';
import Footer from '../components/Footer';
import EcosystemPartners from '../components/EcosystemPartners';

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

export default function Stellar() {
  return (
    <div className="min-h-screen bg-surface text-on-surface">
      {/* Minimal nav */}
      <header className="flex items-center justify-between px-6 py-5 md:px-12 border-b border-outline-variant-30 bg-surface/85 backdrop-blur-sm fixed top-0 z-50 w-full">
        <Link to="/" className="flex items-center gap-3">
          <img src="/logo.png" alt="Wraith" className="h-6 opacity-90" />
          <span className="font-heading text-[13px] font-bold tracking-[2px] text-on-surface">
            WRAITH PROTOCOL
          </span>
        </Link>
        <Link
          to="/"
          className="font-heading text-[11px] font-semibold uppercase tracking-[1.5px] text-outline hover:text-on-surface transition-colors duration-150"
        >
          ← Back to Home
        </Link>
      </header>

      <main id="main-content" className="pt-24">
        {/* Page Hero */}
        <section className="border-b border-outline-variant-30 px-6 py-24 md:px-12">
          <div className="mx-auto max-w-[720px] flex flex-col gap-4">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-tertiary">
              Network Support
            </span>
            <h1 className="font-heading text-[36px] font-bold tracking-[-1.5px] text-on-surface sm:text-[48px] leading-tight">
              Stellar Integration
            </h1>
            <p className="font-body text-[16px] leading-[1.7] text-outline">
              Wraith brings native stealth address privacy to the Stellar network, enabling fast,
              low-cost, and recipient-unlinkable transactions.
            </p>
          </div>
        </section>

        {/* Detailed Info */}
        <section className="px-6 py-16 md:px-12 border-b border-outline-variant-30">
          <div className="mx-auto max-w-[720px] flex flex-col gap-10">
            <Section title="Why Stellar?">
              <p>
                Stellar is built for global payment routing and financial inclusion. Its simple
                transaction model, sub-second finality, and near-zero network fees make it a natural
                fit for private, day-to-day transaction routing.
              </p>
              <p>
                By avoiding the massive protocol overhead of heavier programmable chains, Wraith on
                Stellar delivers high-performance privacy mechanics without sacrificing transaction
                speed or cost-efficiency.
              </p>
            </Section>

            <Section title="How it Works: Memo-Enabled Stealth Payments">
              <p>
                On Stellar, Wraith utilizes standard payment operations combined with memo fields to
                carry encrypted ephemeral key metadata on-chain. Each payment goes to a fresh,
                one-time destination address.
              </p>
              <p>
                The recipient scans the network for incoming transactions and matches them using
                their private view key. Because each transaction uses a new, unlinkable address,
                external observers cannot correlate transactions or discover the recipient’s
                identity.
              </p>
            </Section>

            <Section title="Soroban Smart Contracts">
              <p>
                For more complex payment routing, escrow, and registry lookups, Wraith integrates
                with Soroban—Stellar&apos;s WebAssembly (WASM) smart contract platform. This allows
                developer teams to register stealth meta-addresses and manage keys entirely on-chain
                in a decentralized manner.
              </p>
            </Section>
          </div>
        </section>

        {/* Ecosystem Partners Grid */}
        <EcosystemPartners />
      </main>

      <Footer />
    </div>
  );
}
