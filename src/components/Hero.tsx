import { useState } from 'react';

type CodeLine = {
  content: string;
  color: 'code' | 'comment' | 'highlight';
};

const tabs = ['send.ts', 'scan.ts', 'withdraw.ts'] as const;
type Tab = (typeof tabs)[number];

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

export default function Hero() {
  const [activeTab, setActiveTab] = useState<Tab>('send.ts');
  const [copied, setCopied] = useState(false);

  const lines = codeByTab[activeTab];

  const handleCopy = () => {
    const text = lines.map((l) => l.content).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <section className="flex w-full flex-col gap-16 px-6 pt-24 pb-[120px] md:flex-row md:gap-16 md:px-12 md:pt-24 lg:gap-16">
      <div className="flex w-full flex-col gap-8 pt-16 md:w-1/2">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 border border-outline-variant px-2.5 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-tertiary" />
            <span className="font-mono text-[10px] font-semibold tracking-[1.5px] text-on-surface-variant">
              LIVE ON 4 TESTNETS
            </span>
          </div>
          <div className="rounded-sm border border-tertiary px-2.5 py-1.5">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[1.5px] text-tertiary">
              Stellar partner
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
        <p className="font-body text-[14px] leading-[1.6] text-tertiary">
          Memo-enabled stealth support on Stellar, plus coordinated privacy flows for multi-chain
          apps.
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
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
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
            onClick={handleCopy}
            className="flex cursor-pointer items-center gap-1.5 px-2 py-1 transition-colors duration-150 hover:opacity-80"
          >
            <span className="font-mono text-[10px] font-semibold tracking-[1px] text-outline">
              {copied ? 'COPIED' : 'COPY'}
            </span>
          </button>
        </div>

        <div className="overflow-x-auto border border-outline-variant bg-surface-container p-6">
          <div className="w-max min-w-full">
            {lines.map((line, i) => (
              <div key={`${activeTab}-${i}`} className="flex gap-4 py-1">
                <span className="w-4 shrink-0 font-mono text-xs text-outline-variant select-none">
                  {i + 1}
                </span>
                <span className={`whitespace-pre font-mono text-[13px] ${colorMap[line.color]}`}>
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
