export default function Header() {
  return (
    <header className="fixed top-0 z-50 w-full border-b border-outline-variant bg-surface/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <a href="https://usewraith.xyz" className="flex items-center gap-3">
          <img src="/logo-white.png" alt="Wraith Protocol" className="h-8 w-8" />
          <span className="font-heading text-base font-semibold text-on-surface">
            Wraith Protocol
          </span>
        </a>
        <nav className="flex items-center gap-6">
          <a
            href="https://docs.usewraith.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-on-surface-variant transition-opacity hover:opacity-80"
          >
            Docs
          </a>
          <a
            href="https://demo.usewraith.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-on-surface-variant transition-opacity hover:opacity-80"
          >
            Demo
          </a>
          <a
            href="https://console.usewraith.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-on-surface-variant transition-opacity hover:opacity-80"
          >
            Console
          </a>
        </nav>
      </div>
    </header>
  );
}
