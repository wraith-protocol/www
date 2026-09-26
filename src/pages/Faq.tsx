import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';
import faqData from '../data/faq.json';
import { faqPage } from '../utils/jsonld';

type FaqEntry = {
  id: string;
  category: string;
  question: string;
  answer: string;
  tags: string[];
};

type FaqCategory = {
  id: string;
  title: string;
};

const faqCategories = faqData.categories as FaqCategory[];
const faqEntries = faqData.entries as FaqEntry[];

const sectionLabelStyles =
  'font-mono text-[10px] font-semibold uppercase tracking-[1.8px] text-outline';

const ALL_CATEGORIES = 'all';

export default function Faq() {
  const firstEntry = faqEntries[0];
  const [openEntryId, setOpenEntryId] = useState<string | null>(firstEntry?.id ?? null);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORIES);

  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (!hash) return;

    const entry = faqEntries.find((candidate) => candidate.id === hash);
    if (entry) {
      setOpenEntryId(hash);
      setActiveCategory(ALL_CATEGORIES);
    }
  }, []);

  const entryCount = faqEntries.length;

  const normalizedQuery = query.trim().toLowerCase();

  const filteredEntries = useMemo(() => {
    return faqEntries.filter((entry) => {
      const matchesCategory =
        activeCategory === ALL_CATEGORIES || entry.category === activeCategory;
      if (!matchesCategory) return false;

      if (!normalizedQuery) return true;

      const haystack = [entry.question, entry.answer, ...entry.tags].join(' ').toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [activeCategory, normalizedQuery]);

  const sections = useMemo(() => {
    return faqCategories
      .map((category) => ({
        ...category,
        entries: filteredEntries.filter((entry) => entry.category === category.id),
      }))
      .filter((section) => section.entries.length > 0);
  }, [filteredEntries]);

  const hasResults = filteredEntries.length > 0;

  const faqStructuredData = faqPage(
    faqEntries.map((entry) => ({ question: entry.question, answer: entry.answer })),
  );

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
      />
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
          Back home
        </Link>
      </header>

      <main className="mx-auto flex max-w-[1120px] flex-col gap-12 px-6 py-10 md:px-12 md:py-16">
        <div className="flex flex-col gap-6 border-b border-outline-variant pb-10">
          <span className={sectionLabelStyles}>Support</span>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex max-w-[700px] flex-col gap-3">
              <h1 className="font-heading text-[34px] font-bold tracking-[-1.2px] text-on-surface sm:text-[48px]">
                FAQ
              </h1>
              <p className="font-body text-[15px] leading-[1.7] text-on-surface-variant">
                Short answers to the questions that come up most often in Discord, support, and
                product demos. Each answer is written to be easy to share and easy to find.
              </p>
            </div>
            <div className="flex flex-col gap-1 rounded-sm border border-outline-variant px-4 py-3">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
                Indexed answers
              </span>
              <span className="font-heading text-[18px] font-semibold text-on-surface">
                {entryCount} entries
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <label htmlFor="faq-search" className="sr-only">
              Search FAQ
            </label>
            <div className="relative flex-1">
              <input
                id="faq-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search questions, answers, or tags…"
                className="w-full rounded-sm border border-outline-variant bg-surface-container px-4 py-3 font-body text-[14px] text-on-surface placeholder:text-outline focus:border-on-surface focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter FAQ by category">
            <button
              type="button"
              onClick={() => setActiveCategory(ALL_CATEGORIES)}
              aria-pressed={activeCategory === ALL_CATEGORIES}
              className={`rounded-full border px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[1px] transition-colors ${
                activeCategory === ALL_CATEGORIES
                  ? 'border-on-surface bg-on-surface text-surface'
                  : 'border-outline-variant text-on-surface-variant hover:text-on-surface'
              }`}
            >
              All
            </button>
            {faqCategories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setActiveCategory(category.id)}
                aria-pressed={activeCategory === category.id}
                className={`rounded-full border px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[1px] transition-colors ${
                  activeCategory === category.id
                    ? 'border-on-surface bg-on-surface text-surface'
                    : 'border-outline-variant text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {category.title}
              </button>
            ))}
          </div>

          <p className="font-body text-[13px] text-on-surface-variant" role="status">
            {hasResults
              ? `Showing ${filteredEntries.length} of ${entryCount} entries`
              : 'No matching questions'}
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
          <nav
            className="flex flex-col gap-3 lg:sticky lg:top-6 lg:h-fit"
            aria-label="FAQ sections"
          >
            <span className={sectionLabelStyles}>Jump to</span>
            <div className="flex flex-col gap-2">
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="font-body text-[13px] text-on-surface-variant transition-colors hover:text-on-surface"
                >
                  {section.title}
                </a>
              ))}
            </div>
          </nav>

          <div className="flex flex-col gap-10">
            {!hasResults && (
              <div className="rounded-sm border border-outline-variant bg-surface-container px-5 py-8 text-center">
                <p className="font-body text-[14px] text-on-surface-variant">
                  No questions match "{query}". Try a different search term or clear the category
                  filter.
                </p>
              </div>
            )}
            {sections.map((section) => (
              <section key={section.id} id={section.id} className="flex flex-col gap-4">
                <h2 className="font-heading text-[20px] font-semibold tracking-[-0.4px] text-on-surface">
                  {section.title}
                </h2>
                <div className="flex flex-col gap-3">
                  {section.entries.map((entry) => {
                    const isOpen = openEntryId === entry.id;
                    const toggleId = `faq-toggle-${entry.id}`;
                    const panelId = `faq-panel-${entry.id}`;
                    return (
                      <div
                        key={entry.id}
                        className="rounded-sm border border-outline-variant bg-surface-container"
                      >
                        <div className="px-4 py-4 sm:px-5">
                          <h3
                            id={entry.id}
                            className="font-heading text-[16px] font-semibold tracking-[-0.3px] text-on-surface"
                          >
                            <a
                              href={`#${entry.id}`}
                              className="mr-2 text-outline transition-colors hover:text-on-surface"
                              aria-label={`Direct link to ${entry.question}`}
                            >
                              #
                            </a>
                            <button
                              id={toggleId}
                              type="button"
                              aria-expanded={isOpen}
                              aria-controls={panelId}
                              aria-label={`${isOpen ? 'Hide' : 'Show'} answer for ${entry.question}`}
                              onClick={() => setOpenEntryId(isOpen ? null : entry.id)}
                              className="flex w-full items-center justify-between text-left"
                            >
                              <span className="block w-full text-left">{entry.question}</span>
                              <span className="font-mono text-[10px] font-semibold uppercase tracking-[1.6px] text-outline transition-colors hover:text-on-surface">
                                {isOpen ? 'Hide' : 'Show'}
                              </span>
                            </button>
                          </h3>
                        </div>
                        {isOpen && (
                          <div
                            id={panelId}
                            role="region"
                            aria-labelledby={toggleId}
                            className="border-t border-outline-variant px-4 py-4 sm:px-5"
                          >
                            <p className="font-body text-[14px] leading-[1.7] text-on-surface-variant">
                              {entry.answer}
                            </p>
                            {entry.tags.length > 0 && (
                              <ul className="mt-3 flex flex-wrap gap-2" aria-label="Related tags">
                                {entry.tags.map((tag) => (
                                  <li
                                    key={tag}
                                    className="rounded-full border border-outline-variant px-2 py-0.5 font-mono text-[10px] uppercase tracking-[1px] text-outline"
                                  >
                                    {tag}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
