import { useEffect, useState } from 'react';
import type { TocItem } from '../utils/blog';

export default function BlogToc({ toc, wordCount }: { toc: TocItem[]; wordCount: number }) {
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: '0% 0% -80% 0%' },
    );

    toc.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [toc]);

  if (wordCount <= 800 || toc.length === 0) {
    return null;
  }

  return (
    <nav className="mb-8 lg:mb-0 lg:w-64 lg:shrink-0" aria-label="Table of Contents">
      <div className="lg:sticky lg:top-24">
        <h3 className="mb-3 font-mono text-[12px] uppercase tracking-wider text-outline">
          Table of Contents
        </h3>
        <ul className="flex flex-col gap-2 border-l border-outline-variant-30 pl-4">
          {toc.map((item) => (
            <li key={item.id} className={item.level === 3 ? 'ml-4' : ''}>
              <a
                href={`#${item.id}`}
                className={`block text-[14px] transition-colors focus-visible:outline-primary ${
                  activeId === item.id
                    ? 'font-medium text-primary'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {item.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
