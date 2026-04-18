const chains = [
  {
    name: 'Horizen',
    active: true,
    status: 'LIVE ON TESTNET',
    meta: 'EVM · TEE-secured · ERC-5564',
    border: true,
  },
  {
    name: 'Stellar',
    active: true,
    status: 'LIVE ON TESTNET',
    meta: 'Soroban · Memo-based',
    border: true,
  },
  {
    name: 'Solana',
    active: true,
    status: 'LIVE ON DEVNET',
    meta: 'SPL tokens · Memo program',
    border: true,
  },
  {
    name: 'Nervos CKB',
    active: true,
    status: 'LIVE ON TESTNET',
    meta: 'Cell model · CCC integration',
    border: false,
  },
];

export default function Chains() {
  return (
    <section className="border-t border-outline-variant-30 px-6 py-24 md:px-12">
      <div className="mx-auto flex max-w-[1344px] flex-col gap-10">
        <div className="flex flex-col gap-3">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
            Supported Chains
          </span>
          <h2 className="font-heading text-[28px] font-bold tracking-[-1.2px] text-on-surface sm:text-[40px]">
            Built for a multi-chain world.
          </h2>
        </div>

        <div className="grid grid-cols-2 border-y border-outline-variant md:grid-cols-4">
          {chains.map((chain) => (
            <div
              key={chain.name}
              className={`flex flex-col gap-4 p-6 md:p-7 ${chain.border ? 'border-b border-outline-variant md:border-r md:border-b-0' : ''}`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`font-heading text-lg font-semibold ${chain.active ? 'text-on-surface' : 'text-outline'}`}
                >
                  {chain.name}
                </span>
                <span
                  className={`h-2 w-2 rounded-full ${chain.active ? 'bg-tertiary' : 'bg-outline-variant'}`}
                />
              </div>
              <span
                className={`font-mono text-[10px] font-semibold tracking-[1.5px] ${chain.active ? 'text-tertiary' : 'text-outline'}`}
              >
                {chain.status}
              </span>
              <span
                className={`font-mono text-[11px] ${chain.active ? 'text-outline' : 'text-outline-variant'}`}
              >
                {chain.meta}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
