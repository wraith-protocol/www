const columns = [
  {
    title: 'PRODUCT',
    links: [
      { label: 'Docs', href: 'https://docs.usewraith.xyz' },
      { label: 'Demo', href: 'https://demo.usewraith.xyz' },
      { label: 'Console', href: 'https://console.usewraith.xyz' },
      { label: 'Changelog', href: 'https://docs.usewraith.xyz/changelog' },
    ],
  },
  {
    title: 'DEVELOPERS',
    links: [
      { label: 'SDK', href: 'https://docs.usewraith.xyz/sdk/overview' },
      { label: 'API Reference', href: 'https://docs.usewraith.xyz/api' },
      { label: 'GitHub', href: 'https://github.com/wraith-protocol' },
      { label: 'npm', href: 'https://www.npmjs.com/package/@wraith-protocol/sdk' },
    ],
  },
  {
    title: 'RESOURCES',
    links: [
      { label: 'ERC-5564 spec', href: 'https://eips.ethereum.org/EIPS/eip-5564' },
      { label: 'ERC-6538 spec', href: 'https://eips.ethereum.org/EIPS/eip-6538' },
      { label: 'Horizen docs', href: 'https://docs.horizen.io' },
      { label: 'Security', href: 'https://docs.usewraith.xyz/security' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="px-6 pb-8 pt-12 md:px-12">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col justify-between gap-12 md:flex-row">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-6 w-6 items-center justify-center bg-primary">
                <span className="font-heading text-sm font-bold text-surface">W</span>
              </div>
              <span className="font-heading text-[13px] font-bold tracking-[2px] text-on-surface">
                WRAITH PROTOCOL
              </span>
            </div>
            <p className="max-w-[240px] font-body text-[13px] leading-[1.5] text-outline">
              Private payments, plainly.
            </p>
          </div>

          <div className="flex flex-wrap gap-12">
            {columns.map((column) => (
              <div key={column.title} className="flex flex-col gap-3">
                <span className="font-mono text-[10px] font-semibold tracking-[1.5px] text-outline">
                  {column.title}
                </span>
                {column.links.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-body text-[13px] text-on-surface-variant transition-colors duration-150 hover:text-on-surface"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-start justify-between gap-4 border-t border-outline-variant-30 pt-5 sm:flex-row sm:items-center">
          <span className="font-mono text-[10px] font-semibold tracking-[1.5px] text-outline">
            BUILT ON HORIZEN · ERC-5564 · OPEN SOURCE
          </span>
          <div className="flex items-center gap-6">
            <a
              href="https://usewraith.xyz/privacy"
              className="font-body text-xs text-outline transition-colors duration-150 hover:text-on-surface-variant"
            >
              Privacy
            </a>
            <a
              href="https://usewraith.xyz/terms"
              className="font-body text-xs text-outline transition-colors duration-150 hover:text-on-surface-variant"
            >
              Terms
            </a>
            <a
              href="https://usewraith.xyz/.well-known/security.txt"
              className="font-body text-xs text-outline transition-colors duration-150 hover:text-on-surface-variant"
            >
              Security.txt
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
