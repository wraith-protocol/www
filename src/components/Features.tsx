const features = [
  {
    num: '01',
    title: 'Stealth Addresses',
    description:
      "Every incoming payment lands at a fresh, unlinkable address derived from the recipient's meta-address. Public chains, private receivers.",
    meta: 'ERC-5564 · ERC-6538',
  },
  {
    num: '02',
    title: 'Fast Scanning',
    description:
      "Indexed announcement events via Goldsky so clients scan a wallet's incoming stealth payments in seconds, not minutes.",
    meta: 'Goldsky subgraphs',
  },
  {
    num: '03',
    title: 'Multi-chain Core',
    description:
      'One API for Horizen, Stellar, Solana, and CKB. Chain-specific wallet adapters ship with the SDK — you write application code, not protocol code.',
    meta: '4 chains · more coming',
  },
];

export default function Features() {
  return (
    <section className="border-t border-outline-variant-30 px-6 py-24 md:px-12">
      <div className="mx-auto flex max-w-[1344px] flex-col gap-12">
        <div className="flex flex-col gap-3">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
            Why Wraith
          </span>
          <h2 className="font-heading text-[28px] font-bold leading-[1.1] tracking-[-1.2px] text-on-surface sm:text-[40px]">
            Everything you need{'\n'}for stealth payments.
          </h2>
          <p className="font-body text-base leading-[1.6] text-on-surface-variant">
            Three primitives, wired correctly. No custom crypto on your side.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.num}
              className="flex flex-col gap-4 border border-outline-variant bg-surface-container p-7"
            >
              <span className="font-mono text-[11px] font-semibold tracking-[1.5px] text-outline">
                {feature.num}
              </span>
              <h3 className="font-heading text-xl font-semibold tracking-[-0.5px] text-on-surface">
                {feature.title}
              </h3>
              <p className="font-body text-[13px] leading-[1.65] text-on-surface-variant">
                {feature.description}
              </p>
              <div className="flex items-center gap-2 border-t border-outline-variant-30 pt-3">
                <span className="font-mono text-[11px] text-outline">{feature.meta}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
