const chains = [
  { name: 'Horizen', active: true },
  { name: 'Stellar', active: true },
  { name: 'Ethereum', active: false },
  { name: 'Polygon', active: false },
  { name: 'Base', active: false },
  { name: 'Solana', active: false },
];

export default function Chains() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <h2 className="font-heading text-center text-3xl font-bold text-on-surface md:text-4xl">
          Supported chains
        </h2>
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6">
          {chains.map((chain) => (
            <div
              key={chain.name}
              className={`border px-6 py-3 font-mono text-sm ${
                chain.active
                  ? 'border-outline-variant text-primary'
                  : 'border-outline-variant text-outline'
              }`}
            >
              {chain.name}
              {!chain.active && <span className="ml-2 text-xs text-outline">coming soon</span>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
