const BRAND_COLORS = [
  { name: 'Surface', hex: '#0e0e0e', label: 'Background' },
  { name: 'Primary', hex: '#c6c6c7', label: 'Primary' },
  { name: 'On-Surface', hex: '#e6e1e5', label: 'Text' },
  { name: 'Accent Green', hex: '#22c55e', label: 'Tertiary' },
  { name: 'Accent Blue', hex: '#60a5fa', label: 'Blue' },
];

const LOGOS = [
  { file: 'wraith-logo-dark.svg', label: 'Logo — Dark variant', bg: 'bg-surface' },
  { file: 'wraith-logo-light.svg', label: 'Logo — Light variant', bg: 'bg-white' },
  { file: 'wraith-mark-dark.svg', label: 'Mark — Dark variant', bg: 'bg-surface' },
  { file: 'wraith-mark-light.svg', label: 'Mark — Light variant', bg: 'bg-white' },
];

const COVERAGE: { outlet: string; title: string; date: string; href: string }[] = [];

function CopyBlock({ children }: { children: string }) {
  const copy = () => navigator.clipboard.writeText(children);
  return (
    <div className="relative border border-outline-variant bg-surface-container p-4">
      <p className="pr-16 font-body text-[13px] leading-[1.65] text-on-surface-variant whitespace-pre-wrap">
        {children}
      </p>
      <button
        onClick={copy}
        className="absolute right-3 top-3 font-mono text-[10px] font-semibold tracking-[1.5px] text-outline transition-colors duration-150 hover:text-on-surface-variant"
      >
        COPY
      </button>
    </div>
  );
}

export default function Press() {
  return (
    <div className="min-h-screen bg-surface text-on-surface">
      {/* Header */}
      <header className="fixed top-0 z-50 w-full border-b border-outline-variant-30 bg-surface/80 backdrop-blur-sm">
        <div className="mx-auto flex w-full items-center justify-between px-12 py-5">
          <a href="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="Wraith" className="h-6 opacity-90" />
            <span className="font-heading text-[15px] font-bold tracking-[2px] text-on-surface">
              WRAITH
            </span>
          </a>
          <a
            href="/"
            className="font-body text-[13px] text-outline transition-colors duration-150 hover:text-on-surface-variant"
          >
            ← Home
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 pb-24 pt-32 md:px-12">
        {/* Page title */}
        <div className="mb-16 flex flex-col gap-3">
          <span className="font-mono text-[10px] font-semibold tracking-[1.5px] text-outline">
            PRESS KIT
          </span>
          <h1 className="font-heading text-4xl font-bold tracking-tight text-on-surface md:text-5xl">
            Brand Resources
          </h1>
          <p className="font-body text-[15px] leading-[1.6] text-on-surface-variant">
            Assets, copy, and contacts for press and partners.
          </p>
        </div>

        <div className="flex flex-col gap-16">
          {/* Descriptions */}
          <section className="flex flex-col gap-4">
            <h2 className="font-mono text-[10px] font-semibold tracking-[1.5px] text-outline">
              DESCRIPTIONS
            </h2>

            <div className="flex flex-col gap-2">
              <p className="font-body text-[12px] text-outline">One-line</p>
              <CopyBlock>
                Wraith Protocol is an open-source stealth-address toolkit for private, unlinkable
                payments across EVM, Stellar, Solana, and CKB.
              </CopyBlock>
            </div>

            <div className="flex flex-col gap-2">
              <p className="font-body text-[12px] text-outline">50-word</p>
              <CopyBlock>
                {`Wraith Protocol is an open-source, multi-chain stealth-address toolkit built on ERC-5564 and ERC-6538. It lets developers add receiver-unlinkable private payments to any app in minutes. Wraith supports EVM chains, Stellar (with memo-enabled stealth), Solana, and CKB — shipping as a 14.2 KB TypeScript SDK with zero external dependencies.`}
              </CopyBlock>
            </div>

            <div className="flex flex-col gap-2">
              <p className="font-body text-[12px] text-outline">Boilerplate (~200 words)</p>
              <CopyBlock>
                {`Wraith Protocol is an open-source, developer-first stealth-address infrastructure layer designed to bring practical financial privacy to every blockchain ecosystem. Built on the ERC-5564 and ERC-6538 standards, Wraith enables receiver-unlinkable payments — where each transaction is sent to a one-time stealth address that only the intended recipient can discover and spend from, breaking the on-chain link between sender and receiver.

Wraith ships as a lightweight TypeScript SDK (14.2 KB gzipped) with first-class support for EVM-compatible chains via Horizen, Stellar with memo-enabled stealth flows, Solana, and CKB. Developers can integrate private payments into wallets, dApps, and payment flows in minutes without running any off-chain infrastructure.

Beyond the SDK, Wraith provides a hosted stealth-address registry, a non-custodial web console for end users, and an open demo that illustrates the full send-scan-withdraw lifecycle. The protocol is live on four testnets and is a Stellar Wave grantee through the Stellar Development Foundation's Drips program.

Wraith Protocol was founded with the conviction that privacy is not a premium feature — it is a baseline expectation for financial infrastructure, and open standards are the fastest path to making it universal.`}
              </CopyBlock>
            </div>
          </section>

          {/* Logo downloads */}
          <section className="flex flex-col gap-4">
            <h2 className="font-mono text-[10px] font-semibold tracking-[1.5px] text-outline">
              LOGOS
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {LOGOS.map(({ file, label, bg }) => (
                <div
                  key={file}
                  className="flex flex-col overflow-hidden border border-outline-variant"
                >
                  <div className={`flex h-28 items-center justify-center p-6 ${bg}`}>
                    <img src={`/press-kit/${file}`} alt={label} className="max-h-14 max-w-full" />
                  </div>
                  <div className="flex items-center justify-between border-t border-outline-variant bg-surface-container px-4 py-3">
                    <span className="font-mono text-[11px] text-on-surface-variant">{label}</span>
                    <a
                      href={`/press-kit/${file}`}
                      download
                      className="font-mono text-[10px] font-semibold tracking-[1.5px] text-outline transition-colors duration-150 hover:text-on-surface-variant"
                    >
                      SVG ↓
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Brand colors */}
          <section className="flex flex-col gap-4">
            <h2 className="font-mono text-[10px] font-semibold tracking-[1.5px] text-outline">
              BRAND COLORS
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {BRAND_COLORS.map(({ name, hex }) => (
                <button
                  key={hex}
                  onClick={() => navigator.clipboard.writeText(hex)}
                  className="group flex flex-col overflow-hidden border border-outline-variant transition-colors duration-150 hover:border-outline"
                  title={`Copy ${hex}`}
                >
                  <div
                    className="h-16 w-full border-b border-outline-variant"
                    style={{ backgroundColor: hex }}
                  />
                  <div className="flex flex-col gap-0.5 bg-surface-container px-2.5 py-2">
                    <span className="font-mono text-[10px] font-semibold tracking-[1px] text-on-surface-variant">
                      {name}
                    </span>
                    <span className="font-mono text-[10px] text-outline group-hover:text-primary transition-colors duration-150">
                      {hex}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            <p className="font-body text-[11px] text-outline">
              Click a swatch to copy the hex value.
            </p>
          </section>

          {/* Typography */}
          <section className="flex flex-col gap-4">
            <h2 className="font-mono text-[10px] font-semibold tracking-[1.5px] text-outline">
              TYPOGRAPHY
            </h2>
            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href="https://fonts.google.com/specimen/Space+Grotesk"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 flex-col gap-2 border border-outline-variant bg-surface-container p-5 transition-colors duration-150 hover:border-outline"
              >
                <span className="font-heading text-2xl font-bold text-on-surface">
                  Space Grotesk
                </span>
                <span className="font-mono text-[10px] font-semibold tracking-[1.5px] text-outline">
                  HEADINGS · GOOGLE FONTS ↗
                </span>
              </a>
              <a
                href="https://fonts.google.com/specimen/Inter"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 flex-col gap-2 border border-outline-variant bg-surface-container p-5 transition-colors duration-150 hover:border-outline"
              >
                <span className="font-body text-2xl font-normal text-on-surface">Inter</span>
                <span className="font-mono text-[10px] font-semibold tracking-[1.5px] text-outline">
                  BODY · GOOGLE FONTS ↗
                </span>
              </a>
            </div>
          </section>

          {/* Media coverage */}
          {COVERAGE.length > 0 && (
            <section className="flex flex-col gap-4">
              <h2 className="font-mono text-[10px] font-semibold tracking-[1.5px] text-outline">
                MEDIA COVERAGE
              </h2>
              <div className="flex flex-col gap-0">
                {COVERAGE.map(({ outlet, title, date, href }) => (
                  <a
                    key={href}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between border-b border-outline-variant py-4 transition-colors duration-150 first:border-t hover:bg-surface-bright"
                  >
                    <div className="flex flex-col gap-0.5 px-1">
                      <span className="font-mono text-[10px] font-semibold tracking-[1px] text-outline">
                        {outlet}
                      </span>
                      <span className="font-body text-[14px] text-on-surface">{title}</span>
                    </div>
                    <span className="shrink-0 pl-6 font-mono text-[10px] text-outline">{date}</span>
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Download all */}
          <section className="flex flex-col gap-4">
            <h2 className="font-mono text-[10px] font-semibold tracking-[1.5px] text-outline">
              DOWNLOAD
            </h2>
            <p className="font-body text-[13px] leading-[1.6] text-on-surface-variant">
              Individual SVG files are available above. A ZIP archive of the full press kit is
              available on request — email us at{' '}
              <a
                href="mailto:press@usewraith.xyz"
                className="text-primary underline underline-offset-2"
              >
                press@usewraith.xyz
              </a>
              .
            </p>
          </section>

          {/* Press contact */}
          <section className="flex flex-col gap-4 border-t border-outline-variant pt-12">
            <h2 className="font-mono text-[10px] font-semibold tracking-[1.5px] text-outline">
              PRESS CONTACT
            </h2>
            <a
              href="mailto:press@usewraith.xyz"
              className="font-heading text-xl font-semibold text-primary transition-opacity duration-150 hover:opacity-80"
            >
              press@usewraith.xyz
            </a>
            <p className="font-body text-[13px] leading-[1.6] text-on-surface-variant">
              For interview requests, partnership inquiries, or asset usage questions. We aim to
              respond within one business day.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
