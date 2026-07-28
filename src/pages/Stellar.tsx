import { useState, type KeyboardEvent } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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

const colorMap: Record<CodeLine['color'], string> = {
  code: 'text-on-surface-variant',
  comment: 'text-outline',
  highlight: 'text-primary',
};

// ─── Deployment table data ────────────────────────────────────────────────────

const contracts = [
  {
    name: 'Stealth Factory',
    address: 'CD3XPLACEHOLDER000000000000000000000000000000000000000000000',
    explorer: 'https://testnet.steexp.com/contract/CD3XPLACEHOLDER',
  },
  {
    name: 'Announcement Registry',
    address: 'GABCPLACEHOLDER000000000000000000000000000000000000000000000',
    explorer: 'https://testnet.steexp.com/contract/GABCPLACEHOLDER',
  },
  {
    name: 'Escrow',
    address: 'GESCPLACEHOLDER000000000000000000000000000000000000000000000',
    explorer: 'https://testnet.steexp.com/contract/GESCPLACEHOLDER',
  },
];

export default function Stellar() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('send.ts');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');

  const { ref: heroRef, isInView: heroInView } = useInView({ threshold: 0.1 });
  const { ref: stepsRef, isInView: stepsInView } = useInView({ threshold: 0.1 });
  const { ref: tableRef, isInView: tableInView } = useInView({ threshold: 0.1 });
  const { ref: codeRef, isInView: codeInView } = useInView({ threshold: 0.1 });
  const { ref: ctaRef, isInView: ctaInView } = useInView({ threshold: 0.1 });

  const activeTabIndex = tabs.indexOf(activeTab);
  const lines = codeByTab[activeTab];

  const steps = [
    {
      index: '01',
      title: t('stellarPage.howItWorks.steps.step1Title'),
      body: t('stellarPage.howItWorks.steps.step1Body'),
      mono: 'spending key · viewing key',
    },
    {
      index: '02',
      title: t('stellarPage.howItWorks.steps.step2Title'),
      body: t('stellarPage.howItWorks.steps.step2Body'),
      mono: 'ephemeral pub · shared secret',
    },
    {
      index: '03',
      title: t('stellarPage.howItWorks.steps.step3Title'),
      body: t('stellarPage.howItWorks.steps.step3Body'),
      mono: 'Soroban · registry contract',
    },
    {
      index: '04',
      title: t('stellarPage.howItWorks.steps.step4Title'),
      body: t('stellarPage.howItWorks.steps.step4Body'),
      mono: 'st:xlm: · G... one-time address',
    },
  ];

  const props = [
    {
      label: t('stellarPage.props.txCost'),
      value: '<$0.001',
      sub: t('stellarPage.props.txCostSub'),
    },
    {
      label: t('stellarPage.props.finality'),
      value: '~5s',
      sub: t('stellarPage.props.finalitySub'),
    },
    {
      label: t('stellarPage.props.keyCurve'),
      value: 'ed25519',
      sub: t('stellarPage.props.keyCurveSub'),
    },
    {
      label: t('stellarPage.props.contracts'),
      value: 'Soroban',
      sub: t('stellarPage.props.contractsSub'),
    },
  ];

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
        <title>{t('stellarPage.metaTitle')}</title>
        <meta name="description" content={t('stellarPage.metaDescription')} />
        <meta property="og:title" content={t('stellarPage.metaTitle')} />
        <meta property="og:description" content={t('stellarPage.metaDescription')} />
        <meta property="og:image" content="https://usewraith.xyz/og/stellar.png" />
        <meta property="og:url" content="https://usewraith.xyz/stellar" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      {/* Hero */}
      <section ref={heroRef} className="border-b border-outline-variant-30 px-6 py-24 md:px-12">
        <div className="mx-auto max-w-336">
          <div className="flex flex-wrap items-center gap-3 mb-8" data-reveal={heroInView}>
            <div className="flex items-center gap-2 border border-outline-variant px-2.5 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-tertiary" />
              <span className="font-mono text-[10px] font-semibold tracking-[1.5px] text-on-surface-variant">
                {t('stellarPage.badges.liveTestnet')}
              </span>
            </div>
            <div className="border border-tertiary px-2.5 py-1.5">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[1.5px] text-tertiary">
                {t('stellarPage.badges.stellarPartner')}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-16 md:flex-row md:gap-16">
            <div className="flex w-full flex-col gap-8 md:w-1/2" data-reveal={heroInView}>
              <h1 className="font-heading text-[36px] font-bold leading-[1.05] tracking-[-2px] text-on-surface sm:text-[48px] md:text-[56px]">
                Stellar Integration
              </h1>
              <p className="font-body text-[17px] leading-[1.6] text-on-surface-variant">
                {t('stellarPage.subtitle')}
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <a
                  href="https://demo.usewraith.xyz/stellar"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackEvent('Stellar Demo CTA')}
                  className="flex h-12 items-center justify-center bg-primary px-7 font-heading text-[13px] font-semibold uppercase tracking-[1.5px] text-surface transition-[filter] duration-150 hover:brightness-110"
                >
                  {t('stellarPage.cta.tryDemo')}
                </a>
                <a
                  href="https://docs.usewraith.xyz/chains/stellar"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackEvent('Stellar Docs CTA')}
                  className="flex h-12 items-center justify-center border border-outline-variant px-7 font-heading text-[13px] font-semibold uppercase tracking-[1.5px] text-primary transition-colors duration-150 hover:bg-surface-bright"
                >
                  {t('stellarPage.cta.readDocs')}
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

              <div className="grid grid-cols-2 gap-4 border-t border-outline-variant-30 pt-8 sm:grid-cols-4">
                {props.map((p) => (
                  <div key={p.label} className="flex flex-col gap-1">
                    <span className="font-mono text-[10px] font-semibold tracking-[1.5px] text-outline uppercase">
                      {p.label}
                    </span>
                    <span className="font-heading text-xl font-bold text-on-surface">
                      {p.value}
                    </span>
                    <span className="font-mono text-[10px] text-outline-variant">{p.sub}</span>
                  </div>
                ))}
              </div>
            </div>

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
                    <span className="font-mono text-[10px] text-outline-variant">{row.note}</span>
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

      {/* How it works */}
      <section ref={stepsRef} className="border-b border-outline-variant-30 px-6 py-24 md:px-12">
        <div className="mx-auto max-w-336 flex flex-col gap-10">
          <div className="flex flex-col gap-3" data-reveal={stepsInView}>
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
              {t('stellarPage.howItWorks.eyebrow')}
            </span>
            <h2 className="font-heading text-[28px] font-bold tracking-[-1.2px] text-on-surface sm:text-[40px]">
              {t('stellarPage.howItWorks.title')}
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

      {/* Deployment table */}
      <section ref={tableRef} className="border-b border-outline-variant-30 px-6 py-24 md:px-12">
        <div className="mx-auto max-w-336 flex flex-col gap-8" data-reveal={tableInView}>
          <div className="flex flex-col gap-3">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
              {t('stellarPage.deployments.eyebrow')}
            </span>
            <h2 className="font-heading text-[28px] font-bold tracking-[-1.2px] text-on-surface sm:text-[40px]">
              {t('stellarPage.deployments.title')}
            </h2>
          </div>

          <div className="border border-outline-variant overflow-x-auto">
            <table className="w-full border-collapse font-body text-[13px]">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container">
                  <th className="py-3 px-4 text-left font-mono text-[10px] font-semibold tracking-[1.5px] text-outline uppercase">
                    {t('stellarPage.deployments.contractCol')}
                  </th>
                  <th className="py-3 px-4 text-left font-mono text-[10px] font-semibold tracking-[1.5px] text-outline uppercase">
                    {t('stellarPage.deployments.addressCol')}
                  </th>
                  <th className="py-3 px-4 text-left font-mono text-[10px] font-semibold tracking-[1.5px] text-outline uppercase">
                    {t('stellarPage.deployments.explorerCol')}
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
                        {t('stellarPage.deployments.viewExplorer')}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Code preview */}
      <section ref={codeRef} className="border-b border-outline-variant-30 px-6 py-24 md:px-12">
        <div className="mx-auto max-w-336 flex flex-col gap-8" data-reveal={codeInView}>
          <div className="flex flex-col gap-3">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
              {t('stellarPage.codeSection.eyebrow')}
            </span>
            <h2 className="font-heading text-[28px] font-bold tracking-[-1.2px] text-on-surface sm:text-[40px]">
              {t('stellarPage.codeSection.title')}
            </h2>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center justify-between border border-b-0 border-outline-variant bg-surface-container px-4 py-3">
              <div role="tablist" className="flex gap-1" aria-label="Code examples">
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
                  {copyStatus === 'copied' && t('stellarPage.codeSection.copied')}
                  {copyStatus === 'failed' && t('stellarPage.codeSection.failed')}
                  {copyStatus === 'idle' && t('stellarPage.codeSection.copy')}
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
                      className="w-4 shrink-0 font-mono text-xs text-outline-variant select-none"
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

      {/* CTAs */}
      <section ref={ctaRef} className="border-b border-outline-variant-30 px-6 py-24 md:px-12">
        <div className="mx-auto max-w-336 flex flex-col gap-10" data-reveal={ctaInView}>
          <div className="flex flex-col gap-3">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
              Get started
            </span>
            <h2 className="font-heading text-[28px] font-bold tracking-[-1.2px] text-on-surface sm:text-[40px]">
              {t('stellarPage.ctaSection.title')}
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
              {t('stellarPage.cta.tryDemo')}
            </a>
            <a
              href="https://docs.usewraith.xyz/chains/stellar"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent('Stellar Docs CTA bottom')}
              className="flex h-12 items-center justify-center border border-outline-variant px-7 font-heading text-[13px] font-semibold uppercase tracking-[1.5px] text-primary transition-colors duration-150 hover:bg-surface-bright"
            >
              {t('stellarPage.cta.readDocs')}
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
              ← {t('faqPage.backHome')}
            </Link>
          </div>

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

      <EcosystemPartners />
    </>
  );
}
