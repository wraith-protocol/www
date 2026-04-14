const codeLines = [
  {
    tokens: [
      { text: 'import', color: 'text-error' },
      { text: ' { buildSendStealth } ', color: 'text-on-surface' },
      { text: 'from', color: 'text-error' },
      { text: ' "@wraith-protocol/sdk/chains/evm"', color: 'text-tertiary' },
      { text: ';', color: 'text-on-surface-variant' },
    ],
  },
  { tokens: [] },
  {
    tokens: [
      { text: 'const', color: 'text-error' },
      { text: ' { transaction } = ', color: 'text-on-surface' },
      { text: 'buildSendStealth', color: 'text-primary' },
      { text: '({', color: 'text-on-surface-variant' },
    ],
  },
  {
    tokens: [
      { text: '  recipientMetaAddress', color: 'text-on-surface' },
      { text: ': ', color: 'text-on-surface-variant' },
      { text: '"st:eth:0x..."', color: 'text-tertiary' },
      { text: ',', color: 'text-on-surface-variant' },
    ],
  },
  {
    tokens: [
      { text: '  amount', color: 'text-on-surface' },
      { text: ': ', color: 'text-on-surface-variant' },
      { text: '"0.1"', color: 'text-tertiary' },
      { text: ',', color: 'text-on-surface-variant' },
    ],
  },
  {
    tokens: [
      { text: '  chain', color: 'text-on-surface' },
      { text: ': ', color: 'text-on-surface-variant' },
      { text: '"horizen"', color: 'text-tertiary' },
      { text: ',', color: 'text-on-surface-variant' },
    ],
  },
  { tokens: [{ text: '});', color: 'text-on-surface-variant' }] },
];

export default function Hero() {
  return (
    <section className="flex min-h-screen flex-col items-center justify-center px-6 py-24">
      <h1 className="font-heading text-center text-5xl font-bold tracking-tight text-on-surface md:text-7xl">
        Private payments for every chain
      </h1>
      <p className="mt-6 max-w-xl text-center text-lg text-on-surface-variant">
        Send and receive payments on any blockchain without revealing the recipient. Powered by
        stealth addresses.
      </p>
      <div className="mt-10 flex gap-4">
        <a
          href="https://docs.usewraith.xyz"
          className="bg-primary px-6 py-3 font-heading text-sm font-semibold text-surface transition-opacity hover:opacity-80"
        >
          Read the Docs
        </a>
        <a
          href="https://demo.usewraith.xyz"
          className="border border-outline-variant px-6 py-3 font-heading text-sm font-semibold text-on-surface transition-opacity hover:opacity-80"
        >
          Try the Demo
        </a>
      </div>
      <div className="mt-16 w-full max-w-2xl overflow-x-auto border border-outline-variant bg-surface-container p-6">
        <pre className="font-mono text-sm leading-relaxed">
          {codeLines.map((line, i) => (
            <div key={i}>
              {line.tokens.length === 0
                ? '\n'
                : line.tokens.map((token, j) => (
                    <span key={j} className={token.color}>
                      {token.text}
                    </span>
                  ))}
            </div>
          ))}
        </pre>
      </div>
    </section>
  );
}
