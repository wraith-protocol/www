import { useState, useEffect } from 'react';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    // Check localStorage or prefers-color-scheme
    const savedTheme = localStorage.getItem('wraith-theme') as 'dark' | 'light' | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    setTheme(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);
    const metaTheme = document.querySelector('meta[name="theme-color"]');

    metaTheme?.setAttribute('content', initialTheme === 'dark' ? '#0e0e0e' : '#faf9f7');
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    const metaTheme = document.querySelector('meta[name="theme-color"]');

    metaTheme?.setAttribute('content', newTheme === 'dark' ? '#0e0e0e' : '#faf9f7');
    localStorage.setItem('wraith-theme', newTheme);
  };

  return (
    <header className="fixed top-0 z-50 w-full border-b border-outline-variant-30 bg-surface/80 backdrop-blur-sm">
      <div className="mx-auto flex w-full items-center justify-between px-12 py-5">
        <a href="https://usewraith.xyz" className="flex items-center gap-3">
          <img src="/logo.png" alt="Wraith" className="h-6 opacity-90" />
          <span className="font-heading text-[15px] font-bold tracking-[2px] text-on-surface">
            WRAITH
          </span>
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          <a
            href="https://docs.usewraith.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="font-body text-[13px] text-outline transition-colors duration-150 hover:text-on-surface-variant"
          >
            Docs
          </a>
          <a
            href="https://docs.usewraith.xyz/sdk/overview"
            target="_blank"
            rel="noopener noreferrer"
            className="font-body text-[13px] text-outline transition-colors duration-150 hover:text-on-surface-variant"
          >
            SDK
          </a>
          <a
            href="https://demo.usewraith.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="font-body text-[13px] text-outline transition-colors duration-150 hover:text-on-surface-variant"
          >
            Demo
          </a>
          <a
            href="https://console.usewraith.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="font-body text-[13px] text-outline transition-colors duration-150 hover:text-on-surface-variant"
          >
            Console
          </a>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <button
            onClick={toggleTheme}
            className="font-body text-[13px] text-outline transition-colors duration-150 hover:text-on-surface-variant"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            aria-pressed={theme === 'light'}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <a
            href="https://github.com/wraith-protocol"
            target="_blank"
            rel="noopener noreferrer"
            className="font-body text-[13px] text-outline transition-colors duration-150 hover:text-on-surface-variant"
          >
            GitHub ↗
          </a>
          <a
            href="https://demo.usewraith.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-9 items-center justify-center bg-primary px-5 font-heading text-[11px] font-semibold uppercase tracking-[1.5px] text-surface transition-[filter] duration-150 hover:brightness-110"
          >
            Launch App
          </a>
        </div>

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex flex-col gap-1.5 md:hidden"
          aria-label="Toggle menu"
        >
          <span
            className={`block h-[1.5px] w-5 bg-on-surface transition-transform duration-150 ${menuOpen ? 'translate-y-[3px] rotate-45' : ''}`}
          />
          <span
            className={`block h-[1.5px] w-5 bg-on-surface transition-opacity duration-150 ${menuOpen ? 'opacity-0' : ''}`}
          />
          <span
            className={`block h-[1.5px] w-5 bg-on-surface transition-transform duration-150 ${menuOpen ? '-translate-y-[3px] -rotate-45' : ''}`}
          />
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-outline-variant-30 bg-surface px-6 pb-6 pt-4 md:hidden">
          <nav className="flex flex-col gap-4">
            <button
              onClick={toggleTheme}
              className="font-body text-[13px] text-outline transition-colors duration-150 hover:text-on-surface-variant text-left"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              aria-pressed={theme === 'light'}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            >
              {theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}
            </button>
            <a
              href="https://docs.usewraith.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="font-body text-[13px] text-outline transition-colors duration-150 hover:text-on-surface-variant"
            >
              Docs
            </a>
            <a
              href="https://docs.usewraith.xyz/sdk/overview"
              target="_blank"
              rel="noopener noreferrer"
              className="font-body text-[13px] text-outline transition-colors duration-150 hover:text-on-surface-variant"
            >
              SDK
            </a>
            <a
              href="https://demo.usewraith.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="font-body text-[13px] text-outline transition-colors duration-150 hover:text-on-surface-variant"
            >
              Demo
            </a>
            <a
              href="https://console.usewraith.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="font-body text-[13px] text-outline transition-colors duration-150 hover:text-on-surface-variant"
            >
              Console
            </a>
            <a
              href="https://github.com/wraith-protocol"
              target="_blank"
              rel="noopener noreferrer"
              className="font-body text-[13px] text-outline transition-colors duration-150 hover:text-on-surface-variant"
            >
              GitHub ↗
            </a>
            <a
              href="https://demo.usewraith.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex h-9 items-center justify-center bg-primary font-heading text-[11px] font-semibold uppercase tracking-[1.5px] text-surface transition-[filter] duration-150 hover:brightness-110"
            >
              Launch App
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
