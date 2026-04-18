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
        "import { generateStealthAddress, buildSendStealth } from '@wraith-protocol/sdk/chains/evm'",
      color: 'code',
    },
    { content: '', color: 'code' },
    { content: '// generate a one-time stealth address for the recipient', color: 'comment' },
    {
      content: 'const stealth = generateStealthAddress(spendingPubKey, viewingPubKey)',
      color: 'highlight',
    },
    { content: '', color: 'code' },
    { content: '// build the transaction — atomic send + announce', color: 'comment' },
    { content: 'const tx = buildSendStealth({', color: 'code' },
    { content: '  stealthAddress: stealth.stealthAddress,', color: 'code' },
    { content: '  ephemeralPubKey: stealth.ephemeralPubKey,', color: 'code' },
    { content: '  viewTag: stealth.viewTag,', color: 'code' },
    { content: "  amount: parseEther('0.1'),", color: 'highlight' },
    { content: '})', color: 'code' },
  ],
  'scan.ts': [
    {
      content:
        "import { deriveStealthKeys, scanAnnouncements, fetchAnnouncements } from '@wraith-protocol/sdk/chains/evm'",
      color: 'code',
    },
    { content: '', color: 'code' },
    { content: '// derive stealth keys from wallet signature', color: 'comment' },
    { content: 'const keys = deriveStealthKeys(signature)', color: 'code' },
    { content: '', color: 'code' },
    { content: '// fetch on-chain announcements and scan for your payments', color: 'comment' },
    { content: "const announcements = await fetchAnnouncements('horizen')", color: 'code' },
    { content: 'const matched = scanAnnouncements(', color: 'code' },
    {
      content: '  announcements, keys.viewingKey, keys.spendingPubKey, keys.spendingKey',
      color: 'highlight',
    },
    { content: ')', color: 'code' },
  ],
  'withdraw.ts': [
    {
      content: "import { deriveStealthPrivateKey } from '@wraith-protocol/sdk/chains/evm'",
      color: 'code',
    },
    { content: '', color: 'code' },
    { content: '// derive the private key that controls the stealth address', color: 'comment' },
    { content: 'const stealthPrivKey = deriveStealthPrivateKey(', color: 'code' },
    { content: '  keys.spendingKey, ann.ephemeralPubKey, keys.viewingKey', color: 'highlight' },
    { content: ')', color: 'code' },
    { content: '', color: 'code' },
    { content: '// send funds to any destination', color: 'comment' },
    { content: 'const account = privateKeyToAccount(stealthPrivKey)', color: 'code' },
    { content: 'await walletClient.sendTransaction({', color: 'code' },
    { content: '  account, to: destination, value: amount', color: 'highlight' },
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
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 border border-outline-variant px-2.5 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-tertiary" />
            <span className="font-mono text-[10px] font-semibold tracking-[1.5px] text-on-surface-variant">
              LIVE ON 4 TESTNETS — HORIZEN · STELLAR · SOLANA · CKB
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
