const codeLines = [
  {
    num: '1',
    content: "import { Wraith } from '@wraith-protocol/sdk'",
    color: 'text-on-surface-variant',
  },
  { num: '2', content: ' ', color: 'text-on-surface-variant' },
  {
    num: '3',
    content: "const wraith = new Wraith({ chain: 'horizen' })",
    color: 'text-on-surface-variant',
  },
  { num: '4', content: ' ', color: 'text-on-surface-variant' },
  {
    num: '5',
    content: "// derive a stealth address from the recipient's meta-address",
    color: 'text-outline',
  },
  {
    num: '6',
    content: 'const { stealthAddress, ephemeralPubKey } =',
    color: 'text-on-surface-variant',
  },
  { num: '7', content: '  await wraith.deriveStealthAddress(metaAddress)', color: 'text-primary' },
  { num: '8', content: ' ', color: 'text-on-surface-variant' },
  {
    num: '9',
    content: '// send — the recipient sees this on-chain, but nobody else can',
    color: 'text-outline',
  },
  { num: '10', content: '// link it to the receiver.', color: 'text-outline' },
  {
    num: '11',
    content: 'await wraith.send({ stealthAddress, amount, ephemeralPubKey })',
    color: 'text-on-surface-variant',
  },
];

export default function Hero() {
  return (
    <section className="flex w-full flex-col gap-16 px-6 pt-24 pb-[120px] md:flex-row md:gap-16 md:px-12 md:pt-24 lg:gap-16">
      <div className="flex w-full flex-col gap-8 pt-16 md:w-1/2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 border border-outline-variant px-2.5 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-tertiary" />
            <span className="font-mono text-[10px] font-semibold tracking-[1.5px] text-on-surface-variant">
              v0.4.2 — HORIZEN TESTNET LIVE
            </span>
          </div>
        </div>

        <h1 className="font-heading text-[40px] font-bold leading-[1.05] tracking-[-2.5px] text-on-surface sm:text-[56px] md:text-[72px]">
          Private payments{'\n'}for every chain.
        </h1>

        <p className="font-body text-[17px] leading-[1.6] text-on-surface-variant">
          A stealth-address toolkit built on ERC-5564 and ERC-6538. Drop it into your app and send
          receiver-unlinkable payments across Horizen, Stellar, Solana, and CKB.
        </p>

        <div className="flex items-center gap-3">
          <a
            href="https://docs.usewraith.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-12 items-center justify-center bg-primary px-7 font-heading text-[13px] font-semibold uppercase tracking-[1.5px] text-surface transition-[filter] duration-150 hover:brightness-110"
          >
            Read the Docs
          </a>
          <a
            href="https://demo.usewraith.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-12 items-center justify-center border border-outline-variant px-7 font-heading text-[13px] font-semibold uppercase tracking-[1.5px] text-primary transition-colors duration-150 hover:bg-surface-bright"
          >
            Try the Demo
          </a>
        </div>

        <div className="flex items-center gap-8 pt-6">
          <div className="flex flex-col gap-1">
            <span className="font-mono text-[10px] font-semibold tracking-[1.5px] text-outline">
              CHAINS SUPPORTED
            </span>
            <span className="font-heading text-xl font-bold text-on-surface">4</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-mono text-[10px] font-semibold tracking-[1.5px] text-outline">
              SDK BUNDLE
            </span>
            <span className="font-heading text-xl font-bold text-on-surface">14.2 KB</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-mono text-[10px] font-semibold tracking-[1.5px] text-outline">
              ERC STANDARD
            </span>
            <span className="font-heading text-xl font-bold text-on-surface">5564 / 6538</span>
          </div>
        </div>
      </div>

      <div className="flex w-full flex-col md:w-1/2">
        <div className="flex items-center justify-between border border-b-0 border-outline-variant bg-surface-container px-4 py-3">
          <div className="flex items-center gap-0">
            <div className="flex items-center justify-center bg-surface-bright px-3 py-1.5">
              <span className="font-mono text-[11px] font-medium text-on-surface">send.ts</span>
            </div>
            <div className="flex items-center justify-center px-3 py-1.5">
              <span className="font-mono text-[11px] text-outline">scan.ts</span>
            </div>
            <div className="flex items-center justify-center px-3 py-1.5">
              <span className="font-mono text-[11px] text-outline">withdraw.ts</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1">
            <span className="font-mono text-[10px] font-semibold tracking-[1px] text-outline">
              COPY
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2 border border-outline-variant bg-surface-container p-6">
          {codeLines.map((line) => (
            <div key={line.num} className="flex gap-4">
              <span className="font-mono text-xs text-outline-variant select-none">{line.num}</span>
              <span className={`font-mono text-[13px] ${line.color}`}>{line.content}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border border-t-0 border-outline-variant bg-surface-container px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-tertiary" />
            <span className="font-mono text-[11px] text-on-surface-variant">
              npm i @wraith-protocol/sdk
            </span>
          </div>
          <span className="font-mono text-[10px] font-semibold tracking-[1.5px] text-outline">
            TYPESCRIPT
          </span>
        </div>
      </div>
    </section>
  );
}
