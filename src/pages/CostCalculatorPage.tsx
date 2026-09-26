import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import CostCalculator from '../components/CostCalculator';
import Footer from '../components/Footer';

export default function CostCalculatorPage() {
  return (
    <div className="bg-surface text-on-surface">
      <Helmet>
        <title>Payment Cost Calculator | Wraith Protocol</title>
        <meta
          name="description"
          content="Estimate monthly stealth-payment network fees and modelled overhead across Wraith-supported chains."
        />
        <link rel="canonical" href="https://usewraith.xyz/use-cases/calculator" />
      </Helmet>

      <a href="#main-content" className="skip-link">
        Skip to content
      </a>

      <header className="fixed top-0 z-50 w-full border-b border-outline-variant-30 bg-surface/80 backdrop-blur-sm">
        <div className="mx-auto flex w-full items-center px-6 py-5 md:px-12">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="" width={30} height={24} className="h-6 opacity-90" />
            <span className="font-heading text-[15px] font-bold tracking-[2px] text-on-surface">
              WRAITH
            </span>
          </Link>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="pt-20">
        <section className="border-b border-outline-variant-30 px-6 py-20 md:px-12 md:py-24">
          <div className="mx-auto max-w-3xl">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
              Use cases / calculator
            </p>
            <h1 className="mt-3 font-heading text-4xl font-bold tracking-tight md:text-5xl">
              Payment Cost Calculator
            </h1>
            <p className="mt-6 text-lg leading-8 text-outline">
              Estimate monthly costs for a private-payment scenario, then share the exact chain,
              volume, and average payment assumptions from the URL.
            </p>
          </div>
        </section>

        <CostCalculator />
      </main>

      <Footer />
    </div>
  );
}
