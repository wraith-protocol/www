import { type KeyboardEvent, useState } from 'react';

type ComparisonRow = {
  protocol: string;
  isWraith?: boolean;
  mechanism: string;
  ux: string;
  recipient: string;
  regulation: string;
  multichain: string;
  complexity: string;
};

const comparisonTabs = ['all', 'wraith', 'mixers', 'rollups', 'railgun', 'transparent'] as const;
type ComparisonTab = (typeof comparisonTabs)[number];

const comparisonTabLabels: Record<ComparisonTab, string> = {
  all: 'All Details',
  wraith: 'Wraith (Stealth)',
  mixers: 'Tornado Cash (Mixers)',
  rollups: 'Aztec (zk-Rollups)',
  railgun: 'Railgun (Shielded)',
  transparent: 'Status Quo',
};

const comparisonData: ComparisonRow[] = [
  {
    protocol: 'Wraith Protocol',
    isWraith: true,
    mechanism: 'Stealth Addresses (ERC-5564)',
    ux: 'Low friction (direct sending to meta-address)',
    recipient: 'Passive receipt (scans announcements via viewing key)',
    regulation: 'Non-pooled, direct peer-to-peer transfers',
    multichain: 'Native multi-chain API (4+ chains)',
    complexity: 'Low (standard elliptic curve cryptography)',
  },
  {
    protocol: 'Tornado Cash Style',
    mechanism: 'Zero-Knowledge Pools (zk-SNARKs)',
    ux: 'High friction (fixed deposits, note files)',
    recipient: 'Active withdrawal (must generate ZK proof and pay relayers)',
    regulation: 'Highly sanctioned (global OFAC sanctions)',
    multichain: 'Isolated pools per chain',
    complexity: 'High (client-side proofs, relayer networks)',
  },
  {
    protocol: 'Aztec / ZK Rollups',
    mechanism: 'State Encryption & Rollups',
    ux: 'High friction (requires bridging to L2 and exiting)',
    recipient: 'L2 native (receiver must have L2 account & scan L2)',
    regulation: 'Restricted (privacy bridges deprecating due to compliance)',
    multichain: 'Host-chain locked (complex L2 bridging)',
    complexity: 'Extreme (L2 rollup economics, state sync, proving nodes)',
  },
  {
    protocol: 'Railgun',
    mechanism: 'In-Contract ZK Shielded Pools',
    ux: 'Medium-High (shielding/unshielding, private wallet)',
    recipient: 'Shielded native (must own private address to receive)',
    regulation: 'Self-regulated (viewing keys, proof of innocence)',
    multichain: 'Isolated contracts per network',
    complexity: 'High (private state trees, DeFi adapters, client proofs)',
  },
  {
    protocol: 'Status Quo',
    mechanism: 'None (transparent public ledger)',
    ux: 'Frictionless (native wallet transactions)',
    recipient: 'Native receipt (immediate access, standard wallets)',
    regulation: 'Compliant (but zero privacy or commercial secrecy)',
    multichain: 'Native support on all chains',
    complexity: 'Zero (default ledger mechanics)',
  },
];

export default function Compare() {
  const [activeTab, setActiveTab] = useState<ComparisonTab>('all');

  const activeTabIndex = comparisonTabs.indexOf(activeTab);

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    let nextIndex = activeTabIndex;

    if (event.key === 'ArrowRight') nextIndex = (activeTabIndex + 1) % comparisonTabs.length;
    else if (event.key === 'ArrowLeft') {
      nextIndex = (activeTabIndex - 1 + comparisonTabs.length) % comparisonTabs.length;
    } else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = comparisonTabs.length - 1;
    else return;

    event.preventDefault();
    const nextTab = comparisonTabs[nextIndex];
    if (!nextTab) return;

    setActiveTab(nextTab);
    requestAnimationFrame(() => {
      document.getElementById(`comparison-tab-${nextTab}`)?.focus();
    });
  };

  return (
    <section
      id="compare"
      className="border-t border-outline-variant-30 px-6 py-24 md:px-12 scroll-mt-20"
    >
      <div className="mx-auto flex max-w-[1344px] flex-col gap-12">
        {/* Section Header */}
        <div className="flex flex-col gap-3">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
            Comparative Analysis
          </span>
          <h2 className="font-heading text-[28px] font-bold leading-[1.1] tracking-[-1.2px] text-on-surface sm:text-[40px]">
            Honest comparison to alternatives.
          </h2>
          <p className="font-body text-base leading-[1.6] text-on-surface-variant max-w-2xl">
            Privacy is not one-size-fits-all. Different mechanisms make distinct trade-offs between
            user convenience, regulatory posture, and mathematical complexity.
          </p>
        </div>

        {/* Scroll helper indicator for mobile screens */}
        <div className="flex items-center justify-between lg:hidden">
          <span className="font-mono text-[10px] text-outline flex items-center gap-1.5">
            <span>Swipe table horizontally to view all columns</span>
            <span className="animate-pulse">→</span>
          </span>
        </div>

        {/* Responsive Table Wrapper */}
        <div className="relative border border-outline-variant bg-surface-container overflow-hidden rounded-sm">
          {/* Right edge fade gradient to indicate scrollability */}
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-surface-container to-transparent pointer-events-none z-20 lg:hidden" />

          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[960px] text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant">
                  <th
                    scope="col"
                    className="sticky left-0 z-10 bg-surface-container-high px-[23px] py-[15px] md:px-6 md:py-4 font-mono text-[10px] font-semibold uppercase tracking-[1.5px] text-outline w-[180px]"
                  >
                    Protocol
                  </th>
                  <th
                    scope="col"
                    className="px-[23px] py-[15px] md:px-6 md:py-4 font-mono text-[10px] font-semibold uppercase tracking-[1.5px] text-outline"
                  >
                    Privacy Mechanism
                  </th>
                  <th
                    scope="col"
                    className="px-[23px] py-[15px] md:px-6 md:py-4 font-mono text-[10px] font-semibold uppercase tracking-[1.5px] text-outline"
                  >
                    UX / Sending Flow
                  </th>
                  <th
                    scope="col"
                    className="px-[23px] py-[15px] md:px-6 md:py-4 font-mono text-[10px] font-semibold uppercase tracking-[1.5px] text-outline"
                  >
                    Recipient Flow
                  </th>
                  <th
                    scope="col"
                    className="px-[23px] py-[15px] md:px-6 md:py-4 font-mono text-[10px] font-semibold uppercase tracking-[1.5px] text-outline"
                  >
                    Regulatory Posture
                  </th>
                  <th
                    scope="col"
                    className="px-[23px] py-[15px] md:px-6 md:py-4 font-mono text-[10px] font-semibold uppercase tracking-[1.5px] text-outline"
                  >
                    Multichain
                  </th>
                  <th
                    scope="col"
                    className="px-[23px] py-[15px] md:px-6 md:py-4 font-mono text-[10px] font-semibold uppercase tracking-[1.5px] text-outline"
                  >
                    Complexity
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant-30">
                {comparisonData.map((row) => (
                  <tr
                    key={row.protocol}
                    className={`transition-colors duration-150 ${
                      row.isWraith
                        ? 'bg-surface-bright font-semibold text-on-surface'
                        : 'hover:bg-surface-bright/40 text-on-surface-variant'
                    }`}
                  >
                    <th
                      scope="row"
                      className={`sticky left-0 z-10 px-[23px] py-[19px] md:px-6 md:py-5 font-heading text-sm border-r border-outline-variant-30 ${
                        row.isWraith
                          ? 'bg-surface-bright text-primary'
                          : 'bg-surface-container font-semibold text-on-surface'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{row.protocol}</span>
                        {row.isWraith && (
                          <span className="inline-block h-2 w-2 rounded-full bg-tertiary animate-pulse" />
                        )}
                      </div>
                    </th>
                    <td className="px-[23px] py-[19px] md:px-6 md:py-5 font-body text-[13px] leading-relaxed">
                      {row.mechanism}
                    </td>
                    <td className="px-[23px] py-[19px] md:px-6 md:py-5 font-body text-[13px] leading-relaxed">
                      {row.ux}
                    </td>
                    <td className="px-[23px] py-[19px] md:px-6 md:py-5 font-body text-[13px] leading-relaxed">
                      {row.recipient}
                    </td>
                    <td className="px-[23px] py-[19px] md:px-6 md:py-5 font-body text-[13px] leading-relaxed">
                      {row.regulation}
                    </td>
                    <td className="px-[23px] py-[19px] md:px-6 md:py-5 font-body text-[13px] leading-relaxed">
                      {row.multichain}
                    </td>
                    <td className="px-[23px] py-[19px] md:px-6 md:py-5 font-body text-[13px] leading-relaxed">
                      {row.complexity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Prose Deep-Dives - Category Tabs */}
        <div className="flex flex-col gap-6 mt-6">
          <div
            className="border-b border-outline-variant flex flex-wrap gap-1 md:gap-2"
            role="tablist"
            aria-label="Comparison detail filters"
          >
            {comparisonTabs.map((tab) => (
              <button
                key={tab}
                id={`comparison-tab-${tab}`}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                aria-controls="comparison-tabpanel"
                tabIndex={activeTab === tab ? 0 : -1}
                onClick={() => setActiveTab(tab)}
                onKeyDown={handleTabKeyDown}
                className={`px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[1.5px] border-b-2 transition-all duration-150 -mb-[1px] ${
                  activeTab === tab
                    ? 'border-primary text-on-surface'
                    : 'border-transparent text-outline hover:text-on-surface-variant'
                }`}
              >
                {comparisonTabLabels[tab]}
              </button>
            ))}
          </div>

          <div
            id="comparison-tabpanel"
            role="tabpanel"
            aria-labelledby={`comparison-tab-${activeTab}`}
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-2"
          >
            {/* Card 1: Wraith (Stealth Addresses) */}
            {(activeTab === 'all' || activeTab === 'wraith') && (
              <div className="border border-tertiary-10 bg-surface-container p-8 flex flex-col gap-5 rounded-sm relative overflow-hidden group">
                <div className="absolute right-0 top-0 w-24 h-24 bg-tertiary-10 rounded-full blur-3xl pointer-events-none opacity-50" />
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-semibold tracking-[2px] text-tertiary">
                    WRAITH APPROACH
                  </span>
                  <span className="px-2 py-0.5 font-mono text-[9px] font-semibold tracking-[1px] text-tertiary bg-tertiary-10">
                    NON-POOLED STEALTH
                  </span>
                </div>
                <h3 className="font-heading text-xl font-bold tracking-[-0.3px] text-on-surface">
                  Wraith: Direct, Peer-to-Peer Privacy
                </h3>
                <p className="font-body text-[13px] leading-[1.65] text-on-surface-variant">
                  Wraith implements cryptographic stealth addresses based on the ERC-5564 and
                  ERC-6538 standards. Instead of pooling funds into a shared mixer, every single
                  transaction goes to a one-time, fresh destination address derived
                  cryptographically using the recipient&apos;s public keys and the sender&apos;s
                  ephemeral keys.
                </p>
                <div className="border-t border-outline-variant-30 pt-4 flex flex-col gap-3">
                  <h4 className="font-mono text-[10px] font-semibold text-outline uppercase tracking-[1px]">
                    Why it matters
                  </h4>
                  <p className="font-body text-[13px] leading-[1.6] text-on-surface-variant">
                    By removing the shared &quot;anonymity pool,&quot; Wraith avoids the regulatory
                    issues and technical overhead of traditional mixers. Users transact peer-to-peer
                    natively, while retaining complete unlinkability of the receiver&apos;s identity
                    on the public ledger.
                  </p>
                </div>
              </div>
            )}

            {/* Card 2: Tornado Cash (Mixers) */}
            {(activeTab === 'all' || activeTab === 'mixers') && (
              <div className="border border-outline-variant bg-surface-container p-8 flex flex-col gap-5 rounded-sm">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-semibold tracking-[2px] text-outline">
                    MIXERS & POOLS
                  </span>
                  <span className="px-2 py-0.5 font-mono text-[9px] font-semibold tracking-[1px] text-error bg-error-10">
                    OFAC SANCTIONED
                  </span>
                </div>
                <h3 className="font-heading text-xl font-bold tracking-[-0.3px] text-on-surface">
                  Tornado-Cash-style Mixers
                </h3>
                <p className="font-body text-[13px] leading-[1.65] text-on-surface-variant">
                  Mixers break links between deposit and withdrawal addresses by putting funds into
                  a communal smart-contract pool. Users deposit fixed denominations (e.g. 1 ETH) and
                  receive a cryptographic note. To withdraw, they generate a client-side
                  zero-knowledge proof proving they own one of the unspent deposits.
                </p>
                <div className="border-t border-outline-variant-30 pt-4 flex flex-col gap-3">
                  <h4 className="font-mono text-[10px] font-semibold text-outline uppercase tracking-[1px]">
                    Regulatory Status & Gaps
                  </h4>
                  <p className="font-body text-[13px] leading-[1.6] text-on-surface-variant">
                    Tornado Cash was sanctioned by the U.S. Office of Foreign Assets Control (OFAC)
                    in 2022 because its pooled architecture obfuscates illicit financial flows.
                    Additionally, the UX is complex: receivers must remain online to generate ZK
                    proofs and pay gas relayers to maintain withdrawal privacy.
                  </p>
                </div>
              </div>
            )}

            {/* Card 3: Aztec / ZK Rollups */}
            {(activeTab === 'all' || activeTab === 'rollups') && (
              <div className="border border-outline-variant bg-surface-container p-8 flex flex-col gap-5 rounded-sm">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-semibold tracking-[2px] text-outline">
                    LAYER 2 ENCRYPTION
                  </span>
                  <span className="px-2 py-0.5 font-mono text-[9px] font-semibold tracking-[1px] text-blue bg-blue-10">
                    PROGRAMMABLE L2
                  </span>
                </div>
                <h3 className="font-heading text-xl font-bold tracking-[-0.3px] text-on-surface">
                  Aztec & zk-Rollup Privacy
                </h3>
                <p className="font-body text-[13px] leading-[1.65] text-on-surface-variant">
                  Aztec brings privacy to the smart contract execution layer via an encrypted
                  Layer-2 rollup. Encrypted state updates are processed off-chain, and
                  zero-knowledge proofs are compiled in batches and posted to the Layer-1 Ethereum
                  ledger for global validation.
                </p>
                <div className="border-t border-outline-variant-30 pt-4 flex flex-col gap-3">
                  <h4 className="font-mono text-[10px] font-semibold text-outline uppercase tracking-[1px]">
                    Strengths & Gaps
                  </h4>
                  <p className="font-body text-[13px] leading-[1.6] text-on-surface-variant">
                    Excellent for rich private state logic and private DeFi. However, users face
                    significant friction, including L1-to-L2 bridging steps, delays in rollup
                    finality, and complex wallet setup. Because rollups are tied to a single host
                    chain, cross-chain privacy remains a major challenge.
                  </p>
                </div>
              </div>
            )}

            {/* Card 4: Railgun */}
            {(activeTab === 'all' || activeTab === 'railgun') && (
              <div className="border border-outline-variant bg-surface-container p-8 flex flex-col gap-5 rounded-sm">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-semibold tracking-[2px] text-outline">
                    SHIELDED CONTRACTS
                  </span>
                  <span className="px-2 py-0.5 font-mono text-[9px] font-semibold tracking-[1px] text-on-surface-variant bg-surface-bright">
                    IN-CONTRACT DEFI
                  </span>
                </div>
                <h3 className="font-heading text-xl font-bold tracking-[-0.3px] text-on-surface">
                  Railgun Shielded Actions
                </h3>
                <p className="font-body text-[13px] leading-[1.65] text-on-surface-variant">
                  Railgun is an on-chain privacy protocol deployed directly on EVM networks. It
                  allows users to &quot;shield&quot; tokens inside a smart contract pool. Once
                  shielded, assets can be transferred, swapped, or deployed into partner DeFi yield
                  contracts privately using zk-SNARKs.
                </p>
                <div className="border-t border-outline-variant-30 pt-4 flex flex-col gap-3">
                  <h4 className="font-mono text-[10px] font-semibold text-outline uppercase tracking-[1px]">
                    Strengths & Gaps
                  </h4>
                  <p className="font-body text-[13px] leading-[1.6] text-on-surface-variant">
                    Railgun excels at private, in-pool swaps and yield generation directly on L1/L2
                    without bridging. However, users must use specific Railgun-compatible wallets
                    and pay substantial gas costs to shield or unshield. Its pooled design also
                    requires heavy client-side proof generation.
                  </p>
                </div>
              </div>
            )}

            {/* Card 5: Status Quo */}
            {(activeTab === 'all' || activeTab === 'transparent') && (
              <div className="border border-outline-variant bg-surface-container p-8 flex flex-col gap-5 rounded-sm">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-semibold tracking-[2px] text-outline">
                    TRANSPARENT LEDGER
                  </span>
                  <span className="px-2 py-0.5 font-mono text-[9px] font-semibold tracking-[1px] text-outline bg-outline-variant-30">
                    DEFAULT PUBLIC
                  </span>
                </div>
                <h3 className="font-heading text-xl font-bold tracking-[-0.3px] text-on-surface">
                  The Transparent Ledger Status Quo
                </h3>
                <p className="font-body text-[13px] leading-[1.65] text-on-surface-variant">
                  Public blockchains operate on absolute transparency. Anyone with an internet
                  connection can view your entire transaction history, balances, asset holdings, and
                  network of counterparties via simple block explorers.
                </p>
                <div className="border-t border-outline-variant-30 pt-4 flex flex-col gap-3">
                  <h4 className="font-mono text-[10px] font-semibold text-outline uppercase tracking-[1px]">
                    What you give up
                  </h4>
                  <p className="font-body text-[13px] leading-[1.6] text-on-surface-variant">
                    Transparent accounts expose businesses, merchants, and individuals to
                    front-running, phishing, and physical security risks. While simple to use,
                    complete public disclosure makes default ledger transactions unfeasible for
                    standard enterprise operations like payroll or supplier contracts.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
