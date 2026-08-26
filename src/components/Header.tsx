import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { changeLocale, Locale } from '../i18n';

export default function Header() {
  const { t, i18n } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const currentLocale = (i18n.language.split('-')[0] ?? 'en') as Locale;
  const nextLocale: Locale = currentLocale === 'en' ? 'es' : 'en';

  useEffect(() => {
    if (!menuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
        return;
      }

      if (event.key !== 'Tab' || !menuRef.current) return;

      const focusable = Array.from(
        menuRef.current.querySelectorAll<HTMLAnchorElement | HTMLButtonElement>(
          'a[href], button:not([disabled])',
        ),
      );

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="fixed top-0 z-50 w-full border-b border-outline-variant-30 bg-surface/80 backdrop-blur-sm">
      <div className="mx-auto flex w-full items-center justify-between px-12 py-5">
        <a href="https://usewraith.xyz" className="flex items-center gap-3">
          <img src="/logo.png" alt="" width={30} height={24} className="h-6 opacity-90" />
          <span className="font-heading text-[15px] font-bold tracking-[2px] text-on-surface">
            {t('header.brand')}
          </span>
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          <a
            href="https://docs.usewraith.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="font-body text-[13px] text-outline transition-colors duration-150 hover:text-on-surface-variant"
          >
            {t('header.nav.docs')}
          </a>
          <a
            href="https://docs.usewraith.xyz/sdk/overview"
            target="_blank"
            rel="noopener noreferrer"
            className="font-body text-[13px] text-outline transition-colors duration-150 hover:text-on-surface-variant"
          >
            {t('header.nav.sdk')}
          </a>
          <a
            href="https://demo.usewraith.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="font-body text-[13px] text-outline transition-colors duration-150 hover:text-on-surface-variant"
          >
            {t('header.nav.demo')}
          </a>
          <a
            href="https://console.usewraith.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="font-body text-[13px] text-outline transition-colors duration-150 hover:text-on-surface-variant"
          >
            {t('header.nav.console')}
          </a>
          <a
            href="/press"
            className="font-body text-[13px] text-outline transition-colors duration-150 hover:text-on-surface-variant"
          >
            {t('header.nav.press')}
          </a>
          <a
            href="/use-cases"
            className="font-body text-[13px] text-outline transition-colors duration-150 hover:text-on-surface-variant"
          >
            {t('header.nav.useCases')}
          </a>
          <Link
            to="/grants"
            className="font-body text-[13px] text-outline transition-colors duration-150 hover:text-on-surface-variant"
          >
            {t('header.nav.grants')}
          </Link>
          <Link
            to="/stellar"
            className="font-body text-[13px] text-outline transition-colors duration-150 hover:text-on-surface-variant"
          >
            Stellar
          </Link>
          <Link
            to="/roadmap"
            className="font-body text-[13px] text-outline transition-colors duration-150 hover:text-on-surface-variant"
          >
            {t('header.nav.roadmap')}
          </Link>
          <Link
            to="/blog"
            className="font-body text-[13px] text-outline transition-colors duration-150 hover:text-on-surface-variant"
          >
            {t('header.nav.blog')}
          </Link>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <button
            onClick={toggleTheme}
            className="font-body text-[13px] text-outline transition-colors duration-150 hover:text-on-surface-variant"
            aria-label={t(
              theme === 'dark' ? 'header.theme.switchToLight' : 'header.theme.switchToDark',
            )}
            aria-pressed={theme === 'light'}
            title={t(theme === 'dark' ? 'header.theme.switchToLight' : 'header.theme.switchToDark')}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button
            onClick={() => changeLocale(nextLocale)}
            className="font-body text-[13px] text-outline transition-colors duration-150 hover:text-on-surface-variant"
            aria-label={t('header.locale.switchTo', { lang: nextLocale.toUpperCase() })}
            title={t('header.locale.switchTo', { lang: nextLocale.toUpperCase() })}
          >
            {nextLocale.toUpperCase()}
          </button>
          <a
            href="https://github.com/wraith-protocol"
            target="_blank"
            rel="noopener noreferrer"
            className="font-body text-[13px] text-outline transition-colors duration-150 hover:text-on-surface-variant"
          >
            {t('header.github')}
          </a>
          <a
            href="https://demo.usewraith.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-9 items-center justify-center bg-primary px-5 font-heading text-[11px] font-semibold uppercase tracking-[1.5px] text-surface transition-[filter] duration-150 hover:brightness-110"
          >
            {t('header.launchApp')}
          </a>
        </div>

        <button
          ref={menuButtonRef}
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex flex-col gap-1.5 md:hidden"
          aria-controls="mobile-menu"
          aria-expanded={menuOpen}
          aria-label={t(menuOpen ? 'header.menu.close' : 'header.menu.open')}
        >
          <span
            className={`block h-[1.5px] w-5 bg-on-surface transition-transform duration-150 ${menuOpen ? 'translate-y-0.75 rotate-45' : ''}`}
          />
          <span
            className={`block h-[1.5px] w-5 bg-on-surface transition-opacity duration-150 ${menuOpen ? 'opacity-0' : ''}`}
          />
          <span
            className={`block h-[1.5px] w-5 bg-on-surface transition-transform duration-150 ${menuOpen ? '-translate-y-0.75 -rotate-45' : ''}`}
          />
        </button>
      </div>

      {menuOpen && (
        <div
          id="mobile-menu"
          ref={menuRef}
          className="border-t border-outline-variant-30 bg-surface px-6 pb-6 pt-4 md:hidden"
        >
          <nav className="flex flex-col gap-4" aria-label="Mobile navigation">
            <button
              onClick={toggleTheme}
              className="font-body text-[13px] text-outline transition-colors duration-150 hover:text-on-surface-variant text-left"
              aria-label={t(
                theme === 'dark' ? 'header.theme.switchToLight' : 'header.theme.switchToDark',
              )}
              aria-pressed={theme === 'light'}
              title={t(
                theme === 'dark' ? 'header.theme.switchToLight' : 'header.theme.switchToDark',
              )}
            >
              {theme === 'dark' ? t('header.theme.lightMode') : t('header.theme.darkMode')}
            </button>
            <button
              onClick={() => {
                changeLocale(nextLocale);
                closeMenu();
              }}
              className="font-body text-[13px] text-outline transition-colors duration-150 hover:text-on-surface-variant text-left"
              aria-label={t('header.locale.switchTo', { lang: nextLocale.toUpperCase() })}
            >
              {t('header.locale.switchTo', { lang: nextLocale.toUpperCase() })}
            </button>
            <a
              href="https://docs.usewraith.xyz"
              target="_blank"
              rel="noopener noreferrer"
              onClick={closeMenu}
              className="font-body text-[13px] text-outline transition-colors duration-150 hover:text-on-surface-variant"
            >
              {t('header.nav.docs')}
            </a>
            <a
              href="https://docs.usewraith.xyz/sdk/overview"
              target="_blank"
              rel="noopener noreferrer"
              onClick={closeMenu}
              className="font-body text-[13px] text-outline transition-colors duration-150 hover:text-on-surface-variant"
            >
              {t('header.nav.sdk')}
            </a>
            <a
              href="https://demo.usewraith.xyz"
              target="_blank"
              rel="noopener noreferrer"
              onClick={closeMenu}
              className="font-body text-[13px] text-outline transition-colors duration-150 hover:text-on-surface-variant"
            >
              {t('header.nav.demo')}
            </a>
            <a
              href="https://console.usewraith.xyz"
              target="_blank"
              rel="noopener noreferrer"
              onClick={closeMenu}
              className="font-body text-[13px] text-outline transition-colors duration-150 hover:text-on-surface-variant"
            >
              {t('header.nav.console')}
            </a>
            <a
              href="/press"
              onClick={closeMenu}
              className="font-body text-[13px] text-outline transition-colors duration-150 hover:text-on-surface-variant"
            >
              {t('header.nav.press')}
            </a>
            <a
              href="/use-cases"
              onClick={closeMenu}
              className="font-body text-[13px] text-outline transition-colors duration-150 hover:text-on-surface-variant"
            >
              {t('header.nav.useCases')}
            </a>
            <Link
              to="/grants"
              onClick={closeMenu}
              className="font-body text-[13px] text-outline transition-colors duration-150 hover:text-on-surface-variant"
            >
              {t('header.nav.grants')}
            </Link>
            <Link
              to="/stellar"
              onClick={closeMenu}
              className="font-body text-[13px] text-outline transition-colors duration-150 hover:text-on-surface-variant"
            >
              Stellar
            </Link>
            <Link
              to="/roadmap"
              onClick={closeMenu}
              className="font-body text-[13px] text-outline transition-colors duration-150 hover:text-on-surface-variant"
            >
              {t('header.nav.roadmap')}
            </Link>
            <Link
              to="/blog"
              onClick={closeMenu}
              className="font-body text-[13px] text-outline transition-colors duration-150 hover:text-on-surface-variant"
            >
              {t('header.nav.blog')}
            </Link>
            <a
              href="https://github.com/wraith-protocol"
              target="_blank"
              rel="noopener noreferrer"
              onClick={closeMenu}
              className="font-body text-[13px] text-outline transition-colors duration-150 hover:text-on-surface-variant"
            >
              {t('header.github')}
            </a>
            <a
              href="https://demo.usewraith.xyz"
              target="_blank"
              rel="noopener noreferrer"
              onClick={closeMenu}
              className="mt-2 flex h-9 items-center justify-center bg-primary font-heading text-[11px] font-semibold uppercase tracking-[1.5px] text-surface transition-[filter] duration-150 hover:brightness-110"
            >
              {t('header.launchApp')}
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
