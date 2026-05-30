const comparisonRows = [
  {
    dimension: 'Best fit',
    wraith:
      'Apps that want receiver-unlinkable payments without asking users to leave their current chain.',
    mixers: 'Users trying to break historical links after funds enter and leave shared pools.',
    aztec: 'Teams building private smart contracts and private state on an Ethereum L2.',
    railgun:
      'EVM DeFi users and wallet teams that need shielded balances and private dApp actions.',
    transparent: 'Transfers where public traceability is acceptable or required.',
  },
  {
    dimension: 'Privacy model',
    wraith:
      'Fresh stealth addresses plus announcement scanning. The recipient can recognize and spend funds; observers do not get a reusable receiver address.',
    mixers: 'Pool-based flows that try to obscure deposit and withdrawal links.',
    aztec:
      'Private execution, encrypted private state, and public/private composability inside a purpose-built L2.',
    railgun:
      'ZK-shielded private balances where sends, swaps, and DeFi interactions draw from a shared privacy set.',
    transparent:
      'Account addresses, transaction history, and contract activity remain visible to explorers and indexers.',
  },
  {
    dimension: 'Integration surface',
    wraith:
      'SDK and chain adapters for payment flows across Horizen, Stellar, Solana, and CKB testnets.',
    mixers: 'External routing through mixer contracts and withdrawal flows.',
    aztec: 'Aztec.nr, aztec.js, PXE, and a new privacy-preserving virtual machine.',
    railgun: 'Wallet integrations and TypeScript developer tools for EVM chains.',
    transparent: 'Existing wallets, RPC APIs, block explorers, and app-specific indexing.',
  },
  {
    dimension: 'Trade-off',
    wraith:
      'Designed for private receipt and simpler payment integration, not a full private smart-contract environment.',
    mixers: 'High compliance and reputational risk, especially for regulated products.',
    aztec: 'Powerful programmable privacy, with a deeper platform and tooling commitment.',
    railgun:
      'Strong EVM DeFi privacy, but centered on shielded balances rather than cross-chain stealth payment adapters.',
    transparent:
      'Lowest integration cost, but public metadata can expose customers, payroll, vendors, or strategy.',
  },
];

const alternatives = [
  {
    title: 'Tornado Cash-style mixers',
    copy: 'Mixers focus on breaking links between deposits and withdrawals after funds enter shared pools. That model can help with history separation, but it also creates a concentrated compliance story: Treasury sanctioned Tornado Cash in 2022, then removed the economic sanctions in 2025 after reviewing the legal and policy questions. Product teams still need careful risk review before routing users through mixer-style flows.',
    links: [
      {
        label: '2022 Treasury action',
        href: 'https://home.treasury.gov/news/press-releases/jy0916',
      },
      {
        label: '2025 Treasury delisting',
        href: 'https://home.treasury.gov/news/press-releases/sb0057',
      },
    ],
  },
  {
    title: 'Aztec and private rollups',
    copy: 'Aztec is a privacy-first Ethereum L2 for private smart contracts, confidential transactions, and encrypted private state. It is the right mental model when the whole application needs programmable privacy, but it is a larger platform choice than adding private payment receipt to an existing multi-chain app.',
    links: [{ label: 'Aztec docs', href: 'https://docs.aztec.network/' }],
  },
  {
    title: 'RAILGUN',
    copy: 'RAILGUN is on-chain privacy infrastructure for Ethereum, BSC, Polygon, and Arbitrum. Its docs frame the protocol around ZK private balances, private smart-contract usage, and DeFi actions without moving to a separate chain. Wraith is narrower by design: receiver-unlinkable payment addresses and chain adapters for app developers.',
    links: [{ label: 'RAILGUN overview', href: 'https://docs.railgun.org/wiki' }],
  },
  {
    title: 'Transparent status quo',
    copy: 'Default public-chain payments are simple and composable, but block explorers and analytics can follow account addresses, transaction histories, and ledger activity. For user deposits, payroll, grant payouts, or partner payments, that public metadata can reveal more context than the payment itself.',
    links: [
      {
        label: 'Ethereum transactions',
        href: 'https://ethereum.org/developers/docs/transactions',
      },
      {
        label: 'Stellar explorers',
        href: 'https://developers.stellar.org/docs/tools/developer-tools/block-explorers',
      },
    ],
  },
];

const sourceLinks = [
  { label: 'Wraith GitHub', href: 'https://github.com/wraith-protocol' },
  { label: 'ERC-5564', href: 'https://eips.ethereum.org/EIPS/eip-5564' },
  { label: 'ERC-6538', href: 'https://eips.ethereum.org/EIPS/eip-6538' },
];

const columns = [
  { key: 'wraith', label: 'Wraith' },
  { key: 'mixers', label: 'Mixers' },
  { key: 'aztec', label: 'Aztec' },
  { key: 'railgun', label: 'RAILGUN' },
  { key: 'transparent', label: 'Transparent' },
] as const;

export default function Compare() {
  return (
    <section
      id="compare"
      className="scroll-mt-20 border-t border-outline-variant-30 px-6 py-24 md:px-12"
    >
      <div className="mx-auto flex max-w-[1344px] flex-col gap-12">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="flex max-w-[720px] flex-col gap-3">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
              Compare
            </span>
            <h2 className="font-heading text-[28px] font-bold leading-[1.1] tracking-[-1.2px] text-on-surface sm:text-[40px]">
              Where Wraith fits in the privacy stack.
            </h2>
            <p className="font-body text-base leading-[1.6] text-on-surface-variant">
              Wraith is not a mixer or a private L2. It gives apps a smaller primitive:
              receiver-unlinkable payment addresses that work with the chains users already touch.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {sourceLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="border border-outline-variant px-3 py-2 font-mono text-[10px] font-semibold tracking-[1px] text-outline transition-colors duration-150 hover:border-primary hover:text-primary"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto border border-outline-variant bg-surface-container">
          <table className="min-w-[980px] border-collapse text-left">
            <caption className="sr-only">
              Comparison of Wraith against mixers, Aztec, RAILGUN, and public-chain payments.
            </caption>
            <thead>
              <tr className="border-b border-outline-variant">
                <th
                  scope="col"
                  className="w-[160px] bg-surface-container-high px-5 py-4 font-mono text-[10px] font-semibold uppercase tracking-[1.5px] text-outline"
                >
                  Dimension
                </th>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    className="min-w-[164px] px-5 py-4 font-mono text-[10px] font-semibold uppercase tracking-[1.5px] text-on-surface-variant"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => (
                <tr key={row.dimension} className="border-b border-outline-variant last:border-b-0">
                  <th
                    scope="row"
                    className="bg-surface-container-high px-5 py-5 align-top font-heading text-sm font-semibold text-on-surface"
                  >
                    {row.dimension}
                  </th>
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-5 py-5 align-top font-body text-[13px] leading-[1.6] ${
                        column.key === 'wraith' ? 'text-on-surface' : 'text-on-surface-variant'
                      }`}
                    >
                      {row[column.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          {alternatives.map((alternative) => (
            <article
              key={alternative.title}
              className="flex flex-col gap-5 border border-outline-variant bg-surface-container p-7"
            >
              <h3 className="font-heading text-lg font-semibold tracking-[-0.3px] text-on-surface">
                {alternative.title}
              </h3>
              <p className="font-body text-[13px] leading-[1.65] text-on-surface-variant">
                {alternative.copy}
              </p>
              <div className="mt-auto flex flex-wrap gap-3 border-t border-outline-variant-30 pt-4">
                {alternative.links.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-heading text-[11px] font-semibold uppercase tracking-[1.2px] text-primary transition-opacity duration-150 hover:opacity-80"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
