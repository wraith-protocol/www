import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Footer from '../components/Footer';

type Suggestion = {
  key: 'home' | 'docs' | 'demo' | 'console';
  href: string;
  internal?: boolean;
};

const suggestionItems: Suggestion[] = [
  { key: 'home', href: '/', internal: true },
  { key: 'docs', href: 'https://docs.usewraith.xyz' },
  { key: 'demo', href: 'https://demo.usewraith.xyz' },
  { key: 'console', href: 'https://console.usewraith.xyz' },
];

const sectionLabelStyles =
  'font-mono text-[10px] font-semibold uppercase tracking-[1.8px] text-outline';

export default function NotFound() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');

  const suggestions = suggestionItems.map((item) => ({
    ...item,
    label: t(`notFound.suggestions.${item.key}Label`),
    description: t(`notFound.suggestions.${item.key}Desc`),
  }));

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    const search = trimmed ? `${trimmed} site:usewraith.xyz` : 'site:usewraith.xyz';
    window.location.href = `https://www.google.com/search?q=${encodeURIComponent(search)}`;
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <header className="flex items-center justify-between px-6 py-5 md:px-12">
        <Link to="/" className="flex items-center gap-3">
          <img src="/logo.png" alt="Wraith" width={30} height={24} className="h-6 opacity-90" />
          <span className="font-heading text-[13px] font-bold tracking-[2px] text-on-surface">
            WRAITH PROTOCOL
          </span>
        </Link>
        <Link
          to="/"
          className="font-body text-[13px] text-outline transition-colors hover:text-on-surface"
        >
          {t('notFound.backHome')}
        </Link>
      </header>

      <main className="mx-auto flex max-w-[760px] flex-col gap-12 px-6 py-16 md:px-12 md:py-24">
        <div className="flex flex-col gap-6 border-b border-outline-variant pb-12">
          <span className={sectionLabelStyles}>{t('notFound.error404')}</span>
          <h1 className="font-heading text-[34px] font-bold tracking-[-1.2px] text-on-surface sm:text-[48px]">
            {t('notFound.title')}
          </h1>
          <p className="max-w-[560px] font-body text-[15px] leading-[1.7] text-on-surface-variant">
            {t('notFound.description')}
          </p>
        </div>

        <section className="flex flex-col gap-4" aria-label="Suggested pages">
          <span className={sectionLabelStyles}>{t('notFound.tryThese')}</span>
          <div className="grid gap-3 sm:grid-cols-2">
            {suggestions.map((item) =>
              item.internal ? (
                <Link
                  key={item.label}
                  to={item.href}
                  className="flex flex-col gap-1 border border-outline-variant bg-surface-container px-4 py-4 transition-colors hover:border-outline"
                >
                  <span className="font-heading text-[16px] font-semibold tracking-[-0.3px] text-on-surface">
                    {item.label}
                  </span>
                  <span className="font-body text-[13px] leading-[1.5] text-on-surface-variant">
                    {item.description}
                  </span>
                </Link>
              ) : (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col gap-1 border border-outline-variant bg-surface-container px-4 py-4 transition-colors hover:border-outline"
                >
                  <span className="font-heading text-[16px] font-semibold tracking-[-0.3px] text-on-surface">
                    {item.label}
                  </span>
                  <span className="font-body text-[13px] leading-[1.5] text-on-surface-variant">
                    {item.description}
                  </span>
                </a>
              ),
            )}
          </div>
        </section>

        <section className="flex flex-col gap-4" aria-label="Search the site">
          <span className={sectionLabelStyles}>{t('notFound.orSearch')}</span>
          <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('notFound.searchPlaceholder')}
              aria-label={t('notFound.searchPlaceholder')}
              className="w-full border border-outline-variant bg-surface-container px-4 py-3 font-body text-[14px] text-on-surface placeholder:text-outline focus:border-outline focus:outline-none"
            />
            <button
              type="submit"
              className="border border-outline-variant bg-surface-bright px-6 py-3 font-mono text-[11px] font-semibold uppercase tracking-[1.6px] text-on-surface transition-colors hover:border-outline"
            >
              {t('notFound.searchButton')}
            </button>
          </form>
          <p className="font-body text-[13px] leading-[1.6] text-outline">
            {t('notFound.brokenLink')}{' '}
            <a
              href="https://github.com/wraith-protocol/www/issues/new"
              target="_blank"
              rel="noopener noreferrer"
              className="text-on-surface-variant underline transition-colors hover:text-on-surface"
            >
              {t('notFound.reportGithub')}
            </a>
            .
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
