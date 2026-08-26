import { useState, type KeyboardEvent } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useInView } from '../hooks/useInView';
import { trackEvent } from '../analytics';
import EcosystemPartners from '../components/EcosystemPartners';

// ─── Types ────────────────────────────────────────────────────────────────────

type CodeLine = {
  content: string;
  color: 'code' | 'comment' | 'highlight';
};

const tabs = ['send.ts', 'scan.ts', 'withdraw.ts'] as const;
type Tab = (typeof tabs)[number];

// ─── Code content ─────────────────────────────────────────────────────────────
// Matches Hero.tsx tab names and SDK import paths exactly

const codeByTab: Record<Tab, CodeLine[]> = {
  'send.ts': [
    {
      content:
        "import { bytesToHex, encodeStealthMetaAddress, generateStealthAddress } from '@wraith-protocol/sdk/chains/stellar'",
      color: 'code',
    },
    { content: '', color: 'code' },
    { content: 'declare const spendingPubKey: Uint8Array', color: 'code' },
    { content: 'declare const viewingPubKey: Uint8Array', color: 'code' },
    { content: '', color: 'code' },
    { content: '// Stellar recipients share st:xlm: stealth meta-addresses', color: 'comment' },
    {
      content: 'const metaAddress = encodeStealthMetaAddress(spendingPubKey, viewingPubKey)',
      color: 'highlight',
    },
    { content: '', color: 'code' },
    {
      content: '// generate a one-time Stellar G... address and announcement memo',
      color: 'comment',
    },
    {
      content: 'const stealth = generateStealthAddress(spendingPubKey, viewingPubKey)',
      color: 'code',
    },
    { content: 'const recipient = stealth.stealthAddress', color: 'highlight' },
    { content: 'const memo = bytesToHex(stealth.ephemeralPubKey)', color: 'code' },
  ],
  'scan.ts': [
    {
      content:
        "import { deriveStealthKeys, fetchAnnouncements, scanAnnouncements } from '@wraith-protocol/sdk/chains/stellar'",
      color: 'code',
    },
    { content: '', color: 'code' },
    { content: 'async function findPayments(walletSignature: Uint8Array) {', color: 'code' },
    { content: '  const keys = deriveStealthKeys(walletSignature)', color: 'code' },
    { content: "  const announcements = await fetchAnnouncements('stellar')", color: 'highlight' },
    { content: '', color: 'code' },
    { content: '  // derive viewing keys and scan Stellar announcements', color: 'comment' },
    { content: '  const matched = scanAnnouncements(', color: 'code' },
    {
      content: '    announcements, keys.viewingKey, keys.spendingPubKey, keys.spendingScalar',
      color: 'highlight',
    },
    { content: '  )', color: 'code' },
    { content: '  return matched.map((ann) => ann.stealthAddress)', color: 'code' },
    { content: '}', color: 'code' },
  ],
  'withdraw.ts': [
    {
      content:
        "import { deriveStealthPrivateScalar, hexToBytes, signStellarTransaction } from '@wraith-protocol/sdk/chains/stellar'",
      color: 'code',
    },
    { content: '', color: 'code' },
    {
      content: 'declare const keys: { spendingScalar: bigint; viewingKey: Uint8Array }',
      color: 'code',
    },
    {
      content: 'declare const ann: { ephemeralPubKey: string; stealthPubKeyBytes: Uint8Array }',
      color: 'code',
    },
    { content: 'declare const txHash: Uint8Array', color: 'code' },
    { content: '', color: 'code' },
    {
      content: '// derive the Stellar stealth scalar and sign a transaction hash',
      color: 'comment',
    },
    { content: 'const stealthScalar = deriveStealthPrivateScalar(', color: 'code' },
    {
      content: '  keys.spendingScalar, keys.viewingKey, hexToBytes(ann.ephemeralPubKey)',
      color: 'highlight',
    },
    { content: ')', color: 'code' },
    { content: '', color: 'code' },
    { content: 'const signature = signStellarTransaction(', color: 'code' },
    { content: '  txHash, stealthScalar, ann.stealthPubKeyBytes', color: 'highlight' },
    { content: '})', color: 'code' },
  ],
};

const colorMap = {
  code: 'text-on-surface-variant',
  comment: 'text-outline',
  highlight: 'text-primary',
};

// ─── Deployment table data ────────────────────────────────────────────────────

const contracts = [
  {
    name: 'Stealth Factory',
    // TODO: replace with real testnet contract address after deployment
    address: 'CD3XPLACEHOLDER000000000000000000000000000000000000000000000',
    explorer: 'https://testnet.steexp.com/contract/CD3XPLACEHOLDER',
  },
  {
    name: 'Announcement Registry',
    // TODO: replace with real testnet contract address after deployment
    address: 'GABCPLACEHOLDER000000000000000000000000000000000000000000000',
    explorer: 'https://testnet.steexp.com/contract/GABCPLACEHOLDER',
  },
  {
    name: 'Escrow',
    // TODO: replace with real testnet contract address after deployment
    address: 'GESCPLACEHOLDER000000000000000000000000000000000000000000000',
    explorer: 'https://testnet.steexp.com/contract/GESCPLACEHOLDER',
  },
];

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
  const [activeTab, setActiveTab] = useState<Tab>('send.ts');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');

  const { ref: heroRef, isInView: heroInView } = useInView({ threshold: 0.1 });
  const { ref: stepsRef, isInView: stepsInView } = useInView({ threshold: 0.1 });
  const { ref: tableRef, isInView: tableInView } = useInView({ threshold: 0.1 });
  const { ref: codeRef, isInView: codeInView } = useInView({ threshold: 0.1 });
  const { ref: ctaRef, isInView: ctaInView } = useInView({ threshold: 0.1 });

  const activeTabIndex = tabs.indexOf(activeTab);
  const lines = codeByTab[activeTab];

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    trackEvent('Stellar Code Tab Change', { props: { tab } });
  };

  const handleTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    let next = activeTabIndex;
    if (e.key === 'ArrowRight') next = (activeTabIndex + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') next = (activeTabIndex - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    else return;
    e.preventDefault();
    const nextTab = tabs[next];
    if (!nextTab) return;
    setActiveTab(nextTab);
    requestAnimationFrame(() => {
      document.getElementById(`stellar-tab-${nextTab}`)?.focus();
    });
  };

  const handleCopy = async () => {
    const text = lines.map((l) => l.content).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('failed');
    }
    setTimeout(() => setCopyStatus('idle'), 2000);
  };

  return (
    <>
      <Helmet>
        <title>Stealth payments on Stellar – Wraith Protocol</title>
        <meta
          name="description"
          content="Low-cost, sub-second, ed25519 stealth payments on Stellar with Soroban smart contracts. Build private payment rails with the Wraith SDK."
        />
        <meta property="og:title" content="Stealth payments on Stellar – Wraith Protocol" />
        <meta
          property="og:description"
          content="Low-cost, sub-second, ed25519 stealth payments on Stellar with Soroban smart contracts."
        />
        {/* TODO: replace with real OG image */}
        <meta property="og:image" content="https://usewraith.xyz/og/stellar.png" />
        <meta property="og:url" content="https://usewraith.xyz/stellar" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
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
                  onClick={() => trackEvent('Stellar Demo CTA')}
                  className="flex h-12 items-center justify-center bg-primary px-7 font-heading text-[13px] font-semibold uppercase tracking-[1.5px] text-surface transition-[filter] duration-150 hover:brightness-110"
                >
                  Try Stellar Demo
                </a>
                <a
                  href="https://docs.usewraith.xyz/chains/stellar"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackEvent('Stellar Docs CTA')}
                  className="flex h-12 items-center justify-center border border-outline-variant px-7 font-heading text-[13px] font-semibold uppercase tracking-[1.5px] text-primary transition-colors duration-150 hover:bg-surface-bright"
                >
                  Read Stellar docs
                </a>
                <a
                  href="https://spectre.usewraith.xyz"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackEvent('Spectre on Stellar CTA')}
                  className="flex h-12 items-center justify-center border border-outline-variant px-7 font-heading text-[13px] font-semibold uppercase tracking-[1.5px] text-primary transition-colors duration-150 hover:bg-surface-bright"
                >
                  Spectre on Stellar
                </a>
              </div>

              {/* Value prop stats — matches Hero.tsx stat block */}
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

      {/* ── Deployment table ──────────────────────────────────────────────── */}
      <section ref={tableRef} className="border-b border-outline-variant-30 px-6 py-24 md:px-12">
        <div className="mx-auto max-w-336 flex flex-col gap-8" data-reveal={tableInView}>
          <div className="flex flex-col gap-3">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
              Deployments
            </span>
            <h2 className="font-heading text-[28px] font-bold tracking-[-1.2px] text-on-surface sm:text-[40px]">
              Testnet contracts
            </h2>
          </div>

          <div className="border border-outline-variant overflow-x-auto">
            <table className="w-full border-collapse font-body text-[13px]">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container">
                  <th className="py-3 px-4 text-left font-mono text-[10px] font-semibold tracking-[1.5px] text-outline uppercase">
                    Contract
                  </th>
                  <th className="py-3 px-4 text-left font-mono text-[10px] font-semibold tracking-[1.5px] text-outline uppercase">
                    Address
                  </th>
                  <th className="py-3 px-4 text-left font-mono text-[10px] font-semibold tracking-[1.5px] text-outline uppercase">
                    Explorer
                  </th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((c, i) => (
                  <tr
                    key={c.name}
                    className={i < contracts.length - 1 ? 'border-b border-outline-variant' : ''}
                  >
                    <td className="py-3 px-4 font-heading text-[13px] font-medium text-on-surface whitespace-nowrap">
                      {c.name}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-on-surface-variant break-all">
                      {c.address}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <a
                        href={c.explorer}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() =>
                          trackEvent('Stellar Explorer Link', { props: { contract: c.name } })
                        }
                        className="font-mono text-[11px] font-semibold tracking-[1px] text-tertiary hover:brightness-110 transition-[filter]"
                      >
                        View ↗
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="font-mono text-[10px] tracking-[1px] text-outline">
            * Addresses are placeholders — replace after testnet deployment.
          </p>
        </div>
      </section>

      {/* ── Code preview ──────────────────────────────────────────────────── */}
      {/* Mirrors Hero.tsx code block structure exactly */}
      <section ref={codeRef} className="border-b border-outline-variant-30 px-6 py-24 md:px-12">
        <div className="mx-auto max-w-336 flex flex-col gap-8" data-reveal={codeInView}>
          <div className="flex flex-col gap-3">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
              SDK
            </span>
            <h2 className="font-heading text-[28px] font-bold tracking-[-1.2px] text-on-surface sm:text-[40px]">
              Code examples
            </h2>
            <p className="font-body text-[14px] leading-[1.6] text-on-surface-variant max-w-xl">
              All functions are tree-shakeable and typed. Import only what you need from{' '}
              <code className="font-mono text-[13px] text-primary">
                @wraith-protocol/sdk/chains/stellar
              </code>
              .
            </p>
          </div>

          {/* Tab bar — mirrors Hero.tsx exactly */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between border border-b-0 border-outline-variant bg-surface-container px-4 py-3">
              <div
                className="flex items-center gap-0"
                role="tablist"
                aria-label="Stellar code examples"
              >
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    id={`stellar-tab-${tab}`}
                    role="tab"
                    aria-selected={activeTab === tab}
                    aria-controls={`stellar-panel-${tab}`}
                    tabIndex={activeTab === tab ? 0 : -1}
                    onClick={() => handleTabChange(tab)}
                    onKeyDown={handleTabKeyDown}
                    className={`flex items-center justify-center px-3 py-1.5 transition-colors duration-150 ${
                      activeTab === tab
                        ? 'bg-surface-bright'
                        : 'hover:bg-surface-bright/50 cursor-pointer'
                    }`}
                  >
                    <span
                      className={`font-mono text-[11px] ${
                        activeTab === tab ? 'font-medium text-on-surface' : 'text-outline'
                      }`}
                    >
                      {tab}
                    </span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={handleCopy}
                aria-label={`Copy ${activeTab} to clipboard`}
                className="flex cursor-pointer items-center gap-1.5 px-2 py-1 transition-colors duration-150 hover:opacity-80"
              >
                <span className="font-mono text-[10px] font-semibold tracking-[1px] text-outline">
                  {copyStatus === 'copied' && 'COPIED'}
                  {copyStatus === 'failed' && 'FAILED'}
                  {copyStatus === 'idle' && 'COPY'}
                </span>
              </button>
              <span className="sr-only" aria-live="polite">
                {copyStatus === 'copied' && `${activeTab} copied to clipboard`}
                {copyStatus === 'failed' && `Failed to copy ${activeTab}`}
              </span>
            </div>

            <div
              id={`stellar-panel-${activeTab}`}
              role="tabpanel"
              aria-labelledby={`stellar-tab-${activeTab}`}
              className="overflow-x-auto border border-outline-variant bg-surface-container p-6"
            >
              <div className="w-max min-w-full">
                {lines.map((line, i) => (
                  <div key={`${activeTab}-${i}`} className="flex gap-4 py-1">
                    <span
                      className="w-4 shrink-0 font-mono text-xs text-outline select-none"
                      aria-hidden="true"
                    >
                      {i + 1}
                    </span>
                    <span
                      className={`whitespace-pre font-mono text-[13px] ${colorMap[line.color]}`}
                    >
                      {line.content || ' '}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between border border-t-0 border-outline-variant bg-surface-container px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-tertiary" />
                <span className="font-mono text-[11px] text-on-surface-variant">
                  npm install @wraith-protocol/sdk
                </span>
              </div>
              <span className="font-mono text-[10px] font-semibold tracking-[1.5px] text-outline">
                TYPESCRIPT
              </span>
            </div>
          </div>
        </div>
      </section>

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
              onClick={() => trackEvent('Stellar Demo CTA bottom')}
              className="flex h-12 items-center justify-center bg-primary px-7 font-heading text-[13px] font-semibold uppercase tracking-[1.5px] text-surface transition-[filter] duration-150 hover:brightness-110"
            >
              Try Stellar Demo
            </a>
            <a
              href="https://docs.usewraith.xyz/chains/stellar"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent('Stellar Docs CTA bottom')}
              className="flex h-12 items-center justify-center border border-outline-variant px-7 font-heading text-[13px] font-semibold uppercase tracking-[1.5px] text-primary transition-colors duration-150 hover:bg-surface-bright"
            >
              Read Stellar docs
            </a>
            <a
              href="https://spectre.usewraith.xyz"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent('Spectre CTA bottom')}
              className="flex h-12 items-center justify-center border border-outline-variant px-7 font-heading text-[13px] font-semibold uppercase tracking-[1.5px] text-primary transition-colors duration-150 hover:bg-surface-bright"
            >
              Spectre on Stellar
            </a>
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
                { name: 'Soroban', url: 'https://soroban.stellar.org' },
                { name: 'Freighter Wallet', url: 'https://freighter.app' },
              ].map((credit) => (
                <a
                  key={credit.name}
                  href={credit.url}
                  target="_blank"
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
    </>
  );
}
