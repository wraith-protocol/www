import { useMemo, useEffect, useState } from 'react';

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface BlogTocProps {
  rawContent: string;
  wordCount: number;
}

function generateSlug(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-');
}

export default function BlogToc({ rawContent, wordCount }: BlogTocProps) {
  const [activeId, setActiveId] = useState<string>('');

  const toc = useMemo(() => {
    if (wordCount <= 800) return [];

    const headings: TocItem[] = [];
    const lines = rawContent.split('\n');
    let insideCodeBlock = false;

    for (const line of lines) {
      if (line.startsWith('```')) {
        insideCodeBlock = !insideCodeBlock;
        continue;
      }
      if (insideCodeBlock) continue;

      const match = line.match(/^(#{2,3})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        // Strip out MDX/Markdown formatting from heading text if needed
        const rawText = match[2].replace(/[*_~`]/g, '').trim();
        headings.push({
          id: generateSlug(rawText),
          text: rawText,
          level,
        });
      }
    }
    return headings;
  }, [rawContent, wordCount]);

  useEffect(() => {
    if (toc.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: '0px 0px -80% 0px' },
    );

    toc.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [toc]);

  if (toc.length === 0) return null;

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
      // update URL hash and focus
      window.history.pushState(null, '', `#${id}`);
      el.focus({ preventScroll: true });
    }
  };

  return (
    <nav
      aria-label="Table of contents"
      className="mb-8 rounded-lg border border-outline-variant-30 bg-surface-container p-4 lg:sticky lg:top-24 lg:mb-0 lg:w-64 lg:shrink-0 lg:self-start lg:bg-transparent lg:p-0 lg:border-none"
    >
      <h2 className="mb-4 font-heading text-[16px] font-semibold text-on-surface">
        Table of Contents
      </h2>
      <ul className="flex flex-col gap-2 font-mono text-[13px]">
        {toc.map((item) => (
          <li key={item.id} style={{ paddingLeft: item.level === 3 ? '1rem' : '0' }}>
            <a
              href={`#${item.id}`}
              onClick={(e) => handleClick(e, item.id)}
              className={`block leading-relaxed transition-colors hover:text-primary ${
                activeId === item.id ? 'text-primary font-semibold' : 'text-on-surface-variant'
              }`}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
