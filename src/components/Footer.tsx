const links = [
  { label: 'Docs', href: 'https://docs.usewraith.xyz' },
  { label: 'Demo', href: 'https://demo.usewraith.xyz' },
  { label: 'Console', href: 'https://console.usewraith.xyz' },
  { label: 'GitHub', href: 'https://github.com/wraith-protocol' },
  { label: 'npm', href: 'https://www.npmjs.com/package/@wraith-protocol/sdk' },
];

export default function Footer() {
  return (
    <footer className="border-t border-outline-variant px-6 py-12">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-8 md:flex-row md:justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo-white.png" alt="Wraith Protocol" className="h-6 w-6" />
          <span className="font-heading text-sm font-semibold text-on-surface">
            Wraith Protocol
          </span>
        </div>
        <nav className="flex flex-wrap justify-center gap-6">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm text-on-surface-variant transition-opacity hover:opacity-80"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <p className="font-mono text-xs text-outline">Built with stealth</p>
      </div>
    </footer>
  );
}
