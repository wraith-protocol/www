import { lazy, Suspense } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useInView } from '../hooks/useInView';
import { track } from '../utils/track';
import { usePageSeo } from '../utils/seo';

// ─── Lazy sub-components ─────────────────────────────────────────────────────
// These are loaded after the primary content (hero + steps) has painted.
// StellarDeploymentTable pulls in @wraith-protocol/sdk/chains/stellar at
// runtime; StellarCodePreview and EcosystemPartners are large JSX chunks.

const StellarDeploymentTable = lazy(() => import('../components/StellarDeploymentTable'));
const StellarCodePreview = lazy(() => import('../components/StellarCodePreview'));
const EcosystemPartners = lazy(() => import('../components/EcosystemPartners'));

// ─── How it works steps ───────────────────────────────────────────────────────

const steps = [
  {
    index: '01',
    title: 'ed25519 keys',
    body: "Wraith uses Stellar's native ed25519 key pairs. Spending and viewing keys are derived from a single wallet signature — no new seed phrase required.",
    mono: 'spending key · viewing key',
  },
  {
    index: '02',
    title: 'X25519 ECDH',
    body: 'An ephemeral keypair is generated per payment. Sender and recipient derive a shared secret via X25519 ECDH — the secret never touches the chain.',
    mono: 'ephemeral pub · shared secret',
  },
  {
    index: '03',
    title: 'Soroban announcement',
    body: 'The ephemeral public key is recorded in a Soroban registry contract. Recipients scan announcements off-chain to find payments addressed to them.',
    mono: 'Soroban · registry contract',
  },
  {
    index: '04',
    title: 'StrKey stealth address',
    body: 'Each payment lands at a fresh one-time G… address. The link between sender, recipient, and amount is never visible on the public ledger.',
    mono: 'st:xlm: · G... one-time address',
  },
];

// ─── Value props ──────────────────────────────────────────────────────────────

const props = [
  { label: 'Tx cost', value: '<$0.001', sub: 'per stealth payment' },
  { label: 'Finality', value: '~5s', sub: 'sub-second practical' },
  { label: 'Key curve', value: 'ed25519', sub: 'native to Stellar' },
  { label: 'Contracts', value: 'Soroban', sub: 'Rust · WASM' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function Stellar() {
  const seo = usePageSeo('stellar');

  const { ref: heroRef, isInView: heroInView } = useInView({ threshold: 0.1 });
  const { ref: stepsRef, isInView: stepsInView } = useInView({ threshold: 0.1 });
  const { ref: ctaRef, isInView: ctaInView } = useInView({ threshold: 0.1 });

  return (
    <>
      <Helmet>
        <title>{seo.title}</title>
        <meta name="description" content={seo.description} />
        <link rel="canonical" href={seo.canonical} />
        {seo.alternates.map((alt) => (
          <link key={alt.hrefLang} rel="alternate" hrefLang={alt.hrefLang} href={alt.href} />
        ))}
        <meta property="og:title" content={seo.title} />
        <meta property="og:description" content={seo.description} />
        <meta property="og:image" content="https://usewraith.xyz/og/stellar.png" />
        <meta property="og:url" content={seo.canonical} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={seo.title} />
        <meta name="twitter:description" content={seo.description} />
      </Helmet>

      {/* Layout already provides <main> — we render sections directly */}

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section ref={heroRef} className="border-b border-outline-variant-30 px-6 py-24 md:px-12">
        <div className="mx-auto max-w-336">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-3 mb-8" data-reveal={heroInView}>
            <div className="flex items-center gap-2 border border-outline-variant px-2.5 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-tertiary" />
              <span className="font-mono text-[10px] font-semibold tracking-[1.5px] text-on-surface-variant">
                LIVE TESTNET
              </span>
            </div>
            <div className="border border-tertiary px-2.5 py-1.5">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[1.5px] text-tertiary">
                SDF PARTNER
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-16 md:flex-row md:gap-16">
            {/* Left: copy */}
            <div className="flex w-full flex-col gap-8 md:w-1/2" data-reveal={heroInView}>
              <h1 className="font-heading text-[36px] font-bold leading-[1.05] tracking-[-2px] text-on-surface sm:text-[48px] md:text-[56px]">
                Stellar Integration
              </h1>
              <p className="font-body text-[17px] leading-[1.6] text-on-surface-variant">
                Wraith brings ERC-5564 stealth address semantics to Stellar — using native ed25519
                keys, X25519 ECDH, and Soroban contracts to make every payment unlink&shy;able
                without changing how Stellar works.
              </p>

              {/* CTA row */}
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href="https://demo.usewraith.xyz/stellar"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => track('cta_click', { source: 'stellar-demo' })}
                  className="flex h-12 items-center justify-center bg-primary px-7 font-heading text-[13px] font-semibold uppercase tracking-[1.5px] text-surface transition-[filter] duration-150 hover:brightness-110"
                >
                  Try Stellar Demo
                </a>
                <a
                  href="https://docs.usewraith.xyz/sdk/chains/stellar"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => track('cta_click', { source: 'stellar-docs' })}
                  className="flex h-12 items-center justify-center border border-outline-variant px-7 font-heading text-[13px] font-semibold uppercase tracking-[1.5px] text-primary transition-colors duration-150 hover:bg-surface-bright"
                >
                  Read Stellar docs
                </a>
                <Link
                  to="/roadmap#phase-2"
                  onClick={() => track('cta_click', { source: 'stellar-spectre' })}
                  className="flex h-12 items-center justify-center border border-outline-variant px-7 font-heading text-[13px] font-semibold uppercase tracking-[1.5px] text-primary transition-colors duration-150 hover:bg-surface-bright"
                >
                  Spectre on Stellar
                </Link>
              </div>

              {/* Value prop stats */}
              <div className="flex flex-wrap items-center gap-8 pt-4">
                {props.map((p) => (
                  <div key={p.label} className="flex flex-col gap-1">
                    <span className="font-mono text-[10px] font-semibold tracking-[1.5px] text-outline uppercase">
                      {p.label}
                    </span>
                    <span className="font-heading text-xl font-bold text-on-surface">
                      {p.value}
                    </span>
                    <span className="font-mono text-[10px] text-outline">{p.sub}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: visual — stealth address anatomy */}
            <div className="flex w-full flex-col md:w-1/2" data-reveal={heroInView}>
              <div className="flex items-center justify-between border border-b-0 border-outline-variant bg-surface-container px-4 py-3">
                <span className="font-mono text-[11px] text-on-surface-variant">
                  stealth-meta-address.txt
                </span>
                <span className="font-mono text-[10px] font-semibold tracking-[1.5px] text-outline">
                  STELLAR
                </span>
              </div>
              <div className="border border-outline-variant bg-surface-container p-6 flex flex-col gap-5">
                {[
                  {
                    label: 'STEALTH META-ADDRESS',
                    value: 'st:xlm:Gspend…Gview…',
                    note: 'share publicly — safe to reuse',
                    color: 'text-primary',
                  },
                  {
                    label: 'ONE-TIME ADDRESS (generated per payment)',
                    value: 'GSTEALTH7XYZ…',
                    note: 'never reused · unlinked from meta-address',
                    color: 'text-on-surface-variant',
                  },
                  {
                    label: 'ANNOUNCEMENT MEMO (ephemeral pub key)',
                    value: 'a3f9b2c1d4e8…',
                    note: 'recorded on Soroban registry',
                    color: 'text-on-surface-variant',
                  },
                ].map((row) => (
                  <div key={row.label} className="flex flex-col gap-1.5">
                    <span className="font-mono text-[9px] font-semibold tracking-[1.5px] text-outline uppercase">
                      {row.label}
                    </span>
                    <span className={`font-mono text-[13px] font-medium break-all ${row.color}`}>
                      {row.value}
                    </span>
                    <span className="font-mono text-[10px] text-outline">{row.note}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between border border-t-0 border-outline-variant bg-surface-container px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-tertiary" />
                  <span className="font-mono text-[11px] text-on-surface-variant">
                    ERC-5564 on Stellar
                  </span>
                </div>
                <span className="font-mono text-[10px] font-semibold tracking-[1.5px] text-outline">
                  ed25519 · X25519
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section ref={stepsRef} className="border-b border-outline-variant-30 px-6 py-24 md:px-12">
        <div className="mx-auto max-w-336 flex flex-col gap-10">
          <div className="flex flex-col gap-3" data-reveal={stepsInView}>
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
              Protocol
            </span>
            <h2 className="font-heading text-[28px] font-bold tracking-[-1.2px] text-on-surface sm:text-[40px]">
              How it works on Stellar
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-px bg-outline-variant sm:grid-cols-2">
            {steps.map((step, i) => (
              <div
                key={step.index}
                className="flex flex-col gap-4 bg-surface-container p-7"
                data-reveal={stepsInView}
                style={{ transitionDelay: stepsInView ? `${i * 80}ms` : '0ms' }}
              >
                <span className="font-mono text-[10px] font-semibold tracking-[1.5px] text-outline">
                  {step.index}
                </span>
                <h3 className="font-heading text-[16px] font-semibold text-on-surface">
                  {step.title}
                </h3>
                <p className="font-body text-[14px] leading-[1.7] text-on-surface-variant">
                  {step.body}
                </p>
                <span className="font-mono text-[10px] tracking-[1px] text-outline border-t border-outline-variant pt-3">
                  {step.mono}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Deployment table, code preview, CTAs, partners — loaded lazily ── */}
      <Suspense fallback={null}>
        <StellarDeploymentTable />
        <StellarCodePreview />

        {/* ── CTAs ──────────────────────────────────────────────────────────── */}
        <section ref={ctaRef} className="border-b border-outline-variant-30 px-6 py-24 md:px-12">
          <div className="mx-auto max-w-336 flex flex-col gap-10" data-reveal={ctaInView}>
            <div className="flex flex-col gap-3">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
                Get started
              </span>
              <h2 className="font-heading text-[28px] font-bold tracking-[-1.2px] text-on-surface sm:text-[40px]">
                Build on Stellar today
              </h2>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href="https://demo.usewraith.xyz/stellar"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track('cta_click', { source: 'stellar-demo' })}
                className="flex h-12 items-center justify-center bg-primary px-7 font-heading text-[13px] font-semibold uppercase tracking-[1.5px] text-surface transition-[filter] duration-150 hover:brightness-110"
              >
                Try Stellar Demo
              </a>
              <a
                href="https://docs.usewraith.xyz/sdk/chains/stellar"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track('cta_click', { source: 'stellar-docs' })}
                className="flex h-12 items-center justify-center border border-outline-variant px-7 font-heading text-[13px] font-semibold uppercase tracking-[1.5px] text-primary transition-colors duration-150 hover:bg-surface-bright"
              >
                Read Stellar docs
              </a>
              <Link
                to="/roadmap#phase-2"
                onClick={() => track('cta_click', { source: 'stellar-spectre' })}
                className="flex h-12 items-center justify-center border border-outline-variant px-7 font-heading text-[13px] font-semibold uppercase tracking-[1.5px] text-primary transition-colors duration-150 hover:bg-surface-bright"
              >
                Spectre on Stellar
              </Link>
              <Link
                to="/"
                className="flex h-12 items-center justify-center border border-outline-variant px-7 font-heading text-[13px] font-semibold uppercase tracking-[1.5px] text-primary transition-colors duration-150 hover:bg-surface-bright"
              >
                ← Back to home
              </Link>
            </div>

            {/* Ecosystem credits */}
            <div className="mt-4 flex flex-col gap-4 border-t border-outline-variant pt-8">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
                Built with
              </span>
              <div className="flex flex-wrap items-center gap-6">
                {[
                  { name: 'Stellar Development Foundation', url: 'https://stellar.org' },
                  {
                    name: 'Soroban',
                    url: 'https://developers.stellar.org/docs/build/smart-contracts/overview',
                  },
                  { name: 'Freighter Wallet', url: 'https://freighter.app' },
                ].map((credit) => (
                  <a
                    key={credit.name}
                    href={credit.url}
                    target="_blank"
                    onClick={() => track('cta_click', { source: 'stellar-credit' })}
                    rel="noopener noreferrer"
                    className="font-mono text-[11px] text-on-surface-variant hover:text-primary transition-colors duration-150"
                  >
                    {credit.name} ↗
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Ecosystem partners ────────────────────────────────────────────── */}
        <EcosystemPartners />
      </Suspense>
    </>
  );
}
